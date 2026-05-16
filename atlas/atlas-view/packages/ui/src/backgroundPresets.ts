/**
 * Background presets — shared definition used by both the desktop VisualsPanel
 * and the immersive XRControlPanel. Extracted to its own module to avoid
 * circular dependencies between App.tsx ↔ xr/*.tsx.
 */

export type BgPreset = {
  top: string;
  bottom: string;
  label: string;
  image?: string;
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
  warm:      { top: '#1a100c', bottom: '#0d0906', label: 'Warm Dark', category: 'gradient' },
  fog:       { top: '#101418', bottom: '#1c2028', label: 'Fog', category: 'gradient' },
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
