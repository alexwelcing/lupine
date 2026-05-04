/**
 * useXRHands — hand-tracking hook backed by the raw WebXR API.
 *
 * Returns a stable ref-shaped state for each hand that updates every frame
 * inside the XR render loop. Reading from raw `XRFrame.getJointPose` keeps us
 * decoupled from any specific @react-three/xr internals so the same code keeps
 * working across minor library upgrades.
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type HandLabel = 'left' | 'right';

export interface HandJointSnapshot {
  /** True only on frames where the device reports valid joint poses for this hand. */
  present: boolean;
  /** True when thumb-tip and index-finger-tip are within PINCH_THRESHOLD. */
  pinching: boolean;
  /** Pinch point (world space) — midpoint of thumb tip and index tip. */
  pinchPosition: THREE.Vector3;
  /** Smoothed pinch velocity (world space, m/s). Drives throwing. */
  pinchVelocity: THREE.Vector3;
  /** Wrist position (world space) — useful for "near hand" affordances. */
  wristPosition: THREE.Vector3;
}

export interface XRHandsState {
  left: React.MutableRefObject<HandJointSnapshot>;
  right: React.MutableRefObject<HandJointSnapshot>;
}

const PINCH_THRESHOLD_M = 0.025; // 2.5 cm — standard threshold across XR runtimes
const VELOCITY_SMOOTHING = 0.6;  // 0 = no smoothing, 1 = frozen

function makeSnapshot(): HandJointSnapshot {
  return {
    present: false,
    pinching: false,
    pinchPosition: new THREE.Vector3(),
    pinchVelocity: new THREE.Vector3(),
    wristPosition: new THREE.Vector3(),
  };
}

export function useXRHands(): XRHandsState {
  const { gl } = useThree();
  const left = useRef<HandJointSnapshot>(makeSnapshot());
  const right = useRef<HandJointSnapshot>(makeSnapshot());

  // Last frame's pinch position per hand (world space) for finite-difference velocity.
  const prevPinch = useRef<{ left: THREE.Vector3 | null; right: THREE.Vector3 | null }>({
    left: null,
    right: null,
  });

  // Reusable scratch — avoid allocations every frame
  const tmpMid = useRef(new THREE.Vector3());
  const tmpVel = useRef(new THREE.Vector3());

  useFrame((_state, dt, xrFrame) => {
    const session = (gl as any).xr?.getSession?.();
    const referenceSpace = (gl as any).xr?.getReferenceSpace?.();

    if (!xrFrame || !session || !referenceSpace) {
      left.current.present = false;
      right.current.present = false;
      prevPinch.current.left = null;
      prevPinch.current.right = null;
      return;
    }

    let leftSeen = false;
    let rightSeen = false;

    for (const inputSource of session.inputSources as Iterable<any>) {
      const xrHand = inputSource.hand;
      if (!xrHand) continue;
      const handedness = inputSource.handedness as HandLabel;
      if (handedness !== 'left' && handedness !== 'right') continue;

      const indexJoint = xrHand.get('index-finger-tip');
      const thumbJoint = xrHand.get('thumb-tip');
      const wristJoint = xrHand.get('wrist');
      if (!indexJoint || !thumbJoint) continue;

      const indexPose = (xrFrame as any).getJointPose?.(indexJoint, referenceSpace);
      const thumbPose = (xrFrame as any).getJointPose?.(thumbJoint, referenceSpace);
      const wristPose = wristJoint
        ? (xrFrame as any).getJointPose?.(wristJoint, referenceSpace)
        : null;
      if (!indexPose || !thumbPose) continue;

      const ip = indexPose.transform.position;
      const tp = thumbPose.transform.position;

      const dx = ip.x - tp.x;
      const dy = ip.y - tp.y;
      const dz = ip.z - tp.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      tmpMid.current.set(
        (ip.x + tp.x) * 0.5,
        (ip.y + tp.y) * 0.5,
        (ip.z + tp.z) * 0.5,
      );

      const snap = handedness === 'left' ? left.current : right.current;
      const prev = handedness === 'left' ? prevPinch.current.left : prevPinch.current.right;

      // Smoothed velocity: blend old velocity with new instantaneous estimate.
      if (prev && dt > 1e-4) {
        tmpVel.current.copy(tmpMid.current).sub(prev).divideScalar(dt);
        snap.pinchVelocity.lerp(tmpVel.current, 1 - VELOCITY_SMOOTHING);
      } else {
        snap.pinchVelocity.set(0, 0, 0);
      }

      snap.present = true;
      snap.pinching = dist < PINCH_THRESHOLD_M;
      snap.pinchPosition.copy(tmpMid.current);
      if (wristPose) {
        const wp = wristPose.transform.position;
        snap.wristPosition.set(wp.x, wp.y, wp.z);
      }

      if (handedness === 'left') {
        if (!prevPinch.current.left) prevPinch.current.left = new THREE.Vector3();
        prevPinch.current.left.copy(tmpMid.current);
        leftSeen = true;
      } else {
        if (!prevPinch.current.right) prevPinch.current.right = new THREE.Vector3();
        prevPinch.current.right.copy(tmpMid.current);
        rightSeen = true;
      }
    }

    if (!leftSeen) {
      left.current.present = false;
      left.current.pinching = false;
      prevPinch.current.left = null;
    }
    if (!rightSeen) {
      right.current.present = false;
      right.current.pinching = false;
      prevPinch.current.right = null;
    }
  });

  return { left, right };
}
