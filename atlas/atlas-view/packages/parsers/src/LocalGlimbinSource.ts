// ═══════════════════════════════════════════════════════════════════
// LUPI — Local .glimbin frame source
//
// The Blob-backed twin of StreamingLoader. Where StreamingLoader reads a
// remote .glimbin via HTTP Range requests, this reads a *local* .glimbin
// Blob (an in-memory encode, or a file persisted in OPFS) via
// `blob.slice()`. Same three phases — header → index → frame-on-demand —
// and the same LRU + prefetch, so a user-uploaded trajectory streams
// frame-by-frame through the exact substrate the gallery already uses
// instead of being pinned whole in the store.
//
// This is what makes "bring your own data" reliable for simulations over
// time over large files: after the upload is transcoded to .glimbin and
// stored, only the frames the camera needs (plus a small LRU window) are
// ever resident.
// ═══════════════════════════════════════════════════════════════════

import type { Frame } from '@atlas/core/types';
import {
  HEADER_SIZE,
  FRAME_ENTRY_SIZE,
  FLAG_HAS_BONDS,
  parseHeader,
  parseFrameIndex,
  parseFrameData,
  type GlimbinHeader,
  type GlimbinIndex,
  type DatasetMeta,
} from '@atlas/core/glimbin';

/** LRU frame cache — bounds resident frames to `maxSize` regardless of
 *  trajectory length. Identical contract to StreamingLoader's internal
 *  cache; kept local so the remote path stays untouched. */
class FrameCache {
  private cache = new Map<number, Frame>();
  private order: number[] = [];
  constructor(private maxSize: number = 24) {}

  get(i: number): Frame | undefined {
    const f = this.cache.get(i);
    if (f) {
      this.order = this.order.filter((x) => x !== i);
      this.order.push(i);
    }
    return f;
  }
  set(i: number, frame: Frame): void {
    if (!this.cache.has(i)) {
      while (this.cache.size >= this.maxSize && this.order.length > 0) {
        this.cache.delete(this.order.shift()!);
      }
    } else {
      this.order = this.order.filter((x) => x !== i);
    }
    this.cache.set(i, frame);
    this.order.push(i);
  }
  has(i: number): boolean {
    return this.cache.has(i);
  }
  clear(): void {
    this.cache.clear();
    this.order = [];
  }
  get size(): number {
    return this.cache.size;
  }
}

export interface LocalGlimbinEvents {
  onMetadata?: (meta: DatasetMeta) => void;
  onFrame?: (frameIndex: number, frame: Frame) => void;
  onError?: (error: Error) => void;
}

export class LocalGlimbinSource {
  private blob: Blob;
  private header: GlimbinHeader | null = null;
  private index: GlimbinIndex | null = null;
  private cache: FrameCache;
  private events: LocalGlimbinEvents;
  private inflight = new Map<number, Promise<Frame>>();
  private prefetchController: AbortController | null = null;

  constructor(blob: Blob, events: LocalGlimbinEvents = {}, maxCachedFrames = 24) {
    this.blob = blob;
    this.events = events;
    this.cache = new FrameCache(maxCachedFrames);
  }

  private async readBytes(start: number, endExclusive: number): Promise<ArrayBuffer> {
    return this.blob.slice(start, endExclusive).arrayBuffer();
  }

  /** Read header + frame index up front (a few KB total) and emit
   *  metadata. Cheap and synchronous-feeling for a local Blob. */
  async open(): Promise<DatasetMeta> {
    try {
      if (this.blob.size < HEADER_SIZE) {
        throw new Error(`Not a .glimbin file: ${this.blob.size} bytes is smaller than the header.`);
      }
      this.header = parseHeader(await this.readBytes(0, HEADER_SIZE));

      const indexStart = Number(this.header.frameIndexOffset);
      const indexSize = this.header.totalFrames * FRAME_ENTRY_SIZE;
      this.index = parseFrameIndex(
        await this.readBytes(indexStart, indexStart + indexSize),
        this.header.totalFrames,
      );

      const meta = this.getMetadata()!;
      this.events.onMetadata?.(meta);
      return meta;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      this.events.onError?.(e);
      throw e;
    }
  }

  async fetchFrame(frameIndex: number): Promise<Frame> {
    const cached = this.cache.get(frameIndex);
    if (cached) return cached;

    const existing = this.inflight.get(frameIndex);
    if (existing) return existing;

    if (!this.header || !this.index) {
      throw new Error('LocalGlimbinSource.fetchFrame called before open()');
    }
    if (frameIndex < 0 || frameIndex >= this.index.entries.length) {
      throw new Error(
        `Frame index ${frameIndex} out of range [0, ${this.index.entries.length})`,
      );
    }

    const promise = this.doFetchFrame(frameIndex);
    this.inflight.set(frameIndex, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(frameIndex);
    }
  }

  private async doFetchFrame(frameIndex: number): Promise<Frame> {
    const entry = this.index!.entries[frameIndex];
    const start = Number(entry.offset);
    let buffer = await this.readBytes(start, start + entry.compressedSize);

    if (this.header!.compressed && entry.compressedSize !== entry.rawSize) {
      buffer = await decompressGzip(buffer);
    }

    const parsed = parseFrameData(buffer, entry.natoms, this.header!.flags);
    const columns = ['id', 'type', 'x', 'y', 'z', ...parsed.properties.keys()];
    const frame: Frame = {
      timestep: entry.timestep,
      natoms: entry.natoms,
      // v2 records carry their own box (exact for NPT / deforming cells);
      // v1 falls back to the file-level box from the header.
      boxBounds: parsed.boxBounds ?? this.header!.boxBounds,
      boxTilt: parsed.boxTilt ?? this.header!.boxTilt,
      triclinic: parsed.triclinic ?? this.header!.triclinic,
      columns,
      ids: parsed.ids,
      types: new Int32Array(parsed.types),
      positions: parsed.positions,
      bonds: (this.header!.flags & FLAG_HAS_BONDS) !== 0 ? parsed.bonds : new Int32Array(0),
      properties: parsed.properties,
    };

    this.cache.set(frameIndex, frame);
    this.events.onFrame?.(frameIndex, frame);
    return frame;
  }

  /** Warm the LRU around the playhead so scrubbing/playback stays smooth.
   *  Reads are local so this is best-effort and cheap; failures are
   *  swallowed. */
  prefetch(currentFrame: number, direction: number = 1, lookahead: number = 4): void {
    this.prefetchController?.abort();
    this.prefetchController = new AbortController();
    if (!this.index) return;
    const total = this.index.entries.length;
    const step = direction >= 0 ? 1 : -1;
    for (let i = 1; i <= lookahead; i++) {
      const idx = currentFrame + step * i;
      if (idx >= 0 && idx < total && !this.cache.has(idx)) {
        this.fetchFrame(idx).catch(() => {});
      }
    }
  }

  getMetadata(): DatasetMeta | null {
    if (!this.header || !this.index) return null;
    return {
      totalFrames: this.header.totalFrames,
      atomsPerFrame: this.header.atomsPerFrame,
      atomTypes: this.header.atomTypes,
      globalBounds: this.header.globalBounds,
      boxBounds: this.header.boxBounds,
      boxTilt: this.header.boxTilt,
      triclinic: this.header.triclinic,
      compressed: this.header.compressed,
      hasBonds: this.header.hasBonds,
      hasProperties: this.header.hasProperties,
      fileSize: this.blob.size,
      timesteps: this.index.entries.map((e) => e.timestep),
    };
  }

  isCached(frameIndex: number): boolean {
    return this.cache.has(frameIndex);
  }

  dispose(): void {
    this.prefetchController?.abort();
    this.cache.clear();
    this.inflight.clear();
    this.header = null;
    this.index = null;
  }
}

/** Detect a .glimbin Blob by magic bytes ("GLIM") without parsing. */
export async function isGlimbinBlob(blob: Blob): Promise<boolean> {
  if (blob.size < 4) return false;
  const magic = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  return magic[0] === 0x47 && magic[1] === 0x4c && magic[2] === 0x49 && magic[3] === 0x4d;
}

async function decompressGzip(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    const ds = new DecompressionStream('gzip');
    const stream = new Blob([buffer]).stream().pipeThrough(ds);
    return await new Response(stream).arrayBuffer();
  } catch {
    // Not actually gzip-framed — assume the bytes were already raw.
    return buffer;
  }
}
