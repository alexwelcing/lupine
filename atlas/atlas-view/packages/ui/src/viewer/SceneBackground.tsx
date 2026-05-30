import { useEffect, useRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useXR } from '@react-three/xr';
import { getBackgroundFromColormap } from '@atlas/scene';
import type { ColormapName } from '@atlas/core/types';
import { BG_PRESETS, getBgMedia, type BgMedia, type BgPreset } from '../backgroundPresets';
import { useEquirectMediaTexture } from '../hooks/useEquirectMediaTexture';
import type { BackgroundGradientStyle } from '../equirectTexture';
import { ProceduralBackground, ProceduralMathField } from '../ProceduralBackground';

export function resolveBackground(backgroundPreset: string, colormap: ColormapName): { top: string; bottom: string; media: BgMedia; procedural?: BgPreset['procedural'] } {
  if (backgroundPreset.startsWith('palette:')) {
    const [, palette] = backgroundPreset.split(':');
    const colors = getBackgroundFromColormap((palette as ColormapName) ?? colormap);
    return { ...colors, media: { kind: 'gradient', projection: 'equirectangular' } };
  }
  const preset = BG_PRESETS[backgroundPreset] ?? BG_PRESETS.void;
  return { top: preset.top, bottom: preset.bottom, media: getBgMedia(preset), procedural: preset.procedural };
}

// ─── Scene Background component ──────────────────────────────────────
export function SceneBackground({ top, bottom, style = 'linear', media, procedural, center = [0, 0, 0], distance = 1 }: {
  top: string; bottom: string;
  style?: BackgroundGradientStyle;
  media: BgMedia;
  procedural?: BgPreset['procedural'];
  center?: [number, number, number];
  distance?: number;
}) {
  const { scene } = useThree();

  // Hook must be called unconditionally
  const mode = useXR(state => state.mode);
  const xrMode = mode as string | null;
  const isImmersiveAR = xrMode === 'immersive-ar';
  const isImmersiveVR = xrMode === 'immersive-vr';
  const texture = useEquirectMediaTexture({
    media,
    top,
    bottom,
    style,
    enabled: !isImmersiveAR && !procedural,
    projection: media.kind === 'video' ? 'dome' : 'scene-background',
    logPrefix: 'bg',
  });

  useEffect(() => {
    if (isImmersiveAR || procedural) {
      scene.background = null;
      scene.fog = procedural && !isImmersiveAR ? new THREE.FogExp2(bottom, 0.0007) : null;
      return () => {
        scene.background = null;
        scene.fog = null;
      };
    }

    if (!texture || media.kind === 'video') {
      scene.background = null;
      scene.fog = null;
      return;
    }

    scene.background = texture;
    if (media.kind === 'image') {
      scene.fog = new THREE.FogExp2(bottom, 0.0008);
    } else if (media.kind === 'gradient') {
      scene.fog = new THREE.FogExp2(bottom, 0.0015);
    } else {
      scene.fog = null;
    }

    return () => {
      if (scene.background === texture) scene.background = null;
      scene.fog = null;
    };
  }, [bottom, isImmersiveAR, media.kind, procedural, scene, texture]);

  if (procedural) {
    const visible = !isImmersiveAR;
    return (
      <>
        <ProceduralBackground variant={procedural} top={top} bottom={bottom} visible={visible} />
        <ProceduralMathField variant={procedural} center={center} radius={distance * 1.46} visible={visible} />
      </>
    );
  }

  if (media.kind === 'video' && texture && !isImmersiveAR && !isImmersiveVR) {
    return <PanoramaBackgroundDome texture={texture} />;
  }

  return null;
}

const PANORAMA_DOME_RADIUS = 5000;

function PanoramaBackgroundDome({ texture }: { texture: THREE.Texture }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(PANORAMA_DOME_RADIUS, 128, 64);
    geo.scale(-1, 1, 1);
    return geo;
  }, []);

  useFrame(() => {
    meshRef.current?.position.copy(camera.position);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false} renderOrder={-1000}>
      <meshBasicMaterial
        map={texture}
        side={THREE.FrontSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}
