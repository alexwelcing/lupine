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
  icon: string;                // Emoji or icon identifier
  /** Material override preset. 'default' = per-element identity only. */
  materialPreset: 'default' | 'matte' | 'metallic' | 'glass' | 'plastic';
  /** 0 = per-element identity, 1 = full preset override. */
  materialIntensity: number;
  /** HDRI environment map. */
  environmentPreset: 'city' | 'studio' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'none';
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
    icon: '🔬',
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
    icon: '🏛️',
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
    icon: '📐',
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
    description: 'Hot workshop metal. Strong directional key, brushed anisotropy.',
    icon: '🔥',
    materialPreset: 'metallic',
    materialIntensity: 0.7,
    environmentPreset: 'warehouse',
    envIntensity: 1.5,
    ambientIntensity: 0.3,
    dirLightIntensity: 2.0,
    rimLightIntensity: 0.5,
    postprocessPreset: 'cinematic',
    toneMapping: 'aces',
    backgroundPreset: 'deep',
    atomTexture: 'scratched',
    cardGradient: 'linear-gradient(135deg, #3d1008, #6b2510)',
    accentColor: '#ff7043',
  },
  {
    id: 'crystallography',
    label: 'Crystal',
    description: 'X-ray diffraction aesthetic. Translucent glass, bloom glow.',
    icon: '💎',
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
    icon: '🌌',
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
    icon: '🔮',
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
    icon: '🧬',
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
];

/** Lookup a scene by ID. Returns undefined if not found. */
export function getScene(id: string): MaterialScene | undefined {
  return MATERIAL_SCENES.find(s => s.id === id);
}

/** The default scene applied on first load. */
export const DEFAULT_SCENE_ID = 'specimen';
