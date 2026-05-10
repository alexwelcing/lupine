// ═══════════════════════════════════════════════════════════════════
// glimPSE — .glimbin Binary Format Constants & Parsers
//
// Chunked binary format optimized for HTTP Range Requests and
// direct-to-GPU buffer upload. Enables streaming of multi-GB
// trajectory files without loading the entire dataset into memory.
// ═══════════════════════════════════════════════════════════════════

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
