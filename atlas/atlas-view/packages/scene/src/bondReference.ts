/**
 * bondReference — Brute-force O(N²) bond detection.
 *
 * The trusted oracle. So obviously correct it doesn't need a proof.
 * Both the CPU spatial-hash path and the GPU compute path are diffed
 * against this in tests.
 *
 * Contract is intentionally identical to detectBondsCpu's contract:
 *   - Element-aware mode: d ≤ r_cov(i) + r_cov(j) + tolerance
 *   - Flat mode: d ≤ maxBondLength
 *   - Canonical pairs (i < j), no duplicates
 *   - i ≠ j (no self-bonds)
 *
 * If the spatial-hash output differs from the reference output (after
 * canonicalization), one of them is wrong — and it's not the reference.
 */

import type { BondDetectInput, BondDetectOutput } from './bondDetectCpu';

export function referenceBondDetect(input: BondDetectInput): BondDetectOutput {
  const { positions, types, natoms, maxBondLength, covalentRadii } = input;
  const tolerance = input.tolerance ?? 0.45;
  const useElementAware = !!(covalentRadii && covalentRadii.length > 0);
  const maxBondLengthSq = maxBondLength * maxBondLength;

  const pairs: number[] = [];
  const distances: number[] = [];

  for (let i = 0; i < natoms; i++) {
    const ix = positions[i * 3];
    const iy = positions[i * 3 + 1];
    const iz = positions[i * 3 + 2];

    for (let j = i + 1; j < natoms; j++) {
      const dx = positions[j * 3] - ix;
      const dy = positions[j * 3 + 1] - iy;
      const dz = positions[j * 3 + 2] - iz;
      const d2 = dx * dx + dy * dy + dz * dz;

      if (d2 === 0) continue; // skip coincident atoms

      let accepted: boolean;
      if (useElementAware) {
        const ri = covalentRadii![types[i]] ?? 1.5;
        const rj = covalentRadii![types[j]] ?? 1.5;
        const cutoff = ri + rj + tolerance;
        // Reference also caps at maxBondLength to mirror the spatial-hash
        // path's broadphase filter — otherwise the reference would accept
        // bonds the hash physically can't see.
        accepted = d2 <= cutoff * cutoff && d2 <= maxBondLengthSq;
      } else {
        accepted = d2 <= maxBondLengthSq;
      }

      if (accepted) {
        pairs.push(i, j);
        distances.push(Math.sqrt(d2));
      }
    }
  }

  return {
    bondPairs: new Int32Array(pairs),
    distances: new Float32Array(distances),
    count: pairs.length / 2,
  };
}

/**
 * Canonicalize a pairs array for diff. Pairs are already (i<j) by
 * construction in both reference and spatial-hash paths; this only sorts
 * lexicographically by (i, j) so the array order stops mattering.
 */
export function canonicalizePairs(pairs: Int32Array, distances?: Float32Array): {
  pairs: Int32Array;
  distances: Float32Array | null;
} {
  const count = pairs.length / 2;
  const indices = Array.from({ length: count }, (_, i) => i);
  indices.sort((p, q) => {
    const aP = pairs[p * 2], bP = pairs[p * 2 + 1];
    const aQ = pairs[q * 2], bQ = pairs[q * 2 + 1];
    return aP - aQ || bP - bQ;
  });

  const outPairs = new Int32Array(pairs.length);
  const outDist = distances ? new Float32Array(count) : null;
  for (let k = 0; k < count; k++) {
    const src = indices[k];
    outPairs[k * 2] = pairs[src * 2];
    outPairs[k * 2 + 1] = pairs[src * 2 + 1];
    if (outDist && distances) outDist[k] = distances[src];
  }
  return { pairs: outPairs, distances: outDist };
}

/**
 * Compare two canonicalized bond outputs. Returns the diff details for
 * test assertions; `equal` is true iff pair-sets and distances match
 * within tolerance.
 */
export function diffBonds(
  a: BondDetectOutput,
  b: BondDetectOutput,
  distanceEpsilon: number = 1e-4,
): {
  equal: boolean;
  countMismatch: boolean;
  missingFromA: Array<[number, number]>;
  missingFromB: Array<[number, number]>;
  distanceDiffs: Array<{ pair: [number, number]; aDist: number; bDist: number; delta: number }>;
} {
  const ca = canonicalizePairs(a.bondPairs, a.distances);
  const cb = canonicalizePairs(b.bondPairs, b.distances);

  const setA = new Map<string, number>();
  const setB = new Map<string, number>();
  for (let k = 0; k < a.count; k++) {
    setA.set(`${ca.pairs[k * 2]}-${ca.pairs[k * 2 + 1]}`, ca.distances![k]);
  }
  for (let k = 0; k < b.count; k++) {
    setB.set(`${cb.pairs[k * 2]}-${cb.pairs[k * 2 + 1]}`, cb.distances![k]);
  }

  const missingFromA: Array<[number, number]> = [];
  const missingFromB: Array<[number, number]> = [];
  const distanceDiffs: Array<{ pair: [number, number]; aDist: number; bDist: number; delta: number }> = [];

  for (const [key, dB] of setB) {
    if (!setA.has(key)) {
      const [s1, s2] = key.split('-');
      missingFromA.push([Number(s1), Number(s2)]);
    } else {
      const dA = setA.get(key)!;
      if (Math.abs(dA - dB) > distanceEpsilon) {
        const [s1, s2] = key.split('-');
        distanceDiffs.push({ pair: [Number(s1), Number(s2)], aDist: dA, bDist: dB, delta: dA - dB });
      }
    }
  }
  for (const key of setA.keys()) {
    if (!setB.has(key)) {
      const [s1, s2] = key.split('-');
      missingFromB.push([Number(s1), Number(s2)]);
    }
  }

  return {
    equal:
      a.count === b.count &&
      missingFromA.length === 0 &&
      missingFromB.length === 0 &&
      distanceDiffs.length === 0,
    countMismatch: a.count !== b.count,
    missingFromA,
    missingFromB,
    distanceDiffs,
  };
}
