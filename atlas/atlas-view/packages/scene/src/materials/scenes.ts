/**
 * Material Scenes — curated, holistic visual presets.
 *
 * Each scene coordinates material, lighting, environment, and post-processing
 * into a single authored look. The user picks a scene and gets a polished
 * result; they can refine individual parameters afterward.
 *
 * `materialIntensity` controls how much the global material override blends
 * over per-element identity:
 *   0.0 = pure per-element (Au reads gold, O reads glass, C reads matte)
 *   1.0 = full override (everything uses materialPreset)
 *
 * Scenes that set intensity < 1.0 let the per-element character show through
 * the preset — the best of both worlds.
 */

export interface MaterialScene {
  id: string;
  label: string;
  description: string;
  code: string;                // Short text code used in preset cards.
  /** Material override preset. 'default' = per-element identity only. */
  materialPreset: 'default' | 'matte' | 'metallic' | 'glass' | 'plastic';
  /** 0 = per-element identity, 1 = full preset override. */
  materialIntensity: number;
  /** HDRI environment map. */
  environmentPreset: 'city' | 'studio' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'park' | 'none';
  /** Environment map contribution multiplier. */
  envIntensity: number;
  /** Fill / ambient light. */
  ambientIntensity: number;
  /** Key / directional light. */
  dirLightIntensity: number;
  /** Rim light strength (0 = off). Adds a backlit edge for depth. */
  rimLightIntensity: number;
  /** Post-processing preset. */
  postprocessPreset: 'paper' | 'studio' | 'editorial' | 'cinematic' | 'diagram';
  /** Tone mapping. */
  toneMapping: 'none' | 'aces' | 'reinhard';
  /** Background preset name. */
  backgroundPreset: string;
  /** Atom surface texture overlay. */
  atomTexture: 'none' | 'scratched' | 'noise';
  /** CSS gradient for the card background (visual identity in UI). */
  cardGradient: string;
  /** Accent color for the active-state glow. */
  accentColor: string;
}

/**
 * Curated scenes, ordered by intended discovery flow:
 * scientific → polished → dramatic → experimental.
 */
export const MATERIAL_SCENES: MaterialScene[] = [
  // ─── Scientific Tier ─────────────────────────────────────────────────
  {
    id: 'laboratory',
    label: 'Laboratory',
    description: 'Clean scientific documentation. Neutral light, per-element identity.',
    code: 'LAB',
    materialPreset: 'default',
    materialIntensity: 0.0,
    environmentPreset: 'studio',
    envIntensity: 0.8,
    ambientIntensity: 0.8,
    dirLightIntensity: 1.0,
    rimLightIntensity: 0.0,
    postprocessPreset: 'paper',
    toneMapping: 'aces',
    backgroundPreset: 'white',
    atomTexture: 'none',
    cardGradient: 'linear-gradient(135deg, #1a2332, #2a3a4a)',
    accentColor: '#64b5f6',
  },
  {
    id: 'specimen',
    label: 'Specimen',
    description: 'Museum-quality display. Warm key light reveals per-element character.',
    code: 'SPC',
    materialPreset: 'default',
    materialIntensity: 0.0,
    environmentPreset: 'apartment',
    envIntensity: 1.2,
    ambientIntensity: 0.5,
    dirLightIntensity: 1.5,
    rimLightIntensity: 0.3,
    postprocessPreset: 'studio',
    toneMapping: 'aces',
    backgroundPreset: 'deep',
    atomTexture: 'none',
    cardGradient: 'linear-gradient(135deg, #2d1f0e, #4a3520)',
    accentColor: '#ffb74d',
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    description: 'Technical diagram style. Flat matte, high fill, no distractions.',
    code: 'BLU',
    materialPreset: 'matte',
    materialIntensity: 1.0,
    environmentPreset: 'none',
    envIntensity: 0.0,
    ambientIntensity: 1.0,
    dirLightIntensity: 0.5,
    rimLightIntensity: 0.0,
    postprocessPreset: 'diagram',
    toneMapping: 'none',
    backgroundPreset: 'slate',
    atomTexture: 'none',
    cardGradient: 'linear-gradient(135deg, #0d1b2a, #1b2838)',
    accentColor: '#90a4ae',
  },

  // ─── Polished Tier ───────────────────────────────────────────────────
  {
    id: 'forge',
    label: 'Forge',
    description: 'Warm brushed metal. Industrial reflections without the heavy hero-shot effects.',
    code: 'FRG',
    materialPreset: 'metallic',
    materialIntensity: 0.42,
    environmentPreset: 'warehouse',
    envIntensity: 1.05,
    ambientIntensity: 0.48,
    dirLightIntensity: 1.35,
    rimLightIntensity: 0.28,
    postprocessPreset: 'studio',
    toneMapping: 'aces',
    backgroundPreset: 'deep',
    atomTexture: 'none',
    cardGradient: 'linear-gradient(135deg, #211812, #4a2b1d)',
    accentColor: '#d8904f',
  },
  {
    id: 'crystallography',
    label: 'Crystal',
    description: 'X-ray diffraction aesthetic. Translucent glass, bloom glow.',
    code: 'XTL',
    materialPreset: 'glass',
    materialIntensity: 0.85,
    environmentPreset: 'none',
    envIntensity: 0.3,
    ambientIntensity: 0.2,
    dirLightIntensity: 0.3,
    rimLightIntensity: 0.8,
    postprocessPreset: 'editorial',
    toneMapping: 'aces',
    backgroundPreset: 'void',
    atomTexture: 'none',
    cardGradient: 'linear-gradient(135deg, #0a1628, #162040)',
    accentColor: '#80d8ff',
  },

  // ─── Dramatic Tier ───────────────────────────────────────────────────
  {
    id: 'deep_space',
    label: 'Deep Space',
    description: 'Atoms floating in void. Per-element emission, subtle bloom.',
    code: 'DSP',
    materialPreset: 'default',
    materialIntensity: 0.0,
    environmentPreset: 'night',
    envIntensity: 0.6,
    ambientIntensity: 0.1,
    dirLightIntensity: 0.2,
    rimLightIntensity: 0.6,
    postprocessPreset: 'cinematic',
    toneMapping: 'aces',
    backgroundPreset: 'void',
    atomTexture: 'none',
    cardGradient: 'linear-gradient(135deg, #050510, #0a0a25)',
    accentColor: '#b388ff',
  },
  {
    id: 'holograph',
    label: 'Holograph',
    description: 'Sci-fi holographic display. Glass with emission edge glow.',
    code: 'HOL',
    materialPreset: 'glass',
    materialIntensity: 0.6,
    environmentPreset: 'none',
    envIntensity: 0.1,
    ambientIntensity: 0.0,
    dirLightIntensity: 0.1,
    rimLightIntensity: 1.0,
    postprocessPreset: 'editorial',
    toneMapping: 'aces',
    backgroundPreset: 'void',
    atomTexture: 'none',
    cardGradient: 'linear-gradient(135deg, #001a1a, #003333)',
    accentColor: '#1de9b6',
  },
  {
    id: 'subsurface',
    label: 'Organic',
    description: 'Biological feel. High subsurface scattering, soft forest light.',
    code: 'ORG',
    materialPreset: 'plastic',
    materialIntensity: 0.5,
    environmentPreset: 'forest',
    envIntensity: 1.0,
    ambientIntensity: 0.6,
    dirLightIntensity: 0.8,
    rimLightIntensity: 0.2,
    postprocessPreset: 'studio',
    toneMapping: 'aces',
    backgroundPreset: 'deep',
    atomTexture: 'none',
    cardGradient: 'linear-gradient(135deg, #0a1f0a, #1a3a1a)',
    accentColor: '#69f0ae',
  },

  // ─── Picnic / Outdoor Cinema ─────────────────────────────────────────
  {
    id: 'picnic',
    label: 'Picnic',
    description: 'Outdoor park setting for natural asset viewing. Ideal for cinematic movie watching and image inspection under realistic daylight.',
    code: 'PIC',
    materialPreset: 'default',
    materialIntensity: 0.2,
    environmentPreset: 'park',
    envIntensity: 1.1,
    ambientIntensity: 0.7,
    dirLightIntensity: 1.2,
    rimLightIntensity: 0.15,
    postprocessPreset: 'cinematic',
    toneMapping: 'aces',
    backgroundPreset: 'lavender',
    atomTexture: 'none',
    cardGradient: 'linear-gradient(135deg, #1a2f1a, #2a4a2a)',
    accentColor: '#a5d6a7',
  },
];

/** Lookup a scene by ID. Returns undefined if not found. */
export function getScene(id: string): MaterialScene | undefined {
  return MATERIAL_SCENES.find(s => s.id === id);
}

/** The default scene applied on first load. */
export const DEFAULT_SCENE_ID = 'specimen';
