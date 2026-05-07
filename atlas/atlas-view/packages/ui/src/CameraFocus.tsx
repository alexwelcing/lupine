/**
 * <CameraFocus /> — Smoothly dollies the camera toward a clicked atom.
 *
 * Subscribes to the store's selectedAtoms; when exactly one atom is newly
 * selected, lerps OrbitControls.target + camera.position toward that
 * atom over a few frames. Never pushes the camera *out* — if the user is
 * already close, we just re-center the target. Stops once close enough.
 *
 * Keeps the existing OrbitControls (which the rest of App.tsx wires up
 * for camera persistence, flythrough, etc.) — no replacement needed.
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';
import { useStore } from './store';

const FOCUS_LERP = 0.12;          // target lerp factor per frame (smooth approach)
const POSITION_LERP_SCALE = 0.5;  // camera moves more gently than the target
const MAX_FOCUS_DISTANCE = 12;    // Å — typical "show me this atom + neighbors" framing
const STOP_EPSILON = 0.05;        // stop animation when within this Å of target

interface CameraFocusProps {
  frame: Frame;
  /** When false (e.g. flythrough preview owns the camera), do nothing. */
  enabled?: boolean;
}

export function CameraFocus({ frame, enabled = true }: CameraFocusProps) {
  const selectedAtoms = useStore(s => s.selectedAtoms);
  const { camera, controls } = useThree();

  const targetRef = useRef<THREE.Vector3 | null>(null);
  const prevIdxRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || selectedAtoms.length !== 1) {
      targetRef.current = null;
      prevIdxRef.current = null;
      return;
    }
    const idx = selectedAtoms[0];
    if (idx === prevIdxRef.current) return;
    if (idx < 0 || idx >= frame.natoms) return;
    prevIdxRef.current = idx;
    targetRef.current = new THREE.Vector3(
      frame.positions[idx * 3],
      frame.positions[idx * 3 + 1],
      frame.positions[idx * 3 + 2],
    );
  }, [enabled, selectedAtoms, frame]);

  useFrame(() => {
    if (!targetRef.current || !controls) return;
    const target = targetRef.current;
    const ctrlAny = controls as any;
    if (!ctrlAny.target) return;

    // Lerp the orbit target toward the atom — this is the bulk of "frame
    // this atom" work; OrbitControls will rotate the camera around it.
    ctrlAny.target.lerp(target, FOCUS_LERP);

    // Optionally pull the camera *closer* to the new target if it's far.
    // Never push out: if the user is already nicely framed, only re-center.
    const currentDist = camera.position.distanceTo(ctrlAny.target);
    if (currentDist > MAX_FOCUS_DISTANCE) {
      const offsetDir = camera.position.clone().sub(ctrlAny.target).normalize();
      const desiredPos = ctrlAny.target.clone().add(
        offsetDir.multiplyScalar(MAX_FOCUS_DISTANCE),
      );
      camera.position.lerp(desiredPos, FOCUS_LERP * POSITION_LERP_SCALE);
    }

    ctrlAny.update?.();

    // Snap-to-stop once we're close enough — avoids endless tiny-delta updates.
    if (ctrlAny.target.distanceTo(target) < STOP_EPSILON) {
      ctrlAny.target.copy(target);
      targetRef.current = null;
    }
  });

  return null;
}
