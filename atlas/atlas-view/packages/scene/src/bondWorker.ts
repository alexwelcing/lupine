/**
 * Bond Detection Web Worker
 *
 * Runs spatial hash construction and neighbor queries off the main thread.
 * For 1M atoms this can take 2-5 seconds — doing it on main thread freezes rendering.
 *
 * Protocol:
 *   Main → Worker: { positions: Float32Array, types: Int32Array, natoms, maxBondLength, bonds? }
 *   Worker → Main: { bondPairs: Int32Array (flat [a0,b0, a1,b1, ...]), count }
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
  const { positions, types, natoms, maxBondLength, bonds: precomputedBonds } = e.data;

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
      }
    }
  }

  // Return only the populated portion
  const result = pairBuf.subarray(0, count * 2);
  (self as any).postMessage(
    { bondPairs: result, count },
    [result.buffer] // Transfer ownership — zero-copy
  );
};
