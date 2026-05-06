/**
 * Bond Detection Web Worker
 *
 * Runs spatial hash construction and neighbor queries off the main thread.
 * For 1M atoms this can take 2-5 seconds — doing it on main thread freezes rendering.
 *
 * Protocol:
 *   Main → Worker: { positions: Float32Array, types: Int32Array, natoms, maxBondLength, bonds?, meamScreening? }
 *   Worker → Main: { bondPairs: Int32Array (flat [a0,b0, a1,b1, ...]), count, screeningFactors? }
 */

// Inline spatial hash (can't import modules in a worker blob)
class WorkerSpatialHash {
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

  query(
    x: number, y: number, z: number,
    radius: number,
    positions: Float32Array,
  ): Array<{ index: number; dist: number }> {
    const results: Array<{ index: number; dist: number }> = [];
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
              results.push({ index: j, dist: Math.sqrt(d2) });
            }
          }
        }
      }
    }
    return results;
  }
}

self.onmessage = (e: MessageEvent) => {
  const { positions, types, natoms, maxBondLength, bonds: precomputedBonds, meamScreening } = e.data;

  // If pre-computed bonds exist in the frame data, just pass them through
  if (precomputedBonds && precomputedBonds.length > 0) {
    (self as any).postMessage({
      bondPairs: precomputedBonds,
      count: precomputedBonds.length / 2,
    });
    return;
  }

  // Build spatial hash and find bonds
  const hash = new WorkerSpatialHash(maxBondLength);
  hash.build(positions, natoms);

  // Pre-allocate a generous buffer (most atoms have 2-6 neighbors)
  const maxPairs = Math.min(natoms * 8, 50_000_000); // Cap at 50M pairs
  const pairBuf = new Int32Array(maxPairs * 2);
  let count = 0;

  // Build neighbor lists for MEAM screening (only if requested)
  let neighborList: number[][] | null = null;
  if (meamScreening) {
    neighborList = Array.from({ length: natoms }, () => []);
  }

  for (let i = 0; i < natoms; i++) {
    const ix = positions[i * 3];
    const iy = positions[i * 3 + 1];
    const iz = positions[i * 3 + 2];

    const neighbors = hash.query(ix, iy, iz, maxBondLength, positions);

    for (const { index: j, dist } of neighbors) {
      if (i >= j) continue;
      if (dist <= maxBondLength && count < maxPairs) {
        pairBuf[count * 2] = i;
        pairBuf[count * 2 + 1] = j;
        count++;
        if (neighborList) {
          neighborList[i].push(j);
          neighborList[j].push(i);
        }
      }
    }
  }

  // MEAM geometric screening (computed off-thread so main thread stays smooth)
  let screeningBuf: Float32Array | null = null;
  if (meamScreening && neighborList) {
    screeningBuf = new Float32Array(count);
    const SCREENING_CUTOFF = 1.25;
    const isNeighbor = new Uint8Array(natoms);

    for (let i = 0; i < count; i++) {
      const a = pairBuf[i * 2];
      const b = pairBuf[i * 2 + 1];
      const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
      const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const dij = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dij === 0) {
        screeningBuf[i] = 1.0;
        continue;
      }

      const dijSq = dij * dij;
      const neighborsB = neighborList[b];
      for (let n = 0; n < neighborsB.length; n++) isNeighbor[neighborsB[n]] = 1;

      let s = 1.0;
      const neighborsA = neighborList[a];
      for (let n = 0; n < neighborsA.length; n++) {
        const k = neighborsA[n];
        if (k === b || !isNeighbor[k]) continue;

        const kx = positions[k * 3], ky = positions[k * 3 + 1], kz = positions[k * 3 + 2];
        const dxik = kx - ax, dyik = ky - ay, dzik = kz - az;
        const dikSq = dxik * dxik + dyik * dyik + dzik * dzik;
        if (dikSq >= dijSq) continue;

        const dxjk = kx - bx, dyjk = ky - by, dzjk = kz - bz;
        const djkSq = dxjk * dxjk + dyjk * dyjk + dzjk * dzjk;
        if (djkSq >= dijSq) continue;

        const dik = Math.sqrt(dikSq);
        const djk = Math.sqrt(djkSq);
        const C = (dik + djk) / dij;
        if (C < SCREENING_CUTOFF) {
          s *= 0.15;
          if (s < 0.001) break;
        }
      }
      screeningBuf[i] = s;

      for (let n = 0; n < neighborsB.length; n++) isNeighbor[neighborsB[n]] = 0;
    }
  }

  // Return only the populated portion
  const result = pairBuf.subarray(0, count * 2);
  const transferList: ArrayBuffer[] = [result.buffer as ArrayBuffer];
  if (screeningBuf) {
    const screeningResult = screeningBuf.subarray(0, count);
    transferList.push(screeningResult.buffer as ArrayBuffer);
    (self as any).postMessage(
      { bondPairs: result, count, screeningFactors: screeningResult },
      transferList
    );
  } else {
    (self as any).postMessage(
      { bondPairs: result, count, screeningFactors: null },
      transferList
    );
  }
};
