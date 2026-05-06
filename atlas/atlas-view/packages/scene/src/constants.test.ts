import { describe, it, expect } from 'vitest';
import { lerpColor, getBackgroundFromColormap, getTypeColorFromColormap, DEFAULT_TYPE_COLOR } from './constants';

describe('lerpColor', () => {
  it('interpolates between two colors', () => {
    const a: [number, number, number] = [0, 0, 0];
    const b: [number, number, number] = [1, 1, 1];
    expect(lerpColor(a, b, 0)).toEqual([0, 0, 0]);
    expect(lerpColor(a, b, 1)).toEqual([1, 1, 1]);
    expect(lerpColor(a, b, 0.5)).toEqual([0.5, 0.5, 0.5]);
  });

  it('returns correct midpoint for colored interpolation', () => {
    const red: [number, number, number] = [1, 0, 0];
    const blue: [number, number, number] = [0, 0, 1];
    expect(lerpColor(red, blue, 0.5)).toEqual([0.5, 0, 0.5]);
  });
});

describe('getBackgroundFromColormap', () => {
  it('returns gradient colors for viridis', () => {
    const bg = getBackgroundFromColormap('viridis');
    expect(bg.top).toBeDefined();
    expect(bg.bottom).toBeDefined();
    expect(bg.top.startsWith('#')).toBe(true);
    expect(bg.bottom.startsWith('#')).toBe(true);
  });

  it('returns colors for all known colormaps', () => {
    const colormaps = ['viridis', 'inferno', 'plasma', 'coolwarm', 'neon'] as const;
    for (const name of colormaps) {
      const bg = getBackgroundFromColormap(name);
      expect(bg.top).toBeDefined();
      expect(bg.bottom).toBeDefined();
    }
  });
});

describe('getTypeColorFromColormap', () => {
  it('returns consistent color for same atom type', () => {
    const c1 = getTypeColorFromColormap(1, 'viridis');
    const c2 = getTypeColorFromColormap(1, 'viridis');
    expect(c1).toEqual(c2);
  });

  it('returns different colors for different types', () => {
    const c1 = getTypeColorFromColormap(1, 'viridis');
    const c2 = getTypeColorFromColormap(2, 'viridis');
    // They should differ (very unlikely to be identical)
    expect(c1).not.toEqual(c2);
  });

  it('returns default color for unknown colormap fallback', () => {
    const c = getTypeColorFromColormap(99, 'viridis');
    expect(c.length).toBe(3);
    expect(c.every(v => v >= 0 && v <= 1)).toBe(true);
  });
});

describe('DEFAULT_TYPE_COLOR', () => {
  it('is a neutral gray', () => {
    expect(DEFAULT_TYPE_COLOR).toEqual([0.6, 0.6, 0.6]);
  });
});
