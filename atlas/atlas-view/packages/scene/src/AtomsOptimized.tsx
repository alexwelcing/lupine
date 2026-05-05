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
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame, ColormapName, RenderStyle } from '@atlas/core/types';
import { SpatialHash3D } from './SpatialHash';
import { useGlobalTimer } from './useTimer';

import { TYPE_COLORS, TYPE_RADII, COLORMAPS, BOTANICAL_COLORS, BOTANICAL_RADII, DEFAULT_TYPE_COLOR } from './constants';

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
}

// ─── GLSL Shaders ────────────────────────────────────────────────────

const IMPOSTOR_VERTEX = /* glsl */ `
  // Per-instance attributes
  attribute vec3 instancePosition;
  attribute float instanceRadius;
  attribute float instanceTypeId;
  attribute float instancePropValue;

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

  void main() {
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

const IMPOSTOR_FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying vec2 vUv;
  varying vec3 vViewCenter;
  varying float vRadius;
  varying float vViewRadius;

  uniform mat4 projectionMatrix;
  uniform int uTextureMode; // 0: none, 1: noise, 2: scratched
  uniform int uMaterialPreset; // 0: default, 1: matte, 2: metallic, 3: glass, 4: plastic

  // Two-light setup in view space
  const vec3 LIGHT_DIR = normalize(vec3(0.4, 0.7, 0.6));
  const vec3 LIGHT_DIR_2 = normalize(vec3(-0.3, -0.2, 0.8));

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

    // Material presets approximation
    float roughness = 0.5;
    float metalness = 0.1;
    if (uMaterialPreset == 1) { // matte
      roughness = 0.85;
      metalness = 0.05;
    } else if (uMaterialPreset == 2) { // metallic
      roughness = 0.2;
      metalness = 0.8;
    } else if (uMaterialPreset == 3) { // glass
      roughness = 0.1;
      metalness = 0.1;
    } else if (uMaterialPreset == 4) { // plastic
      roughness = 0.4;
      metalness = 0.0;
    }

    // Blinn-Phong lighting
    float diffuse1 = max(dot(normal, LIGHT_DIR), 0.0);
    vec3 halfDir1 = normalize(LIGHT_DIR + vec3(0.0, 0.0, 1.0));
    float specPower = mix(10.0, 100.0, 1.0 - roughness);
    float spec1 = pow(max(dot(normal, halfDir1), 0.0), specPower) * mix(0.3, 1.5, metalness);
    float diffuse2 = max(dot(normal, LIGHT_DIR_2), 0.0) * 0.3;
    float ambient = 0.15;
    float rim = 1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
    rim = pow(rim, 3.0) * mix(0.15, 0.5, metalness);

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

    float diffuseFactor = mix(1.0, 0.4, metalness);
    vec3 color = texColor * (ambient + (diffuse1 * 0.7 + diffuse2) * diffuseFactor) + vec3(spec1) + vec3(rim);

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
  materialPreset = 'default',
  atomTexture = 'none',
}: AtomsOptimizedProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const spatialHashRef = useRef(new SpatialHash3D(3.0));
  const atomCountRef = useRef(0);

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

    geo.instanceCount = 0;

    return geo;
  }, [capacity]);

  // ─── Material: custom shader with GPU color lookup ─────────────────
  const material = useMemo(() => {
    const paletteTex = buildPaletteTexture((i) => DEFAULT_TYPE_COLOR);
    const colormapTex = buildColormapTexture((t) => [t, t, t]);

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

    if (colorMode === 'uniform') {
      const [r, g, b] = mapFn(0.0);
      uniforms.uUniformColor.value.set(r, g, b);
    }

    // Rebuild the 256×1 type palette (768 bytes, instant)
    const oldPalette = uniforms.uPalette.value as THREE.DataTexture;

    if (botanicalMode) {
      uniforms.uPalette.value = buildPaletteTexture((typeId) => {
        const c = BOTANICAL_COLORS[typeId] ?? [0.3, 0.5, 0.2];
        return [c[0], c[1], c[2]];
      });
    } else {
      // Map types through the active colormap so changing colormap changes atom colors
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

  }, [colorMode, colormap, mapFn, botanicalMode, material, frame.types, frame.natoms, atomTexture, materialPreset]);

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

    let visibleCount = 0;

    for (let i = 0; i < frame.natoms; i++) {
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

      visibleCount++;
    }

    atomCountRef.current = visibleCount;
    geometry.instanceCount = visibleCount;

    // Mark attributes for GPU upload
    const posAttr = geometry.attributes.instancePosition as THREE.InstancedBufferAttribute;
    const radAttr = geometry.attributes.instanceRadius as THREE.InstancedBufferAttribute;
    const typeAttr = geometry.attributes.instanceTypeId as THREE.InstancedBufferAttribute;
    const propAttr = geometry.attributes.instancePropValue as THREE.InstancedBufferAttribute;

    posAttr.needsUpdate = true;
    radAttr.needsUpdate = true;
    typeAttr.needsUpdate = true;
    propAttr.needsUpdate = true;

    (posAttr as any).updateRange = { offset: 0, count: visibleCount * 3 };
    (radAttr as any).updateRange = { offset: 0, count: visibleCount };
    (typeAttr as any).updateRange = { offset: 0, count: visibleCount };
    (propAttr as any).updateRange = { offset: 0, count: visibleCount };

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
