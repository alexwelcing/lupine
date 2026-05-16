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
// (~30 cm across) regardless of how big the underlying simulation cell is.
const TARGET_AR_EXTENT_METERS = 0.3;

// Hard upper bound — even if cameraDistance is tiny, the molecule never
// exceeds this physical size in meters.  Prevents the "giant model in
// your face" failure mode the user reported.
const MAX_SCALE = 0.5;

// Physical resting place when the immersive session begins:
//   x = 0           (in front of user)
//   y = 0.85 m      (slightly below eye-level — feels like a desk/table)
//   z = -1.0 m      (about an arm's length forward)
const REST_POSE = { x: 0, y: 0.85, z: -1.0 };

// We start the molecule farther away and at zero scale, then ease it in
// gently so the user never sees a model snap onto their face.
const ENTRY_START = { z: -3.5, scaleMultiplier: 0.0 };

// How fast the entry animation converges.  Lower = slower / gentler.
// A value of 3.0 means ~1.5s to reach 95% of the target.
const EASE_SPEED = 3.0;

export function SpatialAnchor({ children, cameraDistance = 50 }: SpatialAnchorProps) {
  const anchorRef = useRef<THREE.Group>(null);

  const mode = useXR(state => state.mode);
  const file = useStore(s => s.file);
  const isImmersive = mode === 'immersive-ar' || mode === 'immersive-vr';

  // Pick a final scale that puts the molecule's longest extent at
  // TARGET_AR_EXTENT_METERS, clamped to MAX_SCALE so it can never exceed
  // a comfortable physical size.
  const targetScale = useMemo(() => {
    if (!isImmersive) return 1;
    const sceneDiagonal = Math.max(0.5, cameraDistance / 1.4);
    const raw = TARGET_AR_EXTENT_METERS / sceneDiagonal;
    return Math.min(MAX_SCALE, Math.max(0.005, raw));
  }, [isImmersive, cameraDistance]);

  // Animation state lives in refs so re-renders don't reset them.
  const animatedZ = useRef(ENTRY_START.z);
  const animatedY = useRef(REST_POSE.y);
  const animatedScaleK = useRef(ENTRY_START.scaleMultiplier);

  // Reset animation state when entering/exiting immersive mode.
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

    if (isImmersive) {
      // Gentle exponential ease — EASE_SPEED * dt controls convergence rate.
      // At 60fps (dt≈0.016) with EASE_SPEED=3.0, each frame moves ~4.7%
      // toward the target → takes about 1.5s to reach 95%.
      const t = 1 - Math.exp(-EASE_SPEED * dt);

      animatedZ.current += (REST_POSE.z - animatedZ.current) * t;
      animatedY.current += (REST_POSE.y - animatedY.current) * t;
      animatedScaleK.current += (1 - animatedScaleK.current) * t;

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

  // Initial position matches ENTRY_START so there's no one-frame pop
  // at the rest position before the animation begins.
  return (
    <group
      ref={anchorRef}
      position={[0, isImmersive ? REST_POSE.y : 0, isImmersive ? ENTRY_START.z : 0]}
      scale={isImmersive ? 0 : 1}
    >
      {innerContent}
    </group>
  );
}

