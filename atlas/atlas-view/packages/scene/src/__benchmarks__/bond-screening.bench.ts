/**
 * Bond Screening Benchmark
 *
 * Generates synthetic high-bond-count systems and measures
 * the CPU time for stats + screening computation.
 */

function generateFCCCrystal(nCells: number, a: number): { positions: Float32Array; natoms: number } {
  const natoms = 4 * nCells * nCells * nCells;
  const positions = new Float32Array(natoms * 3);
  let idx = 0;
  for (let ix = 0; ix < nCells; ix++) {
    for (let iy = 0; iy < nCells; iy++) {
      for (let iz = 0; iz < nCells; iz++) {
        const baseX = ix * a;
        const baseY = iy * a;
        const baseZ = iz * a;
        const bases = [
          [0, 0, 0],
          [0.5, 0.5, 0],
          [0.5, 0, 0.5],
          [0, 0.5, 0.5],
        ];
        for (const [bx, by, bz] of bases) {
          positions[idx * 3] = baseX + bx * a;
          positions[idx * 3 + 1] = baseY + by * a;
          positions[idx * 3 + 2] = baseZ + bz * a;
          idx++;
        }
      }
    }
  }
  return { positions, natoms };
}

function findBondsBruteForce(positions: Float32Array, natoms: number, cutoff: number): Int32Array {
  const pairs: number[] = [];
  const c2 = cutoff * cutoff;
  for (let i = 0; i < natoms; i++) {
    for (let j = i + 1; j < natoms; j++) {
      const dx = positions[j * 3] - positions[i * 3];
      const dy = positions[j * 3 + 1] - positions[i * 3 + 1];
      const dz = positions[j * 3 + 2] - positions[i * 3 + 2];
      if (dx * dx + dy * dy + dz * dz <= c2) {
        pairs.push(i, j);
      }
    }
  }
  return new Int32Array(pairs);
}

function computeStats(bondPairs: Int32Array, positions: Float32Array, natoms: number) {
  const bondCount = bondPairs.length / 2;
  const lengths = new Float32Array(bondCount);
  let minLen = Infinity;
  let maxLen = -Infinity;
  let sum = 0;

  for (let i = 0; i < bondCount; i++) {
    const a = bondPairs[i * 2];
    const b = bondPairs[i * 2 + 1];
    const dx = positions[b * 3] - positions[a * 3];
    const dy = positions[b * 3 + 1] - positions[a * 3 + 1];
    const dz = positions[b * 3 + 2] - positions[a * 3 + 2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    lengths[i] = len;
    if (len < minLen) minLen = len;
    if (len > maxLen) maxLen = len;
    sum += len;
  }

  const HIST_BINS = 30;
  const bins = new Array(HIST_BINS).fill(0);
  const range = maxLen - minLen;
  for (let i = 0; i < bondCount; i++) {
    let binIdx = Math.floor(((lengths[i] - minLen) / range) * HIST_BINS);
    if (binIdx < 0) binIdx = 0;
    if (binIdx >= HIST_BINS) binIdx = HIST_BINS - 1;
    bins[binIdx]++;
  }

  const cn = new Float32Array(natoms);
  for (let i = 0; i < bondCount; i++) {
    cn[bondPairs[i * 2]]++;
    cn[bondPairs[i * 2 + 1]]++;
  }

  return { minLen, maxLen, mean: sum / bondCount, bins, cn };
}

function computeScreeningOptimized(bondPairs: Int32Array, positions: Float32Array, natoms: number): Float32Array {
  const bondCount = bondPairs.length / 2;
  const neighborList: number[][] = Array.from({ length: natoms }, () => []);
  for (let i = 0; i < bondCount; i++) {
    const a = bondPairs[i * 2];
    const b = bondPairs[i * 2 + 1];
    neighborList[a].push(b);
    neighborList[b].push(a);
  }

  const screening = new Float32Array(bondCount);
  const SCREENING_CUTOFF = 1.25;
  const isNeighbor = new Uint8Array(natoms);

  for (let i = 0; i < bondCount; i++) {
    const a = bondPairs[i * 2];
    const b = bondPairs[i * 2 + 1];
    const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
    const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];
    const dij = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2);
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
    screening[i] = s;

    for (let n = 0; n < neighborsB.length; n++) isNeighbor[neighborsB[n]] = 0;
  }

  return screening;
}

function runBenchmark(name: string, nCells: number, cutoffFactor: number) {
  const a = 3.615; // Cu lattice constant (Å)
  const cutoff = a * cutoffFactor;

  console.log(`\n=== ${name} ===`);
  const t0 = performance.now();
  const { positions, natoms } = generateFCCCrystal(nCells, a);
  const t1 = performance.now();
  const bondPairs = findBondsBruteForce(positions, natoms, cutoff);
  const t2 = performance.now();
  const bondCount = bondPairs.length / 2;

  const t3 = performance.now();
  computeStats(bondPairs, positions, natoms);
  const t4 = performance.now();

  const t5 = performance.now();
  computeScreeningOptimized(bondPairs, positions, natoms);
  const t6 = performance.now();

  console.log(`  Atoms:     ${natoms.toLocaleString()}`);
  console.log(`  Bonds:     ${bondCount.toLocaleString()}`);
  console.log(`  Generate:  ${(t1 - t0).toFixed(1)} ms`);
  console.log(`  Find:      ${(t2 - t1).toFixed(1)} ms`);
  console.log(`  Stats:     ${(t4 - t3).toFixed(1)} ms`);
  console.log(`  Screening: ${(t6 - t5).toFixed(1)} ms`);
  console.log(`  Total:     ${(t6 - t0).toFixed(1)} ms`);
}

runBenchmark('Small  (10K atoms,  nn-only)',  14, 0.8);
runBenchmark('Medium (50K atoms,  nn-only)',  23, 0.8);
runBenchmark('Large  (100K atoms, nn-only)',  29, 0.8);

console.log('\n--- Worst-case (large cutoff captures multiple shells) ---');
runBenchmark('Medium (50K atoms,  multi-shell)',  23, 1.6);
runBenchmark('Large  (100K atoms, multi-shell)',  29, 1.6);
