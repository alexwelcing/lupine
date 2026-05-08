/**
 * Uniform-grid spatial clustering for huge-scene LOD.
 *
 * Phase 4 of the progressive-rendering system. The renderer now has:
 *   - per-atom impostor spheres (Phase 1) — accurate but expensive
 *   - sub-pixel vertex culling — auto-drops atoms below ~0.6 px
 *
 * On a 1M-atom scene zoomed out far enough that most atoms are sub-
 * pixel, the atoms vanish (they're correctly culled) but the scene
 * goes empty. Splat viewers solve this by aggregating distant clusters
 * into single representative billboards. Same idea here, simpler:
 *
 *   - Subdivide the simulation cell into a uniform N×N×N grid.
 *   - For each cell, average the atoms inside into one centroid +
 *     average color + bounding radius.
 *   - Render the cell as a single impostor sphere ("splat") at far
 *     zoom, where it covers the same screen area as all its atoms
 *     would have.
 *   - Drop the splat as the user zooms in (the constituent atoms take
 *     over, naturally, via the existing pixel-radius LOD).
 *
 * Why uniform grid over an octree:
 *   - O(N) build instead of O(N log N), fits in the post-streaming
 *     idle-callback window without spreading over multiple frames.
 *   - Single render pass, fixed instance count up to GRID_DIM³.
 *   - No traversal logic per frame.
 * Octree is the right next iteration when scenes get very anisotropic
 * (vacuum + dense bulk in the same frame); for FCC-Cu-style fixtures
 * the uniform grid is fine.
 *
 * This module is pure — no React, no Three.js — so it can run inside a
 * Web Worker if we ever decide to take it off the main thread (TODO).
 * For now it runs via requestIdleCallback after streaming completes;
 * a 1M-atom build is ~150-300 ms on a modern laptop.
 */

import type { Frame } from '@atlas/core/types';
import { TYPE_COLORS, TYPE_RADII, DEFAULT_TYPE_COLOR } from './constants';

export interface Clusters {
  /** Cell-centered position [x0, y0, z0, x1, y1, z1, …]. Length = count × 3. */
  positions: Float32Array;
  /** Bounding radius in world units (cell half-diagonal + max atom radius). */
  radii: Float32Array;
  /** Average color [r0, g0, b0, …]. Length = count × 3. RGB in [0,1]. */
  colors: Float32Array;
  /** Number of atoms aggregated into each cluster. Useful for
   *  weighting and for skipping nearly-empty cells. */
  atomCounts: Int32Array;
  /** Number of populated clusters (≤ GRID_DIM³). Empty cells are not
   *  represented; the typed arrays above are pre-trimmed to this count. */
  count: number;
  /** Grid dimension actually used. Capped at MAX_GRID_DIM but reduced
   *  for tiny frames so we don't end up with one atom per cell. */
  gridDim: number;
}

/** Hard ceiling on grid resolution. 64³ = 262K cells; with ~16 atoms per
 *  cell on a 4M-atom frame, that's our sweet spot. Going higher quickly
 *  loses the "aggregate" win — each cell holds 1-2 atoms and the cluster
 *  mesh's instance count approaches the atom count. */
export const MAX_GRID_DIM = 64;

/** Target atoms per populated cell. The grid resolution is chosen so
 *  that, on average, each non-empty cell holds roughly this many atoms.
 *  Lower → more clusters, finer LOD; higher → fewer clusters, coarser. */
const TARGET_ATOMS_PER_CELL = 32;

/** Build clusters from a fully-loaded Frame. Caller is expected to call
 *  this only AFTER streaming completes (frame.positions populated to
 *  natoms) — running it on a partial frame would aggregate
 *  uninitialized zero-positions and produce a giant fake cluster at
 *  the origin. */
export function buildClusters(frame: Frame, qualityHint?: { mobile?: boolean }): Clusters {
  if (!frame.boxBounds || frame.natoms === 0) {
    return emptyClusters();
  }

  // Choose grid resolution. Aim for TARGET_ATOMS_PER_CELL on average,
  // bounded by MAX_GRID_DIM. Mobile gets a smaller cap so we don't ship
  // a 60 MB cluster mesh when the device's whole budget is closer.
  const cap = qualityHint?.mobile ? 32 : MAX_GRID_DIM;
  const targetCells = Math.max(8, Math.ceil(frame.natoms / TARGET_ATOMS_PER_CELL));
  const dimFromTarget = Math.ceil(Math.cbrt(targetCells));
  const gridDim = Math.max(2, Math.min(cap, dimFromTarget));
  const gridDimSq = gridDim * gridDim;
  const totalCells = gridDim * gridDim * gridDim;

  const xlo = frame.boxBounds[0];
  const xhi = frame.boxBounds[1];
  const ylo = frame.boxBounds[2];
  const yhi = frame.boxBounds[3];
  const zlo = frame.boxBounds[4];
  const zhi = frame.boxBounds[5];
  const bx = xhi - xlo || 1;
  const by = yhi - ylo || 1;
  const bz = zhi - zlo || 1;
  const cellSizeX = bx / gridDim;
  const cellSizeY = by / gridDim;
  const cellSizeZ = bz / gridDim;
  const invCellX = gridDim / bx;
  const invCellY = gridDim / by;
  const invCellZ = gridDim / bz;

  // Per-cell accumulators. We sum positions and colors and divide
  // at the end; this is cheaper than maintaining running averages.
  const sumX = new Float64Array(totalCells);
  const sumY = new Float64Array(totalCells);
  const sumZ = new Float64Array(totalCells);
  const sumR = new Float64Array(totalCells);
  const sumG = new Float64Array(totalCells);
  const sumB = new Float64Array(totalCells);
  const counts = new Int32Array(totalCells);

  // Walk every atom, increment its cell's accumulator.
  const positions = frame.positions;
  const types = frame.types;
  let maxAtomRadius = 0;
  for (let i = 0; i < frame.natoms; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    let cx = ((x - xlo) * invCellX) | 0;
    let cy = ((y - ylo) * invCellY) | 0;
    let cz = ((z - zlo) * invCellZ) | 0;
    if (cx < 0) cx = 0; else if (cx >= gridDim) cx = gridDim - 1;
    if (cy < 0) cy = 0; else if (cy >= gridDim) cy = gridDim - 1;
    if (cz < 0) cz = 0; else if (cz >= gridDim) cz = gridDim - 1;
    const cellIdx = cx + cy * gridDim + cz * gridDimSq;

    sumX[cellIdx] += x;
    sumY[cellIdx] += y;
    sumZ[cellIdx] += z;

    // Per-type color from CPK / element data. Fall back to grey for
    // unknown types so empty colors don't poison the average.
    const typeId = types[i];
    const color = TYPE_COLORS[typeId] ?? DEFAULT_TYPE_COLOR;
    sumR[cellIdx] += color[0];
    sumG[cellIdx] += color[1];
    sumB[cellIdx] += color[2];

    counts[cellIdx]++;

    const r = TYPE_RADII[typeId];
    if (r !== undefined && r > maxAtomRadius) maxAtomRadius = r;
  }

  // Compact: skip empty cells. Walk all cells once; emit centroid +
  // average color for non-empty ones. Pre-allocate to total non-empty
  // count for tight typed arrays.
  let nonEmpty = 0;
  for (let i = 0; i < totalCells; i++) if (counts[i] > 0) nonEmpty++;

  const positionsOut = new Float32Array(nonEmpty * 3);
  const radiiOut = new Float32Array(nonEmpty);
  const colorsOut = new Float32Array(nonEmpty * 3);
  const atomCountsOut = new Int32Array(nonEmpty);

  // Bounding radius for each cluster. Cells are axis-aligned cubes;
  // half-diagonal is the radius that just contains the cell, plus a
  // little padding for the atoms' own radii so the splat covers them.
  const cellHalfDiag = 0.5 * Math.sqrt(cellSizeX * cellSizeX + cellSizeY * cellSizeY + cellSizeZ * cellSizeZ);
  const splatRadius = cellHalfDiag + maxAtomRadius;

  let outIdx = 0;
  for (let i = 0; i < totalCells; i++) {
    const n = counts[i];
    if (n === 0) continue;
    const inv = 1 / n;
    positionsOut[outIdx * 3]     = sumX[i] * inv;
    positionsOut[outIdx * 3 + 1] = sumY[i] * inv;
    positionsOut[outIdx * 3 + 2] = sumZ[i] * inv;
    colorsOut[outIdx * 3]     = sumR[i] * inv;
    colorsOut[outIdx * 3 + 1] = sumG[i] * inv;
    colorsOut[outIdx * 3 + 2] = sumB[i] * inv;
    radiiOut[outIdx] = splatRadius;
    atomCountsOut[outIdx] = n;
    outIdx++;
  }

  return {
    positions: positionsOut,
    radii: radiiOut,
    colors: colorsOut,
    atomCounts: atomCountsOut,
    count: nonEmpty,
    gridDim,
  };
}

function emptyClusters(): Clusters {
  return {
    positions: new Float32Array(0),
    radii: new Float32Array(0),
    colors: new Float32Array(0),
    atomCounts: new Int32Array(0),
    count: 0,
    gridDim: 0,
  };
}

/** Approximate world-space size of a single cluster cell, used by the
 *  LOD switch to decide cluster-vs-atom rendering. The cell radius is
 *  uniform so we just expose the average. */
export function clusterCellRadius(clusters: Clusters): number {
  if (clusters.count === 0) return 0;
  // All clusters share the same splatRadius (uniform grid), so any
  // sample is fine.
  return clusters.radii[0];
}
