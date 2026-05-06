/**
 * bondDetectCpu — Pure CPU bond detection (spatial hash + neighbor query).
 *
 * The Web Worker imports this. Tests import this directly (no worker shell)
 * to diff its output against the brute-force reference.
 *
 * Two acceptance modes:
 *   1. Element-aware: d ≤ r_cov(A) + r_cov(B) + tolerance
 *   2. Flat cutoff:   d ≤ maxBondLength
 *
 * Scientific contract: returns canonical pairs (i < j), each at most once,
 * with distances ≤ the active cutoff. No deduplication needed downstream.
 */

export interface BondDetectInput {
  positions: Float32Array;
  types: Int32Array;
  natoms: number;
  /** Cell size for the spatial hash. Must be ≥ effective cutoff so the
   *  3×3×3 neighbor scan covers all candidate pairs. */
  maxBondLength: number;
  covalentRadii?: Float32Array;
  /** Default 0.45 Å — matches the worker's pre-extract default. */
  tolerance?: number;
}

export interface BondDetectOutput {
  bondPairs: Int32Array;     // [a0, b0, a1, b1, ...]
  distances: Float32Array;   // [d0, d1, ...]
  count: number;
}

class SpatialHash {
  private cellSize: number;
  private invCellSize: number;
  private cells: Map<string, number[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.invCellSize = 1.0 / cellSize;
    this.cells = new Map();
  }

  build(positions: Float32Array, natoms: number) {
    this.cells.clear();
    for (let i = 0; i < natoms; i++) {
      const cx = Math.floor(positions[i * 3] * this.invCellSize);
      const cy = Math.floor(positions[i * 3 + 1] * this.invCellSize);
      const cz = Math.floor(positions[i * 3 + 2] * this.invCellSize);
      const key = `${cx},${cy},${cz}`;
      let cell = this.cells.get(key);
      if (!cell) {
        cell = [];
        this.cells.set(key, cell);
      }
      cell.push(i);
    }
  }

  queryRaw(
    x: number, y: number, z: number,
    radius: number,
    positions: Float32Array,
  ): Array<{ index: number; d2: number }> {
    const results: Array<{ index: number; d2: number }> = [];
    const r2 = radius * radius;
    const minCx = Math.floor((x - radius) * this.invCellSize);
    const maxCx = Math.floor((x + radius) * this.invCellSize);
    const minCy = Math.floor((y - radius) * this.invCellSize);
    const maxCy = Math.floor((y + radius) * this.invCellSize);
    const minCz = Math.floor((z - radius) * this.invCellSize);
    const maxCz = Math.floor((z + radius) * this.invCellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cz = minCz; cz <= maxCz; cz++) {
          const cell = this.cells.get(`${cx},${cy},${cz}`);
          if (!cell) continue;
          for (const j of cell) {
            const dx = positions[j * 3] - x;
            const dy = positions[j * 3 + 1] - y;
            const dz = positions[j * 3 + 2] - z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 <= r2 && d2 > 0) {
              results.push({ index: j, d2 });
            }
          }
        }
      }
    }
    return results;
  }
}

export function detectBondsCpu(input: BondDetectInput): BondDetectOutput {
  const { positions, types, natoms, maxBondLength, covalentRadii } = input;
  const tolerance = input.tolerance ?? 0.45;
  const useElementAware = !!(covalentRadii && covalentRadii.length > 0);

  if (natoms < 2) {
    return { bondPairs: new Int32Array(0), distances: new Float32Array(0), count: 0 };
  }

  const hash = new SpatialHash(maxBondLength);
  hash.build(positions, natoms);

  // Generous capacity. Refused pairs beyond this fall on the floor — same
  // contract as the worker's pre-extract behavior.
  const maxPairs = Math.min(natoms * 12, 50_000_000);
  const pairBuf = new Int32Array(maxPairs * 2);
  const distBuf = new Float32Array(maxPairs);
  let count = 0;

  for (let i = 0; i < natoms; i++) {
    const ix = positions[i * 3];
    const iy = positions[i * 3 + 1];
    const iz = positions[i * 3 + 2];

    const neighbors = hash.queryRaw(ix, iy, iz, maxBondLength, positions);

    for (const { index: j, d2 } of neighbors) {
      if (j <= i) continue; // canonical i < j

      let accepted: boolean;
      if (useElementAware) {
        const ri = covalentRadii![types[i]] ?? 1.5;
        const rj = covalentRadii![types[j]] ?? 1.5;
        const cutoff = ri + rj + tolerance;
        accepted = d2 <= cutoff * cutoff;
      } else {
        accepted = d2 <= maxBondLength * maxBondLength;
      }

      if (accepted && count < maxPairs) {
        pairBuf[count * 2] = i;
        pairBuf[count * 2 + 1] = j;
        distBuf[count] = Math.sqrt(d2);
        count++;
      }
    }
  }

  return {
    bondPairs: pairBuf.slice(0, count * 2),
    distances: distBuf.slice(0, count),
    count,
  };
}

/** Per-bond statistics — kept here so the worker stays a thin shell. */
export function computeBondStats(
  distances: Float32Array,
  count: number,
  pairs: Int32Array,
  types: Int32Array,
) {
  if (count === 0) {
    return {
      count: 0, minLength: 0, maxLength: 0, meanLength: 0,
      medianLength: 0, stdDev: 0,
      histogram: { bins: [] as number[], binEdges: [] as number[] },
      typePairCounts: {} as Record<string, number>,
      typePairMeans: {} as Record<string, number>,
    };
  }

  const sorted = new Float32Array(distances.subarray(0, count));
  sorted.sort();

  const min = sorted[0];
  const max = sorted[count - 1];
  const median = count % 2 === 0
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)];

  let sum = 0;
  for (let i = 0; i < count; i++) sum += sorted[i];
  const mean = sum / count;

  let sumSq = 0;
  for (let i = 0; i < count; i++) {
    const d = sorted[i] - mean;
    sumSq += d * d;
  }
  const stdDev = Math.sqrt(sumSq / count);

  const nBins = 30;
  const binWidth = (max - min) / nBins || 1;
  const bins: number[] = new Array(nBins).fill(0);
  const binEdges: number[] = new Array(nBins + 1);
  for (let i = 0; i <= nBins; i++) binEdges[i] = min + i * binWidth;
  for (let i = 0; i < count; i++) {
    const bin = Math.min(Math.floor((sorted[i] - min) / binWidth), nBins - 1);
    bins[bin]++;
  }

  const typePairCounts: Record<string, number> = {};
  const typePairSums: Record<string, number> = {};
  for (let i = 0; i < count; i++) {
    const a = types[pairs[i * 2]];
    const b = types[pairs[i * 2 + 1]];
    const key = a <= b ? `${a}-${b}` : `${b}-${a}`;
    typePairCounts[key] = (typePairCounts[key] ?? 0) + 1;
    typePairSums[key] = (typePairSums[key] ?? 0) + distances[i];
  }
  const typePairMeans: Record<string, number> = {};
  for (const key of Object.keys(typePairCounts)) {
    typePairMeans[key] = typePairSums[key] / typePairCounts[key];
  }

  return {
    count, minLength: min, maxLength: max, meanLength: mean,
    medianLength: median, stdDev,
    histogram: { bins, binEdges },
    typePairCounts, typePairMeans,
  };
}

/** MEAM angular screening — see Baskes 1992. */
export function computeMEAMScreening(
  count: number,
  pairs: Int32Array,
  positions: Float32Array,
  natoms: number,
  distances: Float32Array,
): Float32Array {
  const SCREENING_CUTOFF = 1.25;
  const screeningBuf = new Float32Array(count);

  const neighborList: number[][] = Array.from({ length: natoms }, () => []);
  for (let i = 0; i < count; i++) {
    const a = pairs[i * 2];
    const b = pairs[i * 2 + 1];
    neighborList[a].push(b);
    neighborList[b].push(a);
  }

  const isNeighbor = new Uint8Array(natoms);

  for (let i = 0; i < count; i++) {
    const a = pairs[i * 2];
    const b = pairs[i * 2 + 1];
    const dij = distances[i];

    if (dij === 0) { screeningBuf[i] = 1.0; continue; }
    const dijSq = dij * dij;

    const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
    const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];

    const neighborsB = neighborList[b];
    for (let n = 0; n < neighborsB.length; n++) isNeighbor[neighborsB[n]] = 1;

    let s = 1.0;
    const neighborsA = neighborList[a];
    for (let n = 0; n < neighborsA.length; n++) {
      const k = neighborsA[n];
      if (k === b || !isNeighbor[k]) continue;

      const kx = positions[k * 3], ky = positions[k * 3 + 1], kz = positions[k * 3 + 2];
      const dikSq = (kx - ax) ** 2 + (ky - ay) ** 2 + (kz - az) ** 2;
      if (dikSq >= dijSq) continue;

      const djkSq = (kx - bx) ** 2 + (ky - by) ** 2 + (kz - bz) ** 2;
      if (djkSq >= dijSq) continue;

      const C = (Math.sqrt(dikSq) + Math.sqrt(djkSq)) / dij;
      if (C < SCREENING_CUTOFF) {
        s *= 0.15;
        if (s < 0.001) break;
      }
    }
    screeningBuf[i] = s;

    for (let n = 0; n < neighborsB.length; n++) isNeighbor[neighborsB[n]] = 0;
  }

  return screeningBuf;
}
