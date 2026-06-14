import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, getStoreState } from './test-utils';
import { createMockTrajectory } from '@atlas/core/test-utils';
import { DEFAULT_SCENE_ID } from '@atlas/scene/materials';

function encodeStateDelta(delta: Record<string, unknown>) {
  return btoa(JSON.stringify(delta))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

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

  it('keeps atom color schemes independent from surface render style', () => {
    getStoreState().setRenderStyle('toon');
    getStoreState().setColorScheme('botanical');

    const s = getStoreState();
    expect(s.colorScheme).toBe('botanical');
    expect(s.atomColorSource).toBe('botanical');
    expect(s.renderStyle).toBe('toon');
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

  it('round-trips shareable look settings through URL', () => {
    const s = getStoreState();
    s.setColorScheme('uniform');
    s.setUniformAtomColor('#ff8844');
    s.setPostprocessPreset('cinematic');
    s.setPostprocessIntensity(1.35);
    s.setRenderStyle('botanical');
    s.setMaterialScene('forge');
    s.setMaterialPreset('metallic');
    s.setMaterialIntensity(0.42);
    s.setEnvironmentPreset('warehouse');
    s.setBackgroundPreset('void');
    s.setBackgroundStyle('spotlight');
    s.setRimLightIntensity(0.75);
    s.setFillLightColor('#223344');
    s.setRimLightColor('#ddeeff');

    const encoded = s.encodeToURL();
    resetStore();
    getStoreState().decodeFromURL(encoded);
    const restored = getStoreState();

    expect(restored.colorScheme).toBe('uniform');
    expect(restored.uniformAtomColor).toBe('#ff8844');
    expect(restored.postprocessPreset).toBe('cinematic');
    expect(restored.postprocessIntensity).toBeCloseTo(1.35);
    expect(restored.renderStyle).toBe('botanical');
    expect(restored.materialScene).toBe('forge');
    expect(restored.materialPreset).toBe('metallic');
    expect(restored.materialIntensity).toBeCloseTo(0.42);
    expect(restored.environmentPreset).toBe('warehouse');
    expect(restored.backgroundPreset).toBe('void');
    expect(restored.backgroundStyle).toBe('spotlight');
    expect(restored.rimLightIntensity).toBeCloseTo(0.75);
    expect(restored.fillLightColor).toBe('#223344');
    expect(restored.rimLightColor).toBe('#ddeeff');
  });

  it('sanitizes invalid look settings from URL state', () => {
    getStoreState().decodeFromURL(encodeStateDelta({
      ms: 'missing-scene',
      mp: 'mirror-metal',
      env: 'orbital',
    }));

    const restored = getStoreState();
    expect(restored.materialScene).toBe(DEFAULT_SCENE_ID);
    expect(restored.materialPreset).toBe('default');
    expect(restored.environmentPreset).toBe('studio');
  });

  it('infers color scheme for legacy URL color state', () => {
    getStoreState().decodeFromURL(encodeStateDelta({
      cm: 'property',
      cp: 'energy',
      cmap: 'turbo',
    }));

    let restored = getStoreState();
    expect(restored.colorScheme).toBe('property');
    expect(restored.atomColorSource).toBe('colormap');
    expect(restored.colorMode).toBe('property');
    expect(restored.colorProperty).toBe('energy');

    resetStore();
    getStoreState().decodeFromURL(encodeStateDelta({
      cm: 'type',
      cmap: 'plasma',
    }));

    restored = getStoreState();
    expect(restored.colorScheme).toBe('family');
    expect(restored.atomColorSource).toBe('colormap');
    expect(restored.colorMode).toBe('type');
    expect(restored.colormap).toBe('plasma');
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

  it('opens small molecules with the polished visual default', () => {
    const traj = createMockTrajectory(1, 61);
    const file = { name: 'showcase.xyz', size: 4096, trajectory: traj, thermo: null };

    getStoreState().setFile(file);
    const s = getStoreState();

    expect(s.showBonds).toBe(true);
    expect(s.showCell).toBe(false);
    expect(s.showAxes).toBe(false);
    expect(s.postprocessPreset).toBe('editorial');
    expect(s.backgroundPreset).toBe('xray-lagoon');
    expect(s.rimLightColor).toBe('#7de9ff');
    expect(s.surfacePolish).toBeGreaterThan(0);
    expect(s.surfaceClearcoat).toBeGreaterThan(0);
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
