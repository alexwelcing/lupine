// ═══════════════════════════════════════════════════════════════════
// glimPSE — Streaming Dataset Loader
//
// Fetches .glimbin files from a remote URL using HTTP Range Requests.
// Three-phase loading:
//   1. Fetch 256-byte header → instant metadata
//   2. Fetch frame index     → timeline is ready
//   3. Fetch frames on-demand → only what the camera needs
//
// Designed for GCS + Cloudflare CDN with Bandwidth Alliance.
// A 2GB file might result in only 30MB of actual network transfer
// per user session.
// ═══════════════════════════════════════════════════════════════════

import type { Frame } from '@atlas/core/types';
import {
  HEADER_SIZE,
  FRAME_ENTRY_SIZE,
  parseHeader,
  parseFrameIndex,
  parseFrameData,
  type GlimbinHeader,
  type GlimbinIndex,
  type FrameIndexEntry,
  type DatasetMeta,
} from '@atlas/core/glimbin';

// ─── Cache & state ──────────────────────────────────────────────────

/** LRU frame cache with configurable max entries */
class FrameCache {
  private cache = new Map<number, Frame>();
  private accessOrder: number[] = [];

  constructor(private maxSize: number = 20) {}

  get(frameIndex: number): Frame | undefined {
    const frame = this.cache.get(frameIndex);
    if (frame) {
      // Move to end (most recently used)
      this.accessOrder = this.accessOrder.filter(i => i !== frameIndex);
      this.accessOrder.push(frameIndex);
    }
    return frame;
  }

  set(frameIndex: number, frame: Frame): void {
    if (this.cache.has(frameIndex)) {
      this.cache.set(frameIndex, frame);
      this.accessOrder = this.accessOrder.filter(i => i !== frameIndex);
      this.accessOrder.push(frameIndex);
      return;
    }

    // Evict oldest if at capacity
    while (this.cache.size >= this.maxSize && this.accessOrder.length > 0) {
      const evict = this.accessOrder.shift()!;
      this.cache.delete(evict);
    }

    this.cache.set(frameIndex, frame);
    this.accessOrder.push(frameIndex);
  }

  has(frameIndex: number): boolean {
    return this.cache.has(frameIndex);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  get size(): number {
    return this.cache.size;
  }

  /** Get all cached frame indices */
  keys(): number[] {
    return Array.from(this.cache.keys());
  }
}

// ─── Streaming Loader ───────────────────────────────────────────────

export interface StreamingLoaderEvents {
  onMetadata?: (meta: DatasetMeta) => void;
  onFrame?: (frameIndex: number, frame: Frame) => void;
  onProgress?: (phase: 'header' | 'index' | 'frame', progress: number) => void;
  onError?: (error: Error) => void;
  onTelemetry?: (stats: { bytesTransferred: number; cacheHits: number; cacheMisses: number; cacheSize: number }) => void;
}

export class StreamingLoader {
  private url: string;
  private header: GlimbinHeader | null = null;
  private index: GlimbinIndex | null = null;
  private frameCache: FrameCache;
  private events: StreamingLoaderEvents;

  /** In-flight fetch requests (prevents duplicate fetches for same frame) */
  private inflight = new Map<number, Promise<Frame>>();

  /** AbortController for cancelling prefetch requests */
  private prefetchController: AbortController | null = null;

  /** Total file size from HEAD request */
  private fileSize = 0;

  // Telemetry stats
  private totalBytesTransferred = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(url: string, events: StreamingLoaderEvents = {}, maxCachedFrames = 20) {
    this.url = url;
    this.events = events;
    this.frameCache = new FrameCache(maxCachedFrames);
  }

  private emitTelemetry() {
    this.events.onTelemetry?.({
      bytesTransferred: this.totalBytesTransferred,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheSize: this.frameCache.size,
    });
  }

  // ── Phase 1: Header ─────────────────────────────────────────────

  /**
   * Fetch the 256-byte header. Returns dataset metadata instantly.
   * Cost: 1 HTTP request, 256 bytes transferred.
   */
  async fetchHeader(): Promise<GlimbinHeader> {
    this.events.onProgress?.('header', 0);

    // Also get file size from HEAD
    try {
      const headResp = await fetch(this.url, { method: 'HEAD' });
      const contentLength = headResp.headers.get('Content-Length');
      if (contentLength) this.fileSize = parseInt(contentLength, 10);
    } catch {
      // Non-fatal: we can work without knowing file size
    }

    const resp = await fetch(this.url, {
      headers: { Range: `bytes=0-${HEADER_SIZE - 1}` },
    });

    if (!resp.ok && resp.status !== 206) {
      throw new Error(`Failed to fetch glimbin header: ${resp.status} ${resp.statusText}`);
    }

    const buffer = await resp.arrayBuffer();
    this.totalBytesTransferred += buffer.byteLength;
    this.header = parseHeader(buffer);
    this.events.onProgress?.('header', 1);
    this.emitTelemetry();

    return this.header;
  }

  // ── Phase 2: Frame Index ────────────────────────────────────────

  /**
   * Fetch the frame index. Requires header to be loaded first.
   * Cost: 1 HTTP request, ~24 bytes × totalFrames transferred.
   * For 1000 frames: 24KB.
   */
  async fetchIndex(): Promise<GlimbinIndex> {
    if (!this.header) {
      throw new Error('Must call fetchHeader() before fetchIndex()');
    }

    this.events.onProgress?.('index', 0);

    const indexStart = Number(this.header.frameIndexOffset);
    const indexSize = this.header.totalFrames * FRAME_ENTRY_SIZE;
    const indexEnd = indexStart + indexSize - 1;

    const resp = await fetch(this.url, {
      headers: { Range: `bytes=${indexStart}-${indexEnd}` },
    });

    if (!resp.ok && resp.status !== 206) {
      throw new Error(`Failed to fetch frame index: ${resp.status} ${resp.statusText}`);
    }

    const buffer = await resp.arrayBuffer();
    this.totalBytesTransferred += buffer.byteLength;
    this.index = parseFrameIndex(buffer, this.header.totalFrames);
    this.events.onProgress?.('index', 1);
    this.emitTelemetry();

    // Emit full metadata now that we have header + index
    const meta = this.getMetadata();
    if (meta) this.events.onMetadata?.(meta);

    return this.index;
  }

  // ── Phase 3: Individual Frames ──────────────────────────────────

  /**
   * Fetch a single frame by index. Uses LRU cache.
   * Cost: 1 HTTP request if not cached, ~12 bytes × natoms × 3 transferred.
   */
  async fetchFrame(frameIndex: number, signal?: AbortSignal): Promise<Frame> {
    // Check cache first
    const cached = this.frameCache.get(frameIndex);
    if (cached) {
      this.cacheHits++;
      this.emitTelemetry();
      return cached;
    }
    
    this.cacheMisses++;
    this.emitTelemetry();

    // Check if already in flight
    const existing = this.inflight.get(frameIndex);
    if (existing) return existing;

    // Validate
    if (!this.header || !this.index) {
      throw new Error('Must call fetchHeader() and fetchIndex() before fetchFrame()');
    }

    if (frameIndex < 0 || frameIndex >= this.index.entries.length) {
      throw new Error(`Frame index ${frameIndex} out of range [0, ${this.index.entries.length})`);
    }

    const promise = this._doFetchFrame(frameIndex, signal);
    this.inflight.set(frameIndex, promise);

    try {
      const frame = await promise;
      this.inflight.delete(frameIndex);
      return frame;
    } catch (err) {
      this.inflight.delete(frameIndex);
      throw err;
    }
  }

  private async _doFetchFrame(frameIndex: number, signal?: AbortSignal): Promise<Frame> {
    const entry = this.index!.entries[frameIndex];
    const start = Number(entry.offset);
    const end = start + entry.compressedSize - 1;

    this.events.onProgress?.('frame', frameIndex / this.index!.entries.length);

    const resp = await fetch(this.url, {
      headers: { Range: `bytes=${start}-${end}` },
      signal,
    });

    if (!resp.ok && resp.status !== 206) {
      throw new Error(`Failed to fetch frame ${frameIndex}: ${resp.status}`);
    }

    let buffer = await resp.arrayBuffer();
    this.totalBytesTransferred += buffer.byteLength;
    this.emitTelemetry();

    // Decompress if needed
    if (this.header!.compressed && entry.compressedSize !== entry.rawSize) {
      buffer = await this._decompress(buffer);
    }

    // Parse frame data into typed arrays
    const parsed = parseFrameData(buffer, entry.natoms, this.header!.flags);

    // Build Frame object compatible with existing rendering pipeline
    const frame: Frame = {
      timestep: entry.timestep,
      natoms: entry.natoms,
      boxBounds: this.header!.boxBounds,
      boxTilt: this.header!.boxTilt,
      triclinic: this.header!.triclinic,
      columns: ['id', 'type', 'x', 'y', 'z'],
      ids: parsed.ids,
      // Expand Uint8 types to Int32 for compatibility with existing renderer
      types: new Int32Array(parsed.types),
      positions: parsed.positions,
      bonds: parsed.bonds,
      properties: parsed.properties,
    };

    // Cache and emit
    this.frameCache.set(frameIndex, frame);
    this.events.onFrame?.(frameIndex, frame);

    return frame;
  }

  /** Decompress a buffer (zstd or gzip fallback via DecompressionStream) */
  private async _decompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    // Try native DecompressionStream (available in modern browsers)
    // Note: DecompressionStream supports 'gzip' and 'deflate' natively.
    // For zstd, we'd need a WASM decoder. For now, fall back to gzip.
    try {
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();

      writer.write(new Uint8Array(buffer));
      writer.close();

      const chunks: Uint8Array[] = [];
      let totalLen = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLen += value.length;
      }

      const result = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result.buffer;
    } catch {
      // If decompression fails, assume data was uncompressed
      return buffer;
    }
  }

  // ── Prefetch ────────────────────────────────────────────────────

  /**
   * Prefetch frames around a target index. Call this when the user
   * scrubs the timeline or when playback advances.
   *
   * @param currentFrame - The frame currently being displayed
   * @param direction - 1 for forward playback, -1 for reverse, 0 for static
   * @param lookahead - Number of frames to prefetch ahead
   */
  prefetch(currentFrame: number, direction: number = 1, lookahead: number = 5): void {
    // Cancel previous prefetch batch
    this.prefetchController?.abort();
    this.prefetchController = new AbortController();

    if (!this.index) return;

    const total = this.index.entries.length;
    const targets: number[] = [];

    if (direction >= 0) {
      // Forward: prefetch next N frames
      for (let i = 1; i <= lookahead; i++) {
        const idx = currentFrame + i;
        if (idx < total && !this.frameCache.has(idx)) {
          targets.push(idx);
        }
      }
    } else {
      // Reverse: prefetch previous N frames
      for (let i = 1; i <= lookahead; i++) {
        const idx = currentFrame - i;
        if (idx >= 0 && !this.frameCache.has(idx)) {
          targets.push(idx);
        }
      }
    }

    // Fire prefetches with low priority (background)
    const signal = this.prefetchController.signal;
    for (const target of targets) {
      this.fetchFrame(target, signal).catch(() => {
        // Prefetch failures are non-fatal (likely aborted)
      });
    }
  }

  // ── Metadata ────────────────────────────────────────────────────

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
      fileSize: this.fileSize,
      timesteps: this.index.entries.map(e => e.timestep),
    };
  }

  /** Check if a frame is already cached */
  isCached(frameIndex: number): boolean {
    return this.frameCache.has(frameIndex);
  }

  /** Get all cached frame indices */
  getCachedFrames(): number[] {
    return this.frameCache.keys();
  }

  /** Clear all cached frames and cancel in-flight requests */
  dispose(): void {
    this.prefetchController?.abort();
    this.frameCache.clear();
    this.inflight.clear();
    this.header = null;
    this.index = null;
  }
}

// ─── URL detection ──────────────────────────────────────────────────

/** Check if a URL points to a .glimbin file */
export function isGlimbinUrl(url: string): boolean {
  try {
    const pathname = new URL(url, 'http://localhost').pathname;
    return pathname.endsWith('.glimbin');
  } catch {
    return url.endsWith('.glimbin');
  }
}

/**
 * Auto-detect whether a URL is a .glimbin (streaming) or a raw text file
 * (legacy monolithic parse). Returns the appropriate loader.
 */
export async function autoDetectLoader(url: string): Promise<'streaming' | 'legacy'> {
  if (isGlimbinUrl(url)) return 'streaming';

  // Probe the first 4 bytes to check for GLIM magic
  try {
    const resp = await fetch(url, {
      headers: { Range: 'bytes=0-3' },
    });
    if (resp.ok || resp.status === 206) {
      const buffer = await resp.arrayBuffer();
      const magic = new Uint8Array(buffer);
      if (magic[0] === 0x47 && magic[1] === 0x4C && magic[2] === 0x49 && magic[3] === 0x4D) {
        return 'streaming';
      }
    }
  } catch {
    // Can't probe — fall back to legacy
  }

  return 'legacy';
}
