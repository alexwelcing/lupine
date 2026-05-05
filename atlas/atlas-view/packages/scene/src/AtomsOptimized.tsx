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
  const meshRefHigh = useRef<THREE.InstancedMesh>(null!);
  const meshRefMed = useRef<THREE.InstancedMesh>(null!);
  const meshRefLow = useRef<THREE.InstancedMesh>(null!);
  const timer = useGlobalTimer();
  
  const spatialHashRef = useRef(new SpatialHash3D(3.0));
  const visibleAtomsCountRef = useRef(0);
  
  // Dynamic capacity mapping (vector-style growth)
  const capacityRef = useRef(Math.max(MIN_CAPACITY, Math.ceil(frame.natoms * 1.2)));
  if (frame.natoms > capacityRef.current) {
    capacityRef.current = Math.max(capacityRef.current * 1.5, Math.ceil(frame.natoms * 1.2));
  }
  let capacity = capacityRef.current;
  if (maxAtoms !== undefined && capacity > maxAtoms) {
    capacity = maxAtoms;
  }

  // Pre-allocated working buffers (these are not used actively in LOD beyond initial allocation)
  const matrixArray = useMemo(() => new Float32Array(capacity * 16), [capacity]);
  const colorArray = useMemo(() => new Float32Array(capacity * 3), [capacity]);
  
  // Instance Prop arrays for each LOD
  const propArrayHigh = useMemo(() => new Float32Array(capacity), [capacity]);
  const propArrayMed = useMemo(() => new Float32Array(capacity), [capacity]);
  const propArrayLow = useMemo(() => new Float32Array(capacity), [capacity]);

  const _matrix = useMemo(() => new THREE.Matrix4(), []);
  const _position = useMemo(() => new THREE.Vector3(), []);
  const _scale = useMemo(() => new THREE.Vector3(), []);
  const _quaternion = useMemo(() => new THREE.Quaternion(), []);

  // Geometry & Material (cached, LOD based on atom count)
  const geoToon = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const geoHigh = useMemo(() => new THREE.SphereGeometry(1, 24, 16), []);
  const geoMed = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);  // 42 verts
  const geoLow = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);  // 12 verts

  useEffect(() => {
    geoHigh.setAttribute('instanceProp', new THREE.InstancedBufferAttribute(propArrayHigh, 1));
    geoMed.setAttribute('instanceProp', new THREE.InstancedBufferAttribute(propArrayMed, 1));
    geoLow.setAttribute('instanceProp', new THREE.InstancedBufferAttribute(propArrayLow, 1));
    geoToon.setAttribute('instanceProp', new THREE.InstancedBufferAttribute(propArrayHigh, 1));
  }, [geoHigh, geoMed, geoLow, geoToon, propArrayHigh, propArrayMed, propArrayLow]);

  const uniformsRef = useRef({ uTime: { value: 0 } });
  
  // Create persistent CPU-side source arrays so we don't overwrite them when culling
  const cpuMatrixArray = useMemo(() => new Float32Array(capacity * 16), [capacity]);
  const cpuColorArray = useMemo(() => new Float32Array(capacity * 3), [capacity]);
  const cpuPropArray = useMemo(() => new Float32Array(capacity), [capacity]);

  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const _v = useMemo(() => new THREE.Vector3(), []);
  
  useFrame((state) => {
    if (botanicalMode) {
      uniformsRef.current.uTime.value = timer.getElapsedTime();
    }
    
    // 🎬 Cinematic Macro-to-Micro Transition
    if (!botanicalMode && renderStyle !== 'toon' && frame.natoms > 10000 && material instanceof THREE.MeshPhysicalMaterial) {
      const dist = state.camera.position.length();
      
      const macroDist = 120.0;
      const microDist = 60.0;
      
      let targetOpacity = 1.0;
      let targetTransmission = 0.0;
      let targetRoughness = 0.2;
      
      if (dist > macroDist) {
        targetOpacity = 1.0;
        targetTransmission = 0.0;
        targetRoughness = 0.1;
      } else if (dist < microDist) {
        targetOpacity = 0.8;
        targetTransmission = 0.95;
        targetRoughness = 0.05;
      } else {
        const factor = (macroDist - dist) / (macroDist - microDist);
        targetOpacity = 1.0 - (factor * 0.2);
        targetTransmission = factor * 0.95;
        targetRoughness = 0.1 - (factor * 0.05);
      }
      
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.08);
      material.transmission = THREE.MathUtils.lerp(material.transmission, targetTransmission, 0.08);
      material.roughness = THREE.MathUtils.lerp(material.roughness, targetRoughness, 0.08);
    }

    // 🔭 VIEW is the secret math! Frustum + Dynamic Distance Culling (LOD)
    const meshH = meshRefHigh.current;
    const meshM = meshRefMed.current;
    const meshL = meshRefLow.current;
    
    if (meshH && meshM && meshL && frame.natoms > 0) {
      // 1. Calculate the current view frustum
      projScreenMatrix.multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);
      
      const dstMatH = meshH.instanceMatrix.array as Float32Array;
      const dstColH = meshH.instanceColor ? (meshH.instanceColor.array as Float32Array) : null;
      const dstPropH = geoHigh.attributes.instanceProp.array as Float32Array;

      const dstMatM = meshM.instanceMatrix.array as Float32Array;
      const dstColM = meshM.instanceColor ? (meshM.instanceColor.array as Float32Array) : null;
      const dstPropM = geoMed.attributes.instanceProp.array as Float32Array;

      const dstMatL = meshL.instanceMatrix.array as Float32Array;
      const dstColL = meshL.instanceColor ? (meshL.instanceColor.array as Float32Array) : null;
      const dstPropL = geoLow.attributes.instanceProp.array as Float32Array;

      let countH = 0, countM = 0, countL = 0;
      const totalAtoms = Math.min(frame.natoms, capacity);
      
      const camX = state.camera.position.x;
      const camY = state.camera.position.y;
      const camZ = state.camera.position.z;
      
      // Dynamic LOD thresholds based on camera distance squared
      const lod0_distSq = 60.0 * 60.0;
      const lod1_distSq = 250.0 * 250.0;
      
      // 2. Loop through all pre-calculated atoms in the CPU arrays
      for (let i = 0; i < totalAtoms; i++) {
        const mIdx = i * 16;
        const ax = cpuMatrixArray[mIdx + 12];
        const ay = cpuMatrixArray[mIdx + 13];
        const az = cpuMatrixArray[mIdx + 14];
        
        _v.set(ax, ay, az);
        
        // 3. Good old fashioned physics/optics: Only process what the camera can physically see
        if (true) { // Temporary disable frustum culling
          const dx = ax - camX;
          const dy = ay - camY;
          const dz = az - camZ;
          const distSq = dx*dx + dy*dy + dz*dz;
          
          if (distSq < lod0_distSq || renderStyle === 'toon') {
            // High Detail
            const dstMIdx = countH * 16;
            dstMatH[dstMIdx + 0]  = cpuMatrixArray[mIdx + 0];
            dstMatH[dstMIdx + 1]  = cpuMatrixArray[mIdx + 1];
            dstMatH[dstMIdx + 2]  = cpuMatrixArray[mIdx + 2];
            dstMatH[dstMIdx + 3]  = cpuMatrixArray[mIdx + 3];
            dstMatH[dstMIdx + 4]  = cpuMatrixArray[mIdx + 4];
            dstMatH[dstMIdx + 5]  = cpuMatrixArray[mIdx + 5];
            dstMatH[dstMIdx + 6]  = cpuMatrixArray[mIdx + 6];
            dstMatH[dstMIdx + 7]  = cpuMatrixArray[mIdx + 7];
            dstMatH[dstMIdx + 8]  = cpuMatrixArray[mIdx + 8];
            dstMatH[dstMIdx + 9]  = cpuMatrixArray[mIdx + 9];
            dstMatH[dstMIdx + 10] = cpuMatrixArray[mIdx + 10];
            dstMatH[dstMIdx + 11] = cpuMatrixArray[mIdx + 11];
            dstMatH[dstMIdx + 12] = ax;
            dstMatH[dstMIdx + 13] = ay;
            dstMatH[dstMIdx + 14] = az;
            dstMatH[dstMIdx + 15] = 1;

            if (dstColH) {
              const cIdx = i * 3;
              const dstCIdx = countH * 3;
              dstColH[dstCIdx] = cpuColorArray[cIdx];
              dstColH[dstCIdx + 1] = cpuColorArray[cIdx + 1];
              dstColH[dstCIdx + 2] = cpuColorArray[cIdx + 2];
            }
            dstPropH[countH] = cpuPropArray[i];
            countH++;
          } else if (distSq < lod1_distSq) {
            // Medium Detail
            const dstMIdx = countM * 16;
            dstMatM[dstMIdx + 0]  = cpuMatrixArray[mIdx + 0];
            dstMatM[dstMIdx + 1]  = cpuMatrixArray[mIdx + 1];
            dstMatM[dstMIdx + 2]  = cpuMatrixArray[mIdx + 2];
            dstMatM[dstMIdx + 3]  = cpuMatrixArray[mIdx + 3];
            dstMatM[dstMIdx + 4]  = cpuMatrixArray[mIdx + 4];
            dstMatM[dstMIdx + 5]  = cpuMatrixArray[mIdx + 5];
            dstMatM[dstMIdx + 6]  = cpuMatrixArray[mIdx + 6];
            dstMatM[dstMIdx + 7]  = cpuMatrixArray[mIdx + 7];
            dstMatM[dstMIdx + 8]  = cpuMatrixArray[mIdx + 8];
            dstMatM[dstMIdx + 9]  = cpuMatrixArray[mIdx + 9];
            dstMatM[dstMIdx + 10] = cpuMatrixArray[mIdx + 10];
            dstMatM[dstMIdx + 11] = cpuMatrixArray[mIdx + 11];
            dstMatM[dstMIdx + 12] = ax;
            dstMatM[dstMIdx + 13] = ay;
            dstMatM[dstMIdx + 14] = az;
            dstMatM[dstMIdx + 15] = 1;

            if (dstColM) {
              const cIdx = i * 3;
              const dstCIdx = countM * 3;
              dstColM[dstCIdx] = cpuColorArray[cIdx];
              dstColM[dstCIdx + 1] = cpuColorArray[cIdx + 1];
              dstColM[dstCIdx + 2] = cpuColorArray[cIdx + 2];
            }
            dstPropM[countM] = cpuPropArray[i];
            countM++;
          } else {
            // Low Detail
            const dstMIdx = countL * 16;
            dstMatL[dstMIdx + 0]  = cpuMatrixArray[mIdx + 0];
            dstMatL[dstMIdx + 1]  = cpuMatrixArray[mIdx + 1];
            dstMatL[dstMIdx + 2]  = cpuMatrixArray[mIdx + 2];
            dstMatL[dstMIdx + 3]  = cpuMatrixArray[mIdx + 3];
            dstMatL[dstMIdx + 4]  = cpuMatrixArray[mIdx + 4];
            dstMatL[dstMIdx + 5]  = cpuMatrixArray[mIdx + 5];
            dstMatL[dstMIdx + 6]  = cpuMatrixArray[mIdx + 6];
            dstMatL[dstMIdx + 7]  = cpuMatrixArray[mIdx + 7];
            dstMatL[dstMIdx + 8]  = cpuMatrixArray[mIdx + 8];
            dstMatL[dstMIdx + 9]  = cpuMatrixArray[mIdx + 9];
            dstMatL[dstMIdx + 10] = cpuMatrixArray[mIdx + 10];
            dstMatL[dstMIdx + 11] = cpuMatrixArray[mIdx + 11];
            dstMatL[dstMIdx + 12] = ax;
            dstMatL[dstMIdx + 13] = ay;
            dstMatL[dstMIdx + 14] = az;
            dstMatL[dstMIdx + 15] = 1;

            if (dstColL) {
              const cIdx = i * 3;
              const dstCIdx = countL * 3;
              dstColL[dstCIdx] = cpuColorArray[cIdx];
              dstColL[dstCIdx + 1] = cpuColorArray[cIdx + 1];
              dstColL[dstCIdx + 2] = cpuColorArray[cIdx + 2];
            }
            dstPropL[countL] = cpuPropArray[i];
            countL++;
          }
        }
      }
      
      // Update counts and mark ranges for GPU upload
      meshH.count = countH;
      meshH.instanceMatrix.needsUpdate = true;
      (meshH.instanceMatrix as any).updateRange = { offset: 0, count: countH * 16 };
      if (meshH.instanceColor) {
        meshH.instanceColor.needsUpdate = true;
        (meshH.instanceColor as any).updateRange = { offset: 0, count: countH * 3 };
      }
      geoHigh.attributes.instanceProp.needsUpdate = true;
      (geoHigh.attributes.instanceProp as any).updateRange = { offset: 0, count: countH };

      if (renderStyle === 'toon') {
        geoToon.attributes.instanceProp.needsUpdate = true;
        (geoToon.attributes.instanceProp as any).updateRange = { offset: 0, count: countH };
      }

      meshM.count = countM;
      meshM.instanceMatrix.needsUpdate = true;
      // (meshM.instanceMatrix as any).updateRange.count = countM * 16;
      if (meshM.instanceColor) {
        meshM.instanceColor.needsUpdate = true;
        // (meshM.instanceColor as any).updateRange.count = countM * 3;
      }
      geoMed.attributes.instanceProp.needsUpdate = true;
      (geoMed.attributes.instanceProp as any).updateRange = { offset: 0, count: countM };

      meshL.count = countL;
      meshL.instanceMatrix.needsUpdate = true;
      // (meshL.instanceMatrix as any).updateRange.count = countL * 16;
      if (meshL.instanceColor) {
        meshL.instanceColor.needsUpdate = true;
        // (meshL.instanceColor as any).updateRange.count = countL * 3;
      }
      geoLow.attributes.instanceProp.needsUpdate = true;
      (geoLow.attributes.instanceProp as any).updateRange = { offset: 0, count: countL };
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
      const typeId = sortedTypes[i];
      if (colorMode === 'type') {
        const tc = TYPE_COLORS[typeId] ?? DEFAULT_TYPE_COLOR;
        // The default type color is [0.6, 0.6, 0.6] but TYPE_COLORS contains 1: [1, 1, 1] for Hydrogen
        // However, if the typeId is a generic LAMMPS index (1, 2, 3) and the user doesn't want Hydrogen,
        // we'll stick to TYPE_COLORS for now to restore the physical mapping behavior for XYZ
        lookup.set(typeId, [tc[0], tc[1], tc[2]]);
      } else {
        const t = sortedTypes.length > 1 ? i / (sortedTypes.length - 1) : 0.5;
        lookup.set(typeId, mapFn(t));
      }
    }
    return lookup;
  }, [frame.types, frame.natoms, mapFn, colorMode]);

  // Build spatial hash and update instance buffers
  const uploadFrame = useCallback(() => {
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

    // ─── Pre-compute lookups for O(1) access inside hot loop ───
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
      
      // Inline matrix building into the CPU array
      const mIdx = i * 16;
      cpuMatrixArray[mIdx + 0] = radius; cpuMatrixArray[mIdx + 1] = 0;      cpuMatrixArray[mIdx + 2] = 0;       cpuMatrixArray[mIdx + 3] = 0;
      cpuMatrixArray[mIdx + 4] = 0;      cpuMatrixArray[mIdx + 5] = radius; cpuMatrixArray[mIdx + 6] = 0;       cpuMatrixArray[mIdx + 7] = 0;
      cpuMatrixArray[mIdx + 8] = 0;      cpuMatrixArray[mIdx + 9] = 0;      cpuMatrixArray[mIdx + 10] = radius; cpuMatrixArray[mIdx + 11] = 0;
      cpuMatrixArray[mIdx + 12] = x;     cpuMatrixArray[mIdx + 13] = y;     cpuMatrixArray[mIdx + 14] = z;      cpuMatrixArray[mIdx + 15] = 1;

      // Color
      const cIdx = i * 3;
      if (botanicalMode) {
        const isHighlighted = highlightedAtoms?.has(i);
        if (isHighlighted) {
          cpuColorArray[cIdx] = Math.min(1, botR[typeId] * 1.5);
          cpuColorArray[cIdx + 1] = Math.min(1, botG[typeId] * 1.5);
          cpuColorArray[cIdx + 2] = Math.min(1, botB[typeId] * 1.5);
        } else {
          cpuColorArray[cIdx] = botR[typeId];
          cpuColorArray[cIdx + 1] = botG[typeId];
          cpuColorArray[cIdx + 2] = botB[typeId];
        }
        cpuPropArray[i] = 0.0;
      } else if (isPropMode) {
        let val = propData![i];
        if (nextPropData && nextPropData.length > i) {
          val = val + (nextPropData[i] - val) * t;
        }
        const norm = pMax > pMin ? (val - pMin) / (pMax - pMin) : 0.5;
        const [r, g, b] = mapFn(norm);
        cpuColorArray[cIdx] = r;
        cpuColorArray[cIdx + 1] = g;
        cpuColorArray[cIdx + 2] = b;
        cpuPropArray[i] = norm;
      } else {
        const isHighlighted = highlightedAtoms?.has(i);
        let r, g, b;
        if (colorMode === 'uniform') {
          r = uniR; g = uniG; b = uniB;
        } else {
          r = typR[typeId]; g = typG[typeId]; b = typB[typeId];
        }
        
        if (isHighlighted) {
          cpuColorArray[cIdx] = Math.min(1, r * 1.5);
          cpuColorArray[cIdx + 1] = Math.min(1, g * 1.5);
          cpuColorArray[cIdx + 2] = Math.min(1, b * 1.5);
        } else {
          cpuColorArray[cIdx] = r;
          cpuColorArray[cIdx + 1] = g;
          cpuColorArray[cIdx + 2] = b;
        }
        cpuPropArray[i] = 0.0;
      }
    }

    // Notice we do NOT upload to the GPU here.
    // The CPU array acts as our master state, and the useFrame loop uploads visible instances dynamically.

    // Cleanup: cancel pending idle hash build if effect re-runs
    return cleanupIdle;
  }, [
    frame, nextFrame, interpolationFactor, colorMode, propData, pMin, pMax, scale, highlightedAtoms,
    hiddenAtomTypes, atomTypeScales, typeColorLookup, botanicalMode,
    cpuMatrixArray, cpuColorArray, cpuPropArray, mapFn, onSpatialHash,
    capacity, colorProperty
  ]);

  useEffect(() => {
    return uploadFrame();
  }, [uploadFrame]);

  // Cleanup
  useEffect(() => {
    return () => {
      geoHigh.dispose();
      geoMed.dispose();
      geoLow.dispose();
      geoToon.dispose();
      material.dispose();
      spatialHashRef.current.clear();
    };
  }, [geoHigh, geoMed, geoLow, geoToon, material]);

  // Use the active geometry based on render style for the High LOD layer
  const activeGeoHigh = renderStyle === 'toon' ? geoToon : geoHigh;

  return (
    <group>
      <instancedMesh
        ref={meshRefHigh}
        args={[activeGeoHigh, material, capacity]}
        frustumCulled={false}
      >
        <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(capacity * 3), 3]} />
      </instancedMesh>
      
      <instancedMesh
        ref={meshRefMed}
        args={[geoMed, material, capacity]}
        frustumCulled={false}
      >
        <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(capacity * 3), 3]} />
      </instancedMesh>

      <instancedMesh
        ref={meshRefLow}
        args={[geoLow, material, capacity]}
        frustumCulled={false}
      >
        <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(capacity * 3), 3]} />
      </instancedMesh>
    </group>
  );
}

// Export spatial hash for external use
export { SpatialHash3D };
