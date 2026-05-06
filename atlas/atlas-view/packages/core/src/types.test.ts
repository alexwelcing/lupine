import { describe, it, expect } from 'vitest';
import { UNIT_LABELS, encodeState, decodeState, DEFAULT_STATE } from './types';

describe('UNIT_LABELS', () => {
  it('has distance units for all unit styles', () => {
    const styles = Object.keys(UNIT_LABELS) as Array<keyof typeof UNIT_LABELS>;
    for (const style of styles) {
      expect(UNIT_LABELS[style].distance).toBeDefined();
      expect(UNIT_LABELS[style].distance.length).toBeGreaterThan(0);
    }
  });

  it('metal uses angstroms for distance', () => {
    expect(UNIT_LABELS.metal.distance).toBe('Å');
    expect(UNIT_LABELS.metal.energy).toBe('eV');
  });

  it('lj uses sigma and epsilon', () => {
    expect(UNIT_LABELS.lj.distance).toBe('σ');
    expect(UNIT_LABELS.lj.energy).toBe('ε');
  });
});

describe('encodeState / decodeState', () => {
  it('round-trips a simple state change', () => {
    const encoded = encodeState({ frame: 42 });
    const decoded = decodeState(encoded);
    expect(decoded.frame).toBe(42);
  });

  it('round-trips colorMode', () => {
    const encoded = encodeState({ colorMode: 'property' });
    const decoded = decodeState(encoded);
    expect(decoded.colorMode).toBe('property');
  });

  it('returns empty object for invalid input', () => {
    const decoded = decodeState('not-valid-base64!!!');
    expect(decoded).toEqual({});
  });

  it('preserves nested effect values', () => {
    const patch = { effects: { ...DEFAULT_STATE.effects, bloom: true, bloomIntensity: 0.8 } };
    const encoded = encodeState(patch);
    const decoded = decodeState(encoded);
    expect(decoded.effects?.bloom).toBe(true);
    expect(decoded.effects?.bloomIntensity).toBeCloseTo(0.8);
  });
});
