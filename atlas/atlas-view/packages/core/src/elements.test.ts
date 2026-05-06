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
  });

  it('covers all entries in ELEMENT_DATA', () => {
    for (const [type, data] of Object.entries(ELEMENT_DATA)) {
      const spec = getElementSpec(Number(type));
      expect(spec.symbol).toBe(data.symbol);
    }
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
