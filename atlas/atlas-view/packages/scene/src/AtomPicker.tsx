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
  const { camera, scene, get, gl } = useThree();
  const [hoveredAtom, setHoveredAtom] = useState<number | null>(null);
  const [selectedAtoms, setSelectedAtoms] = useState<Set<number>>(new Set());
  const measureAtomsRef = useRef<number[]>([]); // For measurement mode

  // Pick atom at screen position
  const pickAtom = useCallback((): PickedAtom | null => {
    const state = get();
    const pointer = state.pointer;
    const raycaster = state.raycaster;

    // Raycast into scene
    raycaster.setFromCamera(pointer, camera);
    const ray = raycaster.ray;

    // March along ray, checking spatial hash at intervals
    const step = 0.5; // Check every 0.5 Angstrom
    const maxDist = 1000; // Maximum search distance

    let bestSolidHit: { index: number; distToRay: number } | null = null;
    let bestSoftHit: { index: number; screenDist: number; distance: number } | null = null;

    for (let t = 0; t < maxDist; t += step) {
      const point = ray.at(t, new THREE.Vector3());
      const nearby = spatialHash.query(point.x, point.y, point.z, radius);

      if (nearby.length > 0) {
        let currentSliceSolid: { index: number; distToRay: number } | null = null;
        
        for (const { index } of nearby) {
          const atomX = frame.positions[index * 3];
          const atomY = frame.positions[index * 3 + 1];
          const atomZ = frame.positions[index * 3 + 2];
          const atomPos = new THREE.Vector3(atomX, atomY, atomZ);
          
          // 1. World-space intersection (Solves the zoomed-in bug)
          const distToRay = ray.distanceToPoint(atomPos);
          const worldRadius = radius * 1.2;
          
          // 2. Screen-space intersection (Solves the zoomed-out bug)
          atomPos.project(camera);
          const pointer = get().pointer;
          const dxPixels = (atomPos.x - pointer.x) * gl.domElement.clientWidth / 2;
          const dyPixels = (atomPos.y - pointer.y) * gl.domElement.clientHeight / 2;
          const screenDistPixels = Math.hypot(dxPixels, dyPixels);
          const minClickPixels = 15; // 15px forgiveness zone
          
          // Must be in front of the camera (NDC z < 1.0)
          if (atomPos.z < 1.0) {
            const isSolid = distToRay < worldRadius;
            const isSoft = screenDistPixels < minClickPixels;
            
            if (isSolid) {
              if (!currentSliceSolid || distToRay < currentSliceSolid.distToRay) {
                currentSliceSolid = { index, distToRay };
              }
            } else if (isSoft) {
              // Only record soft hits if we haven't hit a solid target yet
              if (!bestSolidHit && !currentSliceSolid) {
                if (!bestSoftHit || screenDistPixels < bestSoftHit.screenDist) {
                  const worldPos = new THREE.Vector3(atomX, atomY, atomZ);
                  bestSoftHit = { index, screenDist: screenDistPixels, distance: ray.origin.distanceTo(worldPos) };
                }
              }
            }
          }
        }
        
        if (currentSliceSolid) {
          bestSolidHit = currentSliceSolid;
          break; // Found the closest solid hit, stop marching!
        }
      }
    }

    const hit = bestSolidHit || bestSoftHit;
    if (hit) {
      const worldPos = new THREE.Vector3(
        frame.positions[hit.index * 3],
        frame.positions[hit.index * 3 + 1],
        frame.positions[hit.index * 3 + 2]
      );
      return {
        index: hit.index,
        distance: 'distance' in hit ? hit.distance : ray.origin.distanceTo(worldPos),
        worldPosition: worldPos,
      };
    }

    return null;
  }, [camera, frame.positions, radius, gl, spatialHash]);

  // Mouse move handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // If the user is dragging the mouse (orbiting the camera), skip expensive raymarching!
    if (!enabled || e.buttons > 0) return;
    
    const picked = pickAtom();
    
    if (picked?.index !== hoveredAtom) {
      setHoveredAtom(picked?.index ?? null);
      onHover?.(picked?.index ?? null);
    }
  }, [enabled, hoveredAtom, onHover, pickAtom, frame.types]);

  // Pointer down tracking for distinguishing clicks from drags
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const handlePointerDown = useCallback((e: PointerEvent) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Click handler
  const handleClick = useCallback((e: MouseEvent) => {
    if (!enabled) return;
    // Strictly isolate canvas clicks (prevent UI panel clicks from triggering deselection)
    if (!(e.target instanceof HTMLCanvasElement)) return;
    
    // Distinguish click from drag (especially on mobile)
    const dx = e.clientX - pointerDownPosRef.current.x;
    const dy = e.clientY - pointerDownPosRef.current.y;
    if (Math.hypot(dx, dy) > 5) {
      return; // It was a drag, ignore as a click
    }
    
    const picked = pickAtom();
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
    
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handlePointerDown, handleMouseMove, handleClick, handleKeyDown]);

  return null;
}
