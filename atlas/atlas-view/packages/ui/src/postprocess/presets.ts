/**
 * Postprocess presets — directorial looks, not a kitchen sink.
 *
 * Each preset is a coherent recipe: a curated combination of SSAO + Bloom
 * + DOF + Vignette + ToneMapping that's been tuned to read as a single
 * artistic intent. The user picks one and adjusts a single intensity
 * knob that scales the whole look proportionally.
 *
 * Legacy individual sliders still exist under "Advanced" for power users,
 * but they're not the primary UX anymore.
 */

export type PostprocessPresetId =
  | 'paper'      // print-faithful; for journal figures
  | 'studio'     // balanced; the default
  | 'editorial'  // moody dark; for slides on dark backgrounds
  | 'cinematic'  // shallow focus + bloom; for hero shots and trailers
  | 'diagram';   // no postprocess; for explanatory figures

/** Effect-stack parameters at intensity = 1. Intensity scales them. */
export interface PostprocessPresetConfig {
  id: PostprocessPresetId;
  label: string;
  /** One-line essence shown under the title in the gallery. */
  tagline: string;
  /** Performance tier — fast (SSAO+/-Bloom), balanced (+Vignette+ToneMap),
   *  heavy (+DOF). Communicated to the user as a tier badge. */
  performanceTier: 'fast' | 'balanced' | 'heavy';

  ssao: { enabled: boolean; intensity: number; radius: number };
  bloom: { enabled: boolean; intensity: number; threshold: number; smoothing: number };
  dof: { enabled: boolean; bokehScale: number; focalLength: number; focusDistance: number; auto: boolean };
  vignette: { enabled: boolean; offset: number; darkness: number };
  toneMapping: 'aces' | 'reinhard' | 'none';
  /** MSAA samples for the composer when not playing. 0 disables. */
  multisampling: 0 | 2 | 4 | 8;
  /** HDRI environment for IBL. The atom impostor shader and bond
   *  MeshPhysicalMaterial both sample this — single source of truth.
   *  `null` disables IBL (atoms fall back to neutral grey, bonds get no
   *  envMap). */
  env: {
    drei: 'studio' | 'apartment' | 'city' | 'dawn' | 'forest' | 'lobby' | 'night' | 'park' | 'sunset' | 'warehouse' | null;
  };
}

export const POSTPROCESS_PRESETS: Record<PostprocessPresetId, PostprocessPresetConfig> = {
  paper: {
    id: 'paper',
    label: 'Paper',
    tagline: 'Print-faithful. Neutral exposure, accurate depth cues.',
    performanceTier: 'fast',
    ssao: { enabled: true, intensity: 0.4, radius: 0.25 },
    bloom: { enabled: false, intensity: 0, threshold: 0.9, smoothing: 0.3 },
    dof: { enabled: false, bokehScale: 1, focalLength: 0.02, focusDistance: 0.5, auto: false },
    vignette: { enabled: false, offset: 0.5, darkness: 0.3 },
    toneMapping: 'aces',
    multisampling: 4,
    env: { drei: 'apartment' }, // neutral
  },
  studio: {
    id: 'studio',
    label: 'Studio',
    tagline: 'Clean lighting, balanced contrast. The default.',
    performanceTier: 'fast',
    ssao: { enabled: true, intensity: 0.55, radius: 0.3 },
    bloom: { enabled: true, intensity: 0.18, threshold: 0.85, smoothing: 0.3 },
    dof: { enabled: false, bokehScale: 1, focalLength: 0.02, focusDistance: 0.5, auto: false },
    vignette: { enabled: true, offset: 0.4, darkness: 0.4 },
    toneMapping: 'aces',
    multisampling: 4,
    env: { drei: 'studio' }, // balanced studio HDRI
  },
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    tagline: 'Moody contrast, strong rim emphasis. For dark slides.',
    performanceTier: 'balanced',
    ssao: { enabled: true, intensity: 0.85, radius: 0.32 },
    bloom: { enabled: true, intensity: 0.45, threshold: 0.7, smoothing: 0.25 },
    dof: { enabled: false, bokehScale: 1, focalLength: 0.02, focusDistance: 0.5, auto: false },
    vignette: { enabled: true, offset: 0.35, darkness: 0.65 },
    toneMapping: 'aces',
    multisampling: 4,
    env: { drei: 'night' }, // moody dark
  },
  cinematic: {
    id: 'cinematic',
    label: 'Cinematic',
    tagline: 'Shallow focus, deep bloom. Tells a story.',
    performanceTier: 'heavy',
    ssao: { enabled: true, intensity: 0.7, radius: 0.32 },
    bloom: { enabled: true, intensity: 0.6, threshold: 0.55, smoothing: 0.2 },
    dof: { enabled: true, bokehScale: 3, focalLength: 0.025, focusDistance: 0.5, auto: true },
    vignette: { enabled: true, offset: 0.3, darkness: 0.7 },
    toneMapping: 'aces',
    multisampling: 4,
    env: { drei: 'sunset' }, // warm sunset
  },
  diagram: {
    id: 'diagram',
    label: 'Diagram',
    tagline: 'No tricks. Pixel-faithful colors for figures.',
    performanceTier: 'fast',
    ssao: { enabled: false, intensity: 0, radius: 0.3 },
    bloom: { enabled: false, intensity: 0, threshold: 0.9, smoothing: 0.3 },
    dof: { enabled: false, bokehScale: 1, focalLength: 0.02, focusDistance: 0.5, auto: false },
    vignette: { enabled: false, offset: 0.5, darkness: 0.3 },
    toneMapping: 'none',
    multisampling: 4,
    env: { drei: null }, // flat — disables IBL
  },
};

export const PRESET_ORDER: PostprocessPresetId[] = ['paper', 'studio', 'editorial', 'cinematic', 'diagram'];

/** Apply intensity to a preset. Intensity 0 = effects disabled (preset still
 *  selected); 1 = preset's authored values; values > 1 over-drive. Most
 *  effects scale linearly; vignette darkness is non-linear (eyeball'd). */
export function scalePreset(preset: PostprocessPresetConfig, intensity: number): PostprocessPresetConfig {
  const t = Math.max(0, Math.min(2, intensity));
  // At intensity 0, disable everything but tone-mapping (color fidelity).
  const enable = (flag: boolean) => flag && t > 0;
  return {
    ...preset,
    ssao: {
      ...preset.ssao,
      enabled: enable(preset.ssao.enabled),
      intensity: preset.ssao.intensity * t,
    },
    bloom: {
      ...preset.bloom,
      enabled: enable(preset.bloom.enabled),
      intensity: preset.bloom.intensity * t,
    },
    dof: {
      ...preset.dof,
      enabled: enable(preset.dof.enabled),
      bokehScale: preset.dof.bokehScale * t,
    },
    vignette: {
      ...preset.vignette,
      enabled: enable(preset.vignette.enabled),
      darkness: preset.vignette.darkness * Math.min(1.2, t),
    },
  };
}

/** Strip expensive passes for playback. Tone mapping survives because it's
 *  cheap and required for color fidelity; everything else costs frames. */
export function reduceForPlayback(preset: PostprocessPresetConfig): PostprocessPresetConfig {
  return {
    ...preset,
    ssao: { ...preset.ssao, enabled: false },
    bloom: { ...preset.bloom, enabled: false },
    dof: { ...preset.dof, enabled: false },
    vignette: { ...preset.vignette, enabled: false },
    multisampling: 0,
  };
}

/** Stable composer key — only changes when the SET of enabled effects
 *  changes. Effect parameter changes flow through props without remount. */
export function composerKey(preset: PostprocessPresetConfig): string {
  return [
    preset.ssao.enabled ? 'ao' : '_',
    preset.bloom.enabled ? 'bl' : '_',
    preset.dof.enabled ? 'dof' : '_',
    preset.vignette.enabled ? 'vg' : '_',
    preset.toneMapping,
  ].join('|');
}
