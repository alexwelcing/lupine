// Shared, mutable singletons that lock every pane together: one clock (so all
// panes step in time) and one orbit (so dragging any pane turns all of them).
// The 3D reads these refs directly in useFrame (no React re-render at 60fps);
// the UI mirrors a throttled copy for the transport readout.

import * as THREE from "three";

export interface ClockState {
  step: number; // current step (0..maxStep)
  maxStep: number;
  playing: boolean;
  speed: number; // steps per second multiplier
}

export interface OrbitState {
  azimuth: number;
  polar: number;
  distance: number;
  target: THREE.Vector3;
  autoRotate: boolean;
  dragging: boolean;
}

export const clock: ClockState = { step: 0, maxStep: 1, playing: true, speed: 1 };

export const orbit: OrbitState = {
  azimuth: 0.7,
  polar: 1.15,
  distance: 20,
  target: new THREE.Vector3(0, 0, 0),
  autoRotate: true,
  dragging: false,
};

/** Normalized timeline position in [0,1]. */
export function timeNorm(): number {
  return clock.maxStep > 0 ? clock.step / clock.maxStep : 0;
}

const POLAR_MIN = 0.25;
const POLAR_MAX = Math.PI - 0.25;
const DIST_MIN = 10;
const DIST_MAX = 60;

export function dragOrbit(dx: number, dy: number): void {
  orbit.azimuth -= dx * 0.005;
  orbit.polar = Math.min(POLAR_MAX, Math.max(POLAR_MIN, orbit.polar - dy * 0.005));
}

export function zoomOrbit(deltaY: number): void {
  orbit.distance = Math.min(DIST_MAX, Math.max(DIST_MIN, orbit.distance * (1 + deltaY * 0.001)));
}

/** Position a camera from the shared orbit (called per pane, per frame). */
export function applyOrbit(camera: THREE.Camera): void {
  const sp = Math.sin(orbit.polar);
  const { target, distance, azimuth, polar } = orbit;
  camera.position.set(
    target.x + distance * sp * Math.cos(azimuth),
    target.y + distance * Math.cos(polar),
    target.z + distance * sp * Math.sin(azimuth),
  );
  camera.lookAt(target);
}
