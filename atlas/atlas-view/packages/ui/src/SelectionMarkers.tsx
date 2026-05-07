/**
 * <SelectionMarkers /> — Visual feedback for selected/hovered atoms.
 *
 * Selected atoms: a thin halo ring at the atom's equator (camera-aligned)
 * + a soft glow sphere just outside the atom radius. The ring pulses
 * subtly via useFrame so the eye is drawn to it without it being
 * distracting. Closes the click → feedback loop.
 *
 * Hovered atom: a single pale ring, no pulse. Lighter than selection
 * so the user can distinguish "I'm pointing at this" from "I picked this".
 *
 * Implementation note: atoms are instanced impostors so we can't wrap
 * one instance with drei <Outlines />. Instead this layer renders separate
 * non-instanced markers at the picked atom's position. Cheap — a handful
 * of markers max, regardless of total atom count.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';

interface SelectionMarkersProps {
  frame: Frame;
  selectedAtoms: number[];
  hoveredAtom: number | null;
  /** Per-type radius lookup (atom_type → radius in Å). When provided the
   *  marker scales with the atom's actual radius; otherwise the default
   *  (1.2 Å, typical covalent) is used. */
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
            key={`sel-${idx}`}
            position={pos}
            radius={radiusFor(idx) * 1.35}
          />
        );
      })}
      {hoveredAtom != null && !selectedAtoms.includes(hoveredAtom) && (() => {
        const pos = positionOf(hoveredAtom);
        if (!pos) return null;
        return (
          <HoverMarker position={pos} radius={radiusFor(hoveredAtom) * 1.2} />
        );
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
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Subtle pulse: scale 1.0 → 1.08 over a 1.6s sine, plus opacity bobble.
    const pulse = 1.0 + Math.sin(t * 4.0) * 0.04;
    if (ringRef.current) {
      ringRef.current.scale.setScalar(pulse);
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 + Math.sin(t * 3.2) * 0.06;
    }
  });

  // Geometry memoized so changing position doesn't recreate buffers each render.
  const ringGeo = useMemo(
    () => new THREE.RingGeometry(radius * 0.98, radius * 1.04, 64),
    [radius],
  );
  const glowGeo = useMemo(
    () => new THREE.SphereGeometry(radius * 1.06, 24, 16),
    [radius],
  );

  return (
    <group position={position}>
      <Billboard>
        <mesh ref={ringRef} geometry={ringGeo}>
          <meshBasicMaterial
            color="#7ecfff"
            side={THREE.DoubleSide}
            transparent
            opacity={0.9}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
      <mesh ref={glowRef} geometry={glowGeo}>
        <meshBasicMaterial
          color="#7ecfff"
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
          // Additive feels right for a glow read; with regular blending the
          // tinted sphere just looks like a frosted shell.
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
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
    () => new THREE.RingGeometry(radius * 0.99, radius * 1.02, 48),
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
