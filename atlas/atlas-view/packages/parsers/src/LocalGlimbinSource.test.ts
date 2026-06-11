import { describe, it, expect } from 'vitest';
import { assembleGlimbinBlob } from '@atlas/core/glimbin';
import type { Frame, Trajectory } from '@atlas/core/types';
import { LocalGlimbinSource, isGlimbinBlob } from './LocalGlimbinSource';

function makeFrame(timestep: number, natoms: number, base: number): Frame {
  const ids = new Int32Array(natoms);
  const types = new Int32Array(natoms);
  const positions = new Float32Array(natoms * 3);
  for (let i = 0; i < natoms; i++) {
    ids[i] = i + 1;
    types[i] = (i % 2) + 1;
    positions[i * 3] = base + i;
    positions[i * 3 + 1] = base + i;
    positions[i * 3 + 2] = base + i;
  }
  return {
    timestep,
    natoms,
    boxBounds: new Float64Array([0, 10, 0, 10, 0, 10]),
    boxTilt: new Float64Array([0, 0, 0]),
    triclinic: false,
    columns: ['id', 'type', 'x', 'y', 'z'],
    ids,
    types,
    positions,
    bonds: new Int32Array(0),
    properties: new Map(),
  };
}

function makeTrajectory(): Trajectory {
  const frames = [makeFrame(0, 6, 0), makeFrame(10, 6, 1), makeFrame(20, 6, 2), makeFrame(30, 6, 3)];
  return {
    frames,
    totalFrames: frames.length,
    atomTypes: [1, 2],
    globalBounds: { min: [0, 0, 0], max: [10, 10, 10] },
  };
}

describe('LocalGlimbinSource', () => {
  it('detects glimbin magic bytes', async () => {
    const { blob } = assembleGlimbinBlob(makeTrajectory());
    expect(await isGlimbinBlob(blob)).toBe(true);
    expect(await isGlimbinBlob(new Blob(['not a glimbin']))).toBe(false);
  });

  it('opens metadata and reads every frame back from a Blob', async () => {
    const traj = makeTrajectory();
    const { blob } = assembleGlimbinBlob(traj);

    const source = new LocalGlimbinSource(blob);
    const meta = await source.open();
    expect(meta.totalFrames).toBe(4);
    expect(meta.atomsPerFrame).toBe(6);

    for (let fi = 0; fi < traj.totalFrames; fi++) {
      const frame = await source.fetchFrame(fi);
      expect(frame.natoms).toBe(6);
      expect(frame.timestep).toBe(traj.frames[fi].timestep);
      expect(Array.from(frame.positions)).toEqual(Array.from(traj.frames[fi].positions));
      expect(Array.from(frame.types)).toEqual(Array.from(traj.frames[fi].types));
    }
    source.dispose();
  });

  it('serves repeated reads from cache and rejects out-of-range frames', async () => {
    const { blob } = assembleGlimbinBlob(makeTrajectory());
    const source = new LocalGlimbinSource(blob);
    await source.open();

    const a = await source.fetchFrame(2);
    const b = await source.fetchFrame(2);
    expect(b).toBe(a); // same cached object reference
    expect(source.isCached(2)).toBe(true);

    await expect(source.fetchFrame(99)).rejects.toThrow(/out of range/);
  });

  it('throws a clear error when the blob is not a glimbin file', async () => {
    const source = new LocalGlimbinSource(new Blob([new Uint8Array(8)]));
    await expect(source.open()).rejects.toThrow();
  });
});
