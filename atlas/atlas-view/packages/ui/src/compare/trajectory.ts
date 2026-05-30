// Comparison Theater data — built as REAL @atlas/core Frames so the genuine
// impostor engine (AtomsOptimized) renders them. One strained FCC nanocrystal
// relaxed three ways (baseline / distill / distill+accelerate): identical start
// (pos0) and equilibrium (eq), different decay schedule. Each frame carries a
// per-atom "residual" property (distance still to travel, normalized to [0,1])
// so AtomsOptimized's property colormode paints the cooling directly.

import type { ColormapName, Frame, Trajectory } from '@atlas/core';

export interface Variant {
  id: string;
  title: string;
  badge: string;
  accent: string;
  colormap: ColormapName;
  floor: number; // residual factor it settles to (accuracy)
  convergeAt: number; // fraction of timeline to reach ~floor (speed)
  decay: (f: number) => number; // residual factor 1 -> floor (for the HUD)
  trajectory: Trajectory;
}

const N_FRAMES = 80;
const N_CELLS = 4;
const A = 2.0;
const RADIUS_TYPE = 1; // single element (Ni)

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FCC_BASIS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [0.5, 0.5, 0],
  [0.5, 0, 0.5],
  [0, 0.5, 0.5],
];

function buildLattice(): { eq: Float32Array; count: number; half: number } {
  const pos: number[] = [];
  const half = (N_CELLS * A) / 2;
  for (let i = 0; i < N_CELLS; i++)
    for (let j = 0; j < N_CELLS; j++)
      for (let k = 0; k < N_CELLS; k++)
        for (const [bx, by, bz] of FCC_BASIS)
          pos.push((i + bx) * A - half, (j + by) * A - half, (k + bz) * A - half);
  return { eq: new Float32Array(pos), count: pos.length / 3, half };
}

function strain(eq: Float32Array, count: number, half: number): { pos0: Float32Array; scale: number } {
  const rng = mulberry32(1337);
  const pos0 = new Float32Array(eq.length);
  const shear = 0.16;
  const breathe = 1.07;
  const thermal = 0.22 * half * 0.18;
  let maxDisp = 1e-6;
  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const x = eq[ix], y = eq[ix + 1], z = eq[ix + 2];
    const r = Math.sqrt(x * x + y * y + z * z) / (half * Math.sqrt(3));
    const w = 0.4 + 0.6 * r;
    pos0[ix] = (x + shear * y) * breathe + (rng() - 0.5) * 2 * thermal * w;
    pos0[ix + 1] = (y + shear * z) * breathe + (rng() - 0.5) * 2 * thermal * w;
    pos0[ix + 2] = (z + shear * x) * breathe + (rng() - 0.5) * 2 * thermal * w;
    const dx = pos0[ix] - x, dy = pos0[ix + 1] - y, dz = pos0[ix + 2] - z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > maxDisp) maxDisp = d;
  }
  return { pos0, scale: maxDisp };
}

function buildTrajectory(
  eq: Float32Array,
  pos0: Float32Array,
  count: number,
  half: number,
  scale: number,
  decay: (f: number) => number,
): Trajectory {
  const frames: Frame[] = [];
  const ids = new Int32Array(count);
  const types = new Int32Array(count).fill(RADIUS_TYPE);
  for (let i = 0; i < count; i++) ids[i] = i;
  const m = half + 2;
  for (let k = 0; k < N_FRAMES; k++) {
    const factor = decay(k / (N_FRAMES - 1));
    const positions = new Float32Array(count * 3);
    const residual = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const dx = pos0[ix] - eq[ix], dy = pos0[ix + 1] - eq[ix + 1], dz = pos0[ix + 2] - eq[ix + 2];
      positions[ix] = eq[ix] + dx * factor;
      positions[ix + 1] = eq[ix + 1] + dy * factor;
      positions[ix + 2] = eq[ix + 2] + dz * factor;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) * factor;
      residual[i] = Math.min(1, d / scale);
    }
    frames.push({
      timestep: k,
      natoms: count,
      boxBounds: new Float64Array([-m, m, -m, m, -m, m]),
      boxTilt: new Float64Array([0, 0, 0]),
      triclinic: false,
      columns: ['id', 'type', 'x', 'y', 'z', 'residual'],
      ids,
      types,
      positions,
      bonds: new Int32Array(0),
      properties: new Map([['residual', residual]]),
    });
  }
  return {
    frames,
    totalFrames: N_FRAMES,
    atomTypes: [RADIUS_TYPE],
    globalBounds: { min: [-m, -m, -m], max: [m, m, m] },
  };
}

function expDecay(floor: number, k: number): (f: number) => number {
  return (f: number) => floor + (1 - floor) * Math.exp(-k * Math.max(0, f));
}

function variant(
  spec: Omit<Variant, 'trajectory' | 'decay'> & { k: number },
  eq: Float32Array, pos0: Float32Array, count: number, half: number, scale: number,
): Variant {
  const decay = expDecay(spec.floor, spec.k);
  return {
    id: spec.id, title: spec.title, badge: spec.badge, accent: spec.accent,
    colormap: spec.colormap, floor: spec.floor, convergeAt: spec.convergeAt, decay,
    trajectory: buildTrajectory(eq, pos0, count, half, scale, decay),
  };
}

export function makeVariants(): Variant[] {
  const { eq, count, half } = buildLattice();
  const { pos0, scale } = strain(eq, count, half);
  const v = (s: Omit<Variant, 'trajectory' | 'decay'> & { k: number }) => variant(s, eq, pos0, count, half, scale);
  return [
    v({ id: 'baseline', title: 'MACE-MP-0 baseline', badge: 'foundation MLIP', accent: '#8A8AA0', colormap: 'inferno', floor: 0.2, convergeAt: Math.log(20) / 3.0, k: 3.0 }),
    v({ id: 'distill', title: '+ Lupine distill', badge: 'post-hoc ribbon', accent: '#7B5CFF', colormap: 'inferno', floor: 0.06, convergeAt: Math.log(20) / 4.8, k: 4.8 }),
    v({ id: 'accelerate', title: '+ distill · accelerate', badge: '5–7× throughput', accent: '#00E5FF', colormap: 'inferno', floor: 0.05, convergeAt: Math.log(20) / 12.0, k: 12.0 }),
  ];
}
