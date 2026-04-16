/**
 * <InterpolatedAtoms /> — Smooth frame interpolation for playback
 * 
 * Interpolates atom positions between MD frames for butter-smooth
 * motion even at low MD frame rates. Uses linear interpolation
 * with optional velocity extrapolation.
 */

import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';

interface InterpolatedAtomsProps {
  /** Current frame data */
  frame: Frame;
  /** Next frame data (for interpolation target) */
  nextFrame?: Frame;
  /** Interpolation factor: 0 = current frame, 1 = next frame */
  interpolationFactor: number;
  /** Color mode */
  colorMode?: 'type' | 'property';
  colorProperty?: string;
  scale?: number;
  maxAtoms?: number;
  highlightedAtoms?: Set<number>;
}

// Element colors and radii
const TYPE_COLORS: Record<number, [number, number, number]> = {
  1: [0.30, 0.72, 1.0],
  2: [1.0, 0.35, 0.48],
  3: [0.42, 0.88, 0.44],
  4: [1.0, 0.82, 0.16],
  5: [0.64, 0.50, 0.92],
  6: [1.0, 0.58, 0.30],
  7: [0.85, 0.32, 0.68],
  8: [0.28, 0.86, 0.82],
};

const TYPE_RADII: Record<number, number> = {
  1: 1.28, 2: 0.73, 3: 1.60, 4: 1.44,
  5: 1.20, 6: 1.10, 7: 1.35, 8: 1.50,
};

const DEFAULT_MAX_ATOMS = 500000;

export function InterpolatedAtoms({
  frame,
  nextFrame,
  interpolationFactor,
  colorMode = 'type',
  scale = 1.0,
  maxAtoms = DEFAULT_MAX_ATOMS,
  highlightedAtoms,
}: InterpolatedAtomsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  // Pre-allocated buffers
  const matrixArray = useMemo(() => new Float32Array(maxAtoms * 16), [maxAtoms]);
  const colorArray = useMemo(() => new Float32Array(maxAtoms * 3), [maxAtoms]);
  const _matrix = useMemo(() => new THREE.Matrix4(), []);
  const _position = useMemo(() => new THREE.Vector3(), []);
  const _scale = useMemo(() => new THREE.Vector3(), []);
  const _quaternion = useMemo(() => new THREE.Quaternion(), []);

  // Cached geometry/material
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    metalness: 0.1,
    roughness: 0.5,
    clearcoat: 0.05,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.8,
  }), []);

  // Interpolate and update atoms
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const natoms = frame.natoms;
    const t = Math.max(0, Math.min(1, interpolationFactor));
    const hasNextFrame = nextFrame && nextFrame.natoms === natoms;

    // Use current frame positions, or interpolate if next frame available
    const currPos = frame.positions;
    const nextPos = hasNextFrame ? nextFrame.positions : null;

    for (let i = 0; i < natoms; i++) {
      // Interpolate position
      let x = currPos[i * 3];
      let y = currPos[i * 3 + 1];
      let z = currPos[i * 3 + 2];

      if (nextPos && t > 0) {
        // Handle periodic boundary conditions for interpolation
        let dx = nextPos[i * 3] - x;
        let dy = nextPos[i * 3 + 1] - y;
        let dz = nextPos[i * 3 + 2] - z;

        if (frame.boxBounds) {
          const bsx = frame.boxBounds[1] - frame.boxBounds[0];
          const bsy = frame.boxBounds[3] - frame.boxBounds[2];
          const bsz = frame.boxBounds[5] - frame.boxBounds[4];
          
          if (dx > bsx / 2) dx -= bsx;
          if (dx < -bsx / 2) dx += bsx;
          if (dy > bsy / 2) dy -= bsy;
          if (dy < -bsy / 2) dy += bsy;
          if (dz > bsz / 2) dz -= bsz;
          if (dz < -bsz / 2) dz += bsz;
        }

        x = x + dx * t;
        y = y + dy * t;
        z = z + dz * t;
      }

      // Set position and scale
      _position.set(x, y, z);
      const radius = (TYPE_RADII[frame.types[i]] ?? 1.2) * scale;
      _scale.setScalar(radius);

      _matrix.compose(_position, _quaternion, _scale);
      _matrix.toArray(matrixArray, i * 16);

      // Color (use current frame colors, no interpolation needed)
      const isHighlighted = highlightedAtoms?.has(i);
      const tc = TYPE_COLORS[frame.types[i]] ?? [0.6, 0.6, 0.6];

      if (isHighlighted) {
        colorArray[i * 3] = Math.min(1, tc[0] * 1.5);
        colorArray[i * 3 + 1] = Math.min(1, tc[1] * 1.5);
        colorArray[i * 3 + 2] = Math.min(1, tc[2] * 1.5);
      } else {
        colorArray[i * 3] = tc[0];
        colorArray[i * 3 + 1] = tc[1];
        colorArray[i * 3 + 2] = tc[2];
      }
    }

    // Upload to GPU
    mesh.instanceMatrix.array.set(matrixArray.subarray(0, natoms * 16));
    mesh.instanceMatrix.needsUpdate = true;

    if (mesh.instanceColor) {
      mesh.instanceColor.array.set(colorArray.subarray(0, natoms * 3));
      mesh.instanceColor.needsUpdate = true;
    }

    mesh.count = natoms;
  }, [
    frame, nextFrame, interpolationFactor, scale, highlightedAtoms,
    matrixArray, colorArray, _matrix, _position, _scale, _quaternion
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, maxAtoms]}
      frustumCulled={false}
      count={0}
    />
  );
}
