import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function XRMoleculeInteraction({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragPlane = useRef(new THREE.Plane());
  const lastPoint = useRef(new THREE.Vector3());
  const { camera } = useThree();

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setIsDragging(true);

    // Create a plane facing the camera at the point of intersection
    const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
    dragPlane.current.setFromNormalAndCoplanarPoint(normal, e.point);
    
    // Store intersection point to calculate delta later
    const ray = e.ray as THREE.Ray;
    const intersection = new THREE.Vector3();
    ray.intersectPlane(dragPlane.current, intersection);
    if (intersection) {
      lastPoint.current.copy(intersection);
    } else {
      lastPoint.current.copy(e.point);
    }
    
    // Attempt to capture the pointer so fast movements don't lose the drag
    if (e.target && typeof e.target.setPointerCapture === 'function') {
      e.target.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerUp = (e: any) => {
    setIsDragging(false);
    if (e.target && typeof e.target.releasePointerCapture === 'function') {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
    }
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging || !group.current) return;
    e.stopPropagation();
    
    // Use the XR ray or the standard camera ray
    const ray = e.ray as THREE.Ray;
    const intersection = new THREE.Vector3();
    ray.intersectPlane(dragPlane.current, intersection);
    
    if (intersection) {
      // Calculate world-space delta
      const dx = intersection.x - lastPoint.current.x;
      const dy = intersection.y - lastPoint.current.y;
      
      // Convert drag movement to 3D rotation
      // Factor of 5 is a sensitivity multiplier
      group.current.rotation.y += dx * 5; 
      group.current.rotation.x -= dy * 5;
      
      lastPoint.current.copy(intersection);
    }
  };

  const handleWheel = (e: any) => {
    e.stopPropagation();
    if (group.current) {
      const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
      group.current.scale.multiplyScalar(scaleDelta);
    }
  };

  // Optional: A subtle glow when hovered or grabbed to show interactivity
  useFrame(() => {
    if (group.current) {
      const scaleTarget = isDragging ? 1.05 : 1.0;
      group.current.scale.lerp(new THREE.Vector3(scaleTarget, scaleTarget, scaleTarget), 0.1);
    }
  });

  return (
    <group
      ref={group}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOut={handlePointerUp} // Release on out to prevent sticking
      onPointerMove={handlePointerMove}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); }}
      onWheel={handleWheel}
      // Provide a subtle visual indicator that it's interactive
      scale={1}
    >
      {/* Visual bounding box or subtle outline can be added here if desired */}
      {children}
    </group>
  );
}
