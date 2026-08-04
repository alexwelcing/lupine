import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import * as THREE from 'three';
import { CanvasErrorBoundary } from '../CanvasErrorBoundary';
import type { RenderCapability } from '../renderCapability';
import { xrStore } from './xrStore';

interface ViewerCanvasProps {
  capability: RenderCapability;
  cameraDistance: number;
  cameraNear: number;
  center: [number, number, number];
  children: ReactNode;
}

const MAX_DESKTOP_DPR = 1.75;
const MAX_CONSTRAINED_DPR = 1.25;

function resolveMaxDpr(capability: RenderCapability): number {
  if (typeof window === 'undefined') return MAX_DESKTOP_DPR;

  const memoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const constrainedBrowser = capability.browser === 'ios-safari' || capability.browser === 'android-firefox';
  const constrainedHardware = memoryGb <= 4 || cores <= 4;

  return constrainedBrowser || constrainedHardware ? MAX_CONSTRAINED_DPR : MAX_DESKTOP_DPR;
}

export function ViewerCanvas({
  capability,
  cameraDistance,
  cameraNear,
  center,
  children,
}: ViewerCanvasProps) {
  const maxDpr = resolveMaxDpr(capability);

  return (
    <CanvasErrorBoundary capability={capability}>
      <Canvas
        camera={{
          position: [center[0], center[1], center[2] + cameraDistance],
          fov: 50,
          near: cameraNear,
          far: Math.max(10000, cameraDistance * 100),
        }}
        gl={{
          antialias: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, maxDpr]}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          // r182 deprecates PCFSoftShadowMap; PCFShadowMap is now soft.
          gl.shadowMap.type = THREE.PCFShadowMap;
        }}
        style={{
          background: 'transparent',
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      >
        <XR store={xrStore}>{children}</XR>
      </Canvas>
    </CanvasErrorBoundary>
  );
}
