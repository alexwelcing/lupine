import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { XRMoleculeInteraction } from './xr/XRMoleculeInteraction';
import { XRControlPanel } from './xr/XRControlPanel';
import { Text, ContactShadows } from '@react-three/drei';
import { useStore } from './store';

interface SpatialAnchorProps {
  children: React.ReactNode;
  cameraDistance?: number;
}

// In AR/VR we want the molecule to fit a comfortable handheld volume
// (~40 cm across) regardless of how big the underlying simulation cell is.
const TARGET_AR_EXTENT_METERS = 0.4;

// Physical resting place when the immersive session begins:
//   x = 0           (in front of user)
//   y = 1.0 m       (eye-level for a seated/standing user — refines once placed)
//   z = -1.2 m      (about an arm's length forward)
const REST_POSE = { x: 0, y: 1.0, z: -1.2 };

// We start the molecule farther away and smaller, then ease it in to its
// resting pose so the user does not see a giant model snap onto their face.
const ENTRY_START = { z: -3.0, scaleMultiplier: 0.0 };

export function SpatialAnchor({ children, cameraDistance = 50 }: SpatialAnchorProps) {
  const anchorRef = useRef<THREE.Group>(null);

  const mode = useXR(state => state.mode);
  const file = useStore(s => s.file);
  const isImmersive = mode === 'immersive-ar' || mode === 'immersive-vr';

  // Pick a final scale that puts the molecule's longest extent at TARGET_AR_EXTENT_METERS.
  // cameraDistance ≈ diagonal * 1.4 (see App.tsx fit logic), so molecule diagonal in
  // raw scene units ≈ cameraDistance / 1.4. We divide by that to get the conversion.
  const targetScale = useMemo(() => {
    if (!isImmersive) return 1;
    const sceneDiagonal = Math.max(0.5, cameraDistance / 1.4);
    return Math.max(0.005, TARGET_AR_EXTENT_METERS / sceneDiagonal);
  }, [isImmersive, cameraDistance]);

  // Animation state lives in refs so re-renders don't reset them.
  const animatedZ = useRef(REST_POSE.z);
  const animatedY = useRef(REST_POSE.y);
  const animatedScaleK = useRef(1);

  useEffect(() => {
    if (isImmersive) {
      animatedZ.current = ENTRY_START.z;
      animatedY.current = REST_POSE.y;
      animatedScaleK.current = ENTRY_START.scaleMultiplier;
    } else {
      animatedZ.current = 0;
      animatedY.current = 0;
      animatedScaleK.current = 1;
    }
  }, [isImmersive]);

  useFrame((_state, dt) => {
    if (!anchorRef.current) return;
    // Critically-damped ease — feels professional, not floaty
    const lerp = 1 - Math.pow(0.001, dt);

    if (isImmersive) {
      animatedZ.current += (REST_POSE.z - animatedZ.current) * lerp;
      animatedY.current += (REST_POSE.y - animatedY.current) * lerp;
      animatedScaleK.current += (1 - animatedScaleK.current) * lerp;
      anchorRef.current.position.set(REST_POSE.x, animatedY.current, animatedZ.current);
      const k = animatedScaleK.current;
      anchorRef.current.scale.set(k, k, k);
    } else {
      anchorRef.current.position.set(0, 0, 0);
      anchorRef.current.scale.set(1, 1, 1);
    }
  });

  const innerContent = isImmersive ? (
    <>
      <XRMoleculeInteraction>
        <group scale={targetScale}>
          {children}

          {/* Grounding shadow to make the model feel placed, not floating */}
          <ContactShadows
            position={[0, -1.0, 0]}
            opacity={0.6}
            scale={20}
            blur={2.5}
            far={4}
            color="#000000"
          />

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

  return (
    <group ref={anchorRef} position={[0, isImmersive ? REST_POSE.y : 0, isImmersive ? REST_POSE.z : 0]}>
      {innerContent}
    </group>
  );
}
