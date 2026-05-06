// ═══════════════════════════════════════════════════════════════════
// Test Utilities — Mock Data Generators
// Use these to create consistent test data for atoms, bonds, frames.
// ═══════════════════════════════════════════════════════════════════

import type { Frame, Trajectory, BondStats } from './types';

/** Create a minimal Frame with N atoms in a cubic box */
export function createMockFrame(opts: {
  natoms?: number;
  types?: number[];
  positions?: Float32Array;
  bonds?: Int32Array;
  timestep?: number;
  boxSize?: number;
} = {}): Frame {
  const natoms = opts.natoms ?? 4;
  const boxSize = opts.boxSize ?? 10;

  // Default: simple cubic lattice
  const positions = opts.positions ?? new Float32Array(
    Array.from({ length: natoms * 3 }, (_, i) => {
      const atom = Math.floor(i / 3);
      const dim = i % 3;
      // Place atoms on a grid
      const side = Math.ceil(Math.pow(natoms, 1 / 3));
      const x = atom % side;
      const y = Math.floor(atom / side) % side;
      const z = Math.floor(atom / (side * side));
      return [x, y, z][dim] * (boxSize / side);
    })
  );

  const types = opts.types
    ? (Array.isArray(opts.types) ? new Int32Array(opts.types) : opts.types)
    : new Int32Array(Array.from({ length: natoms }, (_, i) => (i % 2) + 1));

  return {
    timestep: opts.timestep ?? 0,
    natoms,
    boxBounds: new Float64Array([0, boxSize, 0, boxSize, 0, boxSize]),
    boxTilt: new Float64Array([0, 0, 0]),
    triclinic: false,
    columns: ['id', 'type', 'x', 'y', 'z'],
    ids: new Int32Array(Array.from({ length: natoms }, (_, i) => i + 1)) as Int32Array,
    types,
    positions,
    bonds: opts.bonds ?? new Int32Array(0),
    properties: new Map(),
  };
}

/** Create a Trajectory with one or more frames */
export function createMockTrajectory(frameCount = 1, natoms = 4): Trajectory {
  const frames: Frame[] = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push(createMockFrame({ natoms, timestep: i * 100 }));
  }
  return {
    frames,
    totalFrames: frameCount,
    atomTypes: [1, 2],
    globalBounds: {
      min: [0, 0, 0],
      max: [10, 10, 10],
    },
  };
}

/** Create realistic BondStats for testing UI panels */
export function createMockBondStats(opts: {
  count?: number;
  minLength?: number;
  maxLength?: number;
  meanLength?: number;
  medianLength?: number;
  stdDev?: number;
  bondLengthHistogramFirstMinimum?: number | null;
} = {}): BondStats {
  const count = opts.count ?? 100;
  const minLength = opts.minLength ?? 1.0;
  const maxLength = opts.maxLength ?? 4.0;
  const meanLength = opts.meanLength ?? 2.5;
  const stdDev = opts.stdDev ?? 0.5;

  const bins = Array.from({ length: 30 }, () => Math.floor(Math.random() * count / 10));
  const binEdges = Array.from({ length: 31 }, (_, i) => minLength + (i * (maxLength - minLength)) / 30);

  const percentiles: Record<string, number> = {};
  for (let p = 0; p <= 100; p += 5) {
    percentiles[`p${p}`] = minLength + (p / 100) * (maxLength - minLength);
  }

  return {
    count,
    minLength,
    maxLength,
    meanLength,
    medianLength: opts.medianLength ?? meanLength,
    stdDev,
    histogram: { bins, binEdges },
    percentiles,
    typePairCounts: { '1-1': 30, '1-2': 50, '2-2': 20 },
    typePairMeans: { '1-1': 2.3, '1-2': 2.5, '2-2': 2.7 },
    bondLengthHistogramFirstMinimum: opts.bondLengthHistogramFirstMinimum ?? 3.2,
  };
}
