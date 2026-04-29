/**
 * <Bonds /> — Dynamic bond detection and rendering
 *
 * Uses spatial hash for O(n) neighbor detection instead of O(n²).
 * Renders bonds as smooth cylindrical tubes with per-atom-type coloring.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame, Trajectory, ColormapName, RenderStyle } from '@atlas/core/types';
import { useStore } from '@atlas/ui/store';
import { SpatialHash3D } from './SpatialHash';
import { DEFAULT_TYPE_COLOR, getTypeColorFromColormap, BOTANICAL_COLORS, COLORMAPS } from './constants';

interface BondsProps {
  /**
   * Stable per-file trajectory. The component reads the live `effectiveFrame`
   * from the store inside `useFrame`, so bond positions update on R3F's render
   * clock without re-rendering the parent tree at the display refresh rate.
   * Bond topology is computed once per trajectory (from frame 0) and reused —
   * bonds in MD trajectories are typically static.
   */
  trajectory: Trajectory;
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
}

export function Bonds({
  trajectory,
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
}: BondsProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const spatialHashRef = useRef(new SpatialHash3D(maxBondLength));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Stable per-file frame-0 reference for topology and capacity calcs.
  const frame0 = trajectory.frames[0];
  const natoms = frame0?.natoms ?? 0;

  // Shared tube geometry: cylinder along Y axis, unit height
  const tubeGeo = useMemo(
    () => new THREE.CylinderGeometry(1, 1, 1, 8, 1),
    []
  );

  const uniformsRef = useRef({ uTime: { value: 0 } });
  useFrame((state) => {
    if (botanicalMode) {
      uniformsRef.current.uTime.value = state.clock.elapsedTime;
    }
    
    // 🎬 Cinematic Macro-to-Micro Transition
    if (!botanicalMode && renderStyle !== 'toon' && natoms > 10000 && material instanceof THREE.MeshPhysicalMaterial) {
      const dist = state.camera.position.length();
      
      const macroDist = 120.0;
      const microDist = 60.0;
      
      let targetOpacity = opacity; // Default desired opacity (e.g. 0.85)
      
      if (dist > macroDist) {
        // Outside the gem: Bonds are invisible
        targetOpacity = 0.0;
      } else if (dist < microDist) {
        // Plunged inside: Bonds are fully visible
        targetOpacity = opacity;
      } else {
        // Smooth fade-in zone
        const factor = (macroDist - dist) / (macroDist - microDist);
        targetOpacity = factor * opacity;
      }
      
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.08);
    }
  });

  const material = useMemo(() => {
    let mat: THREE.Material;
    if (botanicalMode) {
      mat = new THREE.MeshPhysicalMaterial({
        metalness: 0.05,
        roughness: 0.65,
        clearcoat: 0.2, // waxy cuticle
        clearcoatRoughness: 0.3,
        transmission: 0.3, // fake SSS via transmission
        thickness: 1.5,
        ior: 1.4, // organic tissue
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
        ${botanicalMode ? 'uniform float uTime;' : ''}
        ${shader.vertexShader}
      `;
      
      let vertexChunk = `
        #include <begin_vertex>
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
  }, [renderStyle, opacity, botanicalMode]);

  // Dispose shared resources on unmount or when they change
  useEffect(() => {
    return () => { tubeGeo.dispose(); };
  }, [tubeGeo]);

  useEffect(() => {
    return () => { material.dispose(); };
  }, [material]);

  // Bond topology — computed once per file from frame 0. MD bond topology is
  // typically static across frames; recomputing per frame was a major source
  // of allocation churn during play.
  const bondPairs = useMemo(() => {
    if (!frame0 || frame0.natoms < 2) return [];

    if (frame0.bonds && frame0.bonds.length > 0) {
      const pairs: Array<[number, number]> = [];
      for (let i = 0; i < frame0.bonds.length; i += 2) {
        pairs.push([frame0.bonds[i], frame0.bonds[i + 1]]);
      }
      return pairs;
    }

    spatialHashRef.current = new SpatialHash3D(maxBondLength);
    spatialHashRef.current.build(frame0.positions, frame0.natoms);
    return findBondsFast(
      frame0,
      spatialHashRef.current,
      maxBondLength,
      typeCutoffs,
      periodic,
      cellBounds
    );
  }, [frame0, maxBondLength, typeCutoffs, periodic, cellBounds]);

  // Dynamic capacity mapping (vector-style growth) starting at 20k bonds minimum
  const MIN_BOND_CAPACITY = 20000;
  const halfCount = bondPairs.length * 2;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const capacityRef = useRef(Math.max(MIN_BOND_CAPACITY, Math.ceil(halfCount * 1.2)));
  
  if (halfCount > capacityRef.current) {
    capacityRef.current = Math.max(capacityRef.current * 1.5, Math.ceil(halfCount * 1.2));
  }
  const capacity = capacityRef.current;



  const isPropMode = colorMode === 'property' && !!colorProperty;

  // ─── Cached LUTs (rebuilt only when slow inputs change) ───
  const MAX_TYPES = 256;
  const colorLutsRef = useRef({
    propR: new Float32Array(1024),
    propG: new Float32Array(1024),
    propB: new Float32Array(1024),
    typeR: new Float32Array(MAX_TYPES),
    typeG: new Float32Array(MAX_TYPES),
    typeB: new Float32Array(MAX_TYPES),
    botR: new Float32Array(MAX_TYPES),
    botG: new Float32Array(MAX_TYPES),
    botB: new Float32Array(MAX_TYPES),
  });

  useEffect(() => {
    const luts = colorLutsRef.current;
    const mapFn = COLORMAPS[colormap] || COLORMAPS.viridis;

    // Property colormap LUT
    for (let i = 0; i < 1024; i++) {
      const c = mapFn(i / 1023);
      luts.propR[i] = c[0]; luts.propG[i] = c[1]; luts.propB[i] = c[2];
    }

    // Type-keyed color LUTs
    luts.typeR.fill(DEFAULT_TYPE_COLOR[0]);
    luts.typeG.fill(DEFAULT_TYPE_COLOR[1]);
    luts.typeB.fill(DEFAULT_TYPE_COLOR[2]);
    luts.botR.fill(0.3); luts.botG.fill(0.5); luts.botB.fill(0.2);

    if (botanicalMode) {
      for (let i = 0; i < MAX_TYPES; i++) {
        const c = BOTANICAL_COLORS[i] ?? [0.3, 0.5, 0.2];
        luts.botR[i] = c[0]; luts.botG[i] = c[1]; luts.botB[i] = c[2];
      }
    } else if (colorMode === 'uniform') {
      const uniformColor = getTypeColorFromColormap(1, colormap);
      luts.typeR.fill(uniformColor[0]);
      luts.typeG.fill(uniformColor[1]);
      luts.typeB.fill(uniformColor[2]);
    } else {
      for (let i = 0; i < MAX_TYPES; i++) {
        const c = getTypeColorFromColormap(i, colormap);
        luts.typeR[i] = c[0]; luts.typeG[i] = c[1]; luts.typeB[i] = c[2];
      }
    }
  }, [colormap, colorMode, botanicalMode]);

  // Auto-range cache (recomputed only when integer frame index changes)
  const autoRangeRef = useRef<{ frameIdx: number; min: number; max: number; key: string | null }>({
    frameIdx: -1, min: 0, max: 1, key: null,
  });

  // Pre-allocated THREE objects used inside useFrame (avoid GC each tick)
  const tmpRef = useRef({
    posA: new THREE.Vector3(),
    posB: new THREE.Vector3(),
    mid: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    UP: new THREE.Vector3(0, 1, 0),
    midPoint: new THREE.Vector3(),
    axisVec: new THREE.Vector3(1, 0, 0),
    color: new THREE.Color(),
  });

  // ─── Per-frame work — runs on R3F's render clock, not React reconciliation. ───
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || halfCount === 0 || !mesh.instanceMatrix) return;

    const eff = useStore.getState().effectiveFrame;
    const totalFrames = trajectory.frames.length;
    if (totalFrames === 0) return;

    const idx = Math.min(Math.max(0, Math.floor(eff)), totalFrames - 1);
    const nextIdx = Math.min(idx + 1, totalFrames - 1);
    const t = idx === nextIdx ? 0 : Math.max(0, Math.min(1, eff - idx));
    const frame = trajectory.frames[idx];
    const nextFrame = idx === nextIdx ? null : trajectory.frames[nextIdx];

    // Bounds check to prevent drawing beyond pre-allocated memory
    const drawCount = Math.min(halfCount, capacity);
    mesh.count = drawCount;

    const propData = isPropMode && frame.properties ? frame.properties.get(colorProperty!) ?? null : null;
    const hasPropInterpolation = isPropMode && nextFrame && t > 0 && nextFrame.properties && nextFrame.properties.has(colorProperty!);
    const nextPropData = hasPropInterpolation ? nextFrame!.properties!.get(colorProperty!)! : null;

    // Compute auto property range only when integer frame changes (or property changes).
    let pMin = 0, pMax = 1;
    if (isPropMode && propData) {
      const cache = autoRangeRef.current;
      const cacheKey = colorProperty ?? null;
      if (cache.frameIdx !== idx || cache.key !== cacheKey) {
        let mn = Infinity, mx = -Infinity;
        for (let i = 0; i < propData.length; i++) {
          const v = propData[i];
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
        cache.frameIdx = idx;
        cache.key = cacheKey;
        cache.min = mn === Infinity ? 0 : mn;
        cache.max = mx === -Infinity ? 1 : mx;
      }
      pMin = propRange?.[0] ?? cache.min;
      pMax = propRange?.[1] ?? cache.max;
    }

    const luts = colorLutsRef.current;
    const tmp = tmpRef.current;
    const { posA, posB, mid, dir, UP, midPoint, axisVec, color } = tmp;
    const lutSize = 1024;

    for (let i = 0; i < drawCount / 2; i++) {
      const [a, b] = bondPairs[i];
      let ax = frame.positions[a * 3];
      let ay = frame.positions[a * 3 + 1];
      let az = frame.positions[a * 3 + 2];
      let bx = frame.positions[b * 3];
      let by = frame.positions[b * 3 + 1];
      let bz = frame.positions[b * 3 + 2];

      const canInterpolate = nextFrame && t > 0 && nextFrame.positions && nextFrame.positions.length >= frame.positions.length;

      if (canInterpolate) {
          let next_ax = nextFrame!.positions[a * 3];
          let next_ay = nextFrame!.positions[a * 3 + 1];
          let next_az = nextFrame!.positions[a * 3 + 2];
          let d_ax = next_ax - ax;
          let d_ay = next_ay - ay;
          let d_az = next_az - az;

          let next_bx = nextFrame!.positions[b * 3];
          let next_by = nextFrame!.positions[b * 3 + 1];
          let next_bz = nextFrame!.positions[b * 3 + 2];
          let d_bx = next_bx - bx;
          let d_by = next_by - by;
          let d_bz = next_bz - bz;

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

      posA.set(ax, ay, az);
      posB.set(bx, by, bz);

      if (periodic && cellBounds) {
        let dx = posB.x - posA.x;
        let dy = posB.y - posA.y;
        let dz = posB.z - posA.z;
        const lx = cellBounds[1] - cellBounds[0];
        const ly = cellBounds[3] - cellBounds[2];
        const lz = cellBounds[5] - cellBounds[4];
        
        if (Math.abs(dx) > lx * 0.5) dx -= Math.sign(dx) * lx;
        if (Math.abs(dy) > ly * 0.5) dy -= Math.sign(dy) * ly;
        if (Math.abs(dz) > lz * 0.5) dz -= Math.sign(dz) * lz;
        
        posB.set(posA.x + dx, posA.y + dy, posA.z + dz);
      }

      mid.lerpVectors(posA, posB, 0.5);
      const bondLen = posA.distanceTo(posB);
      const halfLen = bondLen / 2;

      let normA = 0.5, normB = 0.5;
      if (isPropMode && propData) {
        let valA = propData[a];
        if (nextPropData && nextPropData.length > a) valA += (nextPropData[a] - valA) * t;
        normA = pMax > pMin ? (valA - pMin) / (pMax - pMin) : 0.5;

        let valB = propData[b];
        if (nextPropData && nextPropData.length > b) valB += (nextPropData[b] - valB) * t;
        normB = pMax > pMin ? (valB - pMin) / (pMax - pMin) : 0.5;
      }

      // Advanced geometry scaling based on property
      const rA = isPropMode ? radius * (0.2 + 1.8 * normA) : radius;
      const rB = isPropMode ? radius * (0.2 + 1.8 * normB) : radius;

      // Instance i*2 (Bottom half of the bond: A -> Mid)
      dir.subVectors(mid, posA).normalize();
      midPoint.lerpVectors(posA, mid, 0.5);
      dummy.position.copy(midPoint);
      dummy.scale.set(rA, halfLen, rA);
      if (Math.abs(dir.dot(UP)) < 0.9999) {
        dummy.quaternion.setFromUnitVectors(UP, dir);
      } else {
        dummy.quaternion.identity();
        if (dir.y < 0) dummy.quaternion.setFromAxisAngle(axisVec, Math.PI);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i * 2, dummy.matrix);
      
      let rColA, gColA, bColA;
      if (botanicalMode && frame.types) {
        const tA = frame.types[a] < MAX_TYPES ? frame.types[a] : 0;
        rColA = luts.botR[tA]; gColA = luts.botG[tA]; bColA = luts.botB[tA];
      } else if (isPropMode && propData) {
        const lutIdx = Math.max(0, Math.min(lutSize - 1, Math.floor(normA * lutSize)));
        rColA = luts.propR[lutIdx]; gColA = luts.propG[lutIdx]; bColA = luts.propB[lutIdx];
      } else {
        const tA = frame.types ? (frame.types[a] < MAX_TYPES ? frame.types[a] : 0) : 0;
        rColA = luts.typeR[tA]; gColA = luts.typeG[tA]; bColA = luts.typeB[tA];
      }
      color.setRGB(rColA, gColA, bColA);
      mesh.setColorAt(i * 2, color);

      // Instance i*2+1 (Top half of the bond: Mid -> B)
      dir.subVectors(posB, mid).normalize();
      midPoint.lerpVectors(mid, posB, 0.5);
      dummy.position.copy(midPoint);
      dummy.scale.set(rB, halfLen, rB);
      if (Math.abs(dir.dot(UP)) < 0.9999) {
        dummy.quaternion.setFromUnitVectors(UP, dir);
      } else {
        dummy.quaternion.identity();
        if (dir.y < 0) dummy.quaternion.setFromAxisAngle(axisVec, Math.PI);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i * 2 + 1, dummy.matrix);

      let rColB, gColB, bColB;
      if (botanicalMode && frame.types) {
        const tB = frame.types[b] < MAX_TYPES ? frame.types[b] : 0;
        rColB = luts.botR[tB]; gColB = luts.botG[tB]; bColB = luts.botB[tB];
      } else if (isPropMode && propData) {
        const lutIdx = Math.max(0, Math.min(lutSize - 1, Math.floor(normB * lutSize)));
        rColB = luts.propR[lutIdx]; gColB = luts.propG[lutIdx]; bColB = luts.propB[lutIdx];
      } else {
        const tB = frame.types ? (frame.types[b] < MAX_TYPES ? frame.types[b] : 0) : 0;
        rColB = luts.typeR[tB]; gColB = luts.typeG[tB]; bColB = luts.typeB[tB];
      }
      color.setRGB(rColB, gColB, bColB);
      mesh.setColorAt(i * 2 + 1, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bondPairs, frame, nextFrame, interpolationFactor, colormap, colorMode, periodic, cellBounds, radius, dummy, botanicalMode, isPropMode, propData, pMin, pMax, colorProperty]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[tubeGeo, material, capacity]}
      frustumCulled={false}
      visible={halfCount > 0}
    />
  );
}

/**
 * Fast bond detection using spatial hash — O(n) instead of O(n²)
 */
function findBondsFast(
  frame: Frame,
  spatialHash: SpatialHash3D,
  maxBondLength: number,
  typeCutoffs?: Map<string, number>,
  periodic?: boolean,
  cellBounds?: [number, number, number, number, number, number]
): Array<[number, number]> {
  const bonds: Array<[number, number]> = [];
  const seen = new Set<string>();

  const [xlo, xhi, ylo, yhi, zlo, zhi] = cellBounds ?? [0, 1, 0, 1, 0, 1];
  const xlen = xhi - xlo;
  const ylen = yhi - ylo;
  const zlen = zhi - zlo;

  for (let i = 0; i < frame.natoms; i++) {
    const ix = frame.positions[i * 3];
    const iy = frame.positions[i * 3 + 1];
    const iz = frame.positions[i * 3 + 2];
    const itype = frame.types[i];

    const neighbors = spatialHash.query(ix, iy, iz, maxBondLength);

    for (const { index: j, dist } of neighbors) {
      if (i >= j) continue;

      let cutoff = maxBondLength;
      if (typeCutoffs) {
        const jtype = frame.types[j];
        const typeKey1 = `${itype}-${jtype}`;
        const typeKey2 = `${jtype}-${itype}`;
        cutoff = typeCutoffs.get(typeKey1) ?? typeCutoffs.get(typeKey2) ?? maxBondLength;
      }

      if (dist <= cutoff) {
        bonds.push([i, j]);
      }
    }

    if (periodic && cellBounds) {
      const periodicImages = [
        [xlen, 0, 0], [-xlen, 0, 0],
        [0, ylen, 0], [0, -ylen, 0],
        [0, 0, zlen], [0, 0, -zlen],
      ];

      for (const [pdx, pdy, pdz] of periodicImages) {
        const pNeighbors = spatialHash.query(ix + pdx, iy + pdy, iz + pdz, maxBondLength);

        for (const { index: j, dist } of pNeighbors) {
          if (dist > maxBondLength) continue;
          // Deduplicate periodic bonds with canonical key
          const lo = Math.min(i, j);
          const hi = Math.max(i, j);
          const key = `${lo}-${hi}`;
          if (seen.has(key)) continue;
          seen.add(key);
          bonds.push([i, j]);
        }
      }
    }
  }

  return bonds;
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
