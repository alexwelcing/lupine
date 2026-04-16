/**
 * <Bonds /> — Dynamic bond detection and rendering
 *
 * Uses spatial hash for O(n) neighbor detection instead of O(n²).
 * Renders bonds as smooth cylindrical tubes with per-atom-type coloring.
 */

import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';
import { SpatialHash3D } from './SpatialHash';
import { TYPE_COLORS, DEFAULT_TYPE_COLOR } from './constants';

interface BondsProps {
  frame: Frame;
  maxBondLength?: number;
  typeCutoffs?: Map<string, number>;
  periodic?: boolean;
  cellBounds?: [number, number, number, number, number, number];
  radius?: number;
  opacity?: number;
  renderStyle?: 'standard' | 'toon';
}

export function Bonds({
  frame,
  maxBondLength = 2.5,
  typeCutoffs,
  periodic = false,
  cellBounds,
  radius = 0.12,
  opacity = 0.85,
  renderStyle = 'standard',
}: BondsProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const spatialHashRef = useRef(new SpatialHash3D(maxBondLength));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Shared tube geometry: cylinder along Y axis, unit height
  const tubeGeo = useMemo(
    () => new THREE.CylinderGeometry(1, 1, 1, 8, 1),
    []
  );

  const material = useMemo(() => {
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
  }, [renderStyle, opacity]);

  // Dispose shared resources on unmount or when they change
  useEffect(() => {
    return () => { tubeGeo.dispose(); };
  }, [tubeGeo]);

  useEffect(() => {
    return () => { material.dispose(); };
  }, [material]);

  // Rebuild bonds when frame or cutoff changes
  useEffect(() => {
    const group = groupRef.current;
    if (!group || !frame || frame.natoms < 2) return;

    // Clear previous bond meshes (don't dispose shared geo/material)
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // Build spatial hash and find bonds
    let bondPairs: Array<[number, number]> = [];
    if (frame.bonds && frame.bonds.length > 0) {
      for (let i = 0; i < frame.bonds.length; i += 2) {
        bondPairs.push([frame.bonds[i], frame.bonds[i + 1]]);
      }
    } else {
      spatialHashRef.current = new SpatialHash3D(maxBondLength);
      spatialHashRef.current.build(frame.positions, frame.natoms);
      bondPairs = findBondsFast(
        frame,
        spatialHashRef.current,
        maxBondLength,
        typeCutoffs,
        periodic,
        cellBounds
      );
    }

    // Use InstancedMesh for performance: 2 half-cylinders per bond (one per atom color)
    const halfCount = bondPairs.length * 2;
    if (halfCount === 0) return;

    const mesh = new THREE.InstancedMesh(tubeGeo, material, halfCount);
    const color = new THREE.Color();
    const posA = new THREE.Vector3();
    const posB = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    const midPoint = new THREE.Vector3();
    const axisVec = new THREE.Vector3(1, 0, 0);

    for (let i = 0; i < bondPairs.length; i++) {
      const [a, b] = bondPairs[i];
      posA.set(
        frame.positions[a * 3],
        frame.positions[a * 3 + 1],
        frame.positions[a * 3 + 2]
      );
      posB.set(
        frame.positions[b * 3],
        frame.positions[b * 3 + 1],
        frame.positions[b * 3 + 2]
      );
      mid.lerpVectors(posA, posB, 0.5);
      const bondLen = posA.distanceTo(posB);
      const halfLen = bondLen / 2;

      // Half A: from atom A to midpoint
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
      const tcA = TYPE_COLORS[frame.types[a]] ?? DEFAULT_TYPE_COLOR;
      color.setRGB(tcA[0], tcA[1], tcA[2]);
      mesh.setColorAt(i * 2, color);

      // Half B: from midpoint to atom B
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
      const tcB = TYPE_COLORS[frame.types[b]] ?? DEFAULT_TYPE_COLOR;
      color.setRGB(tcB[0], tcB[1], tcB[2]);
      mesh.setColorAt(i * 2 + 1, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    group.add(mesh);

    // Cleanup on re-run or unmount: remove mesh from group
    return () => {
      while (group.children.length > 0) {
        group.remove(group.children[0]);
      }
    };
  }, [frame, maxBondLength, typeCutoffs, periodic, cellBounds, tubeGeo, material, radius, dummy]);

  return <group ref={groupRef} />;
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
