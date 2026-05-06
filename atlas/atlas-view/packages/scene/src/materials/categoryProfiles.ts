/**
 * categoryProfiles — material defaults per element category.
 *
 * Every element falls into one of these categories (mapped by atomic number
 * in elementProfiles.ts). The category profile is the fallback look — used
 * when no per-element override exists. This is what gives a brand-new
 * element you've never seen before a sensible appearance the moment a
 * dump file references it.
 *
 * Categories are chosen to match physical/visual character, not to mirror
 * IUPAC group numbers exactly. Lanthanides + actinides share a category
 * because they read similarly (heavy rare-earth metallic). Transition
 * metals are split into warm / cool / dull because Cu and Cr should not
 * look the same.
 */

import type { ElementProfile } from './ElementProfile';

export type MaterialCategory =
  | 'hydrogen'
  | 'noble_gas'
  | 'alkali'
  | 'alkaline_earth'
  | 'transition_warm'   // Cu, Fe, Co, Ni — warm metallics
  | 'transition_cool'   // Ag, Pt, Pd, Ti — cool polished metallics
  | 'transition_dull'   // Mn, Zn, Mo, W — matte metallics
  | 'post_transition'   // Al, Pb, Sn — softer metallics
  | 'metalloid'         // Si, B, Ge, As — gemstone-like
  | 'nonmetal'          // C, N, P, S, Se — dielectric, varied
  | 'halogen'           // F, Cl, Br, I — translucent
  | 'rare_earth'        // lanthanide + actinide — heavy metallic, faint emission
  | 'unknown';          // fallback for synthetic / unmapped

/**
 * Profile per category. Numbers picked by eye based on real-world appearance:
 *  - Metals: high metalness (~0.85), low-to-medium roughness, some anisotropy.
 *  - Ceramics / metalloids: low metalness, high subsurface, low roughness.
 *  - Gases: low metalness, high subsurface (translucent), some anisotropy
 *    via grazing-angle iridescence stand-in.
 */
export const CATEGORY_PROFILES: Record<MaterialCategory, ElementProfile> = {
  hydrogen: {
    metalness: 0.0, roughness: 0.15, anisotropy: 0.0, subsurface: 0.85,
    emission: [0, 0, 0], emissionIntensity: 0,
  },

  noble_gas: {
    // Opalescent — should look ghostly. Metalness 0 keeps base color readable;
    // high subsurface + low roughness gives the inner-glow read.
    metalness: 0.0, roughness: 0.18, anisotropy: 0.35, subsurface: 0.75,
    emission: [0, 0, 0], emissionIntensity: 0,
  },

  alkali: {
    // Soft, slightly waxy metals. Low metalness because freshly-cut alkali
    // looks more diffuse than gold; reflects but isn't mirror-bright.
    metalness: 0.55, roughness: 0.55, anisotropy: 0.05, subsurface: 0.05,
    emission: [0, 0, 0], emissionIntensity: 0,
  },

  alkaline_earth: {
    // Harder than alkali, more polished but still not gold-bright.
    metalness: 0.7, roughness: 0.45, anisotropy: 0.1, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },

  transition_warm: {
    // Cu / Fe / Co / Ni baseline. Strongly metallic, slight roughness so
    // they don't read as mirror balls.
    metalness: 0.92, roughness: 0.28, anisotropy: 0.25, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },

  transition_cool: {
    // Ag / Pt / Pd / Ti — polished, less roughness, less anisotropy. Reads
    // as "instrument-quality" metal.
    metalness: 0.95, roughness: 0.18, anisotropy: 0.15, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },

  transition_dull: {
    // Mn / Zn / W / Mo — high metalness but matte. The "industrial" feel.
    metalness: 0.85, roughness: 0.6, anisotropy: 0.05, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },

  post_transition: {
    // Al / Pb / Sn / Bi — moderate metallic, more grain than transition cool.
    metalness: 0.8, roughness: 0.4, anisotropy: 0.15, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },

  metalloid: {
    // Si / B / Ge / As — gemstone-like. Low metalness, low roughness,
    // significant subsurface. Reads as crystalline / faceted.
    metalness: 0.1, roughness: 0.2, anisotropy: 0.1, subsurface: 0.55,
    emission: [0, 0, 0], emissionIntensity: 0,
  },

  nonmetal: {
    // C / N / P / S / Se — dielectric. Defaults to a slightly subsurface
    // organic look; specific elements can override (diamond C very different
    // from graphite C, both different from S).
    metalness: 0.05, roughness: 0.5, anisotropy: 0.0, subsurface: 0.2,
    emission: [0, 0, 0], emissionIntensity: 0,
  },

  halogen: {
    // F / Cl / Br / I — translucent, can read as gas/liquid.
    metalness: 0.0, roughness: 0.25, anisotropy: 0.1, subsurface: 0.65,
    emission: [0, 0, 0], emissionIntensity: 0,
  },

  rare_earth: {
    // Lanthanide + actinide — heavy metallic, faint Cherenkov-like blue-green
    // glow as the visual signature of radioactive elements. Subtle on purpose
    // so it reads as "active" without overwhelming the chemistry.
    metalness: 0.9, roughness: 0.35, anisotropy: 0.2, subsurface: 0.0,
    emission: [0.15, 0.55, 0.45], emissionIntensity: 0.18,
  },

  unknown: {
    // Generic fallback. Slightly metallic, medium roughness so unknown
    // elements still have *some* character.
    metalness: 0.3, roughness: 0.5, anisotropy: 0.0, subsurface: 0.1,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
};
