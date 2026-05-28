import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';

interface GhostAtomsProps {
  frame: Frame | null | undefined;
  color?: string;
  opacity?: number;
  scale?: number;
}

export function GhostAtoms({
  frame,
  color = '#ffb454',
  opacity = 0.26,
  scale = 0.42,
}: GhostAtomsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 20, 12), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    }),
    [color, opacity],
  );

  const count = frame?.natoms ?? 0;

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !frame || count <= 0) return;
    const positions = frame.positions;
    for (let idx = 0; idx < count; idx += 1) {
      dummy.position.set(
        positions[idx * 3] ?? 0,
        positions[idx * 3 + 1] ?? 0,
        positions[idx * 3 + 2] ?? 0,
      );
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, dummy, frame, scale]);

  if (!frame || count <= 0) return null;

  return (
    <instancedMesh
      key={count}
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
      renderOrder={-1}
    />
  );
}
