import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPRING,
  MAX_STEP,
  dampingRatio,
  isSettled,
  springStep,
  type SpringState,
} from '../spring';

const DT = 1 / 60;

/** Run the spring to rest from `start`, recording the peak position reached. */
function simulate(start: SpringState, target: number, steps = 400) {
  let state = start;
  let peak = start.x;
  let settledAt = -1;
  for (let i = 0; i < steps; i++) {
    state = springStep(state, target, DEFAULT_SPRING, DT);
    if (state.x > peak) peak = state.x;
    if (settledAt < 0 && isSettled(state, target)) settledAt = i;
  }
  return { state, peak, settledAt };
}

describe('springStep', () => {
  it('converges to the target', () => {
    const { state } = simulate({ x: 0, v: 0 }, 1);
    expect(state.x).toBeCloseTo(1, 3);
    expect(state.v).toBeCloseTo(0, 3);
  });

  it('settles in well under a second with the default spring', () => {
    const { settledAt } = simulate({ x: 0, v: 0 }, 1);
    expect(settledAt).toBeGreaterThan(0);
    expect(settledAt * DT).toBeLessThan(1.0); // < 1s to rest
  });

  it('overshoots once on a step (under-damped settle-bounce)', () => {
    // The whole point of the kinetic feel: it springs PAST the target then
    // returns. A critically/over-damped spring would never exceed it.
    const { peak } = simulate({ x: 0, v: 0 }, 1);
    expect(peak).toBeGreaterThan(1.05);
  });

  it('is immutable — never mutates the input state', () => {
    const input: SpringState = { x: 0.2, v: -3 };
    const snapshot = { ...input };
    const out = springStep(input, 1, DEFAULT_SPRING, DT);
    expect(input).toEqual(snapshot);
    expect(out).not.toBe(input);
  });

  it('stays finite when handed an absurd dt (clamped to MAX_STEP)', () => {
    // Backgrounded tab → dt of seconds. Explicit Euler would blow up; the clamp
    // keeps every value finite and bounded.
    let state: SpringState = { x: 0, v: 0 };
    for (let i = 0; i < 50; i++) {
      state = springStep(state, 1, DEFAULT_SPRING, 1000);
      expect(Number.isFinite(state.x)).toBe(true);
      expect(Number.isFinite(state.v)).toBe(true);
    }
  });

  it('treats a huge dt identically to MAX_STEP', () => {
    const start: SpringState = { x: 0, v: 0 };
    const clamped = springStep(start, 1, DEFAULT_SPRING, MAX_STEP);
    const huge = springStep(start, 1, DEFAULT_SPRING, 9999);
    expect(huge).toEqual(clamped);
  });

  it('ignores negative dt rather than running time backwards', () => {
    const start: SpringState = { x: 0.5, v: 2 };
    const out = springStep(start, 1, DEFAULT_SPRING, -1);
    expect(out).toEqual(start);
  });
});

describe('dampingRatio', () => {
  it('reports the default spring as under-damped (0 < ζ < 1)', () => {
    const zeta = dampingRatio(DEFAULT_SPRING);
    expect(zeta).toBeGreaterThan(0);
    expect(zeta).toBeLessThan(1);
  });

  it('matches the closed form ζ = c / (2√(km))', () => {
    const cfg = { stiffness: 100, damping: 20, mass: 1 };
    expect(dampingRatio(cfg)).toBeCloseTo(20 / (2 * Math.sqrt(100)), 10); // = 1.0, critical
  });
});

describe('isSettled', () => {
  it('is true at the target with no velocity', () => {
    expect(isSettled({ x: 1, v: 0 }, 1)).toBe(true);
  });

  it('is false while still moving', () => {
    expect(isSettled({ x: 1, v: 0.5 }, 1)).toBe(false);
    expect(isSettled({ x: 0.5, v: 0 }, 1)).toBe(false);
  });
});
