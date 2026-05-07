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
  /** Render quality tier — picks the fragment-shader complexity.
   *
   *  - 0 ('fast'):     simple Lambert + Blinn-Phong specular, no IBL,
   *                    no Cook-Torrance, NO gl_FragDepth (this is the
   *                    big mobile win — early-Z works again, fragment
   *                    throughput goes up ~5-10×). Atom intersection
   *                    depth is approximated by the quad center, which
   *                    is invisibly wrong on a zoomed-out 1M-atom scene
   *                    and the only path that lets a phone render that
   *                    scene at all.
   *  - 1 ('standard'): Cook-Torrance D/G/F + two-light direct illumination,
   *                    correct gl_FragDepth, no IBL probes, no anisotropy,
   *                    no subsurface. The integrated-laptop-GPU path.
   *  - 2 ('premium'):  full PBR including PMREM IBL, anisotropy,
   *                    subsurface, rim, etched annotation, texture mode,
   *                    property-driven emission. The discrete-GPU path
   *                    and historical default.
   *
   *  Choose based on device. The shader is recompiled when this changes,
   *  so flipping mid-session is supported but causes a one-time stutter. */
  qualityTier?: 0 | 1 | 2;
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

  // Vertex-side LOD. uPxPerWorldAtUnitDepth = (viewport_height / 2) / tan(fov/2)
  // — multiply by (radius / -viewZ) to get the atom's projected pixel radius
  // for a perspective camera. Atoms below uMinPixelRadius are culled by
  // pushing gl_Position outside clip space; the rasterizer skips them so the
  // fragment shader never runs. Saves ~1ms/frame on 1M-atom scenes when
  // zoomed out far enough that most atoms are sub-pixel. uMinPixelRadius=0
  // disables culling (default).
  uniform float uPxPerWorldAtUnitDepth;
  uniform float uMinPixelRadius;

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

    // Sub-pixel culling. Behind-camera atoms have viewZ > 0 (camera looks
    // -Z); we pass them through so the rasterizer's standard clipping
    // handles them — don't rely on viewZ for the radius math.
    if (uMinPixelRadius > 0.0 && viewCenter4.z < 0.0) {
      float pixelRadius = instanceRadius * uPxPerWorldAtUnitDepth / -viewCenter4.z;
      if (pixelRadius < uMinPixelRadius) {
        // Push outside clip space — guaranteed cull, no fragment work.
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
      }
    }

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
// scene.environment. Pulled into the shader source only on QUALITY_TIER 2
// — IBL doesn't fit the fast / standard fragment-throughput budget.
const CUBE_UV_CHUNK = THREE.ShaderChunk.cube_uv_reflection_fragment;

/** Build the impostor-sphere fragment shader at the requested quality tier.
 *
 * Three.js supports `defines` on ShaderMaterial which become `#define`
 * directives at the top of the shader, so we could gate everything via
 * `#if QUALITY_TIER >= N` blocks. We use JS template-literal interpolation
 * instead because the IBL path needs the cube_uv_reflection_fragment
 * shader chunk to be physically present in the source string — it
 * declares `textureCubeUV()`, and even a `#if 0` branch that references
 * an undeclared function fails GLSL compilation on some drivers.
 *
 * Tiers (see AtomsOptimizedProps.qualityTier doc for the full rationale):
 *   0 — fast      : Lambert + Blinn-Phong, no gl_FragDepth (mobile path)
 *   1 — standard  : Cook-Torrance direct lighting, gl_FragDepth on
 *   2 — premium   : full PBR + IBL + anisotropy + etch + texture mode
 */
function buildImpostorFragment(tier: 0 | 1 | 2): string {
  const usesIBL = tier >= 2;
  const usesCookTorrance = tier >= 1;
  const usesFragDepth = tier >= 1;
  const usesEtch = tier >= 2;
  const usesTextureMode = tier >= 2;
  const usesAnisotropy = tier >= 2;
  const usesSubsurface = tier >= 2;
  const usesRim = tier >= 1;

  return /* glsl */ `
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
${usesEtch ? `
  // Etched annotation: a Canvas2D-rasterized text texture stamped onto the
  // facing hemisphere of a single targeted atom. Activated when uHasEtch=1
  // and the fragment's vAtomId matches uEtchAtomId.
  uniform sampler2D tEtchTexture;
  uniform float uEtchAtomId;
  uniform int uHasEtch;` : ''}
${usesTextureMode ? `
  uniform int uTextureMode; // 0: none, 1: noise, 2: scratched` : ''}
  uniform int uColorMode; // 0=type, 1=uniform, 2=property — same scheme as vertex
  uniform int uMaterialPreset; // 0: per-element (default), 1: matte, 2: metallic, 3: glass, 4: plastic
  // 256×2 RGBA: row 0 = (metalness, roughness, anisotropy, subsurface),
  //             row 1 = (emission r, emission g, emission b, intensity).
  uniform sampler2D uMaterialPalette;
${usesIBL ? `
  // IBL — single source of truth. tEnvMap is drei's <Environment> output,
  // a PMREM-prefiltered cubeUV atlas. textureCubeUV (declared by the
  // chunk below) decodes it including roughness-based mip selection.
  uniform sampler2D tEnvMap;
  uniform float uEnvIntensity;
  uniform int uHasEnv;
  #define ENVMAP_TYPE_CUBE_UV
  #define CUBEUV_TEXEL_WIDTH 0.0009765625
  #define CUBEUV_TEXEL_HEIGHT 0.001953125
  #define CUBEUV_MAX_MIP 8.0
  #define envMap tEnvMap
  ${CUBE_UV_CHUNK}` : ''}
  // Property-driven emission strength. 0 disables; >0 makes atoms glow
  // proportional to their normalized property value × colormap-mapped color.
  uniform float uPropEmission;

  // Two-light setup in view space
  const vec3 LIGHT_DIR = normalize(vec3(0.4, 0.7, 0.6));
  const vec3 LIGHT_DIR_2 = normalize(vec3(-0.3, -0.2, 0.8));

${usesTextureMode ? `
  // Simple pseudo-random noise function
  float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }` : ''}

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
    // Default (0): sample per-element profile from the material palette.
    // Presets 1-4: keep the legacy fixed-look behavior so the panel option
    // still works as a global override.
    float metalness, roughness, anisotropy, subsurface;
    vec3 emissionColor = vec3(0.0);
    float emissionIntensity = 0.0;
    if (uMaterialPreset == 0) {
      // Material palette is 256×2: row 0 at v=0.25 holds material params,
      // row 1 at v=0.75 holds (emission rgb, intensity).
      vec2 paletteUv = vec2((vTypeId + 0.5) / 256.0, 0.25);
      vec4 m = texture2D(uMaterialPalette, paletteUv);
      metalness = m.r;
      roughness = m.g;
      anisotropy = m.b;
      subsurface = m.a;

      vec4 e = texture2D(uMaterialPalette, vec2(paletteUv.x, 0.75));
      emissionColor = e.rgb;
      emissionIntensity = e.a;
    } else if (uMaterialPreset == 1) { metalness = 0.05; roughness = 0.85; anisotropy = 0.0; subsurface = 0.0; }
    else if (uMaterialPreset == 2)   { metalness = 0.8;  roughness = 0.2;  anisotropy = 0.0; subsurface = 0.0; }
    else if (uMaterialPreset == 3)   { metalness = 0.1;  roughness = 0.1;  anisotropy = 0.0; subsurface = 0.4; }
    else if (uMaterialPreset == 4)   { metalness = 0.0;  roughness = 0.4;  anisotropy = 0.0; subsurface = 0.0; }
    else                             { metalness = 0.1;  roughness = 0.5;  anisotropy = 0.0; subsurface = 0.0; }

    vec3 V = vec3(0.0, 0.0, 1.0); // view direction in view space, fragment-relative
    vec3 L = LIGHT_DIR;
    float NoL = max(dot(normal, L), 0.0);
    float NoV = max(dot(normal, V), 0.0);

    vec3 texColor = vColor;
${usesTextureMode ? `
    if (uTextureMode == 1) {
      float noiseVal = rand(vUv * 500.0);
      texColor *= mix(0.7, 1.0, noiseVal);
    } else if (uTextureMode == 2) {
      float line = rand(floor(vUv * 100.0));
      if (line > 0.95 && rand(vUv * 50.0) > 0.5) {
        texColor *= 0.5;
      }
    }` : ''}

${usesCookTorrance ? `
    // ─── Cook-Torrance microfacet shading ───────────────────────────
    // GGX D + Smith G + Schlick F. Direct-illumination only at this
    // tier; IBL probes are gated to tier 2 since textureCubeUV is the
    // dominant cost for mid-range integrated GPUs.
    vec3 H = normalize(L + V);
    float NoH = max(dot(normal, H), 0.0);
    float LoH = max(dot(L, H), 0.0);

    float alpha = roughness * roughness;
${usesAnisotropy ? `
    // Anisotropy widens the GGX lobe along screen-space y. Cheap; only
    // physically-meaningful with an orientation hint, which impostor
    // spheres lack — treat as artistic streak control.
    float alphaY = alpha * mix(1.0, 0.4, anisotropy);
    float alphaX = alpha;
    float nxSq = normal.x * normal.x;
    float nySq = normal.y * normal.y;
    float nzSq = normal.z * normal.z;
    float alphaProjSq = (alphaX * alphaX) * nxSq + (alphaY * alphaY) * nySq + alpha * alpha * nzSq;` : `
    float alphaProjSq = alpha * alpha;`}
    float D_denom = (NoH * NoH) * (alphaProjSq - 1.0) + 1.0;
    float D = alphaProjSq / max(3.14159 * D_denom * D_denom, 1e-6);

    float k = (alpha + 1.0) * (alpha + 1.0) / 8.0;
    float G_V = NoV / (NoV * (1.0 - k) + k);
    float G_L = NoL / (NoL * (1.0 - k) + k);
    float G = G_V * G_L;

    vec3 F0 = mix(vec3(0.04), vColor, metalness);
    float fresnelRamp = pow(1.0 - LoH, 5.0);
    vec3 F = F0 + (vec3(1.0) - F0) * fresnelRamp;

    vec3 specular = (D * G) * F / max(4.0 * NoL * NoV, 1e-6);

    float wrapHalf = 0.5;
    float wrapNoL = max((dot(normal, L) + wrapHalf) / (1.0 + wrapHalf), 0.0);
${usesSubsurface ? `
    float backLight = max(dot(-normal, L), 0.0);
    backLight = pow(backLight, 3.0) * subsurface;` : `
    float backLight = 0.0;`}

    vec3 kD = (vec3(1.0) - F) * (1.0 - metalness);
    float wrapNoL2 = max((dot(normal, LIGHT_DIR_2) + wrapHalf) / (1.0 + wrapHalf), 0.0) * 0.3;

    float ambient = 0.15 + subsurface * 0.15;
${usesRim ? `
    float rim = pow(1.0 - NoV, 4.0);
    float rimStrength = mix(0.15, 0.5, metalness) + subsurface * 0.4;
    vec3 rimColor = mix(vec3(1.0), vColor, metalness) * rim * rimStrength;` : `
    vec3 rimColor = vec3(0.0);`}
${usesIBL ? `
    // ─── PMREM IBL ─────────────────────────────────────────────────
    vec3 reflectVec = reflect(-V, normal);
    vec3 envSpec;
    vec3 envAvg;
    if (uHasEnv == 1) {
      envSpec = textureCubeUV(tEnvMap, reflectVec, roughness).rgb * uEnvIntensity;
      envAvg  = textureCubeUV(tEnvMap, normal,     1.0).rgb * uEnvIntensity;
    } else {
      envSpec = vec3(0.5);
      envAvg  = vec3(0.4);
    }
    vec3 envIrradiance = envAvg * (ambient + 0.4);
    vec3 iblSpecular = F0 * envSpec * (0.5 + 0.5 * (1.0 - roughness));` : `
    // Tier 1 (no IBL): neutral irradiance term so the diffuse channel still
    // has a sensible base term, and zero IBL specular contribution.
    vec3 envIrradiance = vec3(ambient + 0.4) * 0.55;
    vec3 iblSpecular = vec3(0.0);`}
    vec3 diffuseTerm = kD * texColor * (envIrradiance + wrapNoL * 0.7 + wrapNoL2);
    vec3 specularTerm = specular * NoL * 1.5;
    vec3 backTerm = texColor * backLight * 0.6;

    vec3 emissive = emissionColor * emissionIntensity;
    if (uColorMode == 2 && uPropEmission > 0.0) {
      emissive += vColor * vPropValue * uPropEmission;
    }
    vec3 color = diffuseTerm + iblSpecular + specularTerm + backTerm + rimColor + emissive;` : `
    // ─── Fast-tier shading (Lambert + Blinn-Phong specular) ─────────
    // Skips the full Cook-Torrance microfacet chain. The whole point: keep
    // the fragment shader cheap so mobile GPUs can run 1M atoms without
    // dropping to slideshow framerates. Roughness shapes the specular
    // exponent so material identity is still visible (chrome looks shinier
    // than plastic) without the GGX cost.
    vec3 H = normalize(L + V);
    float NoH = max(dot(normal, H), 0.0);
    float NoL2 = max(dot(normal, LIGHT_DIR_2), 0.0) * 0.3;
    float gloss = mix(8.0, 96.0, 1.0 - roughness);
    float specHighlight = pow(NoH, gloss) * (1.0 - roughness) * mix(0.4, 0.9, metalness);
    float ambient = 0.18;
    vec3 color = texColor * (ambient + NoL * 0.7 + NoL2)
               + mix(vec3(1.0), texColor, metalness) * specHighlight;
    if (uColorMode == 2 && uPropEmission > 0.0) {
      color += vColor * vPropValue * uPropEmission;
    }
    color += emissionColor * emissionIntensity;`}

${usesEtch ? `
    // ─── Etched annotation overlay ──────────────────────────────────
    if (uHasEtch == 1 && abs(vAtomId - uEtchAtomId) < 0.5) {
      float etchScale = 1.5;
      vec2 etchUv = vec2(normal.x * etchScale + 0.5, -normal.y * etchScale + 0.5);
      if (etchUv.x > 0.0 && etchUv.x < 1.0 && etchUv.y > 0.0 && etchUv.y < 1.0) {
        float etchAlpha = texture2D(tEtchTexture, etchUv).a;
        vec3 engraved = color * 0.32;
        color = mix(color, engraved, etchAlpha);
      }
    }` : ''}

${usesFragDepth ? `
    // Correct sphere-intersection depth so adjacent atoms occlude each
    // other along the actual hit point, not the billboard quad center.
    // NB: gl_FragDepth disables hierarchical-Z and early-Z on most mobile
    // GPUs — that's why fast tier skips this and accepts the (visually
    // imperceptible at zoom-out) approximation of quad depth.
    vec4 clipPos = projectionMatrix * vec4(hitPoint, 1.0);
    float ndcDepth = clipPos.z / clipPos.w;
    gl_FragDepth = ndcDepth * 0.5 + 0.5;` : ''}

    gl_FragColor = vec4(color, 1.0);
  }
`;
}

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
  atomTexture = 'none',
  qualityTier = 2,
}: AtomsOptimizedProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const spatialHashRef = useRef(new SpatialHash3D(3.0));
  const atomCountRef = useRef(0);
  const { scene, camera, gl } = useThree();

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
  // Rebuilt when qualityTier changes — the fragment shader source itself
  // depends on the tier (IBL chunk only included at tier 2 since
  // textureCubeUV must be declared to compile, and we conditionally embed
  // the cube_uv_reflection_fragment chunk that declares it). The shader
  // recompile causes a one-time stutter; tier changes are rare in practice.
  const material = useMemo(() => {
    const paletteTex = buildPaletteTexture((i) => DEFAULT_TYPE_COLOR);
    const colormapTex = buildColormapTexture((t) => [t, t, t]);
    const materialPaletteTex = buildMaterialPaletteTexture();

    // Build only the uniforms the active tier's shader actually
    // declares. ShaderMaterial accepts extra uniforms (Three.js silently
    // ignores ones the shader source doesn't reference), so it's safe
    // to keep them all here — but we annotate which apply where so the
    // tier table is legible.
    const uniforms: Record<string, { value: any }> = {
      uPalette: { value: paletteTex },                     // all tiers
      uColormap: { value: colormapTex },                   // all tiers
      uColorMode: { value: 0 },                            // all tiers
      uUniformColor: { value: new THREE.Vector3(0.6, 0.6, 0.6) }, // all
      uMaterialPreset: { value: 0 },                       // all tiers
      uMaterialPalette: { value: materialPaletteTex },     // all tiers
      uPropEmission: { value: 0 },                         // all tiers
      // Vertex-side LOD — sub-pixel atom culling. Disabled by default
      // (uMinPixelRadius=0). Wired up by useFrame below using camera FOV
      // and viewport size. Cheap when active, no-op otherwise.
      uPxPerWorldAtUnitDepth: { value: 1.0 },
      uMinPixelRadius: { value: 0.0 },
    };
    if (qualityTier >= 1) {
      // Cook-Torrance / standard tier (no IBL) and premium share these.
      // textureMode is declared/sampled only at premium since the noise
      // and scratch effects are framing flourishes, not chemistry signals.
    }
    if (qualityTier >= 2) {
      uniforms.uTextureMode = { value: 0 };
      uniforms.tEnvMap = { value: null as THREE.Texture | null };
      uniforms.uEnvIntensity = { value: 1.0 };
      uniforms.uHasEnv = { value: 0 };
      uniforms.tEtchTexture = { value: null as THREE.Texture | null };
      uniforms.uEtchAtomId = { value: -1 };
      uniforms.uHasEtch = { value: 0 };
    }

    return new THREE.ShaderMaterial({
      vertexShader: IMPOSTOR_VERTEX,
      fragmentShader: buildImpostorFragment(qualityTier),
      uniforms,
      depthWrite: true,
      depthTest: true,
      transparent: false,
      side: THREE.DoubleSide,
    });
  }, [qualityTier]);

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

    // Update texture mode + etch uniforms only when the active tier
    // actually compiled them in. Touching uniforms that don't exist on
    // the material is a silent no-op in Three.js, but the typed reads
    // (uniforms.uTextureMode.value) would throw.
    if (uniforms.uTextureMode) {
      let texMode = 0;
      if (atomTexture === 'noise') texMode = 1;
      if (atomTexture === 'scratched') texMode = 2;
      uniforms.uTextureMode.value = texMode;
    }

    let matMode = 0;
    if (materialPreset === 'matte') matMode = 1;
    if (materialPreset === 'metallic') matMode = 2;
    if (materialPreset === 'glass') matMode = 3;
    if (materialPreset === 'plastic') matMode = 4;
    uniforms.uMaterialPreset.value = matMode;

    uniforms.uPropEmission.value = propertyEmissionStrength;

    // Etched annotation sync. Only present at premium tier — the engraving
    // shader path is gated to QUALITY_TIER 2 since it does an extra
    // texture sample per fragment.
    if (uniforms.tEtchTexture) {
      uniforms.tEtchTexture.value = etchTexture ?? null;
      uniforms.uEtchAtomId.value = etchAtomId ?? -1;
      uniforms.uHasEtch.value = (etchTexture && etchAtomId != null && etchAtomId >= 0) ? 1 : 0;
    }

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
  }, [colorMode, colormap, mapFn, botanicalMode, atomColorSource, material, frame.types, frame.natoms, atomTexture, materialPreset, propertyEmissionStrength, etchTexture, etchAtomId]);

  // ─── PMREM env sync ───────────────────────────────────────────────
  // scene.environment is set by drei's <Environment> in App.tsx; it can
  // change asynchronously when the active postprocess preset's HDRI swaps.
  // useFrame keeps the material uniform pointing at whatever's current,
  // and recomputes the mip count when the texture identity changes (the
  // PMREM mip count is texture.mipmaps.length - 1, or derived from size).
  // ─── Per-frame uniform updates ──────────────────────────────────────
  // Two jobs: keep the IBL env texture pointing at scene.environment
  // (premium-tier only) and keep the vertex-shader LOD pixel-projection
  // uniform in sync with the active camera + viewport so sub-pixel atom
  // culling is geometrically correct.
  useFrame(() => {
    const u = material.uniforms;
    if (u.tEnvMap) {
      const env = (scene as any).environment as THREE.Texture | null;
      if (env !== u.tEnvMap.value) {
        u.tEnvMap.value = env;
        u.uHasEnv.value = env ? 1 : 0;
      }
    }
    // Pixel-projection factor for the vertex-side LOD. For a perspective
    // camera, an atom of world radius r at view-space depth -z projects
    // to (r / -z) * uPxPerWorldAtUnitDepth pixels. Computed from the
    // active camera's fov and the renderer's drawing-buffer height — both
    // can change (window resize, fov adjust) so we refresh per-frame.
    if (u.uPxPerWorldAtUnitDepth) {
      const persp = camera as THREE.PerspectiveCamera;
      if (persp.isPerspectiveCamera) {
        const dpr = (gl as any).getDrawingBufferSize
          ? (gl as any).getDrawingBufferSize(new THREE.Vector2()).y
          : (gl.domElement?.height ?? 720);
        const fovRad = (persp.fov * Math.PI) / 180;
        u.uPxPerWorldAtUnitDepth.value = (0.5 * dpr) / Math.tan(fovRad * 0.5);
      }
    }

    // ─── Progressive upload pump ──────────────────────────────────────
    // Drives the chunked path armed by the upload effect. Each tick
    // processes CHUNK_INDICES atom indices (≤ 50K) and grows the visible
    // instance count. Stale state (frame swapped under us) is gated by
    // identity check; the new frame's effect will reset uploadStateRef.
    const st = uploadStateRef.current;
    if (st.done || st.frame !== frame || !uploadCtxRef.current) return;
    const remaining = frame.natoms - st.iCursor;
    if (remaining <= 0) {
      st.done = true;
      // Final dirty-mark with the exact total — guards against off-by-one
      // if the last chunk's slice fell short of the visible count.
      atomCountRef.current = st.visibleCount;
      geometry.instanceCount = st.visibleCount;
      markAttrsDirty(st.visibleCount);
      return;
    }
    const chunkEnd = Math.min(st.iCursor + CHUNK_INDICES, frame.natoms);
    st.visibleCount = processAtomRange(st.iCursor, chunkEnd, st.visibleCount);
    st.iCursor = chunkEnd;
    atomCountRef.current = st.visibleCount;
    geometry.instanceCount = st.visibleCount;
    markAttrsDirty(st.visibleCount);
    if (st.iCursor >= frame.natoms) st.done = true;
  });

  // ─── Upload frame data to GPU ─────────────────────────────────────
  //
  // Architecture for progressive (chunked) upload:
  //
  //   - The expensive part is the per-atom write loop. For 1M atoms it
  //     runs ~50 ms on a desktop and locks the main thread; on a phone
  //     it's much worse and is what bricks the page on the 1M test.
  //   - We split the loop across animation frames: each `useFrame` tick
  //     processes CHUNK_INDICES atom indices (50K) and grows
  //     `geometry.instanceCount` to the count written so far. The
  //     renderer paints what's available; the next tick fills in more.
  //   - Two paths share one inner loop (`processAtomRange`):
  //       SYNC      — small frames (<PROGRESSIVE_THRESHOLD atoms) and any
  //                   frame currently being interpolated. The full frame
  //                   is processed inside the same effect call. Preserves
  //                   exact pre-existing behavior for playback.
  //       CHUNKED   — large single-frame loads. The effect resets the
  //                   pump state; useFrame ticks advance it.
  //   - `uploadStateRef` tracks the in-progress chunked upload. Frame
  //     identity changes cancel the in-progress pump (the new frame's
  //     effect resets the state to point at it).
  //
  // The mapping from atom index `i` to instance slot `visibleCount` is
  // monotonic but not 1:1 — hidden atoms contribute a `continue`. We
  // carry both counters across chunks so the prefix written remains
  // contiguous and `geometry.instanceCount` always points to a fully-
  // populated range.
  const PROGRESSIVE_THRESHOLD = 100_000; // atoms above which we chunk
  const CHUNK_INDICES = 50_000;          // atom-index window per tick

  const uploadStateRef = useRef<{
    frame: Frame | null;          // identity gate — pump cancels on mismatch
    iCursor: number;              // next atom index to process
    visibleCount: number;         // instance slots written so far
    done: boolean;
  }>({ frame: null, iCursor: 0, visibleCount: 0, done: true });

  // Closure-captured state for the active upload call (set by uploadFrame
  // before either running sync or handing off to the pump). Refs because
  // they live across animation frames in the chunked case but are not
  // React state — mutating them must not re-render.
  const uploadCtxRef = useRef<{
    radiiLookup: Float32Array;
    hiddenLookup: Uint8Array;
    scaleOverrideLookup: Float32Array;
    nextPropData: Float32Array | null;
    bsx: number; bsy: number; bsz: number;
    hasBounds: boolean;
    t: number;
  } | null>(null);

  /** Process atoms [iStart, iEnd) of the current upload context, writing
   *  visible ones to the geometry attributes starting at `visibleStart`.
   *  Returns the post-chunk visible count. Pure write — does NOT touch
   *  `geometry.instanceCount` or attribute dirty flags; callers do that. */
  const processAtomRange = useCallback((iStart: number, iEnd: number, visibleStart: number): number => {
    const ctx = uploadCtxRef.current;
    if (!ctx) return visibleStart;

    const positions = frame.positions;
    const types = frame.types;
    const nextPos = nextFrame && nextFrame.natoms === frame.natoms ? nextFrame.positions : null;
    const { radiiLookup, hiddenLookup, scaleOverrideLookup, nextPropData, bsx, bsy, bsz, hasBounds, t } = ctx;
    const MAX_TYPES = 256;

    const posArr = (geometry.attributes.instancePosition as THREE.InstancedBufferAttribute).array as Float32Array;
    const radArr = (geometry.attributes.instanceRadius as THREE.InstancedBufferAttribute).array as Float32Array;
    const typeArr = (geometry.attributes.instanceTypeId as THREE.InstancedBufferAttribute).array as Float32Array;
    const propArr = (geometry.attributes.instancePropValue as THREE.InstancedBufferAttribute).array as Float32Array;
    const atomIdArr = (geometry.attributes.instanceAtomId as THREE.InstancedBufferAttribute).array as Float32Array;

    let visibleCount = visibleStart;

    for (let i = iStart; i < iEnd; i++) {
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

    return visibleCount;
  }, [frame, nextFrame, scale, propData, pMin, pMax, capacity, geometry]);

  /** Mark the prefix [0, visibleCount) of every per-instance attribute as
   *  needing upload. Called after each chunk in the progressive path and
   *  once at the end of the sync path. */
  const markAttrsDirty = useCallback((visibleCount: number) => {
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
  }, [geometry]);

  /** Build the upload context for the current props (radii lookups, etc.)
   *  and stash it on uploadCtxRef so processAtomRange can read it. Cheap;
   *  runs once per frame change rather than per chunk. */
  const buildUploadCtx = useCallback(() => {
    const t = interpolationFactor ?? 0;
    const hasBounds = !!frame.boxBounds;
    let bsx = 0, bsy = 0, bsz = 0;
    if (hasBounds) {
      bsx = frame.boxBounds![1] - frame.boxBounds![0];
      bsy = frame.boxBounds![3] - frame.boxBounds![2];
      bsz = frame.boxBounds![5] - frame.boxBounds![4];
    }
    const MAX_TYPES = 256;
    const radiiLookup = new Float32Array(MAX_TYPES).fill(1.2);
    const hiddenLookup = new Uint8Array(MAX_TYPES);
    const scaleOverrideLookup = new Float32Array(MAX_TYPES).fill(1.0);
    for (let typeId = 0; typeId < MAX_TYPES; typeId++) {
      radiiLookup[typeId] = botanicalMode ? (BOTANICAL_RADII[typeId] ?? 1.2) : (TYPE_RADII[typeId] ?? 1.2);
      if (hiddenAtomTypes?.has(typeId)) hiddenLookup[typeId] = 1;
      if (atomTypeScales?.[typeId] !== undefined) scaleOverrideLookup[typeId] = atomTypeScales[typeId];
    }
    const hasPropInterpolation = nextFrame && t > 0 && nextFrame.properties && nextFrame.properties.has(colorProperty!);
    const nextPropData = hasPropInterpolation ? (nextFrame!.properties!.get(colorProperty!) ?? null) : null;
    uploadCtxRef.current = {
      radiiLookup, hiddenLookup, scaleOverrideLookup, nextPropData,
      bsx, bsy, bsz, hasBounds, t,
    };
  }, [frame, nextFrame, interpolationFactor, botanicalMode, hiddenAtomTypes, atomTypeScales, colorProperty]);

  /** Top-level upload effect. Decides between SYNC (small frames or
   *  interpolated playback) and CHUNKED (large fresh loads) and either
   *  runs the loop here or arms the useFrame pump below. */
  // Track last frame identity so we can distinguish "user just loaded a
  // new file / scrubbed to a new frame" (chunked path is allowed) from
  // "user changed a color/scale/visibility prop on the same frame" (must
  // re-upload synchronously to avoid flashing the scene to empty before
  // the pump rebuilds it).
  const prevFrameRef = useRef<Frame | null>(null);

  useEffect(() => {
    // Defer spatial hash rebuild to idle time — same as before. This
    // does NOT block the upload; the hash is read by atom-picker only.
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

    buildUploadCtx();

    const t = interpolationFactor ?? 0;
    const frameChanged = prevFrameRef.current !== frame;
    prevFrameRef.current = frame;
    // Chunk only when:
    //   - it's a fresh frame load (otherwise prop changes on the same
    //     frame would flash the scene to empty and re-stream),
    //   - the frame is large enough to be worth chunking, and
    //   - we're not interpolating (interpolated frames re-upload per
    //     animation frame anyway; chunking them spreads playback cost
    //     instead of saving it).
    const isProgressive = frameChanged && frame.natoms > PROGRESSIVE_THRESHOLD && t === 0;

    if (!isProgressive) {
      // SYNC path — preserves exact pre-existing behavior for small
      // frames, for playback / scrubbing, and for prop-only re-uploads.
      const finalCount = processAtomRange(0, frame.natoms, 0);
      atomCountRef.current = finalCount;
      geometry.instanceCount = finalCount;
      markAttrsDirty(finalCount);
      uploadStateRef.current = {
        frame, iCursor: frame.natoms, visibleCount: finalCount, done: true,
      };
    } else {
      // CHUNKED path — arm the pump. Initial instanceCount = 0 so the
      // first paint shows nothing; the next useFrame tick processes the
      // first 50K atoms and the user sees them immediately.
      atomCountRef.current = 0;
      geometry.instanceCount = 0;
      uploadStateRef.current = {
        frame, iCursor: 0, visibleCount: 0, done: false,
      };
    }

    return () => cancelIdle(idleId as any);
  }, [
    frame, nextFrame, interpolationFactor, scale, propData, pMin, pMax,
    hiddenAtomTypes, atomTypeScales, botanicalMode,
    onSpatialHash, capacity, colorProperty, geometry,
    buildUploadCtx, processAtomRange, markAttrsDirty,
  ]);

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

  // Tier-derived default for the sub-pixel-cull threshold. Fast tier
  // aggressively culls atoms that would project to less than ~0.6 px
  // (invisible at the device's DPR but still costing fragment work);
  // standard tier culls below ~0.3 px; premium leaves it off so
  // engineers comparing renders see exactly what's there. The vertex
  // shader treats 0 as "off" and skips the test entirely.
  useEffect(() => {
    if (!material.uniforms.uMinPixelRadius) return;
    const px =
      qualityTier === 0 ? 0.6 :
      qualityTier === 1 ? 0.3 :
      0.0;
    material.uniforms.uMinPixelRadius.value = px;
  }, [material, qualityTier]);

  // Bounding sphere for frustum culling — must exist BEFORE the first
  // render or Three.js will fall back to computing it from the local-
  // space quad attribute, which always reads as a tiny sphere at origin
  // and gets erroneously culled. We size it from the simulation cell
  // (with a small atom-radius pad) so it's a generous over-estimate of
  // where any atom could be in world space. Re-runs when the cell
  // dimensions change, which is essentially per-trajectory.
  useEffect(() => {
    if (!frame.boxBounds) {
      // No cell info — disable culling rather than guess. Sets a
      // very-large sphere so Three.js never culls.
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      return;
    }
    const bb = frame.boxBounds;
    const cx = (bb[0] + bb[1]) * 0.5;
    const cy = (bb[2] + bb[3]) * 0.5;
    const cz = (bb[4] + bb[5]) * 0.5;
    const dx = bb[1] - bb[0];
    const dy = bb[3] - bb[2];
    const dz = bb[5] - bb[4];
    // Half-diagonal + max atom radius pad so atoms touching the cell
    // wall aren't culled early.
    const radius = 0.5 * Math.sqrt(dx * dx + dy * dy + dz * dz) + 5.0;
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), radius);
  }, [
    geometry,
    frame.boxBounds?.[0], frame.boxBounds?.[1],
    frame.boxBounds?.[2], frame.boxBounds?.[3],
    frame.boxBounds?.[4], frame.boxBounds?.[5],
  ]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      // Frustum culling on — bounding sphere is set above before first
      // render. Saves the entire pipeline cost when the camera is pointed
      // away from the cell, which is most of the camera's working volume
      // on a 1M-atom scene.
      frustumCulled={true}
    />
  );
}

// Export spatial hash for external use
export { SpatialHash3D };
