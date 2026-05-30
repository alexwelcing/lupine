// Frame-interpolation math, factored out of AtomsOptimized so the one piece that
// can actually be WRONG — the periodic-boundary unwrap — is unit-tested rather
// than trusted. The GPU does the lerp (mix); the CPU only needs to hand it a
// target position that lies on the SHORT arc across the cell.

/**
 * Minimum-image displacement along one axis: the short path across a periodic
 * cell of width `boxSize`.
 *
 * This is the guard against "boundary streaks". An atom that crosses the cell
 * wall — say 0.1 → 9.9 in a 10-wide cell — has a raw delta of +9.8, which would
 * make `mix(current, target)` drag it the long way across the whole cell. The
 * minimum image takes the −0.2 path instead, so the atom slips through the wall.
 *
 * `boxSize <= 0` means non-periodic (or unknown bounds): the delta is returned
 * unchanged.
 */
export function wrapDelta(d: number, boxSize: number): number {
  if (boxSize <= 0) return d;
  const half = boxSize * 0.5;
  if (d > half) return d - boxSize;
  if (d < -half) return d + boxSize;
  return d;
}

/**
 * The PBC-unwrapped target position for one axis: `current + wrapDelta(...)`.
 * Stored into `instanceTargetPosition`; the vertex shader then does a plain
 * `mix(instancePosition, instanceTargetPosition, uProgress)` with no PBC logic.
 */
export function unwrappedTarget(current: number, next: number, boxSize: number): number {
  return current + wrapDelta(next - current, boxSize);
}
