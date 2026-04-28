import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';
import { useStore } from '@atlas/ui/store';

interface AnomalyTrackerProps {
  frame: Frame | null;
  colorProperty: string | null;
  active: boolean;
}

export function AnomalyTracker({ frame, colorProperty, active }: AnomalyTrackerProps) {
  const { camera, controls } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const isTransitioning = useRef(false);
  
  // We can hook into the store to auto-set DOF focus when tracking
  const setDOFFocus = useStore(s => s.setDOFFocus);
  const dofEnabled = useStore(s => s.dof);
  
  useEffect(() => {
    if (!active || !frame || !colorProperty) {
      isTransitioning.current = false;
      return;
    }
    
    const propData = frame.properties?.get(colorProperty);
    if (!propData) return;

    // Find the max property value and compute threshold
    let pMax = -Infinity;
    let pMin = Infinity;
    for (let i = 0; i < propData.length; i++) {
      if (propData[i] > pMax) pMax = propData[i];
      if (propData[i] < pMin) pMin = propData[i];
    }
    
    if (pMax === pMin) return;

    const threshold = pMin + (pMax - pMin) * 0.85; // Top 15% (matches emissive bloom threshold)
    
    let sumX = 0, sumY = 0, sumZ = 0;
    let count = 0;
    
    for (let i = 0; i < propData.length; i++) {
      if (propData[i] >= threshold) {
        sumX += frame.positions[i * 3];
        sumY += frame.positions[i * 3 + 1];
        sumZ += frame.positions[i * 3 + 2];
        count++;
      }
    }
    
    if (count > 0) {
      targetPosition.current.set(sumX / count, sumY / count, sumZ / count);
      isTransitioning.current = true;
    }
  }, [frame, colorProperty, active]);

  useFrame((state, delta) => {
    if (!active || !isTransitioning.current) return;
    
    // Smoothly interpolate orbit controls target to the anomaly centroid
    if (controls && (controls as any).target) {
      const target = (controls as any).target as THREE.Vector3;
      target.lerp(targetPosition.current, 3.0 * delta);
      
      // Calculate distance to camera to auto-focus DoF
      if (dofEnabled) {
        const dist = camera.position.distanceTo(target);
        // Multiply by 100 because the App sets DoF focus as `dofFocus / 100` 
        // and standard focus values are 0-100 mapped to physical distance.
        // Actually, if we want exact physical distance, let's see: App uses focusDistance={dofFocus / 100}
        setDOFFocus(dist * 100); 
      }
      
      if (target.distanceTo(targetPosition.current) < 0.1) {
        isTransitioning.current = false;
      }
    }
  });

  return null;
}
