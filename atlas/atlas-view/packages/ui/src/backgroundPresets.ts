/**
 * Background presets — shared definition used by both the desktop VisualsPanel
 * and the immersive XRControlPanel. Extracted to its own module to avoid
 * circular dependencies between App.tsx ↔ xr/*.tsx.
 */

import motionLoopManifestJson from '../../../tools/lupi-motion-loops.json';
import publicationBackgroundManifestJson from '../../../tools/lupi-publication-backgrounds.json';

export const MATH_BACKGROUND_IDS = [
  'manifold-field',
  'hopf-current',
  'harmonic-bloom',
  'reaction-lattice',
  'moire-crystal',
] as const;

export type ProceduralBackgroundVariant = typeof MATH_BACKGROUND_IDS[number];

export type BgPreset = {
  top: string;
  bottom: string;
  label: string;
  image?: string;
  media?: BgMedia;
  procedural?: ProceduralBackgroundVariant;
  preview?: string;
  category?: string;
  picker?: 'featured' | 'standard' | 'archive';
  badge?: string;
  intensity?: 'quiet' | 'balanced' | 'active';
  context?: string;
};

export type BgPresetWithId = BgPreset & { id: string };

export type BgVideoSource = {
  src: string;
  type?: 'video/webm' | 'video/mp4' | string;
  tier?: string;
  width?: number;
  height?: number;
};

export type BgMedia =
  | { kind: 'gradient'; projection: 'equirectangular' }
  | {
      kind: 'image';
      src: string;
      poster?: string;
      projection: 'equirectangular';
      width?: number;
      height?: number;
    }
  | {
      kind: 'video';
      sources: BgVideoSource[];
      poster?: string;
      projection: 'equirectangular';
      width?: number;
      height?: number;
      fps?: number;
      durationSeconds?: number;
      loop?: boolean;
      muted?: boolean;
      preload?: 'none' | 'metadata' | 'auto';
    };

export const EQUIRECT_PANORAMA_SIZE = { width: 4096, height: 2048 } as const;

export function inferVideoType(src: string): BgVideoSource['type'] {
  const normalized = src.split('?')[0].toLowerCase();
  if (normalized.endsWith('.webm')) return 'video/webm';
  if (normalized.endsWith('.mp4') || normalized.endsWith('.m4v')) return 'video/mp4';
  return undefined;
}

export function getBgMedia(preset: BgPreset): BgMedia {
  if (preset.media) return preset.media;
  if (preset.image) {
    return {
      kind: 'image',
      src: preset.image,
      poster: preset.image,
      projection: 'equirectangular',
      ...EQUIRECT_PANORAMA_SIZE,
    };
  }
  return { kind: 'gradient', projection: 'equirectangular' };
}

export function getBgPoster(preset: BgPreset): string | undefined {
  const media = getBgMedia(preset);
  if (media.kind === 'image') return media.poster ?? media.src;
  if (media.kind === 'video') return media.poster;
  return preset.image;
}

export function isTexturedBgPreset(preset: BgPreset): boolean {
  return Boolean(preset.procedural) || getBgMedia(preset).kind !== 'gradient';
}

export function isPickerBgPreset(preset: BgPreset): boolean {
  return isTexturedBgPreset(preset) && preset.picker !== 'archive';
}

export function isVideoBgPreset(preset: BgPreset): boolean {
  return getBgMedia(preset).kind === 'video';
}

export function getBgBadge(preset: BgPreset): string | undefined {
  if (getBgMedia(preset).kind === 'video') return preset.badge ?? 'LOOP';
  return preset.badge;
}

type MotionLoopTier = {
  id: string;
  width: number;
  height: number;
  file_suffix?: string;
  format?: string;
  public?: boolean;
};

type MotionLoopRecipe = {
  viewer_preset_id: string;
  label: string;
  poster: string;
  output_base: string;
  top: string;
  bottom: string;
  intensity?: BgPreset['intensity'];
  badge?: string;
};

type MotionLoopManifest = {
  runtime_tier?: string;
  tiers: MotionLoopTier[];
  loops: MotionLoopRecipe[];
};

const MOTION_LOOP_MANIFEST = motionLoopManifestJson as MotionLoopManifest;

function motionLoopFile(recipe: MotionLoopRecipe, tier: MotionLoopTier): string {
  return `${recipe.output_base}${tier.file_suffix ?? ''}.${tier.format ?? 'mp4'}`;
}

function equirectVideoMedia(sources: string | BgVideoSource[], poster: string, size = { width: 2048, height: 1024 }): BgMedia {
  const videoSources = typeof sources === 'string'
    ? [{ src: sources, type: inferVideoType(sources), ...size }]
    : sources.map(source => ({ ...source, type: source.type ?? inferVideoType(source.src) }));

  return {
    kind: 'video',
    sources: videoSources,
    poster,
    projection: 'equirectangular',
    width: size.width,
    height: size.height,
    fps: 24,
    durationSeconds: 8,
    loop: true,
    muted: true,
    preload: 'auto',
  };
}

const MOTION_RUNTIME_TIER = MOTION_LOOP_MANIFEST.tiers.find(tier => tier.id === (MOTION_LOOP_MANIFEST.runtime_tier ?? 'quality'))
  ?? MOTION_LOOP_MANIFEST.tiers[0];

const MOTION_LOOP_PRESETS: Record<string, BgPreset> = Object.fromEntries(
  MOTION_LOOP_MANIFEST.loops.map(recipe => {
    const publicTiers = MOTION_LOOP_MANIFEST.tiers.filter(tier => tier.public !== false);
    const orderedTiers = [...publicTiers].sort((a, b) => a.width - b.width);
    const sources = orderedTiers.map(tier => {
      const file = motionLoopFile(recipe, tier);
      return {
        src: `/backgrounds/${file}`,
        type: inferVideoType(file),
        tier: tier.id,
        width: tier.width,
        height: tier.height,
      };
    });

    return [
      recipe.viewer_preset_id,
      {
        top: recipe.top,
        bottom: recipe.bottom,
        label: recipe.label,
        media: equirectVideoMedia(sources, `/backgrounds/${recipe.poster}`, {
          width: MOTION_RUNTIME_TIER.width,
          height: MOTION_RUNTIME_TIER.height,
        }),
        category: 'motion',
        badge: recipe.badge,
        intensity: recipe.intensity,
      },
    ];
  }),
);

type PublicationBackgroundRecipe = {
  viewer_preset_id: string;
  label: string;
  file: string;
  top: string;
  bottom: string;
  badge?: string;
  intensity?: BgPreset['intensity'];
  context?: string;
};

type PublicationBackgroundManifest = {
  assets: PublicationBackgroundRecipe[];
};

const PUBLICATION_BACKGROUND_MANIFEST = publicationBackgroundManifestJson as PublicationBackgroundManifest;

const PUBLICATION_PRESETS: Record<string, BgPreset> = Object.fromEntries(
  PUBLICATION_BACKGROUND_MANIFEST.assets.map(recipe => [
    recipe.viewer_preset_id,
    {
      top: recipe.top,
      bottom: recipe.bottom,
      label: recipe.label,
      image: `/backgrounds/${recipe.file}`,
      category: 'publication',
      badge: recipe.badge ?? 'PUB',
      intensity: recipe.intensity,
      context: recipe.context,
    },
  ]),
);

export const BG_PRESETS: Record<string, BgPreset> = {
  // ── Solid gradients (legacy) ──
  void:      { top: '#000000', bottom: '#000000', label: 'Void', category: 'gradient' },
  deep:      { top: '#080a14', bottom: '#000000', label: 'Deep Field', category: 'gradient' },
  dark:      { top: '#1a1a1f', bottom: '#0a0a0c', label: 'Dark', category: 'gradient' },
  white:     { top: '#ffffff', bottom: '#f0f0f5', label: 'White', category: 'gradient' },
  blueprint: { top: '#0b162c', bottom: '#050a14', label: 'Blueprint', category: 'gradient' },
  slate:     { top: '#111827', bottom: '#020617', label: 'Slate', category: 'gradient' },
  midnight:  { top: '#080c18', bottom: '#141e38', label: 'Midnight', category: 'gradient' },
  studio:    { top: '#1a1a2e', bottom: '#16213e', label: 'Studio', category: 'gradient' },
  warm:      { top: '#1a100c', bottom: '#0d0906', label: 'Warm Dark', category: 'gradient' },
  fog:       { top: '#101418', bottom: '#1c2028', label: 'Fog', category: 'gradient' },
  'manifold-field': {
    top: '#081525',
    bottom: '#01030a',
    label: 'Manifold Field',
    procedural: 'manifold-field',
    preview: 'radial-gradient(circle at 32% 26%, #b6f4ff 0 2%, transparent 12%), radial-gradient(circle at 68% 64%, #ffb35a 0 2%, transparent 14%), conic-gradient(from 215deg at 52% 52%, #05070f, #123a56, #1ddce0, #6c4cff, #ff9f45, #05070f)',
    category: 'math',
    badge: 'MATH',
    intensity: 'balanced',
  },
  'hopf-current': {
    top: '#071d25',
    bottom: '#010408',
    label: 'Hopf Current',
    procedural: 'hopf-current',
    preview: 'radial-gradient(ellipse at 50% 48%, transparent 0 34%, #72f7ff 35% 38%, transparent 42%), radial-gradient(ellipse at 42% 52%, transparent 0 26%, #ffcf66 27% 30%, transparent 34%), conic-gradient(from 145deg at 50% 50%, #02060b, #063649, #18d7df, #7f5cff, #f5a449, #02060b)',
    category: 'math',
    badge: 'MATH',
    intensity: 'active',
  },
  'harmonic-bloom': {
    top: '#18112b',
    bottom: '#02030b',
    label: 'Harmonic Bloom',
    procedural: 'harmonic-bloom',
    preview: 'radial-gradient(circle at 50% 50%, #f8d47a 0 5%, transparent 18%), repeating-conic-gradient(from 12deg at 50% 50%, #070712 0 9deg, #402b80 12deg, #1edce0 16deg, #070712 23deg)',
    category: 'math',
    badge: 'MATH',
    intensity: 'balanced',
  },
  'reaction-lattice': {
    top: '#061a15',
    bottom: '#010504',
    label: 'Reaction Lattice',
    procedural: 'reaction-lattice',
    preview: 'radial-gradient(circle at 28% 36%, #b8ffee 0 5%, transparent 14%), radial-gradient(circle at 68% 58%, #6dff9f 0 4%, transparent 16%), repeating-radial-gradient(circle at 52% 50%, #03100c 0 7%, #0b4033 10%, #1edce0 11%, #03100c 15%)',
    category: 'math',
    badge: 'MATH',
    intensity: 'balanced',
  },
  'moire-crystal': {
    top: '#111728',
    bottom: '#03040a',
    label: 'Moire Crystal',
    procedural: 'moire-crystal',
    preview: 'linear-gradient(60deg, transparent 0 46%, #f7d36d 47% 49%, transparent 50%), linear-gradient(120deg, transparent 0 45%, #7af8ff 46% 48%, transparent 50%), repeating-conic-gradient(from 30deg at 50% 50%, #050714 0 8deg, #182d54 10deg, #6f57ff 13deg, #050714 21deg)',
    category: 'math',
    badge: 'MATH',
    intensity: 'active',
  },
  ...PUBLICATION_PRESETS,
  // ── Image textures (AI-generated) ──
  nebula:          { top: '#080a14', bottom: '#000000', label: 'Nebula',           image: '/backgrounds/bg_nebula_indigo.jpg',    category: 'cosmic' },
  aurora:          { top: '#061210', bottom: '#000000', label: 'Aurora',           image: '/backgrounds/bg_aurora_teal.jpg',      category: 'cosmic' },
  'plasma-smoke':  { top: '#0a0610', bottom: '#000000', label: 'Plasma Smoke',     image: '/backgrounds/bg_plasma_smoke.jpg',     category: 'cosmic' },
  copper:          { top: '#1a100c', bottom: '#000000', label: 'Copper Shimmer',   image: '/backgrounds/bg_copper_shimmer.jpg',   category: 'material' },
  starfield:       { top: '#000000', bottom: '#000000', label: 'Starfield',        image: '/backgrounds/bg_deep_starfield.jpg',   category: 'cosmic' },
  'navy-grad':     { top: '#0b162c', bottom: '#1a1a2e', label: 'Navy Gradient',    image: '/backgrounds/bg_navy_gradient.jpg',    category: 'studio' },
  crystal:         { top: '#081018', bottom: '#000000', label: 'Crystal Ice',      image: '/backgrounds/bg_crystal_ice.jpg',      category: 'material' },
  bioluminescent:  { top: '#040810', bottom: '#000000', label: 'Bioluminescent',   image: '/backgrounds/bg_bioluminescent.jpg',   category: 'organic' },
  volcanic:        { top: '#120604', bottom: '#000000', label: 'Volcanic Ember',   image: '/backgrounds/bg_volcanic_ember.jpg',   category: 'material' },
  'rose-gold':     { top: '#140a0c', bottom: '#000000', label: 'Rose Gold',        image: '/backgrounds/bg_rose_gold.jpg',        category: 'material' },
  phosphor:        { top: '#040a04', bottom: '#000000', label: 'Phosphor Screen',  image: '/backgrounds/bg_phosphor_screen.jpg',  category: 'lab' },
  marble:          { top: '#f8f8f8', bottom: '#e8e8ec', label: 'White Marble',     image: '/backgrounds/bg_white_marble.jpg',     category: 'studio', picker: 'archive' },
  iridescent:      { top: '#0a0a14', bottom: '#000000', label: 'Iridescent',       image: '/backgrounds/bg_iridescent.jpg',       category: 'material' },
  arctic:          { top: '#0c1018', bottom: '#060a10', label: 'Arctic Terrain',   image: '/backgrounds/bg_arctic_terrain.jpg',   category: 'terrain' },
  'plasma-arc':    { top: '#080814', bottom: '#000000', label: 'Plasma Arc',       image: '/backgrounds/bg_plasma_discharge.jpg', category: 'lab' },
  cream:           { top: '#f5efe8', bottom: '#f0e0d0', label: 'Warm Cream',       image: '/backgrounds/bg_warm_cream.jpg',       category: 'studio', picker: 'archive' },
  circuit:         { top: '#040810', bottom: '#000000', label: 'Circuit Trace',    image: '/backgrounds/bg_circuit_trace.jpg',    category: 'lab' },
  cellular:        { top: '#100a04', bottom: '#000000', label: 'Cellular',         image: '/backgrounds/bg_cellular.jpg',         category: 'organic' },
  concrete:        { top: '#1a1a1f', bottom: '#0a0a0c', label: 'Studio Concrete',  image: '/backgrounds/bg_studio_concrete.jpg',  category: 'studio' },
  spacetime:       { top: '#0a0814', bottom: '#000000', label: 'Spacetime',        image: '/backgrounds/bg_spacetime.jpg',        category: 'cosmic' },
  ocean:           { top: '#04080e', bottom: '#000000', label: 'Deep Ocean',       image: '/backgrounds/bg_deep_ocean.jpg',       category: 'terrain' },
  topographic:     { top: '#0c1018', bottom: '#060a10', label: 'Topographic',      image: '/backgrounds/bg_topographic.jpg',      category: 'terrain' },
  lavender:        { top: '#e8e0f0', bottom: '#d0c8e0', label: 'Lavender',         image: '/backgrounds/bg_lavender.jpg',         category: 'studio', picker: 'archive' },
  'hex-lattice':   { top: '#0a0a10', bottom: '#000000', label: 'Hex Lattice',      image: '/backgrounds/bg_hex_lattice.jpg',      category: 'lab', picker: 'archive' },
  'quantum-fog':   { top: '#08111c', bottom: '#010307', label: 'Quantum Fog',      image: '/backgrounds/bg_quantum_fog.jpg',      category: 'signature', badge: 'NEW', intensity: 'quiet' },
  'neutrino-rain': { top: '#06101c', bottom: '#000000', label: 'Neutrino Rain',    image: '/backgrounds/bg_neutrino_rain.jpg',    category: 'signature', badge: 'NEW', intensity: 'balanced' },
  'protein-dream': { top: '#102029', bottom: '#02060a', label: 'Protein Dream',    image: '/backgrounds/bg_protein_dream.jpg',    category: 'signature', badge: 'NEW', intensity: 'quiet' },
  'xray-lagoon':   { top: '#071b1b', bottom: '#000304', label: 'X-Ray Lagoon',     image: '/backgrounds/bg_xray_lagoon.jpg',      category: 'signature', badge: 'NEW', intensity: 'balanced' },
  'enzyme-aurora': { top: '#08221f', bottom: '#010605', label: 'Enzyme Aurora',    image: '/backgrounds/bg_enzyme_aurora.jpg',    category: 'signature', badge: 'NEW', intensity: 'balanced' },
  'vacuum-foam':   { top: '#050b12', bottom: '#000000', label: 'Vacuum Foam',      image: '/backgrounds/bg_vacuum_foam.jpg',      category: 'signature', badge: 'NEW', intensity: 'quiet' },
  'moire-field':   { top: '#06221f', bottom: '#010604', label: 'Moire Field',      image: '/backgrounds/bg_moire_field.jpg',      category: 'signature', badge: 'NEW', intensity: 'active' },
  'molten-circuit': { top: '#100806', bottom: '#000000', label: 'Molten Circuit',  image: '/backgrounds/bg_molten_circuit_sea.jpg', category: 'signature', badge: 'NEW', intensity: 'active' },
  ...MOTION_LOOP_PRESETS,
};

export const BG_GRADIENT_PRESETS: BgPresetWithId[] = Object.entries(BG_PRESETS)
  .filter(([, preset]) => preset.category === 'gradient')
  .map(([id, preset]) => ({ id, ...preset }));

export const BG_VIDEO_PRESETS: BgPresetWithId[] = Object.entries(BG_PRESETS)
  .filter(([, preset]) => isVideoBgPreset(preset) && isPickerBgPreset(preset))
  .map(([id, preset]) => ({ id, ...preset }));

const TEXTURE_CATEGORY_ORDER = [
  { label: 'Mathematical Fields', categories: ['math'] },
  { label: 'Publication Contexts', categories: ['publication'] },
  { label: 'Motion Loops', categories: ['motion'] },
  { label: 'Signature Stills', categories: ['signature'] },
  { label: 'Cosmic', categories: ['cosmic'] },
  { label: 'Material', categories: ['material'] },
  { label: 'Lab', categories: ['lab'] },
  { label: 'Studio', categories: ['studio'] },
  { label: 'Environment', categories: ['organic', 'terrain'] },
] as const;

export const BG_TEXTURE_CATEGORIES = TEXTURE_CATEGORY_ORDER
  .map(({ label, categories }) => {
    const categorySet = new Set<string>(categories);
    return {
      label,
      presets: Object.entries(BG_PRESETS)
        .filter(([, preset]) => Boolean(preset.category && categorySet.has(preset.category) && isPickerBgPreset(preset)))
        .map(([id, preset]) => ({ id, ...preset })),
    };
  })
  .filter(category => category.presets.length > 0);
