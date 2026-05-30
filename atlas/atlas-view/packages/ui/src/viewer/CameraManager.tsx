import { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';

export function CameraManager({
  fileId,
  center,
  distance,
}: {
  fileId?: string;
  center: [number, number, number];
  distance: number;
}) {
  const { camera, controls } = useThree((s) => ({ camera: s.camera, controls: s.controls as any }));
  const flythroughPreview = useStore(s => s.flythroughPreview);

  // Sync continuously during flythrough preview + keep clipping planes generous
  useFrame(() => {
    // Dynamic clipping: always keep far plane far enough to see everything
    if (camera instanceof THREE.PerspectiveCamera) {
      const camDist = camera.position.length();
      const minFar = Math.max(10000, distance * 100, camDist * 20);
      if (camera.far < minFar) {
        camera.far = minFar;
        camera.updateProjectionMatrix();
      }
    }

    if (flythroughPreview) {
      const state = useStore.getState();
      camera.position.set(...state.cameraPosition);
      camera.lookAt(...state.cameraTarget);

      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = state.cameraFov;
        camera.updateProjectionMatrix();
      }

      if (controls && controls.target) {
        controls.target.set(...state.cameraTarget);
        controls.update();
      }
    }
  });

  // Fit on load
  useEffect(() => {
    if (!fileId) return;
    camera.position.set(center[0], center[1], center[2] + distance);
    camera.lookAt(center[0], center[1], center[2]);
    camera.updateProjectionMatrix();
    if (controls && controls.target) {
      controls.target.set(center[0], center[1], center[2]);
      controls.update();
    }
    useStore.getState().setCameraState(camera.position.toArray() as any, center);
  }, [fileId, center, distance, camera, controls]);

  // Sync with presets
  useEffect(() => {
    const unsub = useStore.subscribe(
      (s) => s.cameraPreset,
      (preset) => {
        const { cameraPosition, cameraTarget } = useStore.getState();
        camera.position.set(...cameraPosition);
        camera.lookAt(...cameraTarget);
        camera.updateProjectionMatrix();
        if (controls && controls.target) {
          controls.target.set(...cameraTarget);
          controls.update();
        }
      }
    );
    return unsub;
  }, [camera, controls]);

  // Apply stored camera state on change (saved views write cameraPosition/Target/Fov).
  useEffect(() => {
    const applyStoredCamera = () => {
      const { cameraPosition, cameraTarget, cameraFov } = useStore.getState();
      camera.position.set(...cameraPosition);
      camera.lookAt(...cameraTarget);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = cameraFov;
        camera.updateProjectionMatrix();
      }
      if (controls && controls.target) {
        controls.target.set(...cameraTarget);
        controls.update();
      }
    };
    const unsubs = [
      useStore.subscribe((s) => s.cameraPosition, applyStoredCamera),
      useStore.subscribe((s) => s.cameraTarget, applyStoredCamera),
      useStore.subscribe((s) => s.cameraFov, applyStoredCamera),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [camera, controls]);

  return null;
}
