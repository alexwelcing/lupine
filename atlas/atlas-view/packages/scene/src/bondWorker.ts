/**
 * Bond Detection Web Worker — thin shell.
 *
 * Core spatial-hash + neighbor-query logic lives in `bondDetectCpu.ts` so
 * it's importable from tests. This file only handles the worker protocol:
 * receive input, dispatch, postMessage with transfers.
 *
 * Two detection modes (handled by detectBondsCpu):
 *   1. Element-aware: cutoff = r_cov(A) + r_cov(B) + tolerance
 *   2. Flat cutoff:   single maxBondLength for all pairs
 *
 * BYOB passthrough: when the simulation provides bonds (frame.bonds), we
 * skip detection and just compute distances for stats/coloring.
 */

import {
  detectBondsCpu,
  computeBondStats,
  computeMEAMScreening,
  type BondDetectInput,
  type BondDetectOutput,
} from './bondDetectCpu';

interface BondWorkerInput extends BondDetectInput {
  /** Pre-computed bonds from simulation output (BYOB passthrough). */
  bonds?: Int32Array | null;
  /** Compute per-bond statistics (mean, histogram, type-pair breakdown). */
  computeStats?: boolean;
  /** Run MEAM angular screening on detected bonds. */
  meamScreening?: boolean;
}

interface BondWorkerOutput extends BondDetectOutput {
  screeningFactors?: Float32Array;
  stats?: ReturnType<typeof computeBondStats>;
}

self.onmessage = (e: MessageEvent<BondWorkerInput>) => {
  const input = e.data;
  const { positions, types, natoms, bonds: precomputedBonds, computeStats = false, meamScreening = false } = input;

  let output: BondWorkerOutput;

  // BYOB: simulation already computed bonds — just fill in distances.
  if (precomputedBonds && precomputedBonds.length > 0) {
    const count = precomputedBonds.length / 2;
    const distances = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = precomputedBonds[i * 2];
      const b = precomputedBonds[i * 2 + 1];
      const dx = positions[b * 3] - positions[a * 3];
      const dy = positions[b * 3 + 1] - positions[a * 3 + 1];
      const dz = positions[b * 3 + 2] - positions[a * 3 + 2];
      distances[i] = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    output = { bondPairs: precomputedBonds, distances, count };
  } else {
    output = detectBondsCpu(input);
  }

  if (output.count > 0 && meamScreening) {
    output.screeningFactors = computeMEAMScreening(
      output.count, output.bondPairs, positions, natoms, output.distances,
    );
  }

  if (computeStats) {
    output.stats = computeBondStats(output.distances, output.count, output.bondPairs, types);
  }

  // Zero-copy transfer of the variable-length result buffers. The input
  // buffers (positions, types) are owned by the caller and can't be
  // transferred back.
  const transferList: ArrayBuffer[] = [
    output.bondPairs.buffer as ArrayBuffer,
    output.distances.buffer as ArrayBuffer,
  ];
  if (output.screeningFactors) {
    transferList.push(output.screeningFactors.buffer as ArrayBuffer);
  }

  (self as any).postMessage(output, transferList);
};
