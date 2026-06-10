// ═══════════════════════════════════════════════════════════════════
// glimPSE — .glimbin Binary Format Constants & Parsers
//
// Chunked binary format optimized for HTTP Range Requests and
// direct-to-GPU buffer upload. Enables streaming of multi-GB
// trajectory files without loading the entire dataset into memory.
// ═══════════════════════════════════════════════════════════════════

import type { Frame, Trajectory } from './types';

/** Magic bytes identifying a .glimbin file */
export const GLIMBIN_MAGIC = new Uint8Array([0x47, 0x4C, 0x49, 0x4D]); // "GLIM"

/** Current format version. v2 adds the per-frame box block
 *  (FLAG_PER_FRAME_BOX) so NPT / deforming-cell trajectories are exact;
 *  v1 files (the remote gallery fixtures) read unchanged. */
export const GLIMBIN_VERSION = 2;

/** Fixed header size in bytes */
export const HEADER_SIZE = 256;

/** Size of each frame index entry in bytes */
export const FRAME_ENTRY_SIZE = 24;

/** Size of the optional per-frame box block (FLAG_PER_FRAME_BOX):
 *  6×f64 bounds + 3×f64 tilt + u8 triclinic + 3 pad. */
export const FRAME_BOX_BLOCK_SIZE = 76;

// ─── Flags ──────────────────────────────────────────────────────────

export const FLAG_COMPRESSED   = 0x0001; // Frame data is zstd-compressed
export const FLAG_LITTLE_ENDIAN = 0x0002; // Data is little-endian (default)
export const FLAG_VARIABLE_ATOMS = 0x0004; // Atom count varies per frame
export const FLAG_HAS_BONDS    = 0x0008; // Frames include bond data
export const FLAG_HAS_PROPERTIES = 0x0010; // Frames include per-atom properties
export const FLAG_PER_FRAME_BOX = 0x0020; // Each frame record starts with its own box

// ─── Types ──────────────────────────────────────────────────────────

/** Parsed header from the first 256 bytes of a .glimbin file */
export interface GlimbinHeader {
  magic: string;
  version: number;
  flags: number;
  totalFrames: number;
  atomsPerFrame: number;
  atomTypes: number[];
  globalBounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  boxBounds: Float64Array;   // [xlo, xhi, ylo, yhi, zlo, zhi]
  boxTilt: Float64Array;     // [xy, xz, yz]
  triclinic: boolean;
  unitStyle: number;
  frameIndexOffset: bigint;

  // Derived
  compressed: boolean;
  littleEndian: boolean;
  variableAtoms: boolean;
  hasBonds: boolean;
  hasProperties: boolean;
}

/** A single entry in the frame index */
export interface FrameIndexEntry {
  /** Byte offset from start of file to the frame's data */
  offset: bigint;
  /** Compressed size of the frame data (bytes) */
  compressedSize: number;
  /** Decompressed size of the frame data (bytes) */
  rawSize: number;
  /** LAMMPS timestep number */
  timestep: number;
  /** Number of atoms in this frame */
  natoms: number;
}

/** Result of parsing the frame index */
export interface GlimbinIndex {
  entries: FrameIndexEntry[];
  /** Byte range of the frame index in the file: [start, end) */
  byteRange: [number, number];
}

/** Metadata extracted from header + index, enough to render UI */
export interface DatasetMeta {
  totalFrames: number;
  atomsPerFrame: number;
  atomTypes: number[];
  globalBounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  boxBounds: Float64Array;
  boxTilt: Float64Array;
  triclinic: boolean;
  compressed: boolean;
  hasBonds: boolean;
  hasProperties: boolean;
  /** Total file size (from Content-Length or known) */
  fileSize: number;
  /** Frame timesteps (for timeline labels) */
  timesteps: number[];
}

// ─── Header parsing ─────────────────────────────────────────────────

/**
 * Parse the 256-byte header from a .glimbin file.
 * Designed to work with a single `Range: bytes=0-255` fetch.
 */
export function parseHeader(buffer: ArrayBuffer): GlimbinHeader {
  if (buffer.byteLength < HEADER_SIZE) {
    throw new Error(`glimbin header too small: ${buffer.byteLength} bytes (need ${HEADER_SIZE})`);
  }

  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  // Verify magic
  const magic = String.fromCharCode(u8[0], u8[1], u8[2], u8[3]);
  if (magic !== 'GLIM') {
    throw new Error(`Invalid glimbin magic: "${magic}" (expected "GLIM")`);
  }

  const version = view.getUint16(4, true);
  if (version > GLIMBIN_VERSION) {
    throw new Error(`Unsupported glimbin version ${version} (max supported: ${GLIMBIN_VERSION})`);
  }

  const flags = view.getUint16(6, true);
  const totalFrames = view.getUint32(8, true);
  const atomsPerFrame = view.getUint32(12, true);

  // Atom types: up to 32, stored as u8 starting at offset 16
  const numTypes = u8[16];
  const atomTypes: number[] = [];
  for (let i = 0; i < numTypes && i < 32; i++) {
    atomTypes.push(u8[17 + i]);
  }

  // Global bounds: 6 × f32 at offset 52
  const boundsOffset = 52;
  const globalBounds = {
    min: [
      view.getFloat32(boundsOffset, true),
      view.getFloat32(boundsOffset + 4, true),
      view.getFloat32(boundsOffset + 8, true),
    ] as [number, number, number],
    max: [
      view.getFloat32(boundsOffset + 12, true),
      view.getFloat32(boundsOffset + 16, true),
      view.getFloat32(boundsOffset + 20, true),
    ] as [number, number, number],
  };

  // Box bounds: 6 × f64 at offset 76
  const boxOffset = 76;
  const boxBounds = new Float64Array(6);
  for (let i = 0; i < 6; i++) {
    boxBounds[i] = view.getFloat64(boxOffset + i * 8, true);
  }

  // Box tilt: 3 × f64 at offset 124
  const tiltOffset = 124;
  const boxTilt = new Float64Array(3);
  for (let i = 0; i < 3; i++) {
    boxTilt[i] = view.getFloat64(tiltOffset + i * 8, true);
  }

  // Triclinic flag at offset 148
  const triclinic = u8[148] !== 0;

  // Unit style at offset 149
  const unitStyle = u8[149];

  // Frame index offset: u64 at offset 152
  const frameIndexOffset = view.getBigUint64(152, true);

  return {
    magic,
    version,
    flags,
    totalFrames,
    atomsPerFrame,
    atomTypes,
    globalBounds,
    boxBounds,
    boxTilt,
    triclinic,
    unitStyle,
    frameIndexOffset,
    // Derived flags
    compressed: (flags & FLAG_COMPRESSED) !== 0,
    littleEndian: (flags & FLAG_LITTLE_ENDIAN) !== 0,
    variableAtoms: (flags & FLAG_VARIABLE_ATOMS) !== 0,
    hasBonds: (flags & FLAG_HAS_BONDS) !== 0,
    hasProperties: (flags & FLAG_HAS_PROPERTIES) !== 0,
  };
}

// ─── Frame index parsing ────────────────────────────────────────────

/**
 * Parse the frame index from a buffer.
 * Call after fetching the byte range: [header.frameIndexOffset, +totalFrames*FRAME_ENTRY_SIZE]
 */
export function parseFrameIndex(buffer: ArrayBuffer, totalFrames: number): GlimbinIndex {
  const expectedSize = totalFrames * FRAME_ENTRY_SIZE;
  if (buffer.byteLength < expectedSize) {
    throw new Error(
      `Frame index too small: ${buffer.byteLength} bytes (need ${expectedSize} for ${totalFrames} frames)`
    );
  }

  const view = new DataView(buffer);
  const entries: FrameIndexEntry[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const base = i * FRAME_ENTRY_SIZE;
    entries.push({
      offset: view.getBigUint64(base, true),
      compressedSize: view.getUint32(base + 8, true),
      rawSize: view.getUint32(base + 12, true),
      timestep: view.getUint32(base + 16, true),
      natoms: view.getUint32(base + 20, true),
    });
  }

  return {
    entries,
    byteRange: [0, expectedSize],
  };
}

// ─── Frame data parsing ─────────────────────────────────────────────

/**
 * Parse a single frame's binary data into typed arrays.
 * The buffer should contain the raw (decompressed) frame data.
 */
export function parseFrameData(
  buffer: ArrayBuffer,
  natoms: number,
  flags: number,
): {
  ids: Int32Array;
  types: Uint8Array;
  positions: Float32Array;
  bonds: Int32Array;
  properties: Map<string, Float32Array>;
  /** Present when the file carries per-frame boxes (FLAG_PER_FRAME_BOX,
   *  v2) — exact cells for NPT / deforming trajectories. */
  boxBounds?: Float64Array;
  boxTilt?: Float64Array;
  triclinic?: boolean;
} {
  let offset = 0;
  const view = new DataView(buffer);

  // Optional per-frame box block (v2).
  let boxBounds: Float64Array | undefined;
  let boxTilt: Float64Array | undefined;
  let triclinic: boolean | undefined;
  if (flags & FLAG_PER_FRAME_BOX) {
    boxBounds = new Float64Array(6);
    for (let i = 0; i < 6; i++) boxBounds[i] = view.getFloat64(offset + i * 8, true);
    boxTilt = new Float64Array(3);
    for (let i = 0; i < 3; i++) boxTilt[i] = view.getFloat64(offset + 48 + i * 8, true);
    triclinic = view.getUint8(offset + 72) !== 0;
    offset += FRAME_BOX_BLOCK_SIZE;
  }

  // ids: Int32Array(natoms)
  const ids = new Int32Array(buffer, offset, natoms);
  offset += natoms * 4;

  // types: Uint8Array(natoms)
  const types = new Uint8Array(buffer, offset, natoms);
  offset += natoms;
  // Align to 4-byte boundary
  offset = (offset + 3) & ~3;

  // positions: Float32Array(natoms * 3)
  const positions = new Float32Array(buffer, offset, natoms * 3);
  offset += natoms * 3 * 4;

  // bonds (optional)
  let bonds = new Int32Array(0);
  if (flags & FLAG_HAS_BONDS) {
    const nbonds = view.getUint32(offset, true);
    offset += 4;
    bonds = new Int32Array(buffer, offset, nbonds * 2);
    offset += nbonds * 2 * 4;
  }

  // properties (optional)
  const properties = new Map<string, Float32Array>();
  if (flags & FLAG_HAS_PROPERTIES) {
    const nprop = view.getUint32(offset, true);
    offset += 4;
    for (let p = 0; p < nprop; p++) {
      // Name: length-prefixed UTF-8 string
      const nameLen = view.getUint16(offset, true);
      offset += 2;
      const nameBytes = new Uint8Array(buffer, offset, nameLen);
      const name = new TextDecoder().decode(nameBytes);
      offset += nameLen;
      // Align to 4-byte boundary
      offset = (offset + 3) & ~3;
      // Data: Float32Array(natoms)
      const data = new Float32Array(buffer, offset, natoms);
      offset += natoms * 4;
      properties.set(name, data);
    }
  }

  return { ids, types, positions, bonds, properties, boxBounds, boxTilt, triclinic };
}

// ─── Header writing (for conversion tools) ──────────────────────────

/**
 * Write a .glimbin header into a 256-byte buffer.
 */
export function writeHeader(header: Omit<GlimbinHeader, 'magic' | 'compressed' | 'littleEndian' | 'variableAtoms' | 'hasBonds' | 'hasProperties'>): ArrayBuffer {
  const buffer = new ArrayBuffer(HEADER_SIZE);
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  // Magic
  u8[0] = 0x47; u8[1] = 0x4C; u8[2] = 0x49; u8[3] = 0x4D;

  view.setUint16(4, header.version, true);
  view.setUint16(6, header.flags, true);
  view.setUint32(8, header.totalFrames, true);
  view.setUint32(12, header.atomsPerFrame, true);

  // Atom types
  u8[16] = Math.min(header.atomTypes.length, 32);
  for (let i = 0; i < Math.min(header.atomTypes.length, 32); i++) {
    u8[17 + i] = header.atomTypes[i];
  }

  // Global bounds
  const boundsOffset = 52;
  view.setFloat32(boundsOffset, header.globalBounds.min[0], true);
  view.setFloat32(boundsOffset + 4, header.globalBounds.min[1], true);
  view.setFloat32(boundsOffset + 8, header.globalBounds.min[2], true);
  view.setFloat32(boundsOffset + 12, header.globalBounds.max[0], true);
  view.setFloat32(boundsOffset + 16, header.globalBounds.max[1], true);
  view.setFloat32(boundsOffset + 20, header.globalBounds.max[2], true);

  // Box bounds
  const boxOffset = 76;
  for (let i = 0; i < 6; i++) {
    view.setFloat64(boxOffset + i * 8, header.boxBounds[i], true);
  }

  // Box tilt
  const tiltOffset = 124;
  for (let i = 0; i < 3; i++) {
    view.setFloat64(tiltOffset + i * 8, header.boxTilt[i], true);
  }

  u8[148] = header.triclinic ? 1 : 0;
  u8[149] = header.unitStyle;
  view.setBigUint64(152, header.frameIndexOffset, true);

  return buffer;
}

// ─── Frame + index writing (trajectory → .glimbin encoder) ──────────
//
// The decoders above were built for the remote streaming path (gallery
// fixtures pre-baked to .glimbin on a bucket). These encoders close the
// loop so a trajectory parsed in the browser — e.g. a user-uploaded
// LAMMPS dump — can be re-emitted as .glimbin, persisted locally, and
// then read back frame-by-frame through the same range-fetch substrate
// instead of being pinned whole in RAM.
//
// Layout is byte-for-byte the inverse of `parseFrameData` /
// `parseFrameIndex`: ids (i32) · types (u8, 4-byte aligned) · positions
// (f32) · optional bonds · optional per-atom properties. Frames are
// written uncompressed (compressedSize === rawSize, no FLAG_COMPRESSED)
// so the reader's decompress branch is skipped — keeps the local path
// allocation-light and deterministic. gzip framing can layer on later
// without changing the index.

/** glimbin stores atom types as u8; reject anything that wouldn't survive
 *  the round-trip so the caller can keep such a trajectory on the
 *  in-memory path rather than silently corrupting type ids. */
export function canEncodeGlimbin(frames: Frame[]): boolean {
  if (frames.length === 0) return false;
  for (const f of frames) {
    for (let i = 0; i < f.natoms; i++) {
      const t = f.types[i];
      if (!Number.isInteger(t) || t < 0 || t > 255) return false;
    }
  }
  return true;
}

/** Derive the file-level flag word from the frames. Bonds/properties
 *  flags are global: if any frame carries them, every frame's record
 *  must include the (possibly empty) block so the reader's fixed walk
 *  stays aligned. */
export function computeGlimbinFlags(frames: Frame[]): number {
  let flags = FLAG_LITTLE_ENDIAN;
  const n0 = frames[0]?.natoms ?? 0;
  if (frames.some((f) => f.natoms !== n0)) flags |= FLAG_VARIABLE_ATOMS;
  if (frames.some((f) => f.bonds && f.bonds.length > 0)) flags |= FLAG_HAS_BONDS;
  if (frames.some((f) => f.properties && f.properties.size > 0)) flags |= FLAG_HAS_PROPERTIES;
  return flags;
}

const align4 = (n: number) => (n + 3) & ~3;

/** Serialize one frame's atom data to the raw (uncompressed) record that
 *  `parseFrameData` reads. `flags` is the file-level flag word so the
 *  bonds/properties blocks are emitted iff the file declares them. */
export function writeFrameData(frame: Frame, flags: number): ArrayBuffer {
  const natoms = frame.natoms;
  const hasBonds = (flags & FLAG_HAS_BONDS) !== 0;
  const hasProps = (flags & FLAG_HAS_PROPERTIES) !== 0;
  const hasBox = (flags & FLAG_PER_FRAME_BOX) !== 0;

  const propEntries: Array<[string, Float32Array, Uint8Array]> = [];
  if (hasProps && frame.properties) {
    for (const [name, data] of frame.properties) {
      propEntries.push([name, data, new TextEncoder().encode(name)]);
    }
  }
  const nbonds = hasBonds ? ((frame.bonds?.length ?? 0) >> 1) : 0;

  // ── Size pass (mirrors the reader's offset walk exactly) ──
  let size = hasBox ? FRAME_BOX_BLOCK_SIZE : 0;
  size += natoms * 4; // ids i32
  size += natoms; // types u8
  size = align4(size);
  size += natoms * 3 * 4; // positions f32
  if (hasBonds) size += 4 + nbonds * 2 * 4;
  if (hasProps) {
    size += 4; // nprop
    for (const [, , nameBytes] of propEntries) {
      size = align4(size + 2 + nameBytes.length); // u16 len + name, padded
      size += natoms * 4; // f32 data
    }
  }

  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  let offset = 0;

  if (hasBox) {
    for (let i = 0; i < 6; i++) view.setFloat64(offset + i * 8, frame.boxBounds?.[i] ?? 0, true);
    for (let i = 0; i < 3; i++) view.setFloat64(offset + 48 + i * 8, frame.boxTilt?.[i] ?? 0, true);
    view.setUint8(offset + 72, frame.triclinic ? 1 : 0);
    offset += FRAME_BOX_BLOCK_SIZE;
  }

  const ids = new Int32Array(buffer, offset, natoms);
  if (frame.ids && frame.ids.length >= natoms) {
    ids.set(frame.ids.subarray(0, natoms)); // bulk memcpy, not per-element
  } else {
    for (let i = 0; i < natoms; i++) ids[i] = i + 1;
  }
  offset += natoms * 4;

  const types = new Uint8Array(buffer, offset, natoms);
  for (let i = 0; i < natoms; i++) types[i] = frame.types[i] & 0xff;
  offset = align4(offset + natoms);

  const positions = new Float32Array(buffer, offset, natoms * 3);
  positions.set(frame.positions.subarray(0, natoms * 3));
  offset += natoms * 3 * 4;

  if (hasBonds) {
    view.setUint32(offset, nbonds, true);
    offset += 4;
    if (nbonds > 0) {
      new Int32Array(buffer, offset, nbonds * 2).set(frame.bonds.subarray(0, nbonds * 2));
      offset += nbonds * 2 * 4;
    }
  }

  if (hasProps) {
    view.setUint32(offset, propEntries.length, true);
    offset += 4;
    for (const [, data, nameBytes] of propEntries) {
      view.setUint16(offset, nameBytes.length, true);
      offset += 2;
      new Uint8Array(buffer, offset, nameBytes.length).set(nameBytes);
      offset = align4(offset + nameBytes.length);
      new Float32Array(buffer, offset, natoms).set(data.subarray(0, natoms));
      offset += natoms * 4;
    }
  }

  return buffer;
}

/** Serialize the frame index (one 24-byte entry per frame). */
export function writeFrameIndex(entries: FrameIndexEntry[]): ArrayBuffer {
  const buffer = new ArrayBuffer(entries.length * FRAME_ENTRY_SIZE);
  const view = new DataView(buffer);
  entries.forEach((e, i) => {
    const base = i * FRAME_ENTRY_SIZE;
    view.setBigUint64(base, e.offset, true);
    view.setUint32(base + 8, e.compressedSize, true);
    view.setUint32(base + 12, e.rawSize, true);
    view.setUint32(base + 16, e.timestep >>> 0, true);
    view.setUint32(base + 20, e.natoms, true);
  });
  return buffer;
}

export interface GlimbinEncodeResult {
  blob: Blob;
  meta: DatasetMeta;
}

export interface GlimbinWriterOptions {
  unitStyle?: number;
  /** Pre-computed flag word (e.g. from `computeGlimbinFlags` when all
   *  frames are already in hand). When omitted, layout flags are locked
   *  from the first frame added — correct for LAMMPS dumps, whose
   *  columns are constant across frames. */
  flags?: number;
  /** Override the accumulated global bounds (callers that already know
   *  them, e.g. `assembleGlimbinBlob` from a parsed Trajectory). */
  globalBounds?: { min: [number, number, number]; max: [number, number, number] };
  /** Override the accumulated atom-type list. */
  atomTypes?: number[];
}

/**
 * Incremental .glimbin encoder — accepts frames one at a time so a long
 * trajectory can be transcoded as it is parsed, holding only the frame
 * in flight. This is what makes the *initial* parse of a simulation
 * over time O(1 frame) in memory instead of O(trajectory).
 *
 * Usage:
 *   const w = new GlimbinStreamWriter();
 *   for each frame: write(w.addFrame(frame)) at the current offset;
 *   const { header, index, indexOffset, meta } = w.finalize();
 *   write `index` at indexOffset, then `header` at offset 0.
 *
 * The caller owns the byte sink (OPFS sync-access handle, Blob parts,
 * file descriptor); the writer only produces buffers and bookkeeping.
 * The header slot (first 256 bytes) is reserved up front and written
 * last, once totalFrames / bounds / index offset are known.
 */
export class GlimbinStreamWriter {
  private entries: FrameIndexEntry[] = [];
  private offset = HEADER_SIZE;
  private flags: number | null;
  private readonly unitStyle: number;
  private readonly boundsOverride?: GlimbinWriterOptions['globalBounds'];
  private readonly typesOverride?: number[];

  private boxBounds = new Float64Array(6);
  private boxTilt = new Float64Array(3);
  private triclinic = false;
  private natoms0 = 0;
  private variableAtoms = false;
  private atomTypeSet = new Set<number>();
  private min: [number, number, number] = [Infinity, Infinity, Infinity];
  private max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  constructor(opts: GlimbinWriterOptions = {}) {
    // v2 writer policy: every frame record carries its own box, so NPT /
    // deforming-cell trajectories round-trip exactly (76 bytes/frame).
    this.flags = opts.flags != null ? opts.flags | FLAG_PER_FRAME_BOX : null;
    this.unitStyle = opts.unitStyle ?? 0;
    this.boundsOverride = opts.globalBounds;
    this.typesOverride = opts.atomTypes;
  }

  get frameCount(): number {
    return this.entries.length;
  }

  /** Bytes of payload emitted so far, including the reserved header slot. */
  get bytesWritten(): number {
    return this.offset;
  }

  /** Serialize one frame; returns the record to append at `bytesWritten`
   *  (before this call). Throws if an atom type wouldn't survive the u8
   *  round-trip — the caller should fall back to a non-glimbin path. */
  addFrame(frame: Frame): ArrayBuffer {
    for (let i = 0; i < frame.natoms; i++) {
      const t = frame.types[i];
      if (!Number.isInteger(t) || t < 0 || t > 255) {
        throw new Error(`glimbin: atom type ${t} exceeds the format's u8 range`);
      }
      this.atomTypeSet.add(t);
      const x = frame.positions[i * 3];
      const y = frame.positions[i * 3 + 1];
      const z = frame.positions[i * 3 + 2];
      if (x < this.min[0]) this.min[0] = x;
      if (y < this.min[1]) this.min[1] = y;
      if (z < this.min[2]) this.min[2] = z;
      if (x > this.max[0]) this.max[0] = x;
      if (y > this.max[1]) this.max[1] = y;
      if (z > this.max[2]) this.max[2] = z;
    }

    if (this.entries.length === 0) {
      // Lock layout flags and the file-level box from the first frame.
      if (this.flags === null) this.flags = computeGlimbinFlags([frame]) | FLAG_PER_FRAME_BOX;
      if (frame.boxBounds) this.boxBounds.set(frame.boxBounds.subarray(0, 6));
      if (frame.boxTilt) this.boxTilt.set(frame.boxTilt.subarray(0, 3));
      this.triclinic = frame.triclinic ?? false;
      this.natoms0 = frame.natoms;
    } else if (frame.natoms !== this.natoms0) {
      this.variableAtoms = true;
    }

    const buf = writeFrameData(frame, this.flags!);
    this.entries.push({
      offset: BigInt(this.offset),
      compressedSize: buf.byteLength,
      rawSize: buf.byteLength,
      timestep: frame.timestep >>> 0,
      natoms: frame.natoms,
    });
    this.offset += buf.byteLength;
    return buf;
  }

  finalize(): {
    header: ArrayBuffer;
    index: ArrayBuffer;
    /** Byte offset at which `index` must land (== payload end). */
    indexOffset: number;
    meta: DatasetMeta;
  } {
    if (this.entries.length === 0) {
      throw new Error('GlimbinStreamWriter.finalize: no frames added');
    }
    const flags =
      (this.flags ?? FLAG_LITTLE_ENDIAN) | (this.variableAtoms ? FLAG_VARIABLE_ATOMS : 0);
    const atomsPerFrame = this.variableAtoms ? 0 : this.natoms0;
    const globalBounds = this.boundsOverride ?? { min: [...this.min], max: [...this.max] };
    const atomTypes =
      this.typesOverride ?? Array.from(this.atomTypeSet).sort((a, b) => a - b);
    const indexOffset = this.offset;

    const header = writeHeader({
      version: GLIMBIN_VERSION,
      flags,
      totalFrames: this.entries.length,
      atomsPerFrame,
      atomTypes: atomTypes.slice(0, 32),
      globalBounds,
      boxBounds: this.boxBounds,
      boxTilt: this.boxTilt,
      triclinic: this.triclinic,
      unitStyle: this.unitStyle,
      frameIndexOffset: BigInt(indexOffset),
    });
    const index = writeFrameIndex(this.entries);

    const meta: DatasetMeta = {
      totalFrames: this.entries.length,
      atomsPerFrame,
      atomTypes,
      globalBounds,
      boxBounds: this.boxBounds,
      boxTilt: this.boxTilt,
      triclinic: this.triclinic,
      compressed: false,
      hasBonds: (flags & FLAG_HAS_BONDS) !== 0,
      hasProperties: (flags & FLAG_HAS_PROPERTIES) !== 0,
      fileSize: indexOffset + index.byteLength,
      timesteps: this.entries.map((e) => e.timestep),
    };

    return { header, index, indexOffset, meta };
  }
}

/**
 * Assemble a whole trajectory into an uncompressed .glimbin Blob:
 * `[header | frame0 | frame1 | … | frameIndex]`. Returns the Blob plus
 * the `DatasetMeta` a reader would derive, so callers can hydrate UI
 * without a re-parse.
 *
 * Box bounds/tilt are taken from frame 0 — the format carries a single
 * file-level box (same as the remote fixtures). Trajectories whose cell
 * varies per frame (NPT) keep the cell wireframe of frame 0; positions,
 * which is what playback renders, are exact per frame.
 *
 * Convenience wrapper over `GlimbinStreamWriter` for callers that already
 * hold every frame; streaming callers (the transcode worker) drive the
 * writer directly and never materialize the whole file.
 */
export function assembleGlimbinBlob(
  trajectory: Trajectory,
  opts: { unitStyle?: number } = {},
): GlimbinEncodeResult {
  const frames = trajectory.frames.filter(Boolean);
  if (frames.length === 0) throw new Error('assembleGlimbinBlob: trajectory has no frames');

  const writer = new GlimbinStreamWriter({
    unitStyle: opts.unitStyle,
    flags: computeGlimbinFlags(frames),
    globalBounds: trajectory.globalBounds,
    atomTypes: trajectory.atomTypes,
  });

  const frameBuffers: ArrayBuffer[] = [];
  for (const frame of frames) frameBuffers.push(writer.addFrame(frame));
  const { header, index, meta } = writer.finalize();

  const blob = new Blob([header, ...frameBuffers, index], {
    type: 'application/octet-stream',
  });
  return { blob, meta: { ...meta, fileSize: blob.size } };
}
