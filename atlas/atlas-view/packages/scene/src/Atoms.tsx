/**
 * <Atoms /> — React Three Fiber instanced mesh atom renderer
 *
 * Renders atoms using InstancedMesh with per-instance color.
 * Color computation happens CPU-side (matching native Rust pattern)
 * then uploaded to GPU via instance buffers.
 */

import { useRef, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import type { Frame, ColormapName, RenderStyle } from '@atlas/core/types';
import { TYPE_COLORS, DEFAULT_TYPE_COLOR, TYPE_RADII } from './constants';

// ─── Colormap implementations ────────────────────────────────────────

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function makeColormap(
  c0: [number, number, number],
  c1: [number, number, number],
  c2: [number, number, number],
  c3: [number, number, number],
): (t: number) => [number, number, number] {
  return (t: number) => {
    t = Math.max(0, Math.min(1, t));
    if (t < 0.33) return lerpColor(c0, c1, t / 0.33);
    if (t < 0.66) return lerpColor(c1, c2, (t - 0.33) / 0.33);
    return lerpColor(c2, c3, (t - 0.66) / 0.34);
  };
}

const COLORMAPS: Record<ColormapName, (t: number) => [number, number, number]> = {
  viridis:   makeColormap([0.267, 0.004, 0.329], [0.282, 0.140, 0.458], [0.127, 0.566, 0.551], [0.993, 0.906, 0.144]),
  inferno:   makeColormap([0.001, 0.0, 0.014],   [0.416, 0.065, 0.432], [0.891, 0.298, 0.159], [0.988, 0.998, 0.644]),
  coolwarm:  (t: number) => {
    t = Math.max(0, Math.min(1, t));
    const cold: [number, number, number] = [0.230, 0.299, 0.754];
    const mid: [number, number, number] = [0.865, 0.865, 0.865];
    const warm: [number, number, number] = [0.706, 0.016, 0.150];
    if (t < 0.5) return lerpColor(cold, mid, t * 2);
    return lerpColor(mid, warm, (t - 0.5) * 2);
  },
  plasma:    makeColormap([0.050, 0.030, 0.530], [0.494, 0.012, 0.658], [0.798, 0.280, 0.470], [0.940, 0.975, 0.131]),
  magma:     makeColormap([0.001, 0.0, 0.014],   [0.416, 0.065, 0.432], [0.871, 0.287, 0.381], [0.988, 0.991, 0.750]),
  cividis:   makeColormap([0.0, 0.135, 0.305],   [0.345, 0.376, 0.388], [0.725, 0.660, 0.320], [0.995, 0.883, 0.150]),
  neon:      makeColormap([0.0, 1.0, 0.4],       [0.0, 0.8, 1.0],       [0.6, 0.0, 1.0],       [1.0, 0.0, 0.6]),
  sunset:    makeColormap([0.12, 0.0, 0.30],     [0.80, 0.15, 0.40],    [1.0, 0.55, 0.15],     [1.0, 0.92, 0.50]),
  vaporwave: makeColormap([0.05, 0.85, 0.85],    [0.55, 0.30, 0.95],    [1.0, 0.40, 0.70],     [1.0, 0.85, 0.40]),
};

// ─── Component ───────────────────────────────────────────────────────

interface AtomsProps {
  frame: Frame;
  colorMode?: 'type' | 'property';
  colorProperty?: string;
  colormap?: ColormapName;
  propRange?: [number, number];
  scale?: number;
  renderStyle?: RenderStyle;
}

export function Atoms({
  frame,
  colorMode = 'type',
  colorProperty,
  colormap = 'viridis',
  propRange,
  scale = 1.0,
  renderStyle = 'standard',
}: AtomsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const geometry = useMemo(() => {
    return renderStyle === 'toon'
      ? new THREE.IcosahedronGeometry(1, 2)
      : new THREE.SphereGeometry(1, 24, 16);
  }, [renderStyle]);

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
      metalness: 0.15,
      roughness: 0.45,
      clearcoat: 0.1,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.8,
    });
  }, [renderStyle]);

  useEffect(() => { return () => { geometry.dispose(); }; }, [geometry]);
  useEffect(() => { return () => { material.dispose(); }; }, [material]);

  // Build the color + matrix arrays CPU-side (matching native Rust pattern)
  // This function is called imperatively after mesh is available
  const uploadFrame = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh || !frame) return;

    // Resolve property data
    let propData: Float32Array | null = null;
    let pMin = 0;
    let pMax = 1;

    if (colorMode === 'property' && colorProperty) {
      propData = frame.properties?.get(colorProperty) ?? null;
      if (propData) {
        if (propRange) {
          pMin = propRange[0];
          pMax = propRange[1];
        } else {
          // Auto-range from data (same as native coloring::property_to_color)
          let mn = Infinity, mx = -Infinity;
          for (let i = 0; i < propData.length; i++) {
            if (propData[i] < mn) mn = propData[i];
            if (propData[i] > mx) mx = propData[i];
          }
          pMin = mn;
          pMax = mx;
        }
      }
    }

    const mapFn = COLORMAPS[colormap] ?? COLORMAPS.viridis;
    const range = Math.max(pMax - pMin, 1e-6);
    const color = new THREE.Color();

    for (let i = 0; i < frame.natoms; i++) {
      // Position + scale
      const atomType = frame.types[i];
      const radius = (TYPE_RADII[atomType] ?? 1.2) * scale;
      dummy.position.set(
        frame.positions[i * 3],
        frame.positions[i * 3 + 1],
        frame.positions[i * 3 + 2]
      );
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Color — computed CPU-side per atom, same as native upload_frame()
      if (colorMode === 'property' && propData) {
        const t = (propData[i] - pMin) / range;
        const [r, g, b] = mapFn(Math.max(0, Math.min(1, t)));
        color.setRGB(r, g, b);
      } else {
        const tc = TYPE_COLORS[atomType] ?? DEFAULT_TYPE_COLOR;
        color.setRGB(tc[0], tc[1], tc[2]);
      }
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = frame.natoms;
  }, [frame, colorMode, colorProperty, colormap, propRange, scale, dummy]);

  // Re-upload whenever any visual parameter changes
  useEffect(() => {
    uploadFrame();
  }, [uploadFrame]);

  // Also re-upload when geometry/material change (R3F remounts the mesh)
  // The key prop forces a full remount, and the ref callback triggers upload
  const onMeshRef = useCallback((mesh: THREE.InstancedMesh | null) => {
    if (mesh) {
      (meshRef as any).current = mesh;
      // Small delay to ensure R3F has finished setting up the mesh
      requestAnimationFrame(() => uploadFrame());
    }
  }, [uploadFrame]);

  return (
    <instancedMesh
      key={`${renderStyle}-${frame.natoms}`}
      ref={onMeshRef}
      args={[geometry, material, frame.natoms]}
      frustumCulled={false}
    />
  );
}
