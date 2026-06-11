import { describe, it, expect } from 'vitest';
import { buildC60 } from './HeroMoleculePreview';

/**
 * The hero teaser must render a *real* Buckminsterfullerene, not a decorative
 * blob. These invariants are the defining properties of a C60 truncated
 * icosahedron — if a future tweak (e.g. the bond threshold) breaks the cage,
 * these fail loudly instead of silently shipping a malformed molecule.
 */
describe('buildC60 — Buckminsterfullerene geometry', () => {
  const { atoms, bonds } = buildC60();

  it('has exactly 60 carbon atoms', () => {
    expect(atoms).toHaveLength(60);
  });

  it('has exactly 90 cage edges', () => {
    expect(bonds).toHaveLength(90);
  });

  it('bonds every atom to exactly 3 neighbours (sp² cage)', () => {
    const degree = new Array(atoms.length).fill(0);
    for (const b of bonds) { degree[b.a]++; degree[b.b]++; }
    expect(degree.every((d) => d === 3)).toBe(true);
  });

  it('places every atom on a unit-ish sphere (normalised)', () => {
    for (const a of atoms) {
      const r = Math.hypot(a.x, a.y, a.z);
      expect(r).toBeGreaterThan(0.99);
      expect(r).toBeLessThan(1.01);
    }
  });

  it('has uniform edge lengths (Archimedean solid)', () => {
    const len = (b: { a: number; b: number }) => {
      const p = atoms[b.a], q = atoms[b.b];
      return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    };
    const lengths = bonds.map(len);
    const min = Math.min(...lengths);
    const max = Math.max(...lengths);
    // All edges identical to within floating-point noise.
    expect(max - min).toBeLessThan(1e-6);
  });

  it('references only valid atom indices', () => {
    for (const b of bonds) {
      expect(b.a).toBeGreaterThanOrEqual(0);
      expect(b.b).toBeLessThan(atoms.length);
      expect(b.a).not.toBe(b.b);
    }
  });
});
