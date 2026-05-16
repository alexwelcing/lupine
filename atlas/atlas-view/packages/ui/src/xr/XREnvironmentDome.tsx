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
  const { camera } = useThree();

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
        loadedTex.mapping = THREE.EquirectangularReflectionMapping;
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.minFilter = THREE.LinearFilter;
        loadedTex.magFilter = THREE.LinearFilter;
        setTexture(loadedTex);
      },
      undefined,
      () => {
        if (cancelled) return;
        // Generate fallback gradient texture
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        const grad = ctx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, top);
        grad.addColorStop(1, bottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        const fallback = new THREE.CanvasTexture(canvas);
        fallback.mapping = THREE.EquirectangularReflectionMapping;
        setTexture(fallback);
      }
    );

    return () => {
      cancelled = true;
      setTexture(prev => {
        prev?.dispose();
        return null;
      });
    };
  }, [imageUrl, top, bottom]);

  // Create gradient texture when no image is provided
  const gradientTexture = useMemo(() => {
    if (imageUrl) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }, [imageUrl, top, bottom]);

  // Sphere geometry (inverted normals)
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(DOME_RADIUS, 64, 32);
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
