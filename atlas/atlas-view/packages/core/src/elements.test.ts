import { describe, it, expect } from 'vitest';
import { ELEMENT_DATA, getElementSpec, hexToRgb } from './elements';

describe('getElementSpec', () => {
  it('returns known elements by atomic number', () => {
    const carbon = getElementSpec(6);
    expect(carbon.symbol).toBe('C');
    expect(carbon.name).toBe('Carbon');
    expect(carbon.color).toBe('#909090');
  });

  it('returns hydrogen with correct radius', () => {
    const h = getElementSpec(1);
    expect(h.symbol).toBe('H');
    expect(h.radius).toBe(0.31);
    expect(h.role).toBe('Terminator');
  });

  it('generates fallback for unknown atomic numbers', () => {
    const unknown = getElementSpec(999);
    expect(unknown.symbol).toBe('X999');
    expect(unknown.name).toBe('Unknown Isotope');
    expect(unknown.color.startsWith('hsl')).toBe(true);
    // Fallback must still expose a covalent + display radius so the bond
    // detector (which uses .radius) and atom renderer (which uses
    // .displayRadius) don't see undefined.
    expect(unknown.radius).toBeGreaterThan(0);
    expect(unknown.displayRadius).toBeGreaterThan(0);
  });

  it('covers all entries in ELEMENT_DATA', () => {
    for (const [type, data] of Object.entries(ELEMENT_DATA)) {
      const spec = getElementSpec(Number(type));
      expect(spec.symbol).toBe(data.symbol);
    }
  });

  it('covers the periodic table through Rn (1-86) so bond detection is not silently degraded', () => {
    // The pre-2026-05-08 table only covered ~30 elements, leaving common
    // materials (LLZO's La, garnet/perovskite/fluorite phases, lanthanide
    // dopants) to fall through to the unknown-isotope fallback. That gave
    // every heavy atom a stub covalent radius of 1.0 Å and missed real
    // bonds (La–O at 2.6 Å rejected because the cutoff collapsed to 2.11).
    for (let z = 1; z <= 86; z++) {
      expect(ELEMENT_DATA[z], `missing element Z=${z}`).toBeDefined();
      expect(ELEMENT_DATA[z].radius).toBeGreaterThan(0);
      expect(ELEMENT_DATA[z].displayRadius).toBeGreaterThan(0);
    }
  });

  it('decouples display radius from covalent radius so bonds remain visible', () => {
    // For tight pairs (C–C ~1.41 Å, half-bond 0.7 Å) the atom must render
    // smaller than half the typical bond, otherwise the bond cylinder is
    // fully buried inside the sphere and the user sees no bonds at all —
    // the carbon-nanotube symptom that motivated this fix.
    const carbon = ELEMENT_DATA[6];
    expect(carbon.displayRadius).toBeLessThan(0.7);
    // But atoms must stay visible — H/He shouldn't collapse to a point.
    const h = ELEMENT_DATA[1];
    expect(h.displayRadius).toBeGreaterThanOrEqual(0.30);
  });

  it('returns proper covalent radius for La so LLZO La–O bonds are detected', () => {
    // Cordero et al. 2008: La covalent radius = 2.07 Å. With this and
    // O = 0.66 Å plus tolerance 0.45 Å, the La–O cutoff is 3.18 Å —
    // comfortably above the ~2.6 Å observed in garnet electrolytes.
    const la = getElementSpec(57);
    expect(la.symbol).toBe('La');
    expect(la.radius).toBeGreaterThanOrEqual(2.0);
  });
});

describe('hexToRgb', () => {
  it('converts hex color to normalized RGB', () => {
    const rgb = hexToRgb('#ff0000');
    expect(rgb[0]).toBeCloseTo(1.0);
    expect(rgb[1]).toBeCloseTo(0.0);
    expect(rgb[2]).toBeCloseTo(0.0);
  });

  it('converts white correctly', () => {
    const rgb = hexToRgb('#ffffff');
    expect(rgb[0]).toBeCloseTo(1.0);
    expect(rgb[1]).toBeCloseTo(1.0);
    expect(rgb[2]).toBeCloseTo(1.0);
  });

  it('handles shorthand hex', () => {
    // The regex only matches 6-char hex, so shorthand returns fallback
    const rgb = hexToRgb('#f00');
    expect(rgb).toEqual([0.6, 0.6, 0.6]);
  });

  it('returns gray for HSL strings', () => {
    const rgb = hexToRgb('hsl(120, 50%, 50%)');
    expect(rgb).toEqual([0.6, 0.6, 0.6]);
  });
});
