import React, { useRef } from 'react';
import * as THREE from 'three';
import { useXR } from '@react-three/xr';
import { PivotControls } from '@react-three/drei';

interface SpatialAnchorProps {
  children: React.ReactNode;
}

export function SpatialAnchor({ children }: SpatialAnchorProps) {
  const anchorRef = useRef<THREE.Group>(null);
  
  let mode = null;
  try {
    const xr = useXR();
    mode = xr?.mode;
  } catch (e) {
    // Ignore
  }

  const isImmersive = mode === 'immersive-ar' || mode === 'immersive-vr';

  const innerContent = isImmersive ? (
    <PivotControls
      visible={true}
      scale={1.5}
      anchor={[0, 0, 0]}
      depthTest={false}
      lineWidth={4}
      axisColors={['#ff4b4b', '#20c20e', '#3a78ff']}
    >
      {children}
    </PivotControls>
  ) : (
    <>{children}</>
  );

  return (
    <group ref={anchorRef} position={[0, isImmersive ? 1.5 : 0, isImmersive ? -1 : 0]}>
      {innerContent}
    </group>
  );
}
