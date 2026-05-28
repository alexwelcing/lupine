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

import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { configureEquirectTexture, createGradientEquirectTexture } from '../equirectTexture';

// Dome radius in meters — large enough to surround the molecule
// but small enough to stay inside the near/far clip range.
const DOME_RADIUS = 50;

// AR opacity targets (lower so the real world shows through)
const AR_DOME_OPACITY = 0.15;
// VR is fully opaque
const VR_DOME_OPACITY = 1.0;

interface XREnvironmentDomeProps {
  imageUrl?: string;
  top: string;
  bottom: string;
}

export function XREnvironmentDome({ imageUrl, top, bottom }: XREnvironmentDomeProps) {
  const mode = useXR(state => state.mode);
  const isAR = mode === 'immersive-ar';
  const isVR = mode === 'immersive-vr';
  const isImmersive = isAR || isVR;

  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { camera, gl } = useThree();

  // Current animated opacity (ref to avoid re-renders)
  const currentOpacity = useRef(0);
  const targetOpacity = useRef(0);

  // Load image texture when available
  useEffect(() => {
    if (!imageUrl) {
      setTexture(null);
      return;
    }

    const loader = new THREE.TextureLoader();
    let cancelled = false;

    loader.load(
      imageUrl,
      (loadedTex) => {
        if (cancelled) { loadedTex.dispose(); return; }
        configureEquirectTexture(loadedTex, gl);
        setTexture(loadedTex);
      },
      undefined,
      () => {
        if (cancelled) return;
        setTexture(createGradientEquirectTexture(top, bottom, gl));
      }
    );

    return () => {
      cancelled = true;
      setTexture(prev => {
        prev?.dispose();
        return null;
      });
    };
  }, [imageUrl, top, bottom, gl]);

  // Create gradient texture when no image is provided
  const gradientTexture = useMemo(() => {
    if (imageUrl) return null;
    return createGradientEquirectTexture(top, bottom, gl);
  }, [imageUrl, top, bottom, gl]);

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
    if (isVR) {
      targetOpacity.current = VR_DOME_OPACITY;
    } else if (isAR) {
      targetOpacity.current = AR_DOME_OPACITY;
    } else {
      targetOpacity.current = 0;
    }
  }, [isAR, isVR]);

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

  const activeTexture = texture || gradientTexture;

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
