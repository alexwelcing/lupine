/**
 * <Bonds /> — Dynamic bond detection and rendering
 *
 * Uses spatial hash for O(n) neighbor detection instead of O(n²).
 * Renders bonds as smooth cylindrical tubes with per-atom-type coloring.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame, ColormapName } from '@atlas/core/types';
import { SpatialHash3D } from './SpatialHash';
import { DEFAULT_TYPE_COLOR, getTypeColorFromColormap, BOTANICAL_COLORS } from './constants';

interface BondsProps {
  frame: Frame;
  nextFrame?: Frame;
  interpolationFactor?: number;
  colormap?: ColormapName;
  colorMode?: 'type' | 'uniform' | 'property';
  maxBondLength?: number;
  typeCutoffs?: Map<string, number>;
  periodic?: boolean;
  cellBounds?: [number, number, number, number, number, number];
  radius?: number;
  opacity?: number;
  renderStyle?: 'standard' | 'toon';
  botanicalMode?: boolean;
}

export function Bonds({
  frame,
  nextFrame,
  interpolationFactor,
  colormap = 'viridis',
  colorMode = 'type',
  maxBondLength = 2.5,
  typeCutoffs,
  periodic = false,
  cellBounds,
  radius = 0.12,
  opacity = 0.85,
  renderStyle = 'standard',
  botanicalMode = false,
}: BondsProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const spatialHashRef = useRef(new SpatialHash3D(maxBondLength));
  const dummy = useMemo(() => new THREE.Object3D(), []);

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
  });

  const material = useMemo(() => {
    if (botanicalMode) {
      const mat = new THREE.MeshPhysicalMaterial({
        metalness: 0.05,
        roughness: 0.65,
        clearcoat: 0.2, // waxy cuticle
        clearcoatRoughness: 0.3,
        transmission: 0.3, // fake SSS via transmission
        thickness: 1.5,
        ior: 1.4, // organic tissue
      });
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = uniformsRef.current.uTime;
        
        // Inject vertex sway (must perfectly match AtomsOptimized to keep bonds connected)
        shader.vertexShader = `
          uniform float uTime;
          ${shader.vertexShader}
        `;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          // Organic wind sway based on world height (instanceMatrix[3].y)
          float heightFactor = max(0.0, instanceMatrix[3].y - 2.0); 
          float swayAmount = heightFactor * 0.04;
          float noise = sin(uTime * 1.2 + instanceMatrix[3].x * 0.5 + instanceMatrix[3].z * 0.5);
          transformed.x += noise * swayAmount;
          transformed.z += cos(uTime * 0.9 + instanceMatrix[3].x) * swayAmount;
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
          float fresnel = pow(1.0 - ndotv, 3.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + vec3(0.15, 0.2, 0.05), fresnel * 0.6);
          `
        );
      };
      return mat;
    }

    if (renderStyle === 'toon') {
      return new THREE.MeshToonMaterial({
        transparent: opacity < 1,
        opacity,
      });
    }
    return new THREE.MeshPhysicalMaterial({
      metalness: 0.1,
      roughness: 0.5,
      transparent: opacity < 1,
      opacity,
    });
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

  // Update instance matrices smoothly using requestAnimationFrame/useEffect
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || halfCount === 0) return;

    if (!mesh.instanceMatrix) return;
    
    // Bounds check to prevent drawing beyond pre-allocated memory
    const drawCount = Math.min(halfCount, capacity);
    mesh.count = drawCount;

    const posA = new THREE.Vector3();
    const posB = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    const midPoint = new THREE.Vector3();
    const axisVec = new THREE.Vector3(1, 0, 0);
    const color = new THREE.Color();

    for (let i = 0; i < drawCount / 2; i++) {
      const [a, b] = bondPairs[i];
      let ax = frame.positions[a * 3];
      let ay = frame.positions[a * 3 + 1];
      let az = frame.positions[a * 3 + 2];
      let bx = frame.positions[b * 3];
      let by = frame.positions[b * 3 + 1];
      let bz = frame.positions[b * 3 + 2];

      const t = interpolationFactor ?? 0;
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

      dir.subVectors(mid, posA).normalize();
      midPoint.lerpVectors(posA, mid, 0.5);
      dummy.position.copy(midPoint);
      dummy.scale.set(radius, halfLen, radius);
      if (Math.abs(dir.dot(UP)) < 0.9999) {
        dummy.quaternion.setFromUnitVectors(UP, dir);
      } else {
        dummy.quaternion.identity();
        if (dir.y < 0) dummy.quaternion.setFromAxisAngle(axisVec, Math.PI);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i * 2, dummy.matrix);
      
      let tcA: [number, number, number];
      if (botanicalMode && frame.types) {
        tcA = BOTANICAL_COLORS[frame.types[a]] ?? [0.3, 0.5, 0.2];
      } else if (colorMode === 'uniform') {
        tcA = getTypeColorFromColormap(1, colormap);
      } else {
        tcA = frame.types ? getTypeColorFromColormap(frame.types[a], colormap) : DEFAULT_TYPE_COLOR;
      }
      color.setRGB(tcA[0], tcA[1], tcA[2]);
      mesh.setColorAt(i * 2, color);

      dir.subVectors(posB, mid).normalize();
      midPoint.lerpVectors(mid, posB, 0.5);
      dummy.position.copy(midPoint);
      dummy.scale.set(radius, halfLen, radius);
      if (Math.abs(dir.dot(UP)) < 0.9999) {
        dummy.quaternion.setFromUnitVectors(UP, dir);
      } else {
        dummy.quaternion.identity();
        if (dir.y < 0) dummy.quaternion.setFromAxisAngle(axisVec, Math.PI);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i * 2 + 1, dummy.matrix);
      
      let tcB: [number, number, number];
      if (botanicalMode && frame.types) {
        tcB = BOTANICAL_COLORS[frame.types[b]] ?? [0.3, 0.5, 0.2];
      } else if (colorMode === 'uniform') {
        tcB = getTypeColorFromColormap(1, colormap);
      } else {
        tcB = frame.types ? getTypeColorFromColormap(frame.types[b], colormap) : DEFAULT_TYPE_COLOR;
      }
      color.setRGB(tcB[0], tcB[1], tcB[2]);
      mesh.setColorAt(i * 2 + 1, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bondPairs, frame, nextFrame, interpolationFactor, colormap, colorMode, periodic, cellBounds, radius, dummy, botanicalMode]);

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
