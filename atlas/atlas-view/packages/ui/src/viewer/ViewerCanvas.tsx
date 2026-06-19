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

export function ViewerCanvas({
  capability,
  cameraDistance,
  cameraNear,
  center,
  children,
}: ViewerCanvasProps) {
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
        onCreated={({ gl }) => {
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
