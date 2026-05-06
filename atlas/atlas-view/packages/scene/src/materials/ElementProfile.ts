/**
 * ElementProfile — per-element material identity.
 *
 * The visual character that distinguishes a copper atom from a hydrogen
 * atom in the renderer. Picked once per element type, encoded into a
 * 256×1 GPU palette texture, and sampled by the fragment shader using
 * the existing `instanceTypeId` attribute. No per-atom CPU work at render
 * time; same cost as the color palette already in place.
 *
 * Designed so all 118 elements have a sensible default via their category,
 * with per-element overrides for the hero metals (Cu, Fe, Au, Ag, Pt) and
 * structurally important nonmetals (H, C, O, Si).
 */

export interface ElementProfile {
  /**
   * PBR metalness, 0..1.
   *   0   = dielectric (glass, ceramic, organic)
   *   1   = pure metal (specular tinted by base color, no diffuse)
   */
  metalness: number;

  /**
   * PBR roughness, 0..1.
   *   0   = mirror polish
   *   1   = fully diffuse (chalky, rubbery)
   */
  roughness: number;

  /**
   * Anisotropic specular strength, 0..1.
   *   0   = isotropic Blinn-Phong
   *   1   = strongly streaked (brushed-metal look)
   * The current impostor shader uses this as a multiplier on a screen-space
   * tangent — a placeholder for the proper anisotropy term we'll wire when
   * we move to a richer BRDF.
   */
  anisotropy: number;

  /**
   * Subsurface scattering strength, 0..1.
   *   0   = opaque (regular surface)
   *   1   = strong subsurface (gemstone, dewdrop, milky glass)
   * Approximates the effect by lifting fragment color near grazing angles
   * and reducing contrast between lit/shadowed sides.
   */
  subsurface: number;

  /**
   * Self-emission color, linear-RGB 0..1 each channel. Atoms with non-zero
   * emission glow regardless of lighting. Most elements are 0 (no glow);
   * radioactives + hot metals + a few hero overrides emit faintly.
   * Multiplied by `emissionIntensity` in the shader.
   */
  emission: [number, number, number];

  /**
   * Emission intensity multiplier, 0..1. 0 disables emission entirely
   * (most elements). Stored separately from RGB so we can express
   * "blue glow at 30% strength" without normalizing the color.
   */
  emissionIntensity: number;
}

/** A null profile — generic mid-PBR look. Returned for unknown elements. */
export const DEFAULT_PROFILE: ElementProfile = {
  metalness: 0.15,
  roughness: 0.55,
  anisotropy: 0.0,
  subsurface: 0.0,
  emission: [0, 0, 0],
  emissionIntensity: 0,
};

/** Pack the material params (row 0) into 4 floats (RGBA layout). */
export function packMaterial(p: ElementProfile): [number, number, number, number] {
  return [p.metalness, p.roughness, p.anisotropy, p.subsurface];
}

/** Pack the emission (row 1) into 4 floats (RGBA layout: rgb + intensity). */
export function packEmission(p: ElementProfile): [number, number, number, number] {
  return [p.emission[0], p.emission[1], p.emission[2], p.emissionIntensity];
}

/** Blend two profiles by t ∈ [0,1]. Useful for transitions or mixed atoms. */
export function lerpProfile(a: ElementProfile, b: ElementProfile, t: number): ElementProfile {
  return {
    metalness: a.metalness + (b.metalness - a.metalness) * t,
    roughness: a.roughness + (b.roughness - a.roughness) * t,
    anisotropy: a.anisotropy + (b.anisotropy - a.anisotropy) * t,
    subsurface: a.subsurface + (b.subsurface - a.subsurface) * t,
    emission: [
      a.emission[0] + (b.emission[0] - a.emission[0]) * t,
      a.emission[1] + (b.emission[1] - a.emission[1]) * t,
      a.emission[2] + (b.emission[2] - a.emission[2]) * t,
    ],
    emissionIntensity: a.emissionIntensity + (b.emissionIntensity - a.emissionIntensity) * t,
  };
}
