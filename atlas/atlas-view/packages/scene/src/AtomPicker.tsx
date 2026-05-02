/**
 * <AtomPicker /> — Raycast-based atom selection
 * 
 * Uses spatial hash for O(1) closest-atom lookup instead of
 * O(n) iteration through all atoms.
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';
import { SpatialHash3D } from './SpatialHash';

interface AtomPickerProps {
  frame: Frame;
  spatialHash: SpatialHash3D;
  enabled?: boolean;
  radius?: number;
  onHover?: (atomIndex: number | null) => void;
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
  onHover,
  onClick,
  onSelect,
  selectionMode = 'single',
}: AtomPickerProps) {
  const { camera, size, scene, raycaster } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const [hoveredAtom, setHoveredAtom] = useState<number | null>(null);
  const [selectedAtoms, setSelectedAtoms] = useState<Set<number>>(new Set());
  const measureAtomsRef = useRef<number[]>([]); // For measurement mode

  // Visual indicator for hovered atom
  const indicatorRef = useRef<THREE.Mesh>(null);

  // Pick atom at screen position
  const pickAtom = useCallback((screenX: number, screenY: number): PickedAtom | null => {
    // Convert to NDC
    mouseRef.current.x = (screenX / size.width) * 2 - 1;
    mouseRef.current.y = -(screenY / size.height) * 2 + 1;

    // Raycast into scene
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const ray = raycasterRef.current.ray;

    // March along ray, checking spatial hash at intervals
    const step = 0.5; // Check every 0.5 Angstrom
    const maxDist = 1000; // Maximum search distance

    for (let t = 0; t < maxDist; t += step) {
      const point = ray.at(t, new THREE.Vector3());
      const nearby = spatialHash.query(point.x, point.y, point.z, radius);

      if (nearby.length > 0) {
        // Found candidate atoms - find closest by actual distance
        let closest: { index: number; dist: number } | null = null;
        
        for (const { index, dist } of nearby) {
          // Screen-space distance check for precision
          const atomX = frame.positions[index * 3];
          const atomY = frame.positions[index * 3 + 1];
          const atomZ = frame.positions[index * 3 + 2];
          const atomPos = new THREE.Vector3(atomX, atomY, atomZ);
          
          // Project to screen space
          atomPos.project(camera);
          const screenDist = Math.hypot(
            atomPos.x - mouseRef.current.x,
            atomPos.y - mouseRef.current.y
          );
          
          // Must be within reasonable screen distance and ray distance
          if (screenDist < 0.05 && (!closest || dist < closest.dist)) {
            closest = { index, dist };
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
  }, [camera, frame.positions, radius, size, spatialHash]);

  // Mouse move handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled) return;
    
    const picked = pickAtom(e.clientX, e.clientY);
    
    if (picked?.index !== hoveredAtom) {
      setHoveredAtom(picked?.index ?? null);
      onHover?.(picked?.index ?? null);
      
      // Update visual indicator
      if (indicatorRef.current && picked) {
        indicatorRef.current.position.copy(picked.worldPosition);
        indicatorRef.current.visible = true;
        
        // Scale based on atom type
        const type = frame.types[picked.index];
        const baseRadius = [1.28, 0.73, 1.60, 1.44][type - 1] ?? 1.2;
        indicatorRef.current.scale.setScalar(baseRadius * 1.2);
      } else if (indicatorRef.current) {
        indicatorRef.current.visible = false;
      }
    }
  }, [enabled, hoveredAtom, onHover, pickAtom, frame.types]);

  // Click handler
  const handleClick = useCallback((e: MouseEvent) => {
    if (!enabled) return;
    // Strictly isolate canvas clicks (prevent UI panel clicks from triggering deselection)
    if (!(e.target instanceof HTMLCanvasElement)) return;
    
    const picked = pickAtom(e.clientX, e.clientY);
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
            // Collect up to 4 atoms for measurement
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
      // We missed all atoms but hit the canvas. Clear selection!
      if (selectionMode === 'single' || selectionMode === 'measure') {
        setSelectedAtoms(new Set());
        measureAtomsRef.current = [];
        onSelect?.([]);
      }
    }
  }, [enabled, onClick, onSelect, pickAtom, selectionMode]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedAtoms(new Set());
      measureAtomsRef.current = [];
      onSelect?.([]);
    }
    if (e.key === 'm' && !e.metaKey && !e.ctrlKey) {
      // Toggle measurement mode
      measureAtomsRef.current = [];
    }
  }, [onSelect]);

  // Attach event listeners
  useEffect(() => {
    if (!enabled) return;
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleMouseMove, handleClick, handleKeyDown]);

  return (
    <>
      {/* Hover indicator */}
      <mesh ref={indicatorRef} visible={false}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial 
          color="#00c8f0" 
          transparent 
          opacity={0.3} 
          depthTest={false}
        />
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
  return (
    <mesh position={position}>
      <sphereGeometry args={[1.3, 16, 12]} />
      <meshBasicMaterial 
        color="#00c8f0" 
        transparent 
        opacity={0.15}
        depthTest={false}
      />
      {/* Selection ring */}
      <mesh scale={1.4}>
        <ringGeometry args={[0.9, 1.0, 32]} />
        <meshBasicMaterial 
          color="#00c8f0" 
          transparent 
          opacity={0.8}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>
      {/* Atom number label */}
      <sprite position={[0, 2, 0]}>
        <spriteMaterial
          attach="material"
          transparent
          opacity={0.9}
        >
          <canvasTexture
            attach="map"
            args={[createLabelCanvas(`#${index + 1}`)]}
          />
        </spriteMaterial>
      </sprite>
    </mesh>
  );
}

// Create text label canvas
function createLabelCanvas(text: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, 64, 32);
  
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#00c8f0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 16);
  
  return canvas;
}
