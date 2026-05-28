/**
 * XREnvironmentDome — Renders the selected background texture on an inverted
 * sphere that surrounds the molecule in AR/VR.
 *
 * In VR mode the dome is fully opaque (acts as a traditional skybox).
 * In AR mode the dome is rendered at low opacity with additive blending,
 * producing a subtle holographic aura that sits behind the passthrough
 * camera feed without obscuring it.
 *
 * The dome smoothly fades in when entering immersive mode and fades out
 * when exiting, so transitions feel seamless.
 */

import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import type { BgMedia } from '../backgroundPresets';
import type { BackgroundGradientStyle } from '../equirectTexture';
import { useEquirectMediaTexture } from '../hooks/useEquirectMediaTexture';

// Dome radius in meters — large enough to surround the molecule
// but small enough to stay inside the near/far clip range.
const DOME_RADIUS = 50;

// AR opacity targets (lower so the real world shows through)
const AR_DOME_OPACITY = 0.15;
// VR is fully opaque
const VR_DOME_OPACITY = 1.0;

interface XREnvironmentDomeProps {
  media: BgMedia;
  top: string;
  bottom: string;
  style?: BackgroundGradientStyle;
  disabled?: boolean;
}

export function XREnvironmentDome({ media, top, bottom, style = 'linear', disabled = false }: XREnvironmentDomeProps) {
  const mode = useXR(state => state.mode);
  const isAR = mode === 'immersive-ar';
  const isVR = mode === 'immersive-vr';
  const isImmersive = isAR || isVR;

  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const { camera } = useThree();
  const activeTexture = useEquirectMediaTexture({
    media,
    top,
    bottom,
    style,
    enabled: isImmersive,
    logPrefix: 'xr-bg',
    projection: 'dome',
  });

  // Current animated opacity (ref to avoid re-renders)
  const currentOpacity = useRef(0);
  const targetOpacity = useRef(0);

  // Sphere geometry (inverted normals)
  const geometry = useMemo(() => {
    // 128×64 segments smooths the silhouette enough that mipmap-filtered
    // texels — not geometry faceting — define the visible quality.
    const geo = new THREE.SphereGeometry(DOME_RADIUS, 128, 64);
    // Flip normals so we render on the inside
    geo.scale(-1, 1, 1);
    return geo;
  }, []);

  // Update opacity target based on mode
  useEffect(() => {
    if (disabled) {
      targetOpacity.current = 0;
    } else if (isVR) {
      targetOpacity.current = VR_DOME_OPACITY;
    } else if (isAR) {
      targetOpacity.current = AR_DOME_OPACITY;
    } else {
      targetOpacity.current = 0;
    }
  }, [disabled, isAR, isVR]);

  // Per-frame: smooth fade + follow camera
  useFrame((_state, dt) => {
    if (!meshRef.current || !matRef.current) return;

    // Smooth crossfade (critically damped)
    const lerp = 1 - Math.pow(0.003, dt);
    currentOpacity.current += (targetOpacity.current - currentOpacity.current) * lerp;

    // Very low opacity → hide entirely for perf
    const visible = currentOpacity.current > 0.005;
    meshRef.current.visible = visible;

    if (!visible) return;

    matRef.current.opacity = currentOpacity.current;

    // Keep the dome centred on camera so it always surrounds the user
    meshRef.current.position.copy(camera.position);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} renderOrder={-1000}>
      <meshBasicMaterial
        ref={matRef}
        map={activeTexture}
        side={THREE.FrontSide}
        transparent
        opacity={0}
        depthWrite={false}
        // In AR: additive blending blends the dome gently with the passthrough
        // In VR: normal blending for a solid skybox
        blending={isAR ? THREE.AdditiveBlending : THREE.NormalBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
