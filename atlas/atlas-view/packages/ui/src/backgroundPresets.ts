/**
 * Background presets — shared definition used by both the desktop VisualsPanel
 * and the immersive XRControlPanel. Extracted to its own module to avoid
 * circular dependencies between App.tsx ↔ xr/*.tsx.
 */

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
  /**
   * Runtime-generated mathematical field. These backgrounds render as a shader
   * in the scene, so they stay crisp at export scale and do not need video.
   */
  procedural?: ProceduralBackgroundVariant;
  preview?: string;
  category?: string;
};

export const BG_PRESETS: Record<string, BgPreset> = {
  // ── Solid gradients (legacy) ──
  void:      { top: '#000000', bottom: '#000000', label: 'Void', category: 'gradient' },
  deep:      { top: '#080a14', bottom: '#000000', label: 'Deep Field', category: 'gradient' },
  dark:      { top: '#1a1a1f', bottom: '#0a0a0c', label: 'Dark', category: 'gradient' },
  white:     { top: '#ffffff', bottom: '#f0f0f5', label: 'White', category: 'gradient' },
  blueprint: { top: '#0b162c', bottom: '#050a14', label: 'Blueprint', category: 'gradient' },
  midnight:  { top: '#080c18', bottom: '#141e38', label: 'Midnight', category: 'gradient' },
  studio:    { top: '#1a1a2e', bottom: '#16213e', label: 'Studio', category: 'gradient' },
  slate:     { top: '#111827', bottom: '#020617', label: 'Slate', category: 'gradient' },
  warm:      { top: '#1a100c', bottom: '#0d0906', label: 'Warm Dark', category: 'gradient' },
  fog:       { top: '#101418', bottom: '#1c2028', label: 'Fog', category: 'gradient' },
  // ── Procedural mathematical fields ──
  'manifold-field': {
    top: '#081525',
    bottom: '#01030a',
    label: 'Manifold Field',
    procedural: 'manifold-field',
    preview: 'radial-gradient(circle at 32% 26%, #b6f4ff 0 2%, transparent 12%), radial-gradient(circle at 68% 64%, #ffb35a 0 2%, transparent 14%), conic-gradient(from 215deg at 52% 52%, #05070f, #123a56, #1ddce0, #6c4cff, #ff9f45, #05070f)',
    category: 'math',
  },
  'hopf-current': {
    top: '#071d25',
    bottom: '#010408',
    label: 'Hopf Current',
    procedural: 'hopf-current',
    preview: 'radial-gradient(ellipse at 50% 48%, transparent 0 34%, #72f7ff 35% 38%, transparent 42%), radial-gradient(ellipse at 42% 52%, transparent 0 26%, #ffcf66 27% 30%, transparent 34%), conic-gradient(from 145deg at 50% 50%, #02060b, #063649, #18d7df, #7f5cff, #f5a449, #02060b)',
    category: 'math',
  },
  'harmonic-bloom': {
    top: '#18112b',
    bottom: '#02030b',
    label: 'Harmonic Bloom',
    procedural: 'harmonic-bloom',
    preview: 'radial-gradient(circle at 50% 50%, #f8d47a 0 5%, transparent 18%), repeating-conic-gradient(from 12deg at 50% 50%, #070712 0 9deg, #402b80 12deg, #1edce0 16deg, #070712 23deg)',
    category: 'math',
  },
  'reaction-lattice': {
    top: '#061a15',
    bottom: '#010504',
    label: 'Reaction Lattice',
    procedural: 'reaction-lattice',
    preview: 'radial-gradient(circle at 28% 36%, #b8ffee 0 5%, transparent 14%), radial-gradient(circle at 68% 58%, #6dff9f 0 4%, transparent 16%), repeating-radial-gradient(circle at 52% 50%, #03100c 0 7%, #0b4033 10%, #1edce0 11%, #03100c 15%)',
    category: 'math',
  },
  'moire-crystal': {
    top: '#111728',
    bottom: '#03040a',
    label: 'Moire Crystal',
    procedural: 'moire-crystal',
    preview: 'linear-gradient(60deg, transparent 0 46%, #f7d36d 47% 49%, transparent 50%), linear-gradient(120deg, transparent 0 45%, #7af8ff 46% 48%, transparent 50%), repeating-conic-gradient(from 30deg at 50% 50%, #050714 0 8deg, #182d54 10deg, #6f57ff 13deg, #050714 21deg)',
    category: 'math',
  },
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
  marble:          { top: '#f8f8f8', bottom: '#e8e8ec', label: 'White Marble',     image: '/backgrounds/bg_white_marble.jpg',     category: 'studio' },
  iridescent:      { top: '#0a0a14', bottom: '#000000', label: 'Iridescent',       image: '/backgrounds/bg_iridescent.jpg',       category: 'material' },
  arctic:          { top: '#0c1018', bottom: '#060a10', label: 'Arctic Terrain',   image: '/backgrounds/bg_arctic_terrain.jpg',   category: 'terrain' },
  'plasma-arc':    { top: '#080814', bottom: '#000000', label: 'Plasma Arc',       image: '/backgrounds/bg_plasma_discharge.jpg', category: 'lab' },
  cream:           { top: '#f5efe8', bottom: '#f0e0d0', label: 'Warm Cream',       image: '/backgrounds/bg_warm_cream.jpg',       category: 'studio' },
  circuit:         { top: '#040810', bottom: '#000000', label: 'Circuit Trace',    image: '/backgrounds/bg_circuit_trace.jpg',    category: 'lab' },
  cellular:        { top: '#100a04', bottom: '#000000', label: 'Cellular',         image: '/backgrounds/bg_cellular.jpg',         category: 'organic' },
  concrete:        { top: '#1a1a1f', bottom: '#0a0a0c', label: 'Studio Concrete',  image: '/backgrounds/bg_studio_concrete.jpg',  category: 'studio' },
  spacetime:       { top: '#0a0814', bottom: '#000000', label: 'Spacetime',        image: '/backgrounds/bg_spacetime.jpg',        category: 'cosmic' },
  ocean:           { top: '#04080e', bottom: '#000000', label: 'Deep Ocean',       image: '/backgrounds/bg_deep_ocean.jpg',       category: 'terrain' },
  topographic:     { top: '#0c1018', bottom: '#060a10', label: 'Topographic',      image: '/backgrounds/bg_topographic.jpg',      category: 'terrain' },
  lavender:        { top: '#e8e0f0', bottom: '#d0c8e0', label: 'Lavender',         image: '/backgrounds/bg_lavender.jpg',         category: 'studio' },
  'hex-lattice':   { top: '#0a0a10', bottom: '#000000', label: 'Hex Lattice',      image: '/backgrounds/bg_hex_lattice.jpg',      category: 'lab' },
};
