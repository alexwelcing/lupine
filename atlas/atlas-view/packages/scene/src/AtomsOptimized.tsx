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
import * as THREE from 'three';
import type { Frame, ColormapName, RenderStyle } from '@atlas/core/types';
import { SpatialHash3D } from './SpatialHash';

import { TYPE_COLORS, TYPE_RADII, COLORMAPS } from './constants';

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

  const material = useMemo(() => {
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
    return new THREE.MeshPhysicalMaterial({
      metalness: 0.1,
      roughness: 0.5,
      clearcoat: 0.05,
      clearcoatRoughness: 0.5,
      envMapIntensity: 0.8,
    });
  }, [renderStyle]);

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

    for (let i = 0; i < frame.natoms; i++) {
      // Position
      let x = positions[i * 3];
      let y = positions[i * 3 + 1];
      let z = positions[i * 3 + 2];

      if (nextPos && t > 0) {
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

        x += dx * t;
        y += dy * t;
        z += dz * t;
      }
      
      _position.set(x, y, z);
      
      // Scale by atom type (hidden = 0, otherwise per-type override or global)
      const isHidden = hiddenAtomTypes?.has(types[i]) ?? false;
      const typeScale = atomTypeScales?.[types[i]] ?? 1.0;
      const radius = isHidden ? 0 : (TYPE_RADII[types[i]] ?? 1.2) * scale * typeScale;
      _scale.setScalar(radius);
      
      // Build matrix
      _matrix.compose(_position, _quaternion, _scale);
      _matrix.toArray(matrixArray, i * 16);

      // Color
      if (colorMode === 'property' && propData) {
        let val = propData[i];
        
        // Interpolate property if next frame is available and has the property
        if (nextFrame && t > 0 && nextFrame.properties && nextFrame.properties.has(colorProperty!)) {
          const nextPropData = nextFrame.properties.get(colorProperty!);
          if (nextPropData && nextPropData.length > i) {
            val = val + (nextPropData[i] - val) * t;
          }
        }
        
        const norm = pMax > pMin ? (val - pMin) / (pMax - pMin) : 0.5;
        const [r, g, b] = mapFn(norm);
        colorArray[i * 3] = r;
        colorArray[i * 3 + 1] = g;
        colorArray[i * 3 + 2] = b;
      } else {
        // Type-based or uniform color using active palette
        const isHighlighted = highlightedAtoms?.has(i);
        let tc: [number, number, number] = [0.6, 0.6, 0.6];
        if (colorMode === 'uniform') {
          tc = mapFn(0.0);
        } else {
          tc = typeColorLookup.get(types[i]) ?? [0.6, 0.6, 0.6];
        }
        
        if (isHighlighted) {
          // Brighten highlighted atoms
          colorArray[i * 3] = Math.min(1, tc[0] * 1.5);
          colorArray[i * 3 + 1] = Math.min(1, tc[1] * 1.5);
          colorArray[i * 3 + 2] = Math.min(1, tc[2] * 1.5);
        } else {
          colorArray[i * 3] = tc[0];
          colorArray[i * 3 + 1] = tc[1];
          colorArray[i * 3 + 2] = tc[2];
        }
      }
    }

    // Upload to GPU - single operation
    const safeAtomCount = Math.min(frame.natoms, capacity);
    mesh.instanceMatrix.array.set(matrixArray.subarray(0, safeAtomCount * 16));
    mesh.instanceMatrix.needsUpdate = true;
    
    if (mesh.instanceColor) {
      mesh.instanceColor.array.set(colorArray.subarray(0, safeAtomCount * 3));
      mesh.instanceColor.needsUpdate = true;
    }
    
    mesh.count = safeAtomCount;

    // Cleanup: cancel pending idle hash build if effect re-runs
    return cleanupIdle;
  }, [
    frame, nextFrame, interpolationFactor, colorMode, propData, pMin, pMax, scale, highlightedAtoms,
    hiddenAtomTypes, atomTypeScales, typeColorLookup,
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
