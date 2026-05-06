/**
 * Synthetic bond-detection fixtures covering the edge cases that have
 * historically broken either the CPU spatial hash or the GPU compute path.
 *
 * Each fixture is self-describing: name + input + a sketch of what the
 * test should check. We don't hard-code expected pair sets here because
 * the brute-force reference is what we trust — fixtures are inputs, the
 * reference is the oracle.
 */

import type { BondDetectInput } from '../bondDetectCpu';

export interface BondFixture {
  name: string;
  /** Why this case matters — the bug class it guards against. */
  rationale: string;
  input: BondDetectInput;
  /** Optional minimum/maximum expected count, for sanity. */
  expectMinCount?: number;
  expectMaxCount?: number;
}

// Element-type 0 maps to a generic atom with covalent radius ~1.0 Å.
// We use simple radii so test bond cutoffs are predictable.
const SIMPLE_RADII = new Float32Array([1.0, 0.5, 1.2, 0.8, 0.6]); // types 0..4

function makePositions(coords: number[][]): Float32Array {
  const out = new Float32Array(coords.length * 3);
  for (let i = 0; i < coords.length; i++) {
    out[i * 3] = coords[i][0];
    out[i * 3 + 1] = coords[i][1];
    out[i * 3 + 2] = coords[i][2];
  }
  return out;
}

function makeTypes(values: number[]): Int32Array {
  return new Int32Array(values);
}

export const BOND_FIXTURES: BondFixture[] = [
  {
    name: 'empty',
    rationale: 'Degenerate input — must not crash, must return zero bonds.',
    input: {
      positions: new Float32Array(0),
      types: new Int32Array(0),
      natoms: 0,
      maxBondLength: 3.2,
      covalentRadii: SIMPLE_RADII,
    },
    expectMinCount: 0,
    expectMaxCount: 0,
  },
  {
    name: 'single atom',
    rationale: 'No bonds possible with one atom.',
    input: {
      positions: makePositions([[0, 0, 0]]),
      types: makeTypes([0]),
      natoms: 1,
      maxBondLength: 3.2,
      covalentRadii: SIMPLE_RADII,
    },
    expectMinCount: 0,
    expectMaxCount: 0,
  },
  {
    name: 'two atoms within cutoff',
    rationale: 'Smallest case that produces a bond. Element-aware threshold is r0+r0+tol = 1.0+1.0+0.45 = 2.45 Å.',
    input: {
      positions: makePositions([[0, 0, 0], [2.0, 0, 0]]),
      types: makeTypes([0, 0]),
      natoms: 2,
      maxBondLength: 3.2,
      covalentRadii: SIMPLE_RADII,
      tolerance: 0.45,
    },
    expectMinCount: 1,
    expectMaxCount: 1,
  },
  {
    name: 'two atoms beyond cutoff',
    rationale: 'Negative case — must not produce a bond.',
    input: {
      positions: makePositions([[0, 0, 0], [3.0, 0, 0]]),
      types: makeTypes([0, 0]),
      natoms: 2,
      maxBondLength: 3.2,
      covalentRadii: SIMPLE_RADII,
      tolerance: 0.45,
    },
    expectMinCount: 0,
    expectMaxCount: 0,
  },
  {
    name: 'linear chain in positive coords',
    rationale: 'Five atoms 1.5 Å apart along x — expect a chain of 4 bonds.',
    input: {
      positions: makePositions([[0, 0, 0], [1.5, 0, 0], [3.0, 0, 0], [4.5, 0, 0], [6.0, 0, 0]]),
      types: makeTypes([0, 0, 0, 0, 0]),
      natoms: 5,
      maxBondLength: 3.2,
      covalentRadii: SIMPLE_RADII,
      tolerance: 0.45,
    },
    expectMinCount: 4,
    expectMaxCount: 4,
  },
  {
    name: 'linear chain in negative coords',
    rationale: 'Same chain, translated to negative octant. Must produce identical bond count to the positive-coord case — guards against the WGSL bug where negative cells were dropped.',
    input: {
      positions: makePositions([[-10, -10, -10], [-8.5, -10, -10], [-7, -10, -10], [-5.5, -10, -10], [-4, -10, -10]]),
      types: makeTypes([0, 0, 0, 0, 0]),
      natoms: 5,
      maxBondLength: 3.2,
      covalentRadii: SIMPLE_RADII,
      tolerance: 0.45,
    },
    expectMinCount: 4,
    expectMaxCount: 4,
  },
  {
    name: 'chain straddling origin',
    rationale: 'Atoms on both sides of the coordinate origin — exercises the cell-index translation in the spatial hash and the WGSL origin offset.',
    input: {
      positions: makePositions([[-3, 0, 0], [-1.5, 0, 0], [0, 0, 0], [1.5, 0, 0], [3, 0, 0]]),
      types: makeTypes([0, 0, 0, 0, 0]),
      natoms: 5,
      maxBondLength: 3.2,
      covalentRadii: SIMPLE_RADII,
      tolerance: 0.45,
    },
    expectMinCount: 4,
    expectMaxCount: 4,
  },
  {
    name: 'mixed types',
    rationale: 'Different covalent radii — pair acceptance must use the per-pair sum, not a single global cutoff.',
    input: {
      positions: makePositions([[0, 0, 0], [1.4, 0, 0], [2.9, 0, 0]]),
      types: makeTypes([1, 1, 0]), // r=0.5,0.5,1.0; cutoffs: 0.5+0.5+0.45=1.45, 0.5+1.0+0.45=1.95
      natoms: 3,
      maxBondLength: 3.2,
      covalentRadii: SIMPLE_RADII,
      tolerance: 0.45,
    },
    // 0-1 distance 1.4 ≤ 1.45 ✓
    // 1-2 distance 1.5 < 1.95 ✓
    // 0-2 distance 2.9 > 1.45 (using min of cutoffs) — element-aware uses r0+r2+tol=2.45, 2.9 > 2.45 ✗
    expectMinCount: 2,
    expectMaxCount: 2,
  },
  {
    name: 'cubic lattice 4x4x4',
    rationale: 'Dense grid — exercises the 3×3×3 neighbor scan and atomic counter increments. 64 atoms, lattice spacing 1.5 Å.',
    input: (() => {
      const coords: number[][] = [];
      for (let x = 0; x < 4; x++)
        for (let y = 0; y < 4; y++)
          for (let z = 0; z < 4; z++)
            coords.push([x * 1.5, y * 1.5, z * 1.5]);
      return {
        positions: makePositions(coords),
        types: makeTypes(new Array(64).fill(0)),
        natoms: 64,
        maxBondLength: 3.2,
        covalentRadii: SIMPLE_RADII,
        tolerance: 0.45,
      };
    })(),
    // Each interior atom has 6 nearest neighbors at 1.5 Å, but with cutoff
    // 2.45 Å diagonals (~2.12 Å) also bond. Bond count is non-trivial; we
    // just sanity-check >= the simple 6-coordinate count.
    expectMinCount: 100,
  },
  {
    name: 'sparse box',
    rationale: 'Few atoms in a large box — for the GPU pipeline, the cellSize must coarsen so the 32-cell grid still spans the box. CPU is unaffected; reference is unaffected; matters when GPU is in the mix.',
    input: {
      positions: makePositions([[0, 0, 0], [50, 50, 50], [50, 50, 51.5]]),
      types: makeTypes([0, 0, 0]),
      natoms: 3,
      maxBondLength: 3.2,
      covalentRadii: SIMPLE_RADII,
      tolerance: 0.45,
    },
    expectMinCount: 1,
    expectMaxCount: 1,
  },
  {
    name: 'deterministic random cluster',
    rationale: 'Pseudo-random cluster of 50 atoms in a 10 Å cube — broad-coverage smoke test. Seeded so results are reproducible.',
    input: (() => {
      const coords: number[][] = [];
      let seed = 0x12345678;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      for (let i = 0; i < 50; i++) {
        coords.push([rand() * 10 - 5, rand() * 10 - 5, rand() * 10 - 5]);
      }
      return {
        positions: makePositions(coords),
        types: makeTypes(new Array(50).fill(0)),
        natoms: 50,
        maxBondLength: 3.2,
        covalentRadii: SIMPLE_RADII,
        tolerance: 0.45,
      };
    })(),
  },
  {
    name: 'flat-cutoff (no covalentRadii)',
    rationale: 'When covalentRadii is omitted, acceptance falls back to maxBondLength. Both implementations must agree on this branch too.',
    input: {
      positions: makePositions([[0, 0, 0], [2.0, 0, 0], [3.5, 0, 0]]),
      types: makeTypes([0, 0, 0]),
      natoms: 3,
      maxBondLength: 2.5,
    },
    // 0-1: 2.0 ≤ 2.5 ✓
    // 1-2: 1.5 ≤ 2.5 ✓
    // 0-2: 3.5 > 2.5 ✗
    expectMinCount: 2,
    expectMaxCount: 2,
  },
];
