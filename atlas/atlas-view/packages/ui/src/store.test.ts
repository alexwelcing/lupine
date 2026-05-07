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

    const encoded = s.encodeToURL();
    resetStore();

    getStoreState().decodeFromURL(encoded);
    const restored = getStoreState();

    expect(restored.showBonds).toBe(true);
    expect(restored.bondCutoff).toBeCloseTo(3.2);
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

  it('sets selected atoms', () => {
    getStoreState().setSelectedAtoms([1, 5, 10]);
    expect(getStoreState().selectedAtoms).toEqual([1, 5, 10]);
  });

  it('accepts updater function for selected atoms', () => {
    getStoreState().setSelectedAtoms([1, 2]);
    getStoreState().setSelectedAtoms((prev) => [...prev, 3]);
    expect(getStoreState().selectedAtoms).toEqual([1, 2, 3]);
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
