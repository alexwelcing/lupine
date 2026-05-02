import React, { useRef } from 'react';
import * as THREE from 'three';
import { useXR } from '@react-three/xr';
import { XRMoleculeInteraction } from './xr/XRMoleculeInteraction';
import { XRControlPanel } from './xr/XRControlPanel';
import { Text, ContactShadows } from '@react-three/drei';
import { useStore } from './store';

interface SpatialAnchorProps {
  children: React.ReactNode;
  cameraDistance?: number;
}

export function SpatialAnchor({ children, cameraDistance = 50 }: SpatialAnchorProps) {
  const anchorRef = useRef<THREE.Group>(null);
  
  // v6 requires a selector
  const mode = useXR(state => state.mode);

  const file = useStore(s => s.file);
  const isImmersive = mode === 'immersive-ar' || mode === 'immersive-vr';
  
  // Base scale down so it fits in a 1-2 meter area in AR/VR instead of being 50+ meters wide
  const scale = isImmersive ? Math.max(0.01, 1.0 / (cameraDistance / 1.4)) : 1;

  const innerContent = isImmersive ? (
    <>
      <XRMoleculeInteraction>
        <group scale={scale}>
          {children}
          
          {/* Grounding shadow to make it feel physically present on the floor/table */}
          <ContactShadows 
            position={[0, -1.0, 0]} 
            opacity={0.6} 
            scale={20} 
            blur={2.5} 
            far={4} 
            color="#000000"
          />

          {/* Dataset Holographic Label placed above the molecule */}
          {file && (
            <Text
              position={[0, 1.2, 0]}
              fontSize={0.2}
              color="#4a90e2"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {file.name}
            </Text>
          )}
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
