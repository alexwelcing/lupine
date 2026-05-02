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
import { TYPE_COLORS, DEFAULT_TYPE_COLOR, TYPE_RADII, COLORMAPS } from './constants';



// ─── Component ───────────────────────────────────────────────────────

interface AtomsProps {
  frame: Frame;
  colorMode?: 'type' | 'property';
  colorProperty?: string;
  colormap?: ColormapName;
  propRange?: [number, number];
  scale?: number;
  renderStyle?: RenderStyle;
  materialPreset?: 'default' | 'matte' | 'metallic' | 'glass' | 'plastic';
}

export function Atoms({
  frame,
  colorMode = 'type',
  colorProperty,
  colormap = 'viridis',
  propRange,
  scale = 1.0,
  renderStyle = 'standard',
  materialPreset = 'default',
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
    
    let matConfig: THREE.MeshPhysicalMaterialParameters = {};
    switch (materialPreset) {
      case 'matte':
        matConfig = { metalness: 0.1, roughness: 0.8, clearcoat: 0.0 };
        break;
      case 'metallic':
        matConfig = { metalness: 0.9, roughness: 0.1, clearcoat: 0.3, clearcoatRoughness: 0.1, envMapIntensity: 2.0 };
        break;
      case 'glass':
        matConfig = { metalness: 0.1, roughness: 0.05, transmission: 0.9, thickness: 1.5, ior: 1.5, transparent: true, clearcoat: 1.0, envMapIntensity: 1.5 };
        break;
      case 'plastic':
        matConfig = { metalness: 0.0, roughness: 0.3, clearcoat: 1.0, clearcoatRoughness: 0.2, envMapIntensity: 1.0 };
        break;
      case 'default':
      default:
        matConfig = { metalness: 0.15, roughness: 0.45, clearcoat: 0.1, clearcoatRoughness: 0.4, envMapIntensity: 0.8 };
        break;
    }
    return new THREE.MeshPhysicalMaterial(matConfig);
  }, [renderStyle, materialPreset]);

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
