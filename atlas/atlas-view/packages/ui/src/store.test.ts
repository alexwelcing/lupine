import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, getStoreState } from './test-utils';
import { createMockTrajectory } from '@atlas/core/test-utils';

describe('Store — Display Toggles', () => {
  beforeEach(() => {
    resetStore();
  });

  it('toggles bonds on/off', () => {
    const s = getStoreState();
    expect(s.showBonds).toBe(false);

    s.toggleBonds();
    expect(getStoreState().showBonds).toBe(true);

    s.toggleBonds();
    expect(getStoreState().showBonds).toBe(false);
  });

  it('toggles cell visibility', () => {
    const s = getStoreState();
    expect(s.showCell).toBe(true);

    s.toggleCell();
    expect(getStoreState().showCell).toBe(false);
  });

  it('toggles axes visibility', () => {
    const s = getStoreState();
    expect(s.showAxes).toBe(true);

    s.toggleAxes();
    expect(getStoreState().showAxes).toBe(false);
  });
});

describe('Store — Bond Settings', () => {
  beforeEach(() => {
    resetStore();
  });

  it('sets bond cutoff', () => {
    getStoreState().setBondCutoff(3.5);
    expect(getStoreState().bondCutoff).toBe(3.5);
  });

  it('sets bond tolerance (the slider new role)', () => {
    // Default mirrors the worker's previous hard-coded slack so existing
    // scenes detect the same bond set out of the box.
    expect(getStoreState().bondTolerance).toBe(0.45);
    getStoreState().setBondTolerance(0.2);
    expect(getStoreState().bondTolerance).toBe(0.2);
    getStoreState().setBondTolerance(1.0);
    expect(getStoreState().bondTolerance).toBe(1.0);
  });
});

describe('Store — Playback', () => {
  beforeEach(() => {
    resetStore();
  });

  it('toggles play state', () => {
    const s = getStoreState();
    expect(s.playing).toBe(false);

    s.togglePlay();
    expect(getStoreState().playing).toBe(true);
  });

  it('sets playback speed', () => {
    getStoreState().setPlaybackSpeed(2.5);
    expect(getStoreState().playbackSpeed).toBe(2.5);
  });
});

describe('Store — Color & Visuals', () => {
  beforeEach(() => {
    resetStore();
  });

  it('sets colormap', () => {
    getStoreState().setColormap('inferno');
    expect(getStoreState().colormap).toBe('inferno');
    expect(getStoreState().activeProfile).toBeNull();
  });

  it('sets render style', () => {
    getStoreState().setRenderStyle('toon');
    expect(getStoreState().renderStyle).toBe('toon');
  });

  it('sets molecule filter shell controls', () => {
    const s = getStoreState();
    s.setFilterShellShape('box');
    s.setFilterShellPreset('prism');
    s.setFilterShellOpacity(1);
    s.setFilterShellRadius(2);

    const next = getStoreState();
    expect(next.filterShellShape).toBe('box');
    expect(next.filterShellPreset).toBe('prism');
    expect(next.filterShellOpacity).toBe(0.75);
    expect(next.filterShellRadius).toBe(1.8);
  });

  it('sets math field controls with safe clamps', () => {
    const s = getStoreState();
    s.setMathFieldAlpha(3.4);
    s.setMathFieldBeta(0);
    s.setMathFieldGamma(2.2);

    let next = getStoreState();
    expect(next.mathFieldAlpha).toBe(3);
    expect(next.mathFieldBeta).toBe(0.1);
    expect(next.mathFieldGamma).toBe(2.2);

    next.resetMathFieldParams();
    next = getStoreState();
    expect(next.mathFieldAlpha).toBe(1);
    expect(next.mathFieldBeta).toBe(1);
    expect(next.mathFieldGamma).toBe(1);
  });

  it('applies neon visual profile', () => {
    getStoreState().applyVisualProfile('neon');
    const s = getStoreState();
    expect(s.activeProfile).toBe('neon');
    expect(s.bloom).toBe(true);
    expect(s.bloomIntensity).toBe(0.6);
    expect(s.environmentPreset).toBe('none');
  });
});

describe('Store — URL Serialization', () => {
  beforeEach(() => {
    resetStore();
  });

  it('encodes default state to empty-ish string', () => {
    const encoded = getStoreState().encodeToURL();
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('round-trips bond settings through URL', () => {
    const s = getStoreState();
    s.toggleBonds();
    s.setBondCutoff(3.2);
    s.setBondTolerance(0.7);

    const encoded = s.encodeToURL();
    resetStore();

    getStoreState().decodeFromURL(encoded);
    const restored = getStoreState();

    expect(restored.showBonds).toBe(true);
    expect(restored.bondCutoff).toBeCloseTo(3.2);
    expect(restored.bondTolerance).toBeCloseTo(0.7);
  });

  it('round-trips molecule filter shell settings through URL', () => {
    const s = getStoreState();
    s.setFilterShellShape('box');
    s.setFilterShellPreset('graphite');
    s.setFilterShellOpacity(0.42);
    s.setFilterShellRadius(1.35);

    const encoded = s.encodeToURL();
    resetStore();

    getStoreState().decodeFromURL(encoded);
    const restored = getStoreState();

    expect(restored.filterShellShape).toBe('box');
    expect(restored.filterShellPreset).toBe('graphite');
    expect(restored.filterShellOpacity).toBeCloseTo(0.42);
    expect(restored.filterShellRadius).toBeCloseTo(1.35);
  });

  it('round-trips math field controls through URL', () => {
    const s = getStoreState();
    s.setBackgroundPreset('moire-crystal');
    s.setMathFieldAlpha(1.7);
    s.setMathFieldBeta(2.4);
    s.setMathFieldGamma(0.6);

    const encoded = s.encodeToURL();
    resetStore();

    getStoreState().decodeFromURL(encoded);
    const restored = getStoreState();

    expect(restored.backgroundPreset).toBe('moire-crystal');
    expect(restored.mathFieldAlpha).toBeCloseTo(1.7);
    expect(restored.mathFieldBeta).toBeCloseTo(2.4);
    expect(restored.mathFieldGamma).toBeCloseTo(0.6);
  });
});

describe('Store — Atom Selection', () => {
  beforeEach(() => {
    resetStore();
  });

  it('toggles atom type visibility', () => {
    const s = getStoreState();
    s.toggleAtomType(1);
    expect(getStoreState().hiddenAtomTypes.has(1)).toBe(true);

    s.toggleAtomType(1);
    expect(getStoreState().hiddenAtomTypes.has(1)).toBe(false);
  });

  it('shows all atom types', () => {
    const s = getStoreState();
    s.toggleAtomType(1);
    s.toggleAtomType(2);
    s.showAllAtomTypes();
    expect(getStoreState().hiddenAtomTypes.size).toBe(0);
  });

});

describe('Store — File Loading', () => {
  beforeEach(() => {
    resetStore();
  });

  it('sets file and resets frame', () => {
    const traj = createMockTrajectory(5, 10);
    const file = { name: 'test.lmp', size: 1024, trajectory: traj, thermo: null };

    getStoreState().setFile(file);
    const s = getStoreState();

    expect(s.file?.name).toBe('test.lmp');
    expect(s.frame).toBe(0);
    expect(s.playing).toBe(false);
  });

  it('defaults fresh molecule loads to element coloring even with properties', () => {
    const traj = createMockTrajectory(1, 10);
    traj.frames[0].properties.set('energy', new Float32Array(10));
    getStoreState().setColorProperty('energy');
    const file = { name: 'property-rich.lmp', size: 2048, trajectory: traj, thermo: null };

    getStoreState().setFile(file);
    const s = getStoreState();

    expect(s.colorScheme).toBe('element');
    expect(s.colorMode).toBe('type');
    expect(s.atomColorSource).toBe('element');
    expect(s.colorProperty).toBeNull();
  });

  it('disables effects for massive systems', () => {
    const traj = createMockTrajectory(1, 100000); // 100K atoms
    const file = { name: 'big.lmp', size: 9999999, trajectory: traj, thermo: null };

    getStoreState().setFile(file);
    const s = getStoreState();

    expect(s.ssao).toBe(false);
    expect(s.bloom).toBe(false);
    expect(s.dof).toBe(false);
  });
});
