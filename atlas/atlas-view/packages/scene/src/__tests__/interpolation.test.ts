import { describe, it, expect } from 'vitest';
import { wrapDelta, unwrappedTarget } from '../interpolation';

// The GPU does the lerp; the only thing the CPU can get WRONG is the periodic
// unwrap that decides which way an atom crosses the cell. This pins it so a
// boundary streak (the #1 visual smoke-test concern) is a build failure, not a
// thing you have to catch by eye.

describe('wrapDelta — minimum image (boundary-streak guard)', () => {
  it('takes the SHORT path across a periodic boundary', () => {
    // raw delta +9.8 in a 10-wide cell is really -0.2 the short way
    expect(wrapDelta(9.8, 10)).toBeCloseTo(-0.2, 10);
    expect(wrapDelta(-9.8, 10)).toBeCloseTo(0.2, 10);
  });

  it('leaves in-cell motion untouched', () => {
    expect(wrapDelta(2, 10)).toBe(2);
    expect(wrapDelta(-3.1, 10)).toBe(-3.1);
    expect(wrapDelta(0, 10)).toBe(0);
  });

  it('never returns a displacement longer than half the box', () => {
    for (const d of [-9.99, -7, -5.01, -0.3, 0, 0.3, 4.99, 7, 9.99]) {
      expect(Math.abs(wrapDelta(d, 10))).toBeLessThanOrEqual(5 + 1e-9);
    }
  });

  it('is a no-op when non-periodic (boxSize <= 0)', () => {
    expect(wrapDelta(9.8, 0)).toBe(9.8);
    expect(wrapDelta(9.8, -1)).toBe(9.8);
  });
});

describe('unwrappedTarget — what instanceTargetPosition stores', () => {
  it('keeps the GPU mix on the short arc through the wall (no streak)', () => {
    // atom at 0.1 moving to 9.9 across a 10-wide cell.
    const cur = 0.1, next = 9.9, box = 10;
    const target = unwrappedTarget(cur, next, box);
    expect(target).toBeCloseTo(-0.1, 10); // just outside the near wall, not at 9.9

    // The shader's mix(cur, target, 0.5):
    const mid = cur + (target - cur) * 0.5;
    expect(mid).toBeCloseTo(0.0, 10); // passes THROUGH the wall...
    // ...whereas the un-unwrapped midpoint would streak to mid-cell:
    const naiveMid = cur + (next - cur) * 0.5;
    expect(naiveMid).toBeCloseTo(5.0, 10);
  });

  it('equals the next position when no wrap is needed', () => {
    expect(unwrappedTarget(2, 3, 10)).toBeCloseTo(3, 10);
    expect(unwrappedTarget(2, 3, 0)).toBeCloseTo(3, 10); // non-periodic
  });
});
