/**
 * <SelectionMarkers /> - subtle selected and hover feedback for atoms.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';

interface SelectionMarkersProps {
  frame: Frame;
  selectedAtoms: number[];
  hoveredAtom: number | null;
  /** Per-type radius lookup (atom_type -> radius in Angstrom). */
  typeRadii?: Record<number, number>;
  /** Default radius if a type isn't in the lookup. */
  defaultRadius?: number;
}

export function SelectionMarkers({
  frame,
  selectedAtoms,
  hoveredAtom,
  typeRadii,
  defaultRadius = 1.2,
}: SelectionMarkersProps) {
  const radiusFor = (atomIndex: number): number => {
    if (atomIndex < 0 || atomIndex >= frame.natoms) return defaultRadius;
    const t = frame.types[atomIndex];
    if (typeRadii && typeRadii[t] != null) return typeRadii[t];
    return defaultRadius;
  };

  const positionOf = (atomIndex: number): [number, number, number] | null => {
    if (atomIndex < 0 || atomIndex >= frame.natoms) return null;
    return [
      frame.positions[atomIndex * 3],
      frame.positions[atomIndex * 3 + 1],
      frame.positions[atomIndex * 3 + 2],
    ];
  };

  return (
    <group>
      {selectedAtoms.map((idx) => {
        const pos = positionOf(idx);
        if (!pos) return null;
        return (
          <SelectedMarker
            key={`selected-${idx}`}
            position={pos}
            radius={radiusFor(idx) * 1.26}
          />
        );
      })}
      {hoveredAtom != null && !selectedAtoms.includes(hoveredAtom) && (() => {
        const pos = positionOf(hoveredAtom);
        if (!pos) return null;
        return <HoverMarker position={pos} radius={radiusFor(hoveredAtom) * 1.20} />;
      })()}
    </group>
  );
}

function SelectedMarker({
  position,
  radius,
}: {
  position: [number, number, number];
  radius: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const ringGeo = useMemo(
    () => new THREE.RingGeometry(radius * 0.94, radius * 1.06, 72),
    [radius],
  );

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 3.6) * 0.035;
    ringRef.current.scale.setScalar(pulse);
  });

  return (
    <Billboard position={position}>
      <mesh ref={ringRef} geometry={ringGeo}>
        <meshBasicMaterial
          color="#7dd3fc"
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}

function HoverMarker({
  position,
  radius,
}: {
  position: [number, number, number];
  radius: number;
}) {
  const ringGeo = useMemo(
    () => new THREE.RingGeometry(radius * 0.98, radius * 1.02, 48),
    [radius],
  );
  return (
    <Billboard position={position}>
      <mesh geometry={ringGeo}>
        <meshBasicMaterial
          color="#cfe5ff"
          side={THREE.DoubleSide}
          transparent
          opacity={0.45}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}
