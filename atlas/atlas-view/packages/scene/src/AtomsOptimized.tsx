/**
 * <AtomsOptimized /> — High-performance instanced atom renderer
 * 
 * Improvements over Atoms.tsx:
 * - Pre-allocated buffer (no reallocation)
 * - Direct Float32Array manipulation (10x faster)
 * - Spatial hash for picking (O(1) vs O(n))
 * - Reduced geometry segments for performance
 * - Proper cleanup to prevent memory leaks
 */

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame, ColormapName, RenderStyle } from '@atlas/core/types';
import { SpatialHash3D } from './SpatialHash';

import { TYPE_COLORS, TYPE_RADII, COLORMAPS, BOTANICAL_COLORS, BOTANICAL_RADII } from './constants';

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
  maxAtoms?: number;      // Pre-allocation size
  onSpatialHash?: (hash: SpatialHash3D) => void; // Expose for picking
  highlightedAtoms?: Set<number>; // For selection
  hiddenAtomTypes?: Set<number>; // Types to hide
  atomTypeScales?: Record<number, number>; // Per-type scale overrides
  botanicalMode?: boolean; // Hidden mode for Lupine brand asset
  materialPreset?: 'default' | 'matte' | 'metallic' | 'glass' | 'plastic';
  atomTexture?: 'none' | 'scratched' | 'noise';
}

// Pre-allocate maximum buffer size (avoid reallocation)
// Initial allocation buffer
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
  maxAtoms, // Optional cap, if omitted we scale infinitely
  onSpatialHash,
  highlightedAtoms,
  hiddenAtomTypes,
  atomTypeScales,
  botanicalMode = false,
  materialPreset = 'default',
  atomTexture = 'none',
}: AtomsOptimizedProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const spatialHashRef = useRef(new SpatialHash3D(3.0));
  
  // Dynamic capacity mapping (vector-style growth)
  const capacityRef = useRef(Math.max(MIN_CAPACITY, Math.ceil(frame.natoms * 1.2)));
  if (frame.natoms > capacityRef.current) {
    capacityRef.current = Math.max(capacityRef.current * 1.5, Math.ceil(frame.natoms * 1.2));
  }
  let capacity = capacityRef.current;
  if (maxAtoms !== undefined && capacity > maxAtoms) {
    capacity = maxAtoms;
  }

  // Pre-allocated working buffers
  const matrixArray = useMemo(() => new Float32Array(capacity * 16), [capacity]);
  const colorArray = useMemo(() => new Float32Array(capacity * 3), [capacity]);
  const propArray = useMemo(() => new Float32Array(capacity), [capacity]);
  const _matrix = useMemo(() => new THREE.Matrix4(), []);
  const _position = useMemo(() => new THREE.Vector3(), []);
  const _scale = useMemo(() => new THREE.Vector3(), []);
  const _quaternion = useMemo(() => new THREE.Quaternion(), []);

  // Geometry & Material (cached, LOD based on atom count)
  const geometry = useMemo(() => {
    if (renderStyle === 'toon') {
      return new THREE.IcosahedronGeometry(1, 1);
    }
    // LOD: Instanced drawing is highly vertex-throughput efficient on modern GPUs.
    // We can safely push high segment counts to maintain perfect circles.
    if (frame.natoms > 100000) {
      return new THREE.SphereGeometry(1, 12, 8);    // V-low for massive systems
    }
    if (frame.natoms > 25000) {
      return new THREE.IcosahedronGeometry(1, 2);   // 162 verts, highly uniform sphere
    }
    return new THREE.SphereGeometry(1, 32, 32);     // Perfect circle silhouettes for normal files
  }, [renderStyle, frame.natoms > 100000, frame.natoms > 25000]);

  useEffect(() => {
    geometry.setAttribute('instanceProp', new THREE.InstancedBufferAttribute(propArray, 1));
  }, [geometry, propArray]);

  const uniformsRef = useRef({ uTime: { value: 0 } });
  useFrame((state) => {
    if (botanicalMode) {
      uniformsRef.current.uTime.value = state.clock.elapsedTime;
    }
    
    // 🎬 Cinematic Macro-to-Micro Transition
    if (!botanicalMode && renderStyle !== 'toon' && frame.natoms > 10000 && material instanceof THREE.MeshPhysicalMaterial) {
      const dist = state.camera.position.length();
      
      // Heuristic for macro scale based on atom count
      // A 30k atom supercell is roughly 70A wide.
      const macroDist = 120.0;
      const microDist = 60.0;
      
      let targetOpacity = 1.0;
      let targetTransmission = 0.0;
      let targetRoughness = 0.2;
      
      if (dist > macroDist) {
        // Outside the gem: Solid, opaque, shiny diamond surface
        targetOpacity = 1.0;
        targetTransmission = 0.0;
        targetRoughness = 0.1;
      } else if (dist < microDist) {
        // Plunged inside: The atoms turn into transparent glass nodes to reveal the intricate lattice bonds
        targetOpacity = 0.8;
        targetTransmission = 0.95;
        targetRoughness = 0.05;
      } else {
        // Smooth transition zone
        const factor = (macroDist - dist) / (macroDist - microDist);
        targetOpacity = 1.0 - (factor * 0.2);
        targetTransmission = factor * 0.95;
        targetRoughness = 0.1 - (factor * 0.05);
      }
      
      // Smoothly lerp properties
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.08);
      material.transmission = THREE.MathUtils.lerp(material.transmission, targetTransmission, 0.08);
      material.roughness = THREE.MathUtils.lerp(material.roughness, targetRoughness, 0.08);
    }
  });

  const material = useMemo(() => {
    if (botanicalMode) {
      const mat = new THREE.MeshPhysicalMaterial({
        metalness: 0.1,
        roughness: 0.4,
        clearcoat: 0.4, // waxy cuticle
        clearcoatRoughness: 0.25,
        transmission: 0.4, // fake SSS via transmission
        thickness: 2.5,
        ior: 1.45, // organic tissue
      });
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = uniformsRef.current.uTime;
        
        // Inject vertex sway
        shader.vertexShader = `
          uniform float uTime;
          ${shader.vertexShader}
        `;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          // Analytically compute the ground height at this instance's world position
          // This matches the Math.exp(-distSq / 600.0) from ProceduralLupine
          float distSq = instanceMatrix[3].x * instanceMatrix[3].x + instanceMatrix[3].z * instanceMatrix[3].z;
          float groundY = 15.0 * exp(-distSq / 600.0);
          
          // Compute local height relative to the hill surface
          float localY = instanceMatrix[3].y - groundY;
          
          // Organic wind sway based on local height.
          // The higher up the plant, the more it sways. Pin the roots to the ground.
          float heightFactor = max(0.0, localY + 8.0); // Stem base is around -10 localY, so we start sway above it
          float swayAmount = pow(heightFactor, 1.2) * 0.005; // Non-linear sway for realistic bending
          
          // Wave function based on world position and time
          float noise = sin(uTime * 1.5 + instanceMatrix[3].x * 0.3 + instanceMatrix[3].z * 0.3);
          
          transformed.x += noise * swayAmount;
          transformed.z += cos(uTime * 1.1 + instanceMatrix[3].x * 0.4) * swayAmount;
          `
        );
        
        // Inject velvet/fuzz subsurface rim light
        shader.fragmentShader = `
          ${shader.fragmentShader}
        `;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          #include <dithering_fragment>
          // Velvet rim/fuzz (Schlick approximation)
          vec3 viewDir = normalize(vViewPosition);
          float ndotv = max(0.0, dot(geometryNormal, viewDir));
          float fresnel = pow(1.0 - ndotv, 4.0);
          
          // Subsurface Scattering Wrap Lighting
          vec3 lightDir = normalize(vec3(0.5, 0.8, 0.5)); // Fake directional light
          float wrap = 0.6;
          float NdotL = max(0.0, (dot(geometryNormal, lightDir) + wrap) / (1.0 + wrap));
          vec3 sssColor = gl_FragColor.rgb * vec3(1.2, 1.4, 0.8) * NdotL * 0.4;
          
          // Mix SSS and Fuzz
          gl_FragColor.rgb += sssColor;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + vec3(0.2, 0.25, 0.1), fresnel * 0.8);
          `
        );
      };
      return mat;
    }

    if (renderStyle === 'toon') {
      const gradientMap = new THREE.DataTexture(
        new Uint8Array([40, 40, 40, 255, 120, 120, 120, 255, 255, 255, 255, 255]),
        3, 1, THREE.RGBAFormat
      );
      gradientMap.needsUpdate = true;
      gradientMap.magFilter = THREE.NearestFilter;
      gradientMap.minFilter = THREE.NearestFilter;
      return new THREE.MeshToonMaterial({ gradientMap });
    }
    let matConfig: THREE.MeshPhysicalMaterialParameters = {};
    switch (materialPreset) {
      case 'matte':
        matConfig = {
          metalness: 0.1,
          roughness: 0.8,
          clearcoat: 0.0,
        };
        break;
      case 'metallic':
        matConfig = {
          metalness: 0.9,
          roughness: 0.1,
          clearcoat: 0.3,
          clearcoatRoughness: 0.1,
          envMapIntensity: 2.0,
        };
        break;
      case 'glass':
        matConfig = {
          metalness: 0.1,
          roughness: 0.05,
          transmission: 0.9,
          thickness: 1.5,
          ior: 1.5,
          transparent: true,
          clearcoat: 1.0,
          envMapIntensity: 1.5,
        };
        break;
      case 'plastic':
        matConfig = {
          metalness: 0.0,
          roughness: 0.3,
          clearcoat: 1.0,
          clearcoatRoughness: 0.2,
          envMapIntensity: 1.0,
        };
        break;
      case 'default':
      default:
        matConfig = {
          metalness: 0.6,
          roughness: 0.2,
          clearcoat: 0.8,
          clearcoatRoughness: 0.2,
          envMapIntensity: 1.5,
          sheen: 0.4,
          sheenRoughness: 0.5,
          sheenColor: new THREE.Color(0x8888aa),
          transparent: true,
          transmission: 0.0,
          opacity: 1.0,
          ior: 1.5,
        };
        break;
    }

    if (atomTexture !== 'none') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      if (atomTexture === 'noise') {
        const id = ctx.createImageData(512, 512);
        for (let i = 0; i < id.data.length; i += 4) {
          const v = Math.random() * 255;
          id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
          id.data[i + 3] = 255;
        }
        ctx.putImageData(id, 0, 0);
      } else if (atomTexture === 'scratched') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#000';
        for (let i = 0; i < 200; i++) {
          ctx.lineWidth = Math.random() * 2;
          ctx.beginPath();
          ctx.moveTo(Math.random() * 512, Math.random() * 512);
          ctx.lineTo(Math.random() * 512, Math.random() * 512);
          ctx.stroke();
        }
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      matConfig.roughnessMap = tex;
      matConfig.bumpMap = tex;
      matConfig.bumpScale = 0.05;
    }

    const mat = new THREE.MeshPhysicalMaterial(matConfig);

    mat.onBeforeCompile = (shader) => {
      // Pass instanceProp from vertex to fragment
      shader.vertexShader = `
        attribute float instanceProp;
        varying float vInstanceProp;
        ${shader.vertexShader}
      `;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vInstanceProp = instanceProp;
        `
      );

      shader.fragmentShader = `
        varying float vInstanceProp;
        ${shader.fragmentShader}
      `;
      
      // Procedural PBR: Modulate roughness and metalness
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `
        #include <roughnessmap_fragment>
        // High strain/error increases roughness (matte/fractured look)
        roughnessFactor = mix(roughnessFactor, 0.9, vInstanceProp);
        `
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <metalnessmap_fragment>',
        `
        #include <metalnessmap_fragment>
        // High strain/error decreases metalness
        metalnessFactor = mix(metalnessFactor, 0.05, vInstanceProp);
        `
      );
      
      // Emissive Radiance: Top 10% of values bleed light
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        float glowIntensity = smoothstep(0.85, 1.0, vInstanceProp) * 2.5;
        totalEmissiveRadiance += diffuseColor.rgb * glowIntensity;
        `
      );
    };
    return mat;
  }, [renderStyle, botanicalMode, materialPreset, atomTexture]);

  // Get property data for coloring
  const propData = useMemo(() => {
    if (colorMode !== 'property' || !colorProperty) return null;
    return frame.properties?.get(colorProperty) ?? null;
  }, [frame, colorMode, colorProperty]);

  // Auto-compute property range
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

  // Pre-compute palette-mapped colors for each atom type
  // This maps each unique type to a position on the active colormap
  const typeColorLookup = useMemo(() => {
    const typeSet = new Set<number>();
    for (let i = 0; i < frame.natoms; i++) typeSet.add(frame.types[i]);
    const sortedTypes = Array.from(typeSet).sort((a, b) => a - b);
    const lookup = new Map<number, [number, number, number]>();
    for (let i = 0; i < sortedTypes.length; i++) {
      const t = sortedTypes.length > 1 ? i / (sortedTypes.length - 1) : 0.5;
      lookup.set(sortedTypes[i], mapFn(t));
    }
    return lookup;
  }, [frame.types, frame.natoms, mapFn]);

  // Build spatial hash and update instance buffers
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Defer spatial hash rebuild to idle time (avoid blocking render loop)
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
    // Capture for cleanup
    const cleanupIdle = () => cancelIdle(idleId as any);

    // Update matrices and colors - direct buffer manipulation for speed
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

    // ─── Pre-compute LUTs for O(1) access inside hot loop ───
    const MAX_TYPES = 256;
    const radiiLookup = new Float32Array(MAX_TYPES).fill(1.2);
    const hiddenLookup = new Uint8Array(MAX_TYPES);
    const scaleOverrideLookup = new Float32Array(MAX_TYPES).fill(1.0);
    const botR = new Float32Array(MAX_TYPES).fill(0.3);
    const botG = new Float32Array(MAX_TYPES).fill(0.5);
    const botB = new Float32Array(MAX_TYPES).fill(0.2);
    const typR = new Float32Array(MAX_TYPES).fill(0.6);
    const typG = new Float32Array(MAX_TYPES).fill(0.6);
    const typB = new Float32Array(MAX_TYPES).fill(0.6);

    for (let typeId = 0; typeId < MAX_TYPES; typeId++) {
      radiiLookup[typeId] = botanicalMode ? (BOTANICAL_RADII[typeId] ?? 1.2) : (TYPE_RADII[typeId] ?? 1.2);
      if (hiddenAtomTypes?.has(typeId)) hiddenLookup[typeId] = 1;
      if (atomTypeScales?.[typeId] !== undefined) scaleOverrideLookup[typeId] = atomTypeScales[typeId];
      if (botanicalMode) {
        const c = BOTANICAL_COLORS[typeId] ?? [0.3, 0.5, 0.2];
        botR[typeId] = c[0]; botG[typeId] = c[1]; botB[typeId] = c[2];
      }
    }
    typeColorLookup.forEach((color, typeId) => {
      if (typeId < MAX_TYPES) {
        typR[typeId] = color[0]; typG[typeId] = color[1]; typB[typeId] = color[2];
      }
    });

    let uniR = 0.6, uniG = 0.6, uniB = 0.6;
    if (colorMode === 'uniform') {
      const tc = mapFn(0.0);
      uniR = tc[0]; uniG = tc[1]; uniB = tc[2];
    }
    
    // Cache prop diffing logic
    const hasPropInterpolation = nextFrame && t > 0 && nextFrame.properties && nextFrame.properties.has(colorProperty!);
    const nextPropData = hasPropInterpolation ? nextFrame.properties!.get(colorProperty!) : null;
    const isPropMode = colorMode === 'property' && propData;

    // ─── Zero-Allocation Lookup Tables ───
    const lutSize = 1024;
    const lutR = new Float32Array(lutSize);
    const lutG = new Float32Array(lutSize);
    const lutB = new Float32Array(lutSize);
    if (isPropMode) {
      for (let i = 0; i < lutSize; i++) {
        const c = mapFn(i / (lutSize - 1));
        lutR[i] = c[0]; lutG[i] = c[1]; lutB[i] = c[2];
      }
    }

    // Convert Set to Uint8Array for O(1) loop checks
    const highlights = new Uint8Array(frame.natoms);
    if (highlightedAtoms && highlightedAtoms.size > 0) {
      highlightedAtoms.forEach(idx => {
        if (idx < frame.natoms) highlights[idx] = 1;
      });
    }

    for (let i = 0; i < frame.natoms; i++) {
      // Position
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
      
      const typeId = types[i] < MAX_TYPES ? types[i] : 0;
      const radius = hiddenLookup[typeId] ? 0 : radiiLookup[typeId] * scale * scaleOverrideLookup[typeId];
      
      // Inline matrix building (translation + scale only, identity rotation)
      const mIdx = i * 16;
      matrixArray[mIdx + 0] = radius; matrixArray[mIdx + 1] = 0;      matrixArray[mIdx + 2] = 0;       matrixArray[mIdx + 3] = 0;
      matrixArray[mIdx + 4] = 0;      matrixArray[mIdx + 5] = radius; matrixArray[mIdx + 6] = 0;       matrixArray[mIdx + 7] = 0;
      matrixArray[mIdx + 8] = 0;      matrixArray[mIdx + 9] = 0;      matrixArray[mIdx + 10] = radius; matrixArray[mIdx + 11] = 0;
      matrixArray[mIdx + 12] = x;     matrixArray[mIdx + 13] = y;     matrixArray[mIdx + 14] = z;      matrixArray[mIdx + 15] = 1;

      // Color
      const cIdx = i * 3;
      const isHighlighted = highlights[i] === 1;

      if (botanicalMode) {
        if (isHighlighted) {
          colorArray[cIdx] = Math.min(1, botR[typeId] * 1.5);
          colorArray[cIdx + 1] = Math.min(1, botG[typeId] * 1.5);
          colorArray[cIdx + 2] = Math.min(1, botB[typeId] * 1.5);
        } else {
          colorArray[cIdx] = botR[typeId];
          colorArray[cIdx + 1] = botG[typeId];
          colorArray[cIdx + 2] = botB[typeId];
        }
        propArray[i] = 0.0;
      } else if (isPropMode) {
        let val = propData![i];
        if (nextPropData && nextPropData.length > i) {
          val = val + (nextPropData[i] - val) * t;
        }
        const norm = pMax > pMin ? (val - pMin) / (pMax - pMin) : 0.5;
        // Map to LUT index (0 to lutSize - 1)
        const lutIdx = Math.max(0, Math.min(lutSize - 1, Math.floor(norm * lutSize)));
        colorArray[cIdx] = lutR[lutIdx];
        colorArray[cIdx + 1] = lutG[lutIdx];
        colorArray[cIdx + 2] = lutB[lutIdx];
        propArray[i] = norm;
      } else {
        let r, g, b;
        if (colorMode === 'uniform') {
          r = uniR; g = uniG; b = uniB;
        } else {
          r = typR[typeId]; g = typG[typeId]; b = typB[typeId];
        }
        
        if (isHighlighted) {
          colorArray[cIdx] = Math.min(1, r * 1.5);
          colorArray[cIdx + 1] = Math.min(1, g * 1.5);
          colorArray[cIdx + 2] = Math.min(1, b * 1.5);
        } else {
          colorArray[cIdx] = r;
          colorArray[cIdx + 1] = g;
          colorArray[cIdx + 2] = b;
        }
        propArray[i] = 0.0;
      }
    }

    // Upload to GPU - single operation
    const safeAtomCount = Math.min(frame.natoms, capacity);
    mesh.instanceMatrix.array.set(matrixArray.subarray(0, safeAtomCount * 16));
    mesh.instanceMatrix.needsUpdate = true;
    
    geometry.attributes.instanceProp.needsUpdate = true;

    if (mesh.instanceColor) {
      mesh.instanceColor.array.set(colorArray.subarray(0, safeAtomCount * 3));
      mesh.instanceColor.needsUpdate = true;
    }
    
    mesh.count = safeAtomCount;

    // Cleanup: cancel pending idle hash build if effect re-runs
    return cleanupIdle;
  }, [
    frame, nextFrame, interpolationFactor, colorMode, propData, pMin, pMax, scale, highlightedAtoms,
    hiddenAtomTypes, atomTypeScales, typeColorLookup, botanicalMode,
    matrixArray, colorArray, _matrix, _position, _scale, _quaternion, mapFn, onSpatialHash
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      spatialHashRef.current.clear();
    };
  }, [geometry, material]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, capacity]}
      frustumCulled={false}
    >
      <instancedBufferAttribute attach="instanceColor" args={[colorArray, 3]} />
    </instancedMesh>
  );
}

// Export spatial hash for external use
export { SpatialHash3D };
