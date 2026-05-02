import React, { useRef } from 'react';
import * as THREE from 'three';
import { useXR } from '@react-three/xr';
import { XRMoleculeInteraction } from './xr/XRMoleculeInteraction';
import { XRControlPanel } from './xr/XRControlPanel';

interface SpatialAnchorProps {
  children: React.ReactNode;
  cameraDistance?: number;
}

export function SpatialAnchor({ children, cameraDistance = 50 }: SpatialAnchorProps) {
  const anchorRef = useRef<THREE.Group>(null);
  
  // v6 requires a selector
  const mode = useXR(state => state.mode);

  const isImmersive = mode === 'immersive-ar' || mode === 'immersive-vr';
  
  // Base scale down so it fits in a 1-2 meter area in AR/VR instead of being 50+ meters wide
  const scale = isImmersive ? Math.max(0.01, 1.0 / (cameraDistance / 1.4)) : 1;

  const innerContent = isImmersive ? (
    <>
      <XRMoleculeInteraction>
        <group scale={scale}>
          {children}
        </group>
      </XRMoleculeInteraction>
      <XRControlPanel />
    </>
  ) : (
    <>{children}</>
  );

  // Position at origin if not immersive, otherwise put it a bit below eye-level and slightly forward
  return (
    <group ref={anchorRef} position={[0, isImmersive ? 1.0 : 0, isImmersive ? -1.5 : 0]}>
      {innerContent}
    </group>
  );
}
