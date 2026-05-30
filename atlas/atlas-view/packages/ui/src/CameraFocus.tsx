/**
 * <CameraFocus /> - smooth focus move for a clicked atom.
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';
import { useStore } from './store';

const TARGET_LERP = 0.14;
const CAMERA_LERP = 0.07;
const MAX_FOCUS_DISTANCE = 12;
const STOP_EPSILON = 0.04;

interface CameraFocusProps {
  frame: Frame;
  enabled?: boolean;
}

export function CameraFocus({ frame, enabled = true }: CameraFocusProps) {
  const selectedAtoms = useStore(s => s.selectedAtoms);
  const { camera, controls, invalidate } = useThree();
  const focusTargetRef = useRef<THREE.Vector3 | null>(null);
  const previousAtomRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || selectedAtoms.length !== 1) {
      focusTargetRef.current = null;
      previousAtomRef.current = null;
      return;
    }

    const atomIndex = selectedAtoms[0];
    if (atomIndex === previousAtomRef.current) return;
    if (atomIndex < 0 || atomIndex >= frame.natoms) return;

    previousAtomRef.current = atomIndex;
    focusTargetRef.current = new THREE.Vector3(
      frame.positions[atomIndex * 3],
      frame.positions[atomIndex * 3 + 1],
      frame.positions[atomIndex * 3 + 2],
    );
  }, [enabled, selectedAtoms, frame.natoms, frame.positions]);

  useFrame(() => {
    if (!focusTargetRef.current || !controls) return;

    const orbitControls = controls as any;
    const orbitTarget = orbitControls.target as THREE.Vector3 | undefined;
    if (!orbitTarget) return;

    const target = focusTargetRef.current;
    orbitTarget.lerp(target, TARGET_LERP);

    const currentDistance = camera.position.distanceTo(orbitTarget);
    if (currentDistance > MAX_FOCUS_DISTANCE) {
      const offsetDirection = camera.position.clone().sub(orbitTarget).normalize();
      const desiredPosition = orbitTarget.clone().add(offsetDirection.multiplyScalar(MAX_FOCUS_DISTANCE));
      camera.position.lerp(desiredPosition, CAMERA_LERP);
    }

    orbitControls.update?.();
    // Keep the render loop alive while focusing (frameloop is "demand" when idle).
    invalidate();

    if (orbitTarget.distanceTo(target) < STOP_EPSILON) {
      orbitTarget.copy(target);
      orbitControls.update?.();
      useStore.getState().setCameraState(
        camera.position.toArray() as [number, number, number],
        orbitTarget.toArray() as [number, number, number],
      );
      focusTargetRef.current = null;
    }
  });

  return null;
}
