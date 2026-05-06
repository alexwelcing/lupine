/**
 * elementProfiles — atomic-number → category mapping + hero-element overrides.
 *
 * Single resolver: `getElementProfile(atomicNumber)`.
 *
 *   1. If the atomic number has a curated override (Cu, Au, Fe, Ag, Pt, O,
 *      C, H, Si), return that.
 *   2. Else map atomic number → MaterialCategory and return the category
 *      profile from categoryProfiles.ts.
 *   3. Else (synthetic / unmapped) return CATEGORY_PROFILES.unknown.
 *
 * Adding a new hero element: append to ELEMENT_OVERRIDES.
 * Adding a new category: edit categoryProfiles.ts (rare).
 * Re-categorizing an existing element: edit ATOMIC_NUMBER_TO_CATEGORY.
 */

import type { ElementProfile } from './ElementProfile';
import { DEFAULT_PROFILE } from './ElementProfile';
import { CATEGORY_PROFILES, type MaterialCategory } from './categoryProfiles';

// ─── Atomic number → MaterialCategory ──────────────────────────────────
//
// Built from the IUPAC periodic table classifications, with one editorial
// choice: transition metals are split into warm / cool / dull based on what
// they look like, not on group number. Lanthanides + actinides share
// 'rare_earth' since they're visually similar.

const NOBLE_GASES = new Set([2, 10, 18, 36, 54, 86, 118]);
const ALKALI_METALS = new Set([3, 11, 19, 37, 55, 87]);
const ALKALINE_EARTH = new Set([4, 12, 20, 38, 56, 88]);
const HALOGENS = new Set([9, 17, 35, 53, 85, 117]);
const TRANSITION_WARM = new Set([26, 27, 28, 29]); // Fe, Co, Ni, Cu
const TRANSITION_COOL = new Set([22, 44, 45, 46, 47, 77, 78]); // Ti, Ru, Rh, Pd, Ag, Ir, Pt
const TRANSITION_DULL = new Set([23, 24, 25, 30, 41, 42, 43, 73, 74, 75]); // V, Cr, Mn, Zn, Nb, Mo, Tc, Ta, W, Re
const POST_TRANSITION = new Set([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116]); // Al, Ga, In, Sn, Tl, Pb, Bi, Po, Nh, Fl, Mc, Lv
const METALLOIDS = new Set([5, 14, 32, 33, 51, 52]); // B, Si, Ge, As, Sb, Te
const NONMETALS_ORGANIC = new Set([6, 7, 8, 15, 16, 34]); // C, N, O, P, S, Se
const LANTHANIDES_RANGE: [number, number] = [57, 71]; // La..Lu
const ACTINIDES_RANGE: [number, number] = [89, 103]; // Ac..Lr
const REMAINING_TRANSITION_RANGES: [number, number][] = [
  [21, 21],   // Sc — cool
  [39, 40],   // Y, Zr — cool
  [72, 72],   // Hf — cool
  [76, 76],   // Os — dull
  [104, 112], // Rf..Cn (synthetic transition) — default to dull
];

export function categoryForAtomicNumber(z: number): MaterialCategory {
  if (z === 1) return 'hydrogen';
  if (NOBLE_GASES.has(z)) return 'noble_gas';
  if (ALKALI_METALS.has(z)) return 'alkali';
  if (ALKALINE_EARTH.has(z)) return 'alkaline_earth';
  if (HALOGENS.has(z)) return 'halogen';
  if (TRANSITION_WARM.has(z)) return 'transition_warm';
  if (TRANSITION_COOL.has(z)) return 'transition_cool';
  if (TRANSITION_DULL.has(z)) return 'transition_dull';
  if (POST_TRANSITION.has(z)) return 'post_transition';
  if (METALLOIDS.has(z)) return 'metalloid';
  if (NONMETALS_ORGANIC.has(z)) return 'nonmetal';
  if (z >= LANTHANIDES_RANGE[0] && z <= LANTHANIDES_RANGE[1]) return 'rare_earth';
  if (z >= ACTINIDES_RANGE[0] && z <= ACTINIDES_RANGE[1]) return 'rare_earth';
  for (const [lo, hi] of REMAINING_TRANSITION_RANGES) {
    if (z >= lo && z <= hi) {
      // Sc, Y, Zr, Hf default to cool; Os and synthetics to dull.
      return z === 76 || z >= 104 ? 'transition_dull' : 'transition_cool';
    }
  }
  return 'unknown';
}

// ─── Per-element overrides for hero atoms ──────────────────────────────
//
// These take precedence over category defaults. Curated to give the most-
// observed elements in MD a distinctive identity. Unlisted elements
// inherit from their category — this is fine and intentional.

const ELEMENT_OVERRIDES: Record<number, ElementProfile> = {
  // 1 H — kept at category default (hydrogen)
  // 6 C — graphite-like default. Layered reflectivity via anisotropy.
  6: {
    metalness: 0.0, roughness: 0.7, anisotropy: 0.4, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
  // 8 O — canonical oxide oxygen. Glass-like.
  8: {
    metalness: 0.0, roughness: 0.18, anisotropy: 0.0, subsurface: 0.7,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
  // 13 Al — bright matte, post-transition representative.
  13: {
    metalness: 0.85, roughness: 0.35, anisotropy: 0.2, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
  // 14 Si — canonical metalloid. Crystalline subsurface.
  14: {
    metalness: 0.2, roughness: 0.15, anisotropy: 0.15, subsurface: 0.6,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
  // 22 Ti — instrument metal. Polished.
  22: {
    metalness: 0.95, roughness: 0.2, anisotropy: 0.15, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
  // 26 Fe — warm, slightly oxidized read.
  26: {
    metalness: 0.9, roughness: 0.4, anisotropy: 0.3, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
  // 27 Co — like Fe but slightly polished.
  27: {
    metalness: 0.92, roughness: 0.32, anisotropy: 0.25, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
  // 28 Ni — cooler than Fe.
  28: {
    metalness: 0.93, roughness: 0.25, anisotropy: 0.2, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
  // 29 Cu — the hero. Warm metallic, slight brushed feel.
  29: {
    metalness: 0.95, roughness: 0.22, anisotropy: 0.35, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
  // 46 Pd — polished.
  46: {
    metalness: 0.95, roughness: 0.18, anisotropy: 0.1, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
  // 47 Ag — mirror-bright cool metal.
  47: {
    metalness: 0.98, roughness: 0.12, anisotropy: 0.15, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
  // 78 Pt — polished, slightly cooler than gold.
  78: {
    metalness: 0.96, roughness: 0.15, anisotropy: 0.15, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },
  // 79 Au — the iconic. Mirror-bright warm.
  79: {
    metalness: 0.98, roughness: 0.15, anisotropy: 0.25, subsurface: 0.0,
    emission: [0, 0, 0], emissionIntensity: 0,
  },

  // ─── Radioactives — visible Cherenkov-like glow ───────────────────────
  // The point of per-element emission today is to make radioactive atoms
  // read instantly different from their stable neighbors. Subtle on
  // purpose: chemistry first, glow second.
  // 88 Ra — alkaline earth normally; flag with radium-green glow.
  88: {
    metalness: 0.7, roughness: 0.45, anisotropy: 0.1, subsurface: 0.0,
    emission: [0.2, 0.85, 0.4], emissionIntensity: 0.3,   // radium green
  },
  // 92 U — heavy metallic with iconic uranium-blue Cherenkov tint.
  92: {
    metalness: 0.85, roughness: 0.4, anisotropy: 0.15, subsurface: 0.0,
    emission: [0.3, 0.6, 1.0], emissionIntensity: 0.25,
  },
  // 94 Pu — alpha-emitter; warmer red-orange glow.
  94: {
    metalness: 0.85, roughness: 0.4, anisotropy: 0.15, subsurface: 0.0,
    emission: [1.0, 0.4, 0.2], emissionIntensity: 0.25,
  },
};

// ─── Resolver ──────────────────────────────────────────────────────────

/**
 * Get the rendering profile for an atomic number. Cheap (just two map
 * lookups) — safe to call per atom, but typical usage builds a
 * type-indexed palette texture once per frame.
 */
export function getElementProfile(atomicNumber: number): ElementProfile {
  const override = ELEMENT_OVERRIDES[atomicNumber];
  if (override) return override;
  const category = categoryForAtomicNumber(atomicNumber);
  return CATEGORY_PROFILES[category] ?? DEFAULT_PROFILE;
}

/**
 * Build a 256×1 RGBA palette of profiles, indexed by atomic number / type
 * id. Returns a flat Float32Array of length 256*4. The renderer uploads
 * this as a DataTexture and the fragment shader samples it via
 * `texture2D(uMaterialPalette, vec2((typeId+0.5)/256, 0.5))`.
 *
 * Atomic numbers > 255 wrap (rare in practice — only synthetic > 255 lands
 * here, and we don't render those).
 */
export function buildMaterialPaletteData(): Float32Array {
  // 2-row layout: row 0 = material params, row 1 = emission RGB + intensity.
  // The shader samples at v = 0.25 (row 0) and v = 0.75 (row 1).
  // Stored as [row0_atom0, row0_atom1, ..., row0_atom255, row1_atom0, ...].
  const out = new Float32Array(256 * 2 * 4);
  for (let z = 0; z < 256; z++) {
    const p = getElementProfile(z);
    // Row 0 — material
    out[z * 4 + 0] = p.metalness;
    out[z * 4 + 1] = p.roughness;
    out[z * 4 + 2] = p.anisotropy;
    out[z * 4 + 3] = p.subsurface;
    // Row 1 — emission (offset by 256*4 floats)
    const rowBase = 256 * 4;
    out[rowBase + z * 4 + 0] = p.emission[0];
    out[rowBase + z * 4 + 1] = p.emission[1];
    out[rowBase + z * 4 + 2] = p.emission[2];
    out[rowBase + z * 4 + 3] = p.emissionIntensity;
  }
  return out;
}
