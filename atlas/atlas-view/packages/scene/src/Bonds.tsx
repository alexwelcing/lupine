/**
 * <Bonds /> — Dynamic bond detection and rendering
 *
 * Uses spatial hash for O(n) neighbor detection instead of O(n²).
 * Renders bonds as smooth cylindrical tubes with per-atom-type coloring.
 */

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame, ColormapName, RenderStyle } from '@atlas/core/types';
import { SpatialHash3D } from './SpatialHash';
import { DEFAULT_TYPE_COLOR, getTypeColorFromColormap, BOTANICAL_COLORS, COLORMAPS } from './constants';

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
}: BondsProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const spatialHashRef = useRef(new SpatialHash3D(maxBondLength));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Shared tube geometry: cylinder along Y axis, unit height
  // Reduced to 5 radial segments for performance on massive arrays
  const tubeGeo = useMemo(
    () => new THREE.CylinderGeometry(1, 1, 1, 5, 1),
    []
  );

  const uniformsRef = useRef({ uTime: { value: 0 } });
  useFrame((state) => {
    if (botanicalMode) {
      uniformsRef.current.uTime.value = state.clock.elapsedTime;
    }
    
    // 🎬 Cinematic Macro-to-Micro Transition
    if (!botanicalMode && renderStyle !== 'toon' && frame.natoms > 10000 && material instanceof THREE.MeshPhysicalMaterial) {
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

    // 🔭 VIEW is the secret math! Frustum Culling for Bonds
    const mesh = meshRef.current;
    if (mesh && halfCount > 0) {
      projScreenMatrix.multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);

      const dstMat = mesh.instanceMatrix.array as Float32Array;
      const dstCol = mesh.instanceColor ? (mesh.instanceColor.array as Float32Array) : null;
      const dstRadiusBT = tubeGeo.attributes.radiusBT.array as Float32Array;

      let visibleCount = 0;
      const totalBonds = Math.min(halfCount, capacity);

      for (let i = 0; i < totalBonds; i++) {
        const midIdx = i * 3;
        _v.set(
          cpuMidPointArray[midIdx + 0],
          cpuMidPointArray[midIdx + 1],
          cpuMidPointArray[midIdx + 2]
        );

        if (frustum.containsPoint(_v)) {
          const srcMIdx = i * 16;
          const dstMIdx = visibleCount * 16;
          
          dstMat[dstMIdx + 0]  = cpuMatrixArray[srcMIdx + 0];
          dstMat[dstMIdx + 1]  = cpuMatrixArray[srcMIdx + 1];
          dstMat[dstMIdx + 2]  = cpuMatrixArray[srcMIdx + 2];
          dstMat[dstMIdx + 3]  = cpuMatrixArray[srcMIdx + 3];
          dstMat[dstMIdx + 4]  = cpuMatrixArray[srcMIdx + 4];
          dstMat[dstMIdx + 5]  = cpuMatrixArray[srcMIdx + 5];
          dstMat[dstMIdx + 6]  = cpuMatrixArray[srcMIdx + 6];
          dstMat[dstMIdx + 7]  = cpuMatrixArray[srcMIdx + 7];
          dstMat[dstMIdx + 8]  = cpuMatrixArray[srcMIdx + 8];
          dstMat[dstMIdx + 9]  = cpuMatrixArray[srcMIdx + 9];
          dstMat[dstMIdx + 10] = cpuMatrixArray[srcMIdx + 10];
          dstMat[dstMIdx + 11] = cpuMatrixArray[srcMIdx + 11];
          dstMat[dstMIdx + 12] = cpuMatrixArray[srcMIdx + 12];
          dstMat[dstMIdx + 13] = cpuMatrixArray[srcMIdx + 13];
          dstMat[dstMIdx + 14] = cpuMatrixArray[srcMIdx + 14];
          dstMat[dstMIdx + 15] = cpuMatrixArray[srcMIdx + 15];

          if (dstCol) {
            const srcCIdx = i * 3;
            const dstCIdx = visibleCount * 3;
            dstCol[dstCIdx + 0] = cpuColorArray[srcCIdx + 0];
            dstCol[dstCIdx + 1] = cpuColorArray[srcCIdx + 1];
            dstCol[dstCIdx + 2] = cpuColorArray[srcCIdx + 2];
          }

          const srcRIdx = i * 2;
          const dstRIdx = visibleCount * 2;
          dstRadiusBT[dstRIdx + 0] = cpuRadiusBTArray[srcRIdx + 0];
          dstRadiusBT[dstRIdx + 1] = cpuRadiusBTArray[srcRIdx + 1];

          visibleCount++;
        }
      }

      mesh.count = visibleCount;
      
      mesh.instanceMatrix.needsUpdate = true;
      (mesh.instanceMatrix as any).updateRange.count = visibleCount * 16;
      
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
        (mesh.instanceColor as any).updateRange.count = visibleCount * 3;
      }
      
      tubeGeo.attributes.radiusBT.needsUpdate = true;
      (tubeGeo.attributes.radiusBT as any).updateRange = { offset: 0, count: visibleCount * 2 };
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
  }, [renderStyle, opacity, botanicalMode]);

  // Dispose shared resources on unmount or when they change
  useEffect(() => {
    return () => { tubeGeo.dispose(); };
  }, [tubeGeo]);

  useEffect(() => {
    return () => { material.dispose(); };
  }, [material]);

  // Rebuild bonds when frame or cutoff changes
  // Find bonds only when topology changes
  const bondPairs = useMemo(() => {
    if (!frame || frame.natoms < 2) return [];

    if (frame.bonds && frame.bonds.length > 0) {
      const pairs: Array<[number, number]> = [];
      for (let i = 0; i < frame.bonds.length; i += 2) {
        pairs.push([frame.bonds[i], frame.bonds[i + 1]]);
      }
      return pairs;
    }

    spatialHashRef.current = new SpatialHash3D(maxBondLength);
    spatialHashRef.current.build(frame.positions, frame.natoms);
    return findBondsFast(
      frame,
      spatialHashRef.current,
      maxBondLength,
      typeCutoffs,
      periodic,
      cellBounds
    );
  }, [frame, maxBondLength, typeCutoffs, periodic, cellBounds]);

  // Dynamic capacity mapping (vector-style growth) starting at 20k bonds minimum
  const MIN_BOND_CAPACITY = 20000;
  const halfCount = bondPairs.length * 2;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const capacityRef = useRef(Math.max(MIN_BOND_CAPACITY, Math.ceil(halfCount * 1.2)));
  
  if (halfCount > capacityRef.current) {
    capacityRef.current = Math.max(capacityRef.current * 1.5, Math.ceil(halfCount * 1.2));
  }
  const capacity = capacityRef.current;

  // CPU-side state arrays for manual frustum culling
  const cpuMatrixArray = useMemo(() => new Float32Array(capacity * 16), [capacity]);
  const cpuColorArray = useMemo(() => new Float32Array(capacity * 3), [capacity]);
  const cpuRadiusBTArray = useMemo(() => new Float32Array(capacity * 2), [capacity]);
  const cpuMidPointArray = useMemo(() => new Float32Array(capacity * 3), [capacity]); // Used for fast point-in-frustum testing
  
  // Working arrays for rendering/updating GPU buffers
  const radiusBTArray = useMemo(() => new Float32Array(capacity * 2), [capacity]);
  useEffect(() => {
    tubeGeo.setAttribute('radiusBT', new THREE.InstancedBufferAttribute(radiusBTArray, 2));
  }, [tubeGeo, radiusBTArray]);

  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const _v = useMemo(() => new THREE.Vector3(), []);

  const isPropMode = colorMode === 'property' && colorProperty;
  const propData = isPropMode && frame.properties ? frame.properties.get(colorProperty) : null;

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

  // Compute geometry and colors into CPU buffers
  useEffect(() => {
    if (halfCount === 0) return;

    // Bounds check to prevent drawing beyond pre-allocated memory
    const drawCount = Math.min(halfCount, capacity);
    
    // Auto-compute property range
    const [autoMin, autoMax] = (() => {
      if (!propData) return [0, 1];
      let mn = Infinity, mx = -Infinity;
      for (let i = 0; i < propData.length; i++) {
        if (propData[i] < mn) mn = propData[i];
        if (propData[i] > mx) mx = propData[i];
      }
      return [mn === Infinity ? 0 : mn, mx === -Infinity ? 1 : mx];
    })();

    const pMin = propRange?.[0] ?? autoMin;
    const pMax = propRange?.[1] ?? autoMax;

    const posA = new THREE.Vector3();
    const posB = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    const midPoint = new THREE.Vector3();
    const axisVec = new THREE.Vector3(1, 0, 0);
    const color = new THREE.Color();

    const t = interpolationFactor ?? 0;
    const hasPropInterpolation = isPropMode && nextFrame && t > 0 && nextFrame.properties && nextFrame.properties.has(colorProperty);
    const nextPropData = hasPropInterpolation ? nextFrame.properties!.get(colorProperty) : null;
    const mapFn = COLORMAPS[colormap] || COLORMAPS.viridis;

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
          let next_ax = nextFrame.positions[a * 3];
          let next_ay = nextFrame.positions[a * 3 + 1];
          let next_az = nextFrame.positions[a * 3 + 2];
          let d_ax = next_ax - ax;
          let d_ay = next_ay - ay;
          let d_az = next_az - az;
          
          let next_bx = nextFrame.positions[b * 3];
          let next_by = nextFrame.positions[b * 3 + 1];
          let next_bz = nextFrame.positions[b * 3 + 2];
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
      const rMid = (rA + rB) / 2.0;

      // Instance i*2 (Bottom half of the bond: A -> Mid)
      cpuRadiusBTArray[(i * 2) * 2] = rA;
      cpuRadiusBTArray[(i * 2) * 2 + 1] = rMid;

      dir.subVectors(mid, posA).normalize();
      midPoint.lerpVectors(posA, mid, 0.5);
      
      // Store midpoint for frustum culling
      cpuMidPointArray[(i * 2) * 3 + 0] = midPoint.x;
      cpuMidPointArray[(i * 2) * 3 + 1] = midPoint.y;
      cpuMidPointArray[(i * 2) * 3 + 2] = midPoint.z;

      dummy.position.copy(midPoint);
      dummy.scale.set(1, halfLen, 1);
      if (Math.abs(dir.dot(UP)) < 0.9999) {
        dummy.quaternion.setFromUnitVectors(UP, dir);
      } else {
        dummy.quaternion.identity();
        if (dir.y < 0) dummy.quaternion.setFromAxisAngle(axisVec, Math.PI);
      }
      dummy.updateMatrix();
      dummy.matrix.toArray(cpuMatrixArray, (i * 2) * 16);
      
      let tcA: [number, number, number];
      if (botanicalMode && frame.types) {
        tcA = BOTANICAL_COLORS[frame.types[a]] ?? [0.3, 0.5, 0.2];
      } else if (isPropMode && propData) {
        tcA = mapFn(normA);
      } else if (colorMode === 'uniform') {
        tcA = getTypeColorFromColormap(1, colormap);
      } else {
        tcA = frame.types ? getTypeColorFromColormap(frame.types[a], colormap) : DEFAULT_TYPE_COLOR;
      }
      cpuColorArray[(i * 2) * 3 + 0] = tcA[0];
      cpuColorArray[(i * 2) * 3 + 1] = tcA[1];
      cpuColorArray[(i * 2) * 3 + 2] = tcA[2];

      // Instance i*2+1 (Top half of the bond: Mid -> B)
      cpuRadiusBTArray[(i * 2 + 1) * 2] = rMid;
      cpuRadiusBTArray[(i * 2 + 1) * 2 + 1] = rB;

      dir.subVectors(posB, mid).normalize();
      midPoint.lerpVectors(mid, posB, 0.5);
      
      // Store midpoint for frustum culling
      cpuMidPointArray[(i * 2 + 1) * 3 + 0] = midPoint.x;
      cpuMidPointArray[(i * 2 + 1) * 3 + 1] = midPoint.y;
      cpuMidPointArray[(i * 2 + 1) * 3 + 2] = midPoint.z;

      dummy.position.copy(midPoint);
      dummy.scale.set(1, halfLen, 1);
      if (Math.abs(dir.dot(UP)) < 0.9999) {
        dummy.quaternion.setFromUnitVectors(UP, dir);
      } else {
        dummy.quaternion.identity();
        if (dir.y < 0) dummy.quaternion.setFromAxisAngle(axisVec, Math.PI);
      }
      dummy.updateMatrix();
      dummy.matrix.toArray(cpuMatrixArray, (i * 2 + 1) * 16);
      
      let tcB: [number, number, number];
      if (botanicalMode && frame.types) {
        tcB = BOTANICAL_COLORS[frame.types[b]] ?? [0.3, 0.5, 0.2];
      } else if (isPropMode && propData) {
        tcB = mapFn(normB);
      } else if (colorMode === 'uniform') {
        tcB = getTypeColorFromColormap(1, colormap);
      } else {
        tcB = frame.types ? getTypeColorFromColormap(frame.types[b], colormap) : DEFAULT_TYPE_COLOR;
      }
      cpuColorArray[(i * 2 + 1) * 3 + 0] = tcB[0];
      cpuColorArray[(i * 2 + 1) * 3 + 1] = tcB[1];
      cpuColorArray[(i * 2 + 1) * 3 + 2] = tcB[2];
    }
  }, [bondPairs, frame, nextFrame, interpolationFactor, colormap, colorMode, periodic, cellBounds, radius, dummy, botanicalMode, isPropMode, propData, propRange, colorProperty, cpuMatrixArray, cpuColorArray, cpuRadiusBTArray, cpuMidPointArray, capacity]);

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
