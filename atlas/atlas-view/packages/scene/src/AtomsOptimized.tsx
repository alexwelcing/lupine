/**
 * <AtomsOptimized /> — Impostor Billboard Sphere Renderer
 *
 * Professional molecular visualization technique used by VMD, PyMOL, OVITO:
 * - 1 quad per atom (2 triangles) instead of 80-triangle sphere meshes
 * - Fragment shader ray-traces pixel-perfect spheres with correct depth
 * - GPU-side color lookup via palette textures — changing colormap is instant
 * - Per-instance data uploaded ONCE per frame change, not per animation frame
 * - 40× triangle reduction, zero per-frame CPU→GPU copies during orbit
 *
 * Color architecture:
 * - Instance attributes store typeId (float) and propValue (float)
 * - A 256×1 DataTexture (uPalette) maps typeId → RGB color
 * - A 256×1 DataTexture (uColormap) maps normalized property → RGB color
 * - Changing colormap/colorMode updates only tiny textures, not 1M atoms
 */

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame, ColormapName, RenderStyle } from '@atlas/core/types';
import { SpatialHash3D } from './SpatialHash';
import { useGlobalTimer } from './useTimer';

import { TYPE_COLORS, TYPE_RADII, COLORMAPS, BOTANICAL_COLORS, BOTANICAL_RADII, DEFAULT_TYPE_COLOR } from './constants';
import { buildMaterialPaletteData } from './materials';
import { getElementSpec, hexToRgb } from '@atlas/core';

// ─── Types ───────────────────────────────────────────────────────────
interface AtomsOptimizedProps {
  frame: Frame;
  nextFrame?: Frame;
  interpolationFactor?: number;
  colorMode?: 'type' | 'uniform' | 'property';
  colorProperty?: string;
  colormap?: ColormapName;
  propRange?: [number, number];
  scale?: number;
  renderStyle?: RenderStyle;
  maxAtoms?: number;
  onSpatialHash?: (hash: SpatialHash3D) => void;
  highlightedAtoms?: Set<number>;
  hiddenAtomTypes?: Set<number>;
  atomTypeScales?: Record<number, number>;
  botanicalMode?: boolean;
  materialPreset?: 'default' | 'matte' | 'metallic' | 'glass' | 'plastic';
  /** 0 = pure per-element identity, 1 = full preset override. Scenes can
   *  blend, e.g. 0.7 means 70% preset + 30% element character. */
  materialIntensity?: number;
  /** Rim / backlight intensity. Adds a backlit edge for depth separation.
   *  0 = material-driven only, >0 = additive rim boost. */
  rimLightIntensity?: number;
  surfaceRoughness?: number;
  surfacePolish?: number;
  surfaceClearcoat?: number;
  keyLightAzimuth?: number;
  keyLightElevation?: number;
  fillLightAzimuth?: number;
  fillLightElevation?: number;
  rimLightAzimuth?: number;
  rimLightElevation?: number;
  fillLightColor?: string;
  rimLightColor?: string;
  atomTexture?: 'none' | 'scratched' | 'noise';
  /** Where per-type atom colors come from. Overrides the legacy
   *  colormap-only behavior. 'colormap' is the original default. */
  atomColorSource?: 'colormap' | 'element' | 'botanical';
  /** Etched annotation texture — text rasterized via Canvas2D, alpha
   *  channel used as the stamp mask. When set together with `etchAtomId`,
   *  the impostor shader engraves it onto that atom's surface. */
  etchTexture?: THREE.Texture | null;
  /** Atom index whose surface gets the etched text. -1 / null disables. */
  etchAtomId?: number | null;
  /** Strength of property-driven emission (0..1). When > 0 and colorMode
   *  is 'property', atoms glow proportional to their normalized property
   *  value × this strength × the colormap-mapped color. Reads as
   *  "this atom is energetic". */
  propertyEmissionStrength?: number;
  /** How many atoms have been uploaded so far (for progressive streaming).
   *  Defaults to frame.natoms when not set. */
  loadedAtomCount?: number;
}

// ─── GLSL Shaders ────────────────────────────────────────────────────

const IMPOSTOR_VERTEX = /* glsl */ `
  // Per-instance attributes
  attribute vec3 instancePosition;
  attribute float instanceRadius;
  attribute float instanceTypeId;
  attribute float instancePropValue;
  // Original atom index in the loaded frame. Used by the etched-label
  // path so a single atom can be picked out of the instanced batch and
  // get its annotation text engraved on its surface.
  attribute float instanceAtomId;

  // Uniforms for GPU color lookup
  uniform sampler2D uPalette;   // 256×1: typeId → color
  uniform sampler2D uColormap;  // 256×1: propValue [0,1] → color
  uniform int uColorMode;       // 0=type, 1=uniform, 2=property
  uniform vec3 uUniformColor;

  // Passed to fragment
  varying vec3 vColor;
  varying vec2 vUv;
  varying vec3 vViewCenter;
  varying float vRadius;
  varying float vViewRadius;
  varying float vTypeId;
  varying float vPropValue;
  varying float vAtomId;

  void main() {
    vTypeId = instanceTypeId;
    vPropValue = instancePropValue;
    vAtomId = instanceAtomId;

    // ─── GPU-side color lookup ───
    if (uColorMode == 2) {
      // Property mode: sample colormap by normalized property value
      vColor = texture2D(uColormap, vec2(instancePropValue, 0.5)).rgb;
    } else if (uColorMode == 1) {
      // Uniform mode
      vColor = uUniformColor;
    } else {
      // Type mode: sample palette by typeId
      float u = (instanceTypeId + 0.5) / 256.0;
      vColor = texture2D(uPalette, vec2(u, 0.5)).rgb;
    }

    vUv = position.xy;
    vRadius = instanceRadius;

    // Transform sphere center to view space
    vec4 viewCenter4 = modelViewMatrix * vec4(instancePosition, 1.0);
    vViewCenter = viewCenter4.xyz;
    vViewRadius = instanceRadius;

    // Billboard: offset the quad corner in view space
    vec3 viewPos = viewCenter4.xyz;
    float expand = instanceRadius * 1.3;
    viewPos.xy += position.xy * expand;

    gl_Position = projectionMatrix * vec4(viewPos, 1.0);
  }
`;

// Three.js exports `cube_uv_reflection_fragment` (and the `defines`-style
// constants it needs) — including this chunk gives our shader the
// `textureCubeUV(envMap, direction, roughness)` function that decodes the
// octahedral-packed cubeUV atlas drei's <Environment> produces. This is
// the same machinery MeshStandardMaterial uses for PMREM-prefiltered
// scene.environment.
const CUBE_UV_CHUNK = THREE.ShaderChunk.cube_uv_reflection_fragment;

const IMPOSTOR_FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying vec2 vUv;
  varying vec3 vViewCenter;
  varying float vRadius;
  varying float vViewRadius;
  varying float vTypeId;
  varying float vPropValue;
  varying float vAtomId;

  uniform mat4 projectionMatrix;
  // Etched annotation: a Canvas2D-rasterized text texture stamped onto the
  // facing hemisphere of a single targeted atom. Activated when uHasEtch=1
  // and the fragment's vAtomId matches uEtchAtomId. Uses the view-space
  // normal as the stamp UV so the text always reads to camera (it follows
  // the silhouette, not the world). The alpha channel of the texture
  // darkens the surface to give an engraved feel.
  uniform sampler2D tEtchTexture;
  uniform float uEtchAtomId;
  uniform int uHasEtch;
  uniform int uTextureMode; // 0: none, 1: noise, 2: scratched
  uniform int uColorMode; // 0=type, 1=uniform, 2=property — same scheme as vertex
  uniform int uMaterialPreset; // 0: per-element (default), 1: matte, 2: metallic, 3: glass, 4: plastic
  // 0..1: blend between per-element identity (0) and preset override (1).
  // Lets Material Scenes partially preserve element character while
  // applying a global look.
  uniform float uMaterialIntensity;
  // User-controllable rim light boost (additive over the material-driven rim).
  uniform float uRimLight;
  // Granular Surface Character overrides.
  // uSurfaceRoughness and uSurfacePolish act as offsets to the active material profile.
  uniform float uSurfaceRoughness;
  uniform float uSurfacePolish;
  uniform float uSurfaceClearcoat;
  uniform vec3 uLightDir;
  uniform vec3 uFillLightDir;
  uniform vec3 uRimLightDir;
  uniform vec3 uFillLightColor;
  uniform vec3 uRimLightColor;
  // 256×2 RGBA: row 0 = (metalness, roughness, anisotropy, subsurface),
  //             row 1 = (emission r, emission g, emission b, intensity).
  uniform sampler2D uMaterialPalette;
  // IBL — single source of truth. tEnvMap is drei's <Environment> output:
  // a PMREM-prefiltered, octahedral-packed cubeUV atlas (Three.js's
  // CubeUVReflectionMapping). textureCubeUV (provided by the
  // cube_uv_reflection_fragment chunk injected below) decodes it correctly,
  // including roughness-based mip selection. uHasEnv=0 ('diagram' preset)
  // falls back to neutral grey so atoms still read.
  uniform sampler2D tEnvMap;
  uniform float uEnvIntensity;
  uniform int uHasEnv;
  // ENVMAP_TYPE_CUBE_UV gates Three.js's cube_uv_reflection_fragment chunk
  // so its textureCubeUV() definition is visible to us. CUBEUV_TEXEL_*
  // and CUBEUV_MAX_MIP are sized for PMREMGenerator's default 256-pixel
  // base resolution (drei's default). The chunk also requires the uniform
  // be named "envMap" (not tEnvMap) — alias it.
  #define ENVMAP_TYPE_CUBE_UV
  #define CUBEUV_TEXEL_WIDTH 0.0009765625
  #define CUBEUV_TEXEL_HEIGHT 0.001953125
  #define CUBEUV_MAX_MIP 8.0
  #define envMap tEnvMap
  ${CUBE_UV_CHUNK}
  // Property-driven emission strength. 0 disables; >0 makes atoms glow
  // proportional to their normalized property value × colormap-mapped color.
  uniform float uPropEmission;

  // Three-light setup in view space
  // Key, fill, and rim light dirs are dynamic and passed via uniforms.

  // Simple pseudo-random noise function
  float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
    // Ray-sphere intersection in view space
    float expand = vRadius * 1.3;
    vec3 fragViewPos = vViewCenter + vec3(vUv * expand, 0.0);

    vec3 rayDir = normalize(fragViewPos);
    vec3 oc = -vViewCenter;

    float b = dot(oc, rayDir);
    float c = dot(oc, oc) - vViewRadius * vViewRadius;
    float discriminant = b * b - c;

    if (discriminant < 0.0) {
      discard;
    }

    float t = -b - sqrt(discriminant);
    vec3 hitPoint = rayDir * t;
    vec3 normal = normalize(hitPoint - vViewCenter);

    // ─── Material lookup ────────────────────────────────────────────
    // Always sample per-element profile from the material palette first.
    // Then, if a preset override is active (uMaterialPreset > 0), blend
    // between per-element and preset based on uMaterialIntensity.
    // This is the key upgrade: Material Scenes can partially preserve
    // element character (Au still looks gold-ish on 'Forge' at 0.7).
    float metalness, roughness, anisotropy, subsurface;
    vec3 emissionColor = vec3(0.0);
    float emissionIntensity = 0.0;

    // Step 1: per-element identity (always sampled)
    vec2 paletteUv = vec2((vTypeId + 0.5) / 256.0, 0.25);
    vec4 elemMat = texture2D(uMaterialPalette, paletteUv);
    float elemMetal = elemMat.r;
    float elemRough = elemMat.g;
    float elemAniso = elemMat.b;
    float elemSSS   = elemMat.a;

    vec4 e = texture2D(uMaterialPalette, vec2(paletteUv.x, 0.75));
    emissionColor = e.rgb;
    emissionIntensity = e.a;

    // Step 2: preset override values
    float presetMetal, presetRough, presetAniso, presetSSS;
    if (uMaterialPreset == 1)      { presetMetal = 0.05; presetRough = 0.85; presetAniso = 0.0; presetSSS = 0.0; }
    else if (uMaterialPreset == 2) { presetMetal = 0.8;  presetRough = 0.2;  presetAniso = 0.0; presetSSS = 0.0; }
    else if (uMaterialPreset == 3) { presetMetal = 0.1;  presetRough = 0.1;  presetAniso = 0.0; presetSSS = 0.4; }
    else if (uMaterialPreset == 4) { presetMetal = 0.0;  presetRough = 0.4;  presetAniso = 0.0; presetSSS = 0.0; }
    else                           { presetMetal = elemMetal; presetRough = elemRough; presetAniso = elemAniso; presetSSS = elemSSS; }

    // Step 3: blend by materialIntensity
    metalness  = mix(elemMetal, presetMetal, uMaterialIntensity);
    roughness  = mix(elemRough, presetRough, uMaterialIntensity);
    anisotropy = mix(elemAniso, presetAniso, uMaterialIntensity);
    subsurface = mix(elemSSS,   presetSSS,   uMaterialIntensity);

    // Step 4: apply granular user offsets (Polish/Roughness)
    metalness = clamp(metalness + uSurfacePolish, 0.0, 1.0);
    roughness = clamp(roughness + uSurfaceRoughness, 0.0, 1.0);

    // ─── Cook-Torrance microfacet shading (Tier 1 polish) ───────────
    // Replaces the Blinn-Phong baseline. Same 4 per-element inputs
    // (metalness/roughness/anisotropy/subsurface), much more material identity.
    //
    //   - GGX D + Smith G + Schlick F microfacet specular
    //   - Burley-style wrap diffuse for soft shadow rolloff
    //   - Subsurface backlight: light "transmits" to the shadow side for
    //     translucent atoms (H, O, noble gases) — they read as dewdrops
    //     not painted balls
    //   - Schlick fresnel ramps reflectivity at grazing — gives Cu/Au/Ag
    //     the chrome-edge that distinguishes them from plastic
    //   - Anisotropic D-term widens the highlight along screen-space y,
    //     reads as "brushed" for high-anisotropy metals
    //
    // We're in view space here, so the camera direction is +z from any
    // fragment. That simplifies F/G calculations.
    vec3 V = vec3(0.0, 0.0, 1.0); // view direction in view space, fragment-relative
    vec3 L = uLightDir;
    vec3 H = normalize(L + V);
    float NoL = max(dot(normal, L), 0.0);
    float NoV = max(dot(normal, V), 0.0);
    float NoH = max(dot(normal, H), 0.0);
    float LoH = max(dot(L, H), 0.0);

    // GGX normal distribution. alpha grows with roughness² (the standard
    // perceptually-linear remap). Anisotropy stretches the lobe along
    // screen-space y by reducing alpha in that direction — a placeholder
    // until atoms get a real tangent attribute (impostor spheres are
    // direction-less, so this is the best approximation without a per-
    // atom orientation hint).
    // Isotropic GGX. The former anisotropy term stretched the lobe in
    // SCREEN space (a self-described placeholder) — it wobbled as the
    // camera moved. Removed for stable, consistent highlights; matches
    // the bonds going isotropic.
    float alpha = roughness * roughness;
    float a2 = alpha * alpha;
    float D_denom = (NoH * NoH) * (a2 - 1.0) + 1.0;
    float D = a2 / max(3.14159 * D_denom * D_denom, 1e-6);

    // Smith G (height-correlated approximation). Cheap.
    float k = (alpha + 1.0) * (alpha + 1.0) / 8.0;
    float G_V = NoV / (NoV * (1.0 - k) + k);
    float G_L = NoL / (NoL * (1.0 - k) + k);
    float G = G_V * G_L;

    // Schlick fresnel. F0 is 0.04 for dielectrics (typical glass/plastic),
    // base color for metals. The (1-F0)*(1-LoH)^5 ramp gives chrome the
    // bright edge.
    vec3 F0 = mix(vec3(0.04), vColor, metalness);
    float fresnelRamp = pow(1.0 - LoH, 5.0);
    vec3 F = F0 + (vec3(1.0) - F0) * fresnelRamp;

    // Cook-Torrance specular term. The 4 NoL NoV in the denominator is
    // standard; the max protects against divide-by-zero at silhouettes.
    vec3 specular = (D * G) * F / max(4.0 * NoL * NoV, 1e-6);

    // ─── Clearcoat (Tier 2 polish) ──────────────────────────────────
    // A secondary specular lobe on top of the base material.
    // Fixed low roughness, high F0 to simulate a polished resin/varnish layer.
    float clearcoat = uSurfaceClearcoat;
    if (clearcoat > 0.0) {
      float ccRoughness = 0.1;
      float ccAlpha = ccRoughness * ccRoughness;
      float ccAlphaSq = ccAlpha * ccAlpha;
      float ccD_denom = (NoH * NoH) * (ccAlphaSq - 1.0) + 1.0;
      float ccD = ccAlphaSq / max(3.14159 * ccD_denom * ccD_denom, 1e-6);

      float cck = (ccAlpha + 1.0) * (ccAlpha + 1.0) / 8.0;
      float ccG_V = NoV / (NoV * (1.0 - cck) + cck);
      float ccG_L = NoL / (NoL * (1.0 - cck) + cck);
      float ccG = ccG_V * ccG_L;

      // Clearcoat F0 is fixed at 0.04 (IOR ~1.5)
      vec3 ccF0 = vec3(0.04);
      vec3 ccF = ccF0 + (vec3(1.0) - ccF0) * fresnelRamp;

      vec3 ccSpecular = (ccD * ccG) * ccF / max(4.0 * NoL * NoV, 1e-6);

      // Add clearcoat specular, and energy conserve the base layer
      specular = specular * (1.0 - ccF * clearcoat) + ccSpecular * clearcoat;
    }

    // ─── Diffuse with subsurface ──────────────────────────────────────
    // Burley wrap: smooths the shadow terminator. wrapHalf=1 is half-Lambert.
    float wrapHalf = 0.5; // tuneable; higher = softer transition
    float wrapNoL = max((dot(normal, L) + wrapHalf) / (1.0 + wrapHalf), 0.0);

    // Subsurface backlight: when the normal points away from the light,
    // simulate light transmitting through the material to the shadow side.
    // This is what makes a dewdrop, milky glass, or noble-gas atom read as
    // "lit from within" rather than as a painted shadow.
    float backLight = max(dot(-normal, L), 0.0);
    backLight = pow(backLight, 3.0) * subsurface;

    // Combine: dielectric portion uses (1-F) energy conservation; metalness
    // attenuates the diffuse term entirely (metals don't have diffuse).
    vec3 kD = (vec3(1.0) - F) * (1.0 - metalness);

    // Secondary fill light — wrap-shaded for consistency.
    float wrapNoL2 = max((dot(normal, uFillLightDir) + wrapHalf) / (1.0 + wrapHalf), 0.0) * 0.3;

    // Ambient floor — raised for metals since they have near-zero kD
    // (no diffuse channel) and depend entirely on env reflections.
    // When the PMREM probe is missing, metals would be invisible.
    float ambient = 0.15 + subsurface * 0.15 + metalness * 0.25;

    // Rim — Schlick-style fresnel rim for visual depth. Material-driven
    // base + user-controllable uRimLight additive boost for depth separation.
    float rim = pow(1.0 - NoV, 4.0);
    float rimDirMask = max(dot(normal, uRimLightDir), 0.0);
    float rimBase = mix(0.15, 0.5, metalness) + subsurface * 0.4;
    // Base rim comes from all sides (white/vColor), extra rim light is directional and tinted
    vec3 rimBaseColor = mix(vec3(1.0), vColor, metalness) * rim * rimBase;
    vec3 rimDirColor = uRimLightColor * rim * uRimLight * rimDirMask;
    vec3 rimColor = rimBaseColor + rimDirColor;

    // Apply texture based on uniform
    vec3 texColor = vColor;
    if (uTextureMode == 1) {
      // Noise
      float noiseVal = rand(vUv * 500.0);
      texColor *= mix(0.7, 1.0, noiseVal);
    } else if (uTextureMode == 2) {
      // Scratched (procedural lines)
      float line = rand(floor(vUv * 100.0));
      if (line > 0.95 && rand(vUv * 50.0) > 0.5) {
        texColor *= 0.5;
      }
    }

    // ─── PMREM IBL — sample the real environment cube ────────────────
    // tEnvMap is drei's <Environment>, processed by Three's PMREMGenerator.
    // textureCubeUV (from cube_uv_reflection_fragment) decodes the
    // octahedral-packed atlas and selects the right mip from roughness.
    // Specular probe: along reflection vector. Diffuse irradiance: along
    // surface normal at near-max roughness (acts as a tinted ambient).
    vec3 reflectVec = reflect(-V, normal);
    vec3 envSpec;
    vec3 envAvg;
    if (uHasEnv == 1) {
      // Roughness floor for the mip select: impostor-sphere normals vary
      // fast across a pixel, so sampling the sharpest env mips on low-
      // roughness metals aliased into a crawling shimmer under motion.
      // Clamping to ~0.18 costs negligible sharpness, kills the strobe.
      envSpec = textureCubeUV(tEnvMap, reflectVec, max(roughness, 0.18)).rgb * uEnvIntensity;
      envAvg  = textureCubeUV(tEnvMap, normal,     1.0).rgb * uEnvIntensity;
    } else {
      // No PMREM env — use brighter fallback so atoms are always visible.
      // Metals depend entirely on env reflections; without a probe,
      // specular is the only light path that survives (kD≈0). The
      // directional-dependent specular from LIGHT_DIR alone can leave
      // shadow-side fragments at pixel values [2,3,6]. Fix: strong
      // fallback probe that guarantees readability.
      envSpec = vec3(0.8);
      envAvg  = vec3(0.6);
    }

    // Final combine — Cook-Torrance + Burley diffuse + subsurface backlight + rim + IBL + emission.
    //   - Diffuse uses Burley wrap (wrapNoL) which softens the shadow line.
    //   - kD = (1-F)(1-metalness) implements energy conservation: metals
    //     have no diffuse contribution, dielectrics share energy with spec.
    //   - IBL specular: F0 * envSpec gives metals a real-feeling environment
    //     reflection that varies with viewing angle. Replaces the flat
    //     F0 * (ambient + 0.4) baseline.
    //   - IBL diffuse: envAvg as the ambient-irradiance color (tinted!).
    //   - Specular is the full Cook-Torrance term × NoL.
    //   - backLight × texColor gives translucent atoms a subtle glow on
    //     the shadow side — dewdrop / glass / noble gas read.
    //   - Rim is fresnel-driven, color-tinted by metalness.
    //   - Emission: per-element baseline glow from the palette row 1.
    vec3 envIrradiance = envAvg * (ambient + 0.4);
    // Main directional light is considered white, fill light is tinted
    vec3 diffuseIrradiance = envIrradiance + vec3(1.0) * wrapNoL * 0.7 + uFillLightColor * wrapNoL2;
    vec3 diffuseTerm = kD * texColor * diffuseIrradiance;
    vec3 iblSpecular = F0 * envSpec * (0.5 + 0.5 * (1.0 - roughness));
    vec3 specularTerm = specular * NoL * 1.5;
    vec3 backTerm = texColor * backLight * 0.6;
    // Per-element emission baseline + property-driven emission boost.
    //   - Baseline: per-element emission × intensity (radioactives glow).
    //   - Property-driven: when in property color mode, atoms with high
    //     normalized property emit additional light tinted by the colormap-
    //     mapped color. Reads as "this atom is doing something."
    vec3 emissive = emissionColor * emissionIntensity;
    if (uColorMode == 2 && uPropEmission > 0.0) {
      emissive += vColor * vPropValue * uPropEmission;
    }
    vec3 color = diffuseTerm + iblSpecular + specularTerm + backTerm + rimColor + emissive;

    // ─── Minimum visibility floor ──────────────────────────────────
    // Guarantee atoms are always distinguishable from the background,
    // even when the env map fails to load or metallic BRDF zeroes out
    // the diffuse channel. This is a perceptual safety net, not a
    // physical term — it adds a tiny amount of base color so no atom
    // ever renders as pure black.
    vec3 minFloor = texColor * 0.08;
    color = max(color, minFloor);

    // ─── Etched annotation overlay ────────────────────────────────────
    // Only the targeted atom executes this branch. We project the
    // view-space normal into a stamp UV: the camera-facing pole maps to
    // (0.5, 0.5), edges of the visible hemisphere fall outside [0,1].
    // etchScale > 1.0 keeps the text inside a small central patch of the
    // silhouette so it reads as a label, not a tattoo wrapping around.
    if (uHasEtch == 1 && abs(vAtomId - uEtchAtomId) < 0.5) {
      float etchScale = 1.5;
      vec2 etchUv = vec2(normal.x * etchScale + 0.5, -normal.y * etchScale + 0.5);
      if (etchUv.x > 0.0 && etchUv.x < 1.0 && etchUv.y > 0.0 && etchUv.y < 1.0) {
        float etchAlpha = texture2D(tEtchTexture, etchUv).a;
        // Darken where text is (engraved depth) plus a subtle warm tint so
        // it reads as a stamped marker rather than a paint splotch.
        vec3 engraved = color * 0.32;
        color = mix(color, engraved, etchAlpha);
      }
    }

    // Correct depth via projected hit point
    vec4 clipPos = projectionMatrix * vec4(hitPoint, 1.0);
    float ndcDepth = clipPos.z / clipPos.w;
    gl_FragDepth = ndcDepth * 0.5 + 0.5;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────

/** Build a 256×1 RGBA DataTexture from a color lookup function */
function buildPaletteTexture(
  lookupFn: (index: number) => [number, number, number],
): THREE.DataTexture {
  const data = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = lookupFn(i);
    data[i * 4]     = Math.round(r * 255);
    data[i * 4 + 1] = Math.round(g * 255);
    data[i * 4 + 2] = Math.round(b * 255);
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Build the per-element material palette texture. 256×2 RGBA:
 *   - row 0 (sampled at v=0.25): material params (metalness, roughness, anisotropy, subsurface)
 *   - row 1 (sampled at v=0.75): emission (r, g, b, intensity)
 *
 * Stored as 8-bit; both material params (0..1) and emission color (0..1)
 * fit. Emission intensity in alpha is also 0..1.
 *
 * Reads the entire periodic table from `materials/elementProfiles.ts`,
 * so adding a new element override there immediately reflects here.
 */
function buildMaterialPaletteTexture(): THREE.DataTexture {
  const floats = buildMaterialPaletteData(); // length 256 * 2 * 4
  const data = new Uint8Array(256 * 2 * 4);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.max(0, Math.min(255, Math.round(floats[i] * 255)));
  }
  const tex = new THREE.DataTexture(data, 256, 2, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Build a 256×1 RGBA DataTexture sampling a colormap over [0,1] */
function buildColormapTexture(
  mapFn: (t: number) => [number, number, number],
): THREE.DataTexture {
  const data = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const [r, g, b] = mapFn(t);
    data[i * 4]     = Math.round(r * 255);
    data[i * 4 + 1] = Math.round(g * 255);
    data[i * 4 + 2] = Math.round(b * 255);
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// ─── Component ───────────────────────────────────────────────────────

const MIN_CAPACITY = 50000;

export function AtomsOptimized({
  frame,
  nextFrame,
  interpolationFactor,
  colorMode = 'type',
  colorProperty,
  colormap = 'viridis',
  propRange,
  scale = 1.0,
  renderStyle = 'standard',
  maxAtoms,
  onSpatialHash,
  highlightedAtoms,
  hiddenAtomTypes,
  atomTypeScales,
  botanicalMode = false,
  atomColorSource = 'colormap',
  etchTexture = null,
  etchAtomId = null,
  propertyEmissionStrength = 0,
  materialPreset = 'default',
  materialIntensity = 0.0,
  rimLightIntensity = 0.0,
  surfaceRoughness = 0.0,
  surfacePolish = 0.0,
  surfaceClearcoat = 0.0,
  keyLightAzimuth = 40,
  keyLightElevation = 45,
  fillLightAzimuth = -120,
  fillLightElevation = 10,
  rimLightAzimuth = 160,
  rimLightElevation = 30,
  fillLightColor = '#8888ff',
  rimLightColor = '#ffffff',
  atomTexture = 'none',
  loadedAtomCount,
}: AtomsOptimizedProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const spatialHashRef = useRef(new SpatialHash3D(3.0));
  const atomCountRef = useRef(0);
  const { scene } = useThree();

  // Capacity — grow-only, never shrink
  const capacityRef = useRef(Math.max(MIN_CAPACITY, Math.ceil(frame.natoms * 1.2)));
  if (frame.natoms > capacityRef.current) {
    capacityRef.current = Math.max(capacityRef.current * 1.5, Math.ceil(frame.natoms * 1.2));
  }
  let capacity = capacityRef.current;
  if (maxAtoms !== undefined && capacity > maxAtoms) {
    capacity = maxAtoms;
  }

  // ─── Geometry: one quad, instanced ────────────────────────────────
  const geometry = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry();

    // Quad vertices: 4 corners in [-1, 1]
    const quadPos = new Float32Array([
      -1, -1, 0,
       1, -1, 0,
       1,  1, 0,
      -1,  1, 0,
    ]);
    const quadIdx = new Uint16Array([0, 1, 2, 0, 2, 3]);

    geo.setAttribute('position', new THREE.BufferAttribute(quadPos, 3));
    geo.setIndex(new THREE.BufferAttribute(quadIdx, 1));

    // Per-instance attributes
    const posAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('instancePosition', posAttr);

    const radAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    radAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('instanceRadius', radAttr);

    // TypeId and PropValue — the shader does the color lookup
    const typeAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    typeAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('instanceTypeId', typeAttr);

    const propAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    propAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('instancePropValue', propAttr);

    // AtomId — original frame index, used by the etched-label fragment
    // path to single out one instance. f32 holds atom indices up to ~16M
    // exactly; well above the 1M scene cap.
    const atomIdAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    atomIdAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('instanceAtomId', atomIdAttr);

    geo.instanceCount = 0;

    return geo;
  }, [capacity]);

  // ─── Material: custom shader with GPU color lookup ─────────────────
  const material = useMemo(() => {
    const paletteTex = buildPaletteTexture((i) => DEFAULT_TYPE_COLOR);
    const colormapTex = buildColormapTexture((t) => [t, t, t]);

    const materialPaletteTex = buildMaterialPaletteTexture();

    return new THREE.ShaderMaterial({
      vertexShader: IMPOSTOR_VERTEX,
      fragmentShader: IMPOSTOR_FRAGMENT,
      uniforms: {
        uPalette: { value: paletteTex },
        uColormap: { value: colormapTex },
        uColorMode: { value: 0 },
        uUniformColor: { value: new THREE.Vector3(0.6, 0.6, 0.6) },
        uTextureMode: { value: 0 },
        uMaterialPreset: { value: 0 },
        uMaterialIntensity: { value: 0.0 },
        uRimLight: { value: 0.0 },
        uSurfaceRoughness: { value: 0.0 },
        uSurfacePolish: { value: 0.0 },
        uSurfaceClearcoat: { value: 0.0 },
        uLightDir: { value: new THREE.Vector3(0.4, 0.7, 0.6) },
        uFillLightDir: { value: new THREE.Vector3(-0.3, -0.2, 0.8) },
        uRimLightDir: { value: new THREE.Vector3(0.0, 0.0, -1.0) },
        uFillLightColor: { value: new THREE.Color('#8888ff') },
        uRimLightColor: { value: new THREE.Color('#ffffff') },
        // Static — periodic table doesn't change at runtime.
        uMaterialPalette: { value: materialPaletteTex },
        // PMREM env (synced from scene.environment via useFrame below).
        tEnvMap: { value: null as THREE.Texture | null },
        uEnvIntensity: { value: 1.0 },
        uHasEnv: { value: 0 },
        // Etched annotation — synced from props in the effect below.
        tEtchTexture: { value: null as THREE.Texture | null },
        uEtchAtomId: { value: -1 },
        uHasEtch: { value: 0 },
        // Property-driven emission strength
        uPropEmission: { value: 0 },
      },
      depthWrite: true,
      depthTest: true,
      transparent: false,
      side: THREE.DoubleSide,
    });
  }, []);

  // ─── Property data ─────────────────────────────────────────────────
  const propData = useMemo(() => {
    if (colorMode !== 'property' || !colorProperty) return null;
    return frame.properties?.get(colorProperty) ?? null;
  }, [frame, colorMode, colorProperty]);

  const [autoMin, autoMax] = useMemo(() => {
    if (!propData) return [0, 1];
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < propData.length; i++) {
      if (propData[i] < mn) mn = propData[i];
      if (propData[i] > mx) mx = propData[i];
    }
    return [mn === Infinity ? 0 : mn, mx === -Infinity ? 1 : mx];
  }, [propData]);

  const pMin = propRange?.[0] ?? autoMin;
  const pMax = propRange?.[1] ?? autoMax;
  const mapFn = COLORMAPS[colormap] ?? COLORMAPS.viridis;

  // ─── Update palette texture (instant — no atom iteration) ─────────
  useEffect(() => {
    const uniforms = material.uniforms;

    // Update color mode uniform
    uniforms.uColorMode.value = colorMode === 'property' ? 2 : colorMode === 'uniform' ? 1 : 0;

    // Update texture mode uniform
    let texMode = 0;
    if (atomTexture === 'noise') texMode = 1;
    if (atomTexture === 'scratched') texMode = 2;
    uniforms.uTextureMode.value = texMode;

    let matMode = 0;
    if (materialPreset === 'matte') matMode = 1;
    if (materialPreset === 'metallic') matMode = 2;
    if (materialPreset === 'glass') matMode = 3;
    if (materialPreset === 'plastic') matMode = 4;
    uniforms.uMaterialPreset.value = matMode;
    uniforms.uMaterialIntensity.value = materialIntensity ?? 0.0;
    uniforms.uRimLight.value = rimLightIntensity ?? 0.0;
    uniforms.uSurfaceRoughness.value = surfaceRoughness ?? 0.0;
    uniforms.uSurfacePolish.value = surfacePolish ?? 0.0;

    uniforms.uPropEmission.value = propertyEmissionStrength;

    uniforms.uFillLightColor.value.set(fillLightColor);
    uniforms.uRimLightColor.value.set(rimLightColor);

    // Etched annotation sync. The texture itself is owned by the caller
    // (App.tsx builds it from the active annotation text); we just point
    // the uniform at it and flip the gating int. -1 atomId is the sentinel
    // for "no etch" — fragments compare via abs(diff) < 0.5 so any value
    // outside the live atom range trivially fails.
    uniforms.tEtchTexture.value = etchTexture ?? null;
    uniforms.uEtchAtomId.value = etchAtomId ?? -1;
    uniforms.uHasEtch.value = (etchTexture && etchAtomId != null && etchAtomId >= 0) ? 1 : 0;

    if (colorMode === 'uniform') {
      const [r, g, b] = mapFn(0.0);
      uniforms.uUniformColor.value.set(r, g, b);
    }

    // Rebuild the 256×1 type palette (768 bytes, instant)
    const oldPalette = uniforms.uPalette.value as THREE.DataTexture;

    // Source the per-type palette from one of three places. botanicalMode
    // forces botanical regardless of atomColorSource — historical UX.
    const effectiveSource = botanicalMode ? 'botanical' : atomColorSource;

    if (effectiveSource === 'botanical') {
      uniforms.uPalette.value = buildPaletteTexture((typeId) => {
        const c = BOTANICAL_COLORS[typeId] ?? [0.3, 0.5, 0.2];
        return [c[0], c[1], c[2]];
      });
    } else if (effectiveSource === 'element') {
      // Element-natural colors from the periodic table data. Cu is warm, Au
      // is gold, O is red — no colormap mediation. Pairs with the per-element
      // material identity for a chemically-honest read.
      uniforms.uPalette.value = buildPaletteTexture((typeId) => {
        const spec = getElementSpec(typeId);
        return hexToRgb(spec.color);
      });
    } else {
      // 'colormap' — types mapped through the active colormap by rank.
      // Generic, abstract; fine when chemistry isn't the point.
      const typeSet = new Set<number>();
      for (let i = 0; i < frame.natoms; i++) typeSet.add(frame.types[i]);
      const sortedTypes = Array.from(typeSet).sort((a, b) => a - b);
      const typeToNorm = new Map<number, number>();
      for (let j = 0; j < sortedTypes.length; j++) {
        typeToNorm.set(sortedTypes[j], sortedTypes.length > 1 ? j / (sortedTypes.length - 1) : 0.5);
      }
      uniforms.uPalette.value = buildPaletteTexture((typeId) => {
        const t = typeToNorm.get(typeId) ?? 0.5;
        return mapFn(t);
      });
    }

    oldPalette.dispose();

    // Rebuild the 256×1 colormap texture (768 bytes, instant)
    const oldColormap = uniforms.uColormap.value as THREE.DataTexture;
    uniforms.uColormap.value = buildColormapTexture(mapFn);
    oldColormap.dispose();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorMode, colormap, mapFn, botanicalMode, atomColorSource, material, frame.types, frame.natoms, atomTexture, materialPreset, propertyEmissionStrength, etchTexture, etchAtomId, materialIntensity, rimLightIntensity, surfaceRoughness, surfacePolish, surfaceClearcoat, fillLightColor, rimLightColor]);

  // ─── PMREM env sync and dynamic lighting ───────────────────────────────────────────────
  // scene.environment is set by drei's <Environment> in App.tsx; it can
  // change asynchronously when the active postprocess preset's HDRI swaps.
  // useFrame keeps the material uniform pointing at whatever's current,
  // and recomputes the mip count when the texture identity changes (the
  // PMREM mip count is texture.mipmaps.length - 1, or derived from size).
  useFrame(({ camera }) => {
    const env = (scene as any).environment as THREE.Texture | null;
    const u = material.uniforms;
    if (env !== u.tEnvMap.value) {
      u.tEnvMap.value = env;
      u.uHasEnv.value = env ? 1 : 0;
    }

    // Continuously transform the light directions into view space
    // so the impostor shader gets them relative to the camera.
    const kAz = (keyLightAzimuth ?? 40) * Math.PI / 180;
    const kEl = (keyLightElevation ?? 45) * Math.PI / 180;
    const kx = Math.cos(kEl) * Math.sin(kAz);
    const ky = Math.sin(kEl);
    const kz = Math.cos(kEl) * Math.cos(kAz);
    const lightWorldDir = new THREE.Vector3(kx, ky, kz).normalize();
    const lightViewDir = lightWorldDir.clone().transformDirection(camera.matrixWorldInverse).normalize();
    u.uLightDir.value.copy(lightViewDir);

    const fAz = (fillLightAzimuth ?? -120) * Math.PI / 180;
    const fEl = (fillLightElevation ?? 10) * Math.PI / 180;
    const fx = Math.cos(fEl) * Math.sin(fAz);
    const fy = Math.sin(fEl);
    const fz = Math.cos(fEl) * Math.cos(fAz);
    const fillWorldDir = new THREE.Vector3(fx, fy, fz).normalize();
    const fillViewDir = fillWorldDir.clone().transformDirection(camera.matrixWorldInverse).normalize();
    u.uFillLightDir.value.copy(fillViewDir);

    const rAz = (rimLightAzimuth ?? 160) * Math.PI / 180;
    const rEl = (rimLightElevation ?? 30) * Math.PI / 180;
    const rx = Math.cos(rEl) * Math.sin(rAz);
    const ry = Math.sin(rEl);
    const rz = Math.cos(rEl) * Math.cos(rAz);
    const rimWorldDir = new THREE.Vector3(rx, ry, rz).normalize();
    const rimViewDir = rimWorldDir.clone().transformDirection(camera.matrixWorldInverse).normalize();
    u.uRimLightDir.value.copy(rimViewDir);
  });

  // ─── Upload frame data to GPU (runs ONCE per frame change) ────────
  const uploadFrame = useCallback(() => {
    // Defer spatial hash rebuild to idle time
    const idleCallback = (typeof requestIdleCallback !== 'undefined')
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 0);
    const cancelIdle = (typeof cancelIdleCallback !== 'undefined')
      ? cancelIdleCallback
      : clearTimeout;
    const idleId = idleCallback(() => {
      spatialHashRef.current.build(frame.positions, frame.natoms);
      onSpatialHash?.(spatialHashRef.current);
    });
    const cleanupIdle = () => cancelIdle(idleId as any);

    const positions = frame.positions;
    const types = frame.types;

    const t = interpolationFactor ?? 0;
    const hasNextFrame = nextFrame && nextFrame.natoms === frame.natoms;
    const nextPos = hasNextFrame ? nextFrame.positions : null;

    let bsx = 0, bsy = 0, bsz = 0;
    const hasBounds = !!frame.boxBounds;
    if (hasBounds) {
      bsx = frame.boxBounds![1] - frame.boxBounds![0];
      bsy = frame.boxBounds![3] - frame.boxBounds![2];
      bsz = frame.boxBounds![5] - frame.boxBounds![4];
    }

    // Pre-compute radii lookups
    const MAX_TYPES = 256;
    const radiiLookup = new Float32Array(MAX_TYPES).fill(1.2);
    const hiddenLookup = new Uint8Array(MAX_TYPES);
    const scaleOverrideLookup = new Float32Array(MAX_TYPES).fill(1.0);

    for (let typeId = 0; typeId < MAX_TYPES; typeId++) {
      radiiLookup[typeId] = botanicalMode ? (BOTANICAL_RADII[typeId] ?? 1.2) : (TYPE_RADII[typeId] ?? 1.2);
      if (hiddenAtomTypes?.has(typeId)) hiddenLookup[typeId] = 1;
      if (atomTypeScales?.[typeId] !== undefined) scaleOverrideLookup[typeId] = atomTypeScales[typeId];
    }

    // Property normalization
    const hasPropInterpolation = nextFrame && t > 0 && nextFrame.properties && nextFrame.properties.has(colorProperty!);
    const nextPropData = hasPropInterpolation ? nextFrame.properties!.get(colorProperty!) : null;

    // Get instance attribute arrays directly
    const posArr = (geometry.attributes.instancePosition as THREE.InstancedBufferAttribute).array as Float32Array;
    const radArr = (geometry.attributes.instanceRadius as THREE.InstancedBufferAttribute).array as Float32Array;
    const typeArr = (geometry.attributes.instanceTypeId as THREE.InstancedBufferAttribute).array as Float32Array;
    const propArr = (geometry.attributes.instancePropValue as THREE.InstancedBufferAttribute).array as Float32Array;
    const atomIdArr = (geometry.attributes.instanceAtomId as THREE.InstancedBufferAttribute).array as Float32Array;

    let visibleCount = 0;

    // When streaming, only render atoms that have been received
    const effectiveAtomCount = loadedAtomCount ?? frame.natoms;

    for (let i = 0; i < effectiveAtomCount; i++) {
      const typeId = types[i] < MAX_TYPES ? types[i] : 0;
      const radius = hiddenLookup[typeId] ? 0 : radiiLookup[typeId] * scale * scaleOverrideLookup[typeId];
      if (radius === 0) continue;
      if (visibleCount >= capacity) break;

      // Position with interpolation + PBC unwrapping
      let x = positions[i * 3];
      let y = positions[i * 3 + 1];
      let z = positions[i * 3 + 2];

      if (nextPos && t > 0) {
        let dx = nextPos[i * 3] - x;
        let dy = nextPos[i * 3 + 1] - y;
        let dz = nextPos[i * 3 + 2] - z;

        if (hasBounds) {
          if (dx > bsx / 2) dx -= bsx;
          if (dx < -bsx / 2) dx += bsx;
          if (dy > bsy / 2) dy -= bsy;
          if (dy < -bsy / 2) dy += bsy;
          if (dz > bsz / 2) dz -= bsz;
          if (dz < -bsz / 2) dz += bsz;
        }

        x += dx * t;
        y += dy * t;
        z += dz * t;
      }

      const pi = visibleCount * 3;
      posArr[pi]     = x;
      posArr[pi + 1] = y;
      posArr[pi + 2] = z;

      radArr[visibleCount] = radius;
      typeArr[visibleCount] = typeId;

      // Normalized property value (for property color mode)
      if (propData) {
        let val = propData[i];
        if (nextPropData && nextPropData.length > i) {
          val = val + (nextPropData[i] - val) * t;
        }
        propArr[visibleCount] = pMax > pMin ? (val - pMin) / (pMax - pMin) : 0.5;
      } else {
        propArr[visibleCount] = 0.0;
      }

      // Pass through the original atom index so the etched-label fragment
      // can compare against uEtchAtomId. Hidden atoms (skipped above) get
      // no instance, which is fine — they can't be picked anyway.
      atomIdArr[visibleCount] = i;

      visibleCount++;
    }

    atomCountRef.current = visibleCount;
    geometry.instanceCount = visibleCount;

    // Mark attributes for GPU upload
    const posAttr = geometry.attributes.instancePosition as THREE.InstancedBufferAttribute;
    const radAttr = geometry.attributes.instanceRadius as THREE.InstancedBufferAttribute;
    const typeAttr = geometry.attributes.instanceTypeId as THREE.InstancedBufferAttribute;
    const propAttr = geometry.attributes.instancePropValue as THREE.InstancedBufferAttribute;

    const atomIdAttr = geometry.attributes.instanceAtomId as THREE.InstancedBufferAttribute;
    posAttr.needsUpdate = true;
    radAttr.needsUpdate = true;
    typeAttr.needsUpdate = true;
    propAttr.needsUpdate = true;
    atomIdAttr.needsUpdate = true;

    (posAttr as any).updateRange = { offset: 0, count: visibleCount * 3 };
    (radAttr as any).updateRange = { offset: 0, count: visibleCount };
    (typeAttr as any).updateRange = { offset: 0, count: visibleCount };
    (propAttr as any).updateRange = { offset: 0, count: visibleCount };
    (atomIdAttr as any).updateRange = { offset: 0, count: visibleCount };

    return cleanupIdle;
  }, [
    frame, nextFrame, interpolationFactor, scale, propData, pMin, pMax,
    hiddenAtomTypes, atomTypeScales, botanicalMode,
    onSpatialHash, capacity, colorProperty, geometry,
  ]);

  useEffect(() => {
    return uploadFrame();
  }, [uploadFrame]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      if (material.uniforms.uPalette.value) material.uniforms.uPalette.value.dispose();
      if (material.uniforms.uColormap.value) material.uniforms.uColormap.value.dispose();
      spatialHashRef.current.clear();
    };
  }, [geometry, material]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}

// Export spatial hash for external use
export { SpatialHash3D };
