/**
 * Spring-mass-damper integrator for tactile UI feedback.
 *
 * Pure, framework-free, and immutable (each step returns a NEW state) so it can
 * be unit-tested in isolation and reused by any hook/component. This is the
 * "Hooke's Law on the canvas" core from *The Kinetic Instrument* (Ch. 1):
 *
 *   F = -k·x - c·v      (restoring force + viscous damping)
 *   a = F / m
 *
 * integrated with **Euler-Cromer** (semi-implicit Euler): velocity is advanced
 * first, then position uses the NEW velocity. Plain explicit Euler injects
 * energy and visibly diverges in a 60 fps loop; Euler-Cromer is symplectic and
 * stays stable for the stiffnesses we use, at one add/mul more than explicit.
 */

export interface SpringConfig {
  /** stiffness k — higher = snappier, faster return */
  stiffness: number;
  /** viscous damping c — higher = less overshoot */
  damping: number;
  /** mass m — higher = more sluggish/heavier feel */
  mass: number;
}

export interface SpringState {
  /** position (for press feedback: a scale multiplier around 1.0) */
  x: number;
  /** velocity */
  v: number;
}

/**
 * Snappy, lightly under-damped press feel. ζ ≈ 0.44 → a small, single visible
 * overshoot on release ("settle-bounce") that reads as mechanical precision
 * rather than wobble. See {@link dampingRatio}.
 */
export const DEFAULT_SPRING: SpringConfig = { stiffness: 520, damping: 20, mass: 1 };

/**
 * Largest timestep the integrator will take. A backgrounded tab, GC pause, or
 * dropped frame produces a huge dt; clamping it keeps a stiff spring from
 * exploding (Δx per step bounded) at the cost of a slightly slowed catch-up.
 */
export const MAX_STEP = 1 / 30;

/** One Euler-Cromer step toward `target`. Returns a new state; never mutates. */
export function springStep(
  state: SpringState,
  target: number,
  config: SpringConfig,
  dt: number,
): SpringState {
  const { stiffness, damping, mass } = config;
  const h = dt > MAX_STEP ? MAX_STEP : dt < 0 ? 0 : dt;
  const a = (-stiffness * (state.x - target) - damping * state.v) / mass;
  const v = state.v + a * h; // advance velocity first …
  const x = state.x + v * h; // … then position with the updated velocity
  return { x, v };
}

/** True once the spring is close enough to rest that further steps are invisible. */
export function isSettled(state: SpringState, target: number, epsilon = 0.0005): boolean {
  return Math.abs(state.x - target) < epsilon && Math.abs(state.v) < epsilon;
}

/**
 * Damping ratio ζ = c / (2·√(k·m)).
 *   ζ < 1 under-damped (overshoots, bounces), ζ = 1 critical (fastest, no
 *   overshoot), ζ > 1 over-damped (sluggish, no overshoot).
 */
export function dampingRatio({ stiffness, damping, mass }: SpringConfig): number {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

/** Honor the OS "reduce motion" setting — callers should skip animation when true. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
