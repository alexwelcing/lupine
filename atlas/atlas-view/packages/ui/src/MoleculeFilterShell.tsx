import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { FilterShellPreset, FilterShellShape } from './store';

const SHELL_PRESETS: Record<FilterShellPreset, {
  fill: string;
  edge: string;
  accent: string;
}> = {
  haze: { fill: '#d9f7ff', edge: '#7de9ff', accent: '#ffffff' },
  cryo: { fill: '#84c9ff', edge: '#d7f7ff', accent: '#5eead4' },
  prism: { fill: '#b9a8ff', edge: '#63f6ff', accent: '#ff7ab6' },
  graphite: { fill: '#8aa0b6', edge: '#d1d5db', accent: '#f59e0b' },
};

interface MoleculeFilterShellProps {
  center: [number, number, number];
  radius: number;
  shape: FilterShellShape;
  preset: FilterShellPreset;
  opacity: number;
  radiusScale: number;
}

export function MoleculeFilterShell({
  center,
  radius,
  shape,
  preset,
  opacity,
  radiusScale,
}: MoleculeFilterShellProps) {
  const style = SHELL_PRESETS[preset] ?? SHELL_PRESETS.haze;
  const shellRadius = Math.max(0.5, radius * radiusScale);
  const diameter = shellRadius * 2;
  const fillOpacity = Math.min(0.34, opacity * 0.58);
  const rimOpacity = Math.min(0.72, opacity * 1.35);

  const cubeEdgesGeometry = useMemo(() => {
    if (shape !== 'cube') return null;
    const box = new THREE.BoxGeometry(diameter, diameter, diameter);
    const edges = new THREE.EdgesGeometry(box, 15);
    box.dispose();
    return edges;
  }, [diameter, shape]);

  useEffect(() => () => {
    cubeEdgesGeometry?.dispose();
  }, [cubeEdgesGeometry]);

  if (shape === 'off' || opacity <= 0) return null;

  return (
    <group position={center} renderOrder={-40}>
      <mesh frustumCulled={false} renderOrder={-40}>
        {shape === 'sphere' ? (
          <sphereGeometry args={[shellRadius, 40, 20]} />
        ) : (
          <boxGeometry args={[diameter, diameter, diameter, 1, 1, 1]} />
        )}
        <meshBasicMaterial
          color={style.fill}
          transparent
          opacity={fillOpacity}
          depthWrite={false}
          depthTest
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>

      {shape === 'sphere' && (
        <mesh frustumCulled={false} renderOrder={-39}>
          <sphereGeometry args={[shellRadius * 1.003, 24, 12]} />
          <meshBasicMaterial
            color={style.edge}
            transparent
            opacity={rimOpacity}
            wireframe
            depthWrite={false}
            depthTest
            toneMapped={false}
          />
        </mesh>
      )}

      {shape === 'cube' && cubeEdgesGeometry && (
        <lineSegments geometry={cubeEdgesGeometry} frustumCulled={false} renderOrder={-39}>
          <lineBasicMaterial
            color={style.edge}
            transparent
            opacity={rimOpacity}
            depthWrite={false}
            depthTest
            toneMapped={false}
          />
        </lineSegments>
      )}

      {shape === 'cube' && (
        <mesh frustumCulled={false} renderOrder={-38}>
          <boxGeometry args={[diameter * 1.006, diameter * 1.006, diameter * 1.006, 1, 1, 1]} />
          <meshBasicMaterial
            color={style.accent}
            transparent
            opacity={Math.min(0.18, opacity * 0.36)}
            wireframe
            depthWrite={false}
            depthTest
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}
