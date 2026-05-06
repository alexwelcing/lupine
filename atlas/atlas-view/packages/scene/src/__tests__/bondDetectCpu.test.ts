/**
 * Differential test: CPU spatial-hash bond detection vs the brute-force
 * reference. Any disagreement is a bug in the spatial hash — the reference
 * is so simple it's the trusted oracle.
 *
 * If this file fails on the "linear chain in negative coords" or "chain
 * straddling origin" fixtures, that's the canary for the spatial hash's
 * cell-indexing logic — the same class of bug we fixed in the WGSL path.
 */

import { describe, it, expect } from 'vitest';
import { detectBondsCpu } from '../bondDetectCpu';
import { referenceBondDetect, diffBonds } from '../bondReference';
import { BOND_FIXTURES } from './bondFixtures';

describe('detectBondsCpu vs reference (differential)', () => {
  for (const fixture of BOND_FIXTURES) {
    it(`${fixture.name}`, () => {
      const expected = referenceBondDetect(fixture.input);
      const actual = detectBondsCpu(fixture.input);

      const diff = diffBonds(expected, actual);

      if (!diff.equal) {
        const msg = [
          `Fixture: ${fixture.name}`,
          `Expected ${expected.count} bonds, got ${actual.count}.`,
          diff.missingFromB.length > 0
            ? `Missing from CPU output: ${diff.missingFromB.slice(0, 8).map(p => `(${p[0]},${p[1]})`).join(', ')}${diff.missingFromB.length > 8 ? '...' : ''}`
            : null,
          diff.missingFromA.length > 0
            ? `Spurious in CPU output: ${diff.missingFromA.slice(0, 8).map(p => `(${p[0]},${p[1]})`).join(', ')}${diff.missingFromA.length > 8 ? '...' : ''}`
            : null,
          diff.distanceDiffs.length > 0
            ? `Distance disagreement on ${diff.distanceDiffs.length} pairs (showing first): ${JSON.stringify(diff.distanceDiffs[0])}`
            : null,
        ].filter(Boolean).join('\n  ');
        throw new Error(`Bond mismatch:\n  ${msg}`);
      }

      expect(diff.equal).toBe(true);
    });
  }
});
