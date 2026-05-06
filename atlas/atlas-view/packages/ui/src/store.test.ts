import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, getStoreState } from './test-utils';
import { createMockBondStats, createMockTrajectory } from '@atlas/core/test-utils';

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

  it('sets bond stats and retrieves them', () => {
    const stats = createMockBondStats({ count: 250, meanLength: 2.8 });
    getStoreState().setBondStats(stats);
    expect(getStoreState().bondStats?.count).toBe(250);
    expect(getStoreState().bondStats?.meanLength).toBe(2.8);
  });

  it('applies percentile cutoff from bond stats', () => {
    const stats = createMockBondStats({ minLength: 1.0, maxLength: 4.0 });
    // p95 should be around 3.85 (95% of range)
    stats.percentiles['p95'] = 3.85;

    getStoreState().setBondStats(stats);
    getStoreState().setBondPercentileRange([5, 95]);
    getStoreState().applyPercentileCutoff();

    expect(getStoreState().bondCutoff).toBeCloseTo(3.85);
  });

  it('toggles filament mode', () => {
    const s = getStoreState();
    expect(s.filamentMode).toBe(false);

    s.toggleFilamentMode();
    expect(getStoreState().filamentMode).toBe(true);
  });

  it('toggles MEAM screening', () => {
    const s = getStoreState();
    expect(s.meamScreening).toBe(false);

    s.toggleMeamScreening();
    expect(getStoreState().meamScreening).toBe(true);
  });

  it('toggles g(r)-driven cutoff', () => {
    const s = getStoreState();
    expect(s.grDrivenCutoff).toBe(false);

    s.toggleGrDrivenCutoff();
    expect(getStoreState().grDrivenCutoff).toBe(true);
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
    s.toggleFilamentMode();

    const encoded = s.encodeToURL();
    resetStore();

    getStoreState().decodeFromURL(encoded);
    const restored = getStoreState();

    expect(restored.showBonds).toBe(true);
    expect(restored.bondCutoff).toBeCloseTo(3.2);
    expect(restored.filamentMode).toBe(true);
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
