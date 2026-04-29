/**
 * <AtomPicker /> — Raycast-based atom selection.
 *
 * Click-only. The previous version did a raycast on every `pointermove`
 * event (throttled to 20 Hz, plus a separate window mousemove listener that
 * stored cursor coordinates in React state) — both were re-rendering the
 * full app shell whenever the user moved the cursor and competing with the
 * playback hot path. Hover-on-demand can come back as an Alt-modifier-gated
 * opt-in if anyone misses it.
 *
 * Uses spatial hash for O(1) closest-atom lookup instead of O(n) iteration.
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';
import { SpatialHash3D } from './SpatialHash';

interface AtomPickerProps {
  frame: Frame;
  spatialHash: SpatialHash3D;
  enabled?: boolean;
  radius?: number;
  onClick?: (atomIndex: number | null) => void;
  onSelect?: (indices: number[]) => void; // Multi-select
  selectionMode?: 'single' | 'add' | 'remove' | 'measure';
}

export interface PickedAtom {
  index: number;
  distance: number;
  worldPosition: THREE.Vector3;
}

export function AtomPicker({
  frame,
  spatialHash,
  enabled = true,
  radius = 2.0,
  onClick,
  onSelect,
  selectionMode = 'single',
}: AtomPickerProps) {
  const { camera } = useThree();
  const [selectedAtoms, setSelectedAtoms] = useState<Set<number>>(new Set());
  const measureAtomsRef = useRef<number[]>([]); // For measurement mode

  // Universal Raycast (XR + Mouse)
  const pickAtomRay = useCallback((ray: THREE.Ray): PickedAtom | null => {
    // March along ray, checking spatial hash at intervals
    const step = Math.max(1.0, radius * 0.5); // Dynamic step size
    const maxDist = Math.min(camera.far, 300);

    for (let t = 0; t < maxDist; t += step) {
      const point = ray.at(t, new THREE.Vector3());
      const nearby = spatialHash.query(point.x, point.y, point.z, radius);

      if (nearby.length > 0) {
        let closest: { index: number; dist: number } | null = null;
        
        for (const { index, dist } of nearby) {
          const atomPos = new THREE.Vector3(
            frame.positions[index * 3],
            frame.positions[index * 3 + 1],
            frame.positions[index * 3 + 2]
          );
          
          // Distance from atom center to the ray
          const distToRay = ray.distanceToPoint(atomPos);
          
          if (distToRay < radius && (!closest || distToRay < closest.dist)) {
            closest = { index, dist: distToRay };
          }
        }

        if (closest) {
          return {
            index: closest.index,
            distance: closest.dist,
            worldPosition: new THREE.Vector3(
              frame.positions[closest.index * 3],
              frame.positions[closest.index * 3 + 1],
              frame.positions[closest.index * 3 + 2]
            ),
          };
        }
      }
    }
    return null;
  }, [camera.far, frame.positions, radius, spatialHash]);

  // R3F Pointer Click
  const handlePointerClick = useCallback((e: any) => {
    if (!enabled) return;
    e.stopPropagation();
    
    if (!e.ray) return;
    const picked = pickAtomRay(e.ray);
    const index = picked?.index ?? null;
    
    onClick?.(index);

    if (index !== null) {
      setSelectedAtoms(prev => {
        const next = new Set(prev);
        switch (selectionMode) {
          case 'single':
            next.clear();
            next.add(index);
            break;
          case 'add':
            next.add(index);
            break;
          case 'remove':
            next.delete(index);
            break;
          case 'measure':
            measureAtomsRef.current.push(index);
            if (measureAtomsRef.current.length > 4) {
               measureAtomsRef.current.shift();
            }
            onSelect?.(measureAtomsRef.current);
            return new Set(measureAtomsRef.current);
        }
        onSelect?.(Array.from(next));
        return next;
      });
    } else {
      if (selectionMode === 'single' || selectionMode === 'measure') {
        setSelectedAtoms(new Set());
        measureAtomsRef.current = [];
        onSelect?.([]);
      }
    }
  }, [enabled, onClick, onSelect, pickAtomRay, selectionMode]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedAtoms(new Set());
      measureAtomsRef.current = [];
      onSelect?.([]);
    }
    if (e.key === 'm' && !e.metaKey && !e.ctrlKey) {
      measureAtomsRef.current = [];
    }
  }, [onSelect]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  // Calculate bounds for the invisible raycast target
  const boundsMesh = useMemo(() => {
    if (!frame.boxBounds) {
      return { position: [0,0,0] as [number, number, number], args: [100, 100, 100] as [number, number, number] };
    }
    const [xlo, xhi, ylo, yhi, zlo, zhi] = frame.boxBounds;
    return {
      position: [(xlo + xhi) / 2, (ylo + yhi) / 2, (zlo + zhi) / 2] as [number, number, number],
      args: [xhi - xlo + 5, yhi - ylo + 5, zhi - zlo + 5] as [number, number, number]
    };
  }, [frame.boxBounds]);

  return (
    <>
      {/* Invisible raycast target for click selection (Mouse + XR) */}
      <mesh
        position={boundsMesh.position}
        onClick={handlePointerClick}
      >
        <boxGeometry args={boundsMesh.args} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Selection indicators */}
      {Array.from(selectedAtoms).map(index => (
        <SelectionIndicator
          key={index}
          position={[
            frame.positions[index * 3],
            frame.positions[index * 3 + 1],
            frame.positions[index * 3 + 2],
          ]}
          index={index}
        />
      ))}
    </>
  );
}

// Individual selection indicator
function SelectionIndicator({ position, index }: { position: [number, number, number]; index: number }) {
  const reticleRef1 = useRef<THREE.Mesh>(null);
  const reticleRef2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (reticleRef1.current) {
      reticleRef1.current.rotation.x = t * 1.2;
      reticleRef1.current.rotation.y = t * 0.8;
      const pulse = 1.0 + Math.sin(t * 8) * 0.05;
      reticleRef1.current.scale.setScalar(pulse);
    }
    if (reticleRef2.current) {
      reticleRef2.current.rotation.y = -t * 1.5;
      reticleRef2.current.rotation.z = t * 0.5;
    }
  });

  return (
    <group position={position}>
      {/* Holographic Core Glow */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial 
          color="#00ffff" 
          transparent 
          opacity={0.15}
          depthTest={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Sci-Fi Targeting Reticles */}
      <mesh ref={reticleRef1}>
        <torusGeometry args={[1.8, 0.03, 16, 64]} />
        <meshBasicMaterial 
          color="#ffffff" 
          transparent
          opacity={0.9}
          depthTest={false}
        />
      </mesh>
      <mesh ref={reticleRef2}>
        <torusGeometry args={[2.0, 0.015, 16, 64]} />
        <meshBasicMaterial 
          color="#00ffff" 
          transparent
          opacity={0.6}
          depthTest={false}
        />
      </mesh>

      {/* High-Fidelity Troika Text Label (XR Compatible) */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#0055ff"
        outlineOpacity={0.8}
        renderOrder={999}
        material-depthTest={false}
      >
        {`#${index + 1}`}
      </Text>
    </group>
  );
}
