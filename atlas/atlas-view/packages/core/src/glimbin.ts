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

/** Current format version */
export const GLIMBIN_VERSION = 1;

/** Fixed header size in bytes */
export const HEADER_SIZE = 256;

/** Size of each frame index entry in bytes */
export const FRAME_ENTRY_SIZE = 24;

// ─── Flags ──────────────────────────────────────────────────────────

export const FLAG_COMPRESSED   = 0x0001; // Frame data is zstd-compressed
export const FLAG_LITTLE_ENDIAN = 0x0002; // Data is little-endian (default)
export const FLAG_VARIABLE_ATOMS = 0x0004; // Atom count varies per frame
export const FLAG_HAS_BONDS    = 0x0008; // Frames include bond data
export const FLAG_HAS_PROPERTIES = 0x0010; // Frames include per-atom properties

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
} {
  let offset = 0;
  const view = new DataView(buffer);

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

  return { ids, types, positions, bonds, properties };
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

  const propEntries: Array<[string, Float32Array, Uint8Array]> = [];
  if (hasProps && frame.properties) {
    for (const [name, data] of frame.properties) {
      propEntries.push([name, data, new TextEncoder().encode(name)]);
    }
  }
  const nbonds = hasBonds ? ((frame.bonds?.length ?? 0) >> 1) : 0;

  // ── Size pass (mirrors the reader's offset walk exactly) ──
  let size = natoms * 4; // ids i32
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

  const ids = new Int32Array(buffer, offset, natoms);
  for (let i = 0; i < natoms; i++) ids[i] = frame.ids?.[i] ?? i + 1;
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
 * This buffers every frame once to build the Blob. That bounds *steady
 * state* memory — once persisted, frames are read back on demand instead
 * of all living in the store — and is the substrate the local library +
 * eventual cloud sync read from.
 */
export function assembleGlimbinBlob(
  trajectory: Trajectory,
  opts: { unitStyle?: number } = {},
): GlimbinEncodeResult {
  const frames = trajectory.frames.filter(Boolean);
  if (frames.length === 0) throw new Error('assembleGlimbinBlob: trajectory has no frames');

  const flags = computeGlimbinFlags(frames);
  const variableAtoms = (flags & FLAG_VARIABLE_ATOMS) !== 0;

  const frameBuffers: ArrayBuffer[] = [];
  const entries: FrameIndexEntry[] = [];
  let offset = HEADER_SIZE;
  for (const frame of frames) {
    const buf = writeFrameData(frame, flags);
    frameBuffers.push(buf);
    entries.push({
      offset: BigInt(offset),
      compressedSize: buf.byteLength,
      rawSize: buf.byteLength,
      timestep: frame.timestep >>> 0,
      natoms: frame.natoms,
    });
    offset += buf.byteLength;
  }
  const frameIndexOffset = offset;

  const boxBounds = frames[0].boxBounds ?? new Float64Array(6);
  const boxTilt = frames[0].boxTilt ?? new Float64Array(3);
  const atomTypes = trajectory.atomTypes.slice(0, 32);

  const header = writeHeader({
    version: GLIMBIN_VERSION,
    flags,
    totalFrames: frames.length,
    atomsPerFrame: variableAtoms ? 0 : frames[0].natoms,
    atomTypes,
    globalBounds: trajectory.globalBounds,
    boxBounds,
    boxTilt,
    triclinic: frames[0].triclinic ?? false,
    unitStyle: opts.unitStyle ?? 0,
    frameIndexOffset: BigInt(frameIndexOffset),
  });

  const indexBuffer = writeFrameIndex(entries);
  const blob = new Blob([header, ...frameBuffers, indexBuffer], {
    type: 'application/octet-stream',
  });

  const meta: DatasetMeta = {
    totalFrames: frames.length,
    atomsPerFrame: variableAtoms ? 0 : frames[0].natoms,
    atomTypes: trajectory.atomTypes,
    globalBounds: trajectory.globalBounds,
    boxBounds,
    boxTilt,
    triclinic: frames[0].triclinic ?? false,
    compressed: false,
    hasBonds: (flags & FLAG_HAS_BONDS) !== 0,
    hasProperties: (flags & FLAG_HAS_PROPERTIES) !== 0,
    fileSize: blob.size,
    timesteps: frames.map((f) => f.timestep >>> 0),
  };

  return { blob, meta };
}
