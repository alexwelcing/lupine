/**
 * <Bonds /> — High-performance bond rendering with off-thread detection
 *
 * Bond detection (spatial hash + neighbor query) runs in a Web Worker so it
 * never blocks rendering. The component stays mounted and uses visibility
 * toggling instead of unmount/remount.
 *
 * Architecture:
 * - Bond detection → Web Worker (non-blocking)
 * - Bond geometry → computed once per worker result
 * - GPU upload → native TypedArray.set() bulk copy
 * - Toggle → instant visibility flip, no recomputation
 */

import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame, ColormapName, RenderStyle } from '@atlas/core/types';
import { useGlobalTimer } from './useTimer';
import { DEFAULT_TYPE_COLOR, getTypeColorFromColormap, BOTANICAL_COLORS, COLORMAPS } from './constants';

// Worker URL — matches the pattern used in @atlas/parsers
const BOND_WORKER_URL = new URL('./bondWorker.ts', import.meta.url);

interface BondsProps {
  frame: Frame;
  nextFrame?: Frame;
  interpolationFactor?: number;
  colormap?: ColormapName;
  colorMode?: 'type' | 'uniform' | 'property';
  colorProperty?: string;
  propRange?: [number, number];
  maxBondLength?: number;
  typeCutoffs?: Map<string, number>;
  periodic?: boolean;
  cellBounds?: [number, number, number, number, number, number];
  radius?: number;
  opacity?: number;
  renderStyle?: RenderStyle;
  botanicalMode?: boolean;
  materialPreset?: 'default' | 'matte' | 'metallic' | 'glass' | 'plastic';
  visible?: boolean;
}

export function Bonds({
  frame,
  nextFrame,
  interpolationFactor,
  colormap = 'viridis',
  colorMode = 'type',
  colorProperty,
  propRange,
  maxBondLength = 2.5,
  typeCutoffs,
  periodic = false,
  cellBounds,
  radius = 0.12,
  opacity = 0.85,
  renderStyle = 'standard',
  botanicalMode = false,
  materialPreset = 'default',
  visible = true,
}: BondsProps) {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timer = useGlobalTimer();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const workerRef = useRef<Worker | null>(null);

  // Bond pair data from the worker
  const [bondPairs, setBondPairs] = useState<Int32Array>(new Int32Array(0));
  const bondCount = bondPairs.length / 2;
  const halfCount = bondCount * 2; // Each bond → 2 half-cylinders

  // Tube geometry — 5 radial segments for performance
  const tubeGeo = useMemo(
    () => new THREE.CylinderGeometry(1, 1, 1, 5, 1),
    []
  );

  // ─── Web Worker lifecycle ──────────────────────────────────────────
  useEffect(() => {
    const worker = new Worker(BOND_WORKER_URL, { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { bondPairs: pairs, count } = e.data;
      // pairs is Int32Array [a0,b0, a1,b1, ...]
      setBondPairs(pairs instanceof Int32Array ? pairs : new Int32Array(pairs));
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // ─── Dispatch bond detection to worker (debounced) ─────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!workerRef.current || !frame || frame.natoms < 2) {
      setBondPairs(new Int32Array(0));
      return;
    }

    // Debounce cutoff changes — 300ms delay so slider doesn't spam
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const worker = workerRef.current;
      if (!worker) return;

      // Send data to worker — positions and types are transferred (zero-copy)
      // We make copies since the originals are shared with the renderer
      const posCopy = new Float32Array(frame.positions);
      const typesCopy = new Int32Array(frame.types);

      worker.postMessage(
        {
          positions: posCopy,
          types: typesCopy,
          natoms: frame.natoms,
          maxBondLength,
          bonds: frame.bonds && frame.bonds.length > 0 ? new Int32Array(frame.bonds) : null,
        },
        [posCopy.buffer, typesCopy.buffer] // Transfer ownership
      );
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [frame, maxBondLength]);

  // ─── Capacity management ───────────────────────────────────────────
  const MIN_BOND_CAPACITY = 20000;
  const capacityRef = useRef(MIN_BOND_CAPACITY);
  if (halfCount > capacityRef.current) {
    capacityRef.current = Math.max(capacityRef.current * 1.5, Math.ceil(halfCount * 1.2));
  }
  const capacity = capacityRef.current;

  // CPU-side state arrays for bulk GPU upload
  const cpuMatrixArray = useMemo(() => new Float32Array(capacity * 16), [capacity]);
  const cpuColorArray = useMemo(() => new Float32Array(capacity * 3), [capacity]);
  const cpuRadiusBTArray = useMemo(() => new Float32Array(capacity * 2), [capacity]);

  // Working arrays for rendering/updating GPU buffers
  const radiusBTArray = useMemo(() => new Float32Array(capacity * 2), [capacity]);
  useEffect(() => {
    tubeGeo.setAttribute('radiusBT', new THREE.InstancedBufferAttribute(radiusBTArray, 2));
  }, [tubeGeo, radiusBTArray]);

  // ─── Material ──────────────────────────────────────────────────────
  const uniformsRef = useRef({ uTime: { value: 0 } });

  const material = useMemo(() => {
    let mat: THREE.Material;
    if (botanicalMode) {
      mat = new THREE.MeshPhysicalMaterial({
        metalness: 0.05,
        roughness: 0.65,
        clearcoat: 0.2,
        clearcoatRoughness: 0.3,
        transmission: 0.3,
        thickness: 1.5,
        ior: 1.4,
      });
    } else if (renderStyle === 'toon') {
      mat = new THREE.MeshToonMaterial({
        transparent: opacity < 1,
        opacity,
      });
    } else {
      let matConfig: THREE.MeshPhysicalMaterialParameters = {};
      switch (materialPreset) {
        case 'matte':
          matConfig = { metalness: 0.05, roughness: 0.85, clearcoat: 0.0 };
          break;
        case 'metallic':
          matConfig = { metalness: 0.8, roughness: 0.2, clearcoat: 0.2, clearcoatRoughness: 0.2, envMapIntensity: 2.0 };
          break;
        case 'glass':
          matConfig = { metalness: 0.1, roughness: 0.1, transmission: 0.8, thickness: 1.5, ior: 1.5, transparent: true, clearcoat: 1.0, envMapIntensity: 1.5 };
          break;
        case 'plastic':
          matConfig = { metalness: 0.0, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 1.0 };
          break;
        case 'default':
        default:
          matConfig = { metalness: 0.1, roughness: 0.5, clearcoat: 0.1, envMapIntensity: 0.8 };
          break;
      }
      mat = new THREE.MeshPhysicalMaterial({
        ...matConfig,
        transparent: true,
        opacity,
      });
    }

    mat.onBeforeCompile = (shader) => {
      if (botanicalMode) {
        shader.uniforms.uTime = uniformsRef.current.uTime;
      }

      shader.vertexShader = `
        attribute vec2 radiusBT;
        ${botanicalMode ? 'uniform float uTime;' : ''}
        ${shader.vertexShader}
      `;

      let vertexChunk = `
        #include <begin_vertex>
        // Taper bonds using per-instance radiusBT (bottom, top)
        float instanceRadius = mix(radiusBT.x, radiusBT.y, position.y + 0.5);
        transformed.x *= instanceRadius;
        transformed.z *= instanceRadius;
      `;

      if (botanicalMode) {
        vertexChunk += `
        // Organic wind sway based on world height (instanceMatrix[3].y)
        float heightFactor = max(0.0, instanceMatrix[3].y - 2.0);
        float swayAmount = heightFactor * 0.04;
        float noise = sin(uTime * 1.2 + instanceMatrix[3].x * 0.5 + instanceMatrix[3].z * 0.5);
        transformed.x += noise * swayAmount;
        transformed.z += cos(uTime * 0.9 + instanceMatrix[3].x) * swayAmount;
        `;
      }

      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', vertexChunk);

      if (botanicalMode) {
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
          float fresnel = pow(1.0 - ndotv, 3.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + vec3(0.15, 0.2, 0.05), fresnel * 0.6);
          `
        );
      }
    };
    return mat;
  }, [renderStyle, opacity, botanicalMode, materialPreset]);

  // Cleanup
  useEffect(() => {
    return () => { tubeGeo.dispose(); };
  }, [tubeGeo]);

  useEffect(() => {
    return () => { material.dispose(); };
  }, [material]);

  // ─── Property data ─────────────────────────────────────────────────
  const isPropMode = colorMode === 'property' && colorProperty;
  const propData = isPropMode && frame.properties ? frame.properties.get(colorProperty) : null;

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


  // Upload instance matrices + colors. Extracted into a callback so we can
  // invoke it both on dep change AND on mesh remount (R3F remounts the mesh
  // when entering WebXR, and rAF is paused during the session-start transition
  // so a normal useEffect won't fire on the new mesh until too late).
  const uploadBonds = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh || halfCount === 0) return;

    if (!mesh.instanceMatrix) return;

    const drawCount = Math.min(halfCount, capacity);

    const t = interpolationFactor ?? 0;
    const hasPropInterpolation = isPropMode && nextFrame && t > 0 && nextFrame.properties && nextFrame.properties.has(colorProperty!);
    const nextPropData = hasPropInterpolation ? nextFrame.properties!.get(colorProperty!) : null;
    const mapFn = COLORMAPS[colormap] || COLORMAPS.viridis;

    // Build type normalization map to match AtomsOptimized.tsx
    const typeSet = new Set<number>();
    if (frame.types) {
      for (let i = 0; i < frame.natoms; i++) typeSet.add(frame.types[i]);
    }
    const sortedTypes = Array.from(typeSet).sort((a, b) => a - b);
    const typeToNorm = new Map<number, number>();
    for (let j = 0; j < sortedTypes.length; j++) {
      typeToNorm.set(sortedTypes[j], sortedTypes.length > 1 ? j / (sortedTypes.length - 1) : 0.5);
    }

    // Auto-compute local min/max for prop mapping if not supplied
    let pMin = propRange?.[0] ?? 0;
    let pMax = propRange?.[1] ?? 1;
    if (isPropMode && propData && !propRange) {
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < frame.natoms; i++) {
        if (propData[i] < min) min = propData[i];
        if (propData[i] > max) max = propData[i];
      }
      pMin = min;
      pMax = max;
    }

    const positions = frame.positions;
    const nextPos = nextFrame?.positions;

    for (let i = 0; i < drawCount / 2; i++) {
      const a = bondPairs[i * 2];
      const b = bondPairs[i * 2 + 1];
      let ax = positions[a * 3];
      let ay = positions[a * 3 + 1];
      let az = positions[a * 3 + 2];
      let bx = positions[b * 3];
      let by = positions[b * 3 + 1];
      let bz = positions[b * 3 + 2];

      const canInterpolate = nextFrame && t > 0 && nextPos && nextPos.length >= positions.length;

      if (canInterpolate) {
        let d_ax = nextPos[a * 3] - ax;
        let d_ay = nextPos[a * 3 + 1] - ay;
        let d_az = nextPos[a * 3 + 2] - az;

        let d_bx = nextPos[b * 3] - bx;
        let d_by = nextPos[b * 3 + 1] - by;
        let d_bz = nextPos[b * 3 + 2] - bz;

        if (frame.boxBounds) {
          const bsx = frame.boxBounds[1] - frame.boxBounds[0];
          const bsy = frame.boxBounds[3] - frame.boxBounds[2];
          const bsz = frame.boxBounds[5] - frame.boxBounds[4];

          if (d_ax > bsx / 2) d_ax -= bsx;
          if (d_ax < -bsx / 2) d_ax += bsx;
          if (d_bx > bsx / 2) d_bx -= bsx;
          if (d_bx < -bsx / 2) d_bx += bsx;

          if (d_ay > bsy / 2) d_ay -= bsy;
          if (d_ay < -bsy / 2) d_ay += bsy;
          if (d_by > bsy / 2) d_by -= bsy;
          if (d_by < -bsy / 2) d_by += bsy;

          if (d_az > bsz / 2) d_az -= bsz;
          if (d_az < -bsz / 2) d_az += bsz;
          if (d_bz > bsz / 2) d_bz -= bsz;
          if (d_bz < -bsz / 2) d_bz += bsz;
        }
        ax += d_ax * t;
        ay += d_ay * t;
        az += d_az * t;
        bx += d_bx * t;
        by += d_by * t;
        bz += d_bz * t;
      }

      if (periodic && cellBounds) {
        let diffx = bx - ax;
        let diffy = by - ay;
        let diffz = bz - az;
        const lx = cellBounds[1] - cellBounds[0];
        const ly = cellBounds[3] - cellBounds[2];
        const lz = cellBounds[5] - cellBounds[4];

        if (Math.abs(diffx) > lx * 0.5) diffx -= Math.sign(diffx) * lx;
        if (Math.abs(diffy) > ly * 0.5) diffy -= Math.sign(diffy) * ly;
        if (Math.abs(diffz) > lz * 0.5) diffz -= Math.sign(diffz) * lz;

        bx = ax + diffx;
        by = ay + diffy;
        bz = az + diffz;
      }

      let dx = bx - ax;
      let dy = by - ay;
      let dz = bz - az;
      const bondLenSq = dx*dx + dy*dy + dz*dz;
      if (bondLenSq === 0) continue;
      
      const bondLen = Math.sqrt(bondLenSq);
      const halfLen = bondLen * 0.5;

      let normA = 0.5, normB = 0.5;
      if (isPropMode && propData) {
        let valA = propData[a];
        if (nextPropData && nextPropData.length > a) valA += (nextPropData[a] - valA) * t;
        normA = pMax > pMin ? (valA - pMin) / (pMax - pMin) : 0.5;

        let valB = propData[b];
        if (nextPropData && nextPropData.length > b) valB += (nextPropData[b] - valB) * t;
        normB = pMax > pMin ? (valB - pMin) / (pMax - pMin) : 0.5;
      }

      const rA = isPropMode ? radius * (0.2 + 1.8 * normA) : radius;
      const rB = isPropMode ? radius * (0.2 + 1.8 * normB) : radius;
      const rMid = (rA + rB) / 2.0;

      // Instance i*2 (Bottom half: A → Mid)
      cpuRadiusBTArray[(i * 2) * 2] = rA;
      cpuRadiusBTArray[(i * 2) * 2 + 1] = rMid;
      
      // Instance i*2+1 (Top half: Mid → B)
      cpuRadiusBTArray[(i * 2 + 1) * 2] = rMid;
      cpuRadiusBTArray[(i * 2 + 1) * 2 + 1] = rB;

      // Inline Matrix math to skip massive THREE.Object3D overhead
      const nx = dx / bondLen;
      const ny = dy / bondLen;
      const nz = dz / bondLen;
      
      let upX = 0, upY = 1, upZ = 0;
      if (Math.abs(ny) > 0.999) {
          upX = 1; upY = 0; upZ = 0;
      }
      
      let ux = upY * nz - upZ * ny;
      let uy = upZ * nx - upX * nz;
      let uz = upX * ny - upY * nx;
      const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz);
      ux /= uLen; uy /= uLen; uz /= uLen;
      
      const vx = uy * nz - uz * ny;
      const vy = uz * nx - ux * nz;
      const vz = ux * ny - uy * nx;

      // Midpoints for Bottom (A -> Mid) and Top (Mid -> B)
      const midAx = ax + dx * 0.25;
      const midAy = ay + dy * 0.25;
      const midAz = az + dz * 0.25;

      let offA = (i * 2) * 16;
      cpuMatrixArray[offA + 0]  = ux;
      cpuMatrixArray[offA + 1]  = uy;
      cpuMatrixArray[offA + 2]  = uz;
      cpuMatrixArray[offA + 3]  = 0;
      cpuMatrixArray[offA + 4]  = nx * halfLen;
      cpuMatrixArray[offA + 5]  = ny * halfLen;
      cpuMatrixArray[offA + 6]  = nz * halfLen;
      cpuMatrixArray[offA + 7]  = 0;
      cpuMatrixArray[offA + 8]  = vx;
      cpuMatrixArray[offA + 9]  = vy;
      cpuMatrixArray[offA + 10] = vz;
      cpuMatrixArray[offA + 11] = 0;
      cpuMatrixArray[offA + 12] = midAx;
      cpuMatrixArray[offA + 13] = midAy;
      cpuMatrixArray[offA + 14] = midAz;
      cpuMatrixArray[offA + 15] = 1;

      const midBx = ax + dx * 0.75;
      const midBy = ay + dy * 0.75;
      const midBz = az + dz * 0.75;

      let offB = (i * 2 + 1) * 16;
      cpuMatrixArray[offB + 0]  = ux;
      cpuMatrixArray[offB + 1]  = uy;
      cpuMatrixArray[offB + 2]  = uz;
      cpuMatrixArray[offB + 3]  = 0;
      cpuMatrixArray[offB + 4]  = nx * halfLen;
      cpuMatrixArray[offB + 5]  = ny * halfLen;
      cpuMatrixArray[offB + 6]  = nz * halfLen;
      cpuMatrixArray[offB + 7]  = 0;
      cpuMatrixArray[offB + 8]  = vx;
      cpuMatrixArray[offB + 9]  = vy;
      cpuMatrixArray[offB + 10] = vz;
      cpuMatrixArray[offB + 11] = 0;
      cpuMatrixArray[offB + 12] = midBx;
      cpuMatrixArray[offB + 13] = midBy;
      cpuMatrixArray[offB + 14] = midBz;
      cpuMatrixArray[offB + 15] = 1;

      let tcA: [number, number, number];
      if (botanicalMode && frame.types) {
        tcA = BOTANICAL_COLORS[frame.types[a]] ?? [0.3, 0.5, 0.2];
      } else if (isPropMode && propData) {
        tcA = mapFn(normA);
      } else if (colorMode === 'uniform') {
        tcA = mapFn(0.0);
      } else {
        tcA = frame.types ? mapFn(typeToNorm.get(frame.types[a]) ?? 0.5) : DEFAULT_TYPE_COLOR;
      }
      cpuColorArray[(i * 2) * 3 + 0] = tcA[0];
      cpuColorArray[(i * 2) * 3 + 1] = tcA[1];
      cpuColorArray[(i * 2) * 3 + 2] = tcA[2];

      let tcB: [number, number, number];
      if (botanicalMode && frame.types) {
        tcB = BOTANICAL_COLORS[frame.types[b]] ?? [0.3, 0.5, 0.2];
      } else if (isPropMode && propData) {
        tcB = mapFn(normB);
      } else if (colorMode === 'uniform') {
        tcB = mapFn(0.0);
      } else {
        tcB = frame.types ? mapFn(typeToNorm.get(frame.types[b]) ?? 0.5) : DEFAULT_TYPE_COLOR;
      }
      cpuColorArray[(i * 2 + 1) * 3 + 0] = tcB[0];
      cpuColorArray[(i * 2 + 1) * 3 + 1] = tcB[1];
      cpuColorArray[(i * 2 + 1) * 3 + 2] = tcB[2];
    }

    // ─── GPU upload ────────────────────────────────────────────────────
    const totalBonds = Math.min(halfCount, capacity);

    const dstMat = mesh.instanceMatrix.array as Float32Array;
    dstMat.set(cpuMatrixArray.subarray(0, totalBonds * 16));

    const dstCol = mesh.instanceColor ? (mesh.instanceColor.array as Float32Array) : null;
    if (dstCol) {
      dstCol.set(cpuColorArray.subarray(0, totalBonds * 3));
    }

    const dstRadiusBT = tubeGeo.attributes.radiusBT.array as Float32Array;
    dstRadiusBT.set(cpuRadiusBTArray.subarray(0, totalBonds * 2));

    mesh.count = totalBonds;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    tubeGeo.attributes.radiusBT.needsUpdate = true;
    (tubeGeo.attributes.radiusBT as any).updateRange = { offset: 0, count: totalBonds * 2 };
  }, [bondPairs, halfCount, capacity, tubeGeo, frame, nextFrame, interpolationFactor, colormap, colorMode, periodic, cellBounds, radius, dummy, botanicalMode, isPropMode, propData, pMin, pMax, colorProperty, cpuMatrixArray, cpuColorArray, cpuRadiusBTArray]);

  useFrame(() => {
    if (botanicalMode) {
      uniformsRef.current.uTime.value = timer.getElapsedTime();
    }
  });

  useEffect(() => {
    uploadBonds();
  }, [uploadBonds]);

  // Handle R3F remounts on WebXR session entry. rAF is paused during the
  // transition, so we schedule the upload via setTimeout (same pattern as
  // Atoms / AtomsOptimized — see commit 17a0b66).
  const onMeshRef = useCallback((mesh: THREE.InstancedMesh | null) => {
    if (mesh) {
      (meshRef as any).current = mesh;
      setTimeout(() => uploadBonds(), 0);
    }
  }, [uploadBonds]);

  return (
    <instancedMesh
      ref={onMeshRef}
      args={[tubeGeo, material, capacity]}
      frustumCulled={false}
      visible={visible && halfCount > 0}
    >
      <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(capacity * 3), 3]} />
    </instancedMesh>
  );
}

/** Predefined bond cutoffs for common elements (Angstroms) */
export const DEFAULT_CUTOFFS: Map<string, number> = new Map([
  ['Cu-Cu', 2.8], ['Cu-O', 2.0],
  ['O-O', 1.6],   ['O-H', 1.2],
  ['C-C', 1.8],   ['C-H', 1.1],
  ['Si-O', 1.7],  ['Al-O', 1.9],
  ['Fe-O', 2.1],  ['Fe-Fe', 2.5],
]);

/** Build type cutoff map from element symbols */
export function buildTypeCutoffs(
  typeToElement: Map<number, string>,
  cutoffs: Map<string, number> = DEFAULT_CUTOFFS
): Map<string, number> {
  const result = new Map<string, number>();

  for (const [type1, elem1] of typeToElement) {
    for (const [type2, elem2] of typeToElement) {
      const key1 = `${elem1}-${elem2}`;
      const key2 = `${elem2}-${elem1}`;
      const cutoff = cutoffs.get(key1) ?? cutoffs.get(key2);
      if (cutoff) {
        result.set(`${type1}-${type2}`, cutoff);
      }
    }
  }

  return result;
}
