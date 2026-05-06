/**
 * Sanity-check the brute-force reference itself against the per-fixture
 * `expectMinCount` / `expectMaxCount` annotations. If this file fails,
 * either the fixture annotation is wrong or the reference is wrong;
 * either way, do NOT trust the cross-implementation tests until this passes.
 */

import { describe, it, expect } from 'vitest';
import { referenceBondDetect } from '../bondReference';
import { BOND_FIXTURES } from './bondFixtures';

describe('referenceBondDetect (oracle sanity check)', () => {
  for (const fixture of BOND_FIXTURES) {
    it(`${fixture.name} — ${fixture.rationale}`, () => {
      const result = referenceBondDetect(fixture.input);

      if (fixture.expectMinCount !== undefined) {
        expect(result.count).toBeGreaterThanOrEqual(fixture.expectMinCount);
      }
      if (fixture.expectMaxCount !== undefined) {
        expect(result.count).toBeLessThanOrEqual(fixture.expectMaxCount);
      }

      // Structural invariants every output must satisfy:
      expect(result.bondPairs.length).toBe(result.count * 2);
      expect(result.distances.length).toBe(result.count);
      for (let k = 0; k < result.count; k++) {
        const a = result.bondPairs[k * 2];
        const b = result.bondPairs[k * 2 + 1];
        expect(a).toBeLessThan(b); // canonical i < j
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(fixture.input.natoms);
        expect(result.distances[k]).toBeGreaterThan(0);
      }
    });
  }
});
