import { describe, it, expect } from 'vitest';
import {
  assembleGlimbinBlob,
  canEncodeGlimbin,
  computeGlimbinFlags,
  writeFrameData,
  GlimbinStreamWriter,
  parseHeader,
  parseFrameIndex,
  parseFrameData,
  HEADER_SIZE,
  FRAME_ENTRY_SIZE,
  FLAG_HAS_BONDS,
  FLAG_HAS_PROPERTIES,
  FLAG_VARIABLE_ATOMS,
} from './glimbin';
import type { Frame, Trajectory } from './types';

function makeFrame(opts: {
  timestep: number;
  natoms: number;
  base?: number;
  withProps?: boolean;
  withBonds?: boolean;
}): Frame {
  const { timestep, natoms, base = 0, withProps = false, withBonds = false } = opts;
  const ids = new Int32Array(natoms);
  const types = new Int32Array(natoms);
  const positions = new Float32Array(natoms * 3);
  for (let i = 0; i < natoms; i++) {
    ids[i] = i + 1;
    types[i] = (i % 3) + 1;
    positions[i * 3] = base + i;
    positions[i * 3 + 1] = base + i + 0.5;
    positions[i * 3 + 2] = base + i + 0.25;
  }
  const properties = new Map<string, Float32Array>();
  if (withProps) {
    const energy = new Float32Array(natoms);
    for (let i = 0; i < natoms; i++) energy[i] = i * 0.1 + timestep;
    properties.set('energy', energy);
  }
  return {
    timestep,
    natoms,
    boxBounds: new Float64Array([0, 10, 0, 20, 0, 30]),
    boxTilt: new Float64Array([0, 0, 0]),
    triclinic: false,
    columns: ['id', 'type', 'x', 'y', 'z'],
    ids,
    types,
    positions,
    bonds: withBonds ? new Int32Array([0, 1, 1, 2]) : new Int32Array(0),
    properties,
  };
}

function makeTrajectory(frames: Frame[]): Trajectory {
  return {
    frames,
    totalFrames: frames.length,
    atomTypes: [1, 2, 3],
    globalBounds: { min: [0, 0, 0], max: [10, 20, 30] },
  };
}

async function decodeAllFrames(blob: Blob) {
  const headerBuf = await blob.slice(0, HEADER_SIZE).arrayBuffer();
  const header = parseHeader(headerBuf);
  const indexStart = Number(header.frameIndexOffset);
  const indexBuf = await blob
    .slice(indexStart, indexStart + header.totalFrames * FRAME_ENTRY_SIZE)
    .arrayBuffer();
  const index = parseFrameIndex(indexBuf, header.totalFrames);
  const frames = [];
  for (const entry of index.entries) {
    const start = Number(entry.offset);
    const buf = await blob.slice(start, start + entry.compressedSize).arrayBuffer();
    frames.push(parseFrameData(buf, entry.natoms, header.flags));
  }
  return { header, index, frames };
}

describe('glimbin encoder round-trip', () => {
  it('round-trips a simple multi-frame trajectory', async () => {
    const traj = makeTrajectory([
      makeFrame({ timestep: 0, natoms: 5 }),
      makeFrame({ timestep: 100, natoms: 5, base: 1 }),
      makeFrame({ timestep: 200, natoms: 5, base: 2 }),
    ]);
    const { blob, meta } = assembleGlimbinBlob(traj);
    expect(meta.totalFrames).toBe(3);
    expect(meta.atomsPerFrame).toBe(5);

    const { header, frames } = await decodeAllFrames(blob);
    expect(header.totalFrames).toBe(3);
    expect(frames).toHaveLength(3);

    for (let fi = 0; fi < 3; fi++) {
      const original = traj.frames[fi];
      const decoded = frames[fi];
      expect(Array.from(decoded.ids)).toEqual(Array.from(original.ids));
      expect(Array.from(decoded.types)).toEqual(Array.from(original.types));
      expect(Array.from(decoded.positions)).toEqual(Array.from(original.positions));
    }
  });

  it('preserves per-atom properties and bonds when present', async () => {
    const traj = makeTrajectory([
      makeFrame({ timestep: 0, natoms: 4, withProps: true, withBonds: true }),
      makeFrame({ timestep: 50, natoms: 4, base: 3, withProps: true, withBonds: true }),
    ]);
    const flags = computeGlimbinFlags(traj.frames);
    expect(flags & FLAG_HAS_PROPERTIES).toBeTruthy();
    expect(flags & FLAG_HAS_BONDS).toBeTruthy();

    const { blob } = assembleGlimbinBlob(traj);
    const { frames } = await decodeAllFrames(blob);
    expect(Array.from(frames[0].bonds)).toEqual([0, 1, 1, 2]);
    expect(frames[0].properties.has('energy')).toBe(true);
    expect(Array.from(frames[1].properties.get('energy')!)).toEqual(
      Array.from(traj.frames[1].properties.get('energy')!),
    );
  });

  it('flags variable atom counts and indexes per-frame natoms', async () => {
    const traj = makeTrajectory([
      makeFrame({ timestep: 0, natoms: 5 }),
      makeFrame({ timestep: 10, natoms: 7, base: 1 }),
    ]);
    traj.atomTypes = [1, 2, 3];
    const flags = computeGlimbinFlags(traj.frames);
    expect(flags & FLAG_VARIABLE_ATOMS).toBeTruthy();

    const { blob, meta } = assembleGlimbinBlob(traj);
    expect(meta.atomsPerFrame).toBe(0);
    const { index, frames } = await decodeAllFrames(blob);
    expect(index.entries[0].natoms).toBe(5);
    expect(index.entries[1].natoms).toBe(7);
    expect(frames[1].positions).toHaveLength(7 * 3);
  });

  it('rejects trajectories with atom type ids that exceed a byte', () => {
    const bad = makeFrame({ timestep: 0, natoms: 2 });
    bad.types = new Int32Array([1, 300]);
    expect(canEncodeGlimbin([bad])).toBe(false);
    const good = makeFrame({ timestep: 0, natoms: 2 });
    expect(canEncodeGlimbin([good])).toBe(true);
  });

  it('writeFrameData produces a 4-byte-aligned record', () => {
    const frame = makeFrame({ timestep: 0, natoms: 3, withProps: true });
    const buf = writeFrameData(frame, FLAG_HAS_PROPERTIES);
    expect(buf.byteLength % 4).toBe(0);
  });
});

describe('GlimbinStreamWriter (incremental encode)', () => {
  it('produces the same bytes as assembleGlimbinBlob given matching metadata', async () => {
    const frames = [
      makeFrame({ timestep: 0, natoms: 5 }),
      makeFrame({ timestep: 100, natoms: 5, base: 1 }),
      makeFrame({ timestep: 200, natoms: 5, base: 2 }),
    ];
    const traj = makeTrajectory(frames);

    // Reference: the batch encoder (which feeds the writer the trajectory's
    // declared bounds + types).
    const reference = await assembleGlimbinBlob(traj).blob.arrayBuffer();

    // Incremental: same overrides, frames fed one at a time.
    const writer = new GlimbinStreamWriter({
      globalBounds: traj.globalBounds,
      atomTypes: traj.atomTypes,
    });
    const recs = frames.map((f) => writer.addFrame(f));
    const { header, index, indexOffset } = writer.finalize();
    const streamed = await new Blob([header, ...recs, index]).arrayBuffer();

    expect(streamed.byteLength).toBe(reference.byteLength);
    expect(new Uint8Array(streamed)).toEqual(new Uint8Array(reference));
    expect(indexOffset).toBe(HEADER_SIZE + recs.reduce((s, r) => s + r.byteLength, 0));
  });

  it('accumulates global bounds and atom types from the frames themselves', () => {
    // No overrides: bounds/types must come from the positions/types fed in.
    const frames = [
      makeFrame({ timestep: 0, natoms: 4, base: 5 }),
      makeFrame({ timestep: 1, natoms: 4, base: -3 }),
    ];
    const writer = new GlimbinStreamWriter();
    frames.forEach((f) => writer.addFrame(f));
    const { meta } = writer.finalize();
    expect(meta.totalFrames).toBe(2);
    // base -3 frame has the smallest x (= -3); base 5 frame the largest.
    expect(meta.globalBounds.min[0]).toBe(-3);
    expect(meta.globalBounds.max[0]).toBe(5 + 3); // base 5, atom index 3
    expect(meta.atomTypes).toEqual([1, 2, 3]);
  });

  it('decodes back through the standard reader', async () => {
    const frames = [
      makeFrame({ timestep: 0, natoms: 4, withProps: true, withBonds: true }),
      makeFrame({ timestep: 9, natoms: 6, base: 2, withProps: true, withBonds: true }),
    ];
    const writer = new GlimbinStreamWriter();
    const recs = frames.map((f) => writer.addFrame(f));
    const { header, index, meta } = writer.finalize();
    const blob = new Blob([header, ...recs, index]);

    // Variable atom count must be detected from the frames themselves.
    expect(meta.atomsPerFrame).toBe(0);
    const { header: h, frames: decoded } = await decodeAllFrames(blob);
    expect(h.totalFrames).toBe(2);
    expect(decoded[1].positions).toHaveLength(6 * 3);
    expect(Array.from(decoded[0].positions)).toEqual(Array.from(frames[0].positions));
  });

  it('rejects an out-of-range atom type when adding a frame', () => {
    const writer = new GlimbinStreamWriter();
    const bad = makeFrame({ timestep: 0, natoms: 2 });
    bad.types = new Int32Array([1, 999]);
    expect(() => writer.addFrame(bad)).toThrow(/u8 range/);
  });
});
