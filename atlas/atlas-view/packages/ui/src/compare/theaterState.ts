// Shared, mutable singletons that lock every pane together: one clock (so all
// panes step in time) and one orbit (so dragging any pane turns all of them).
// The 3D reads these in useFrame; the page mirrors a throttled copy for the HUD.

import * as THREE from 'three';

export interface ClockState {
  t: number; // normalized timeline position [0,1]
  playing: boolean;
  speed: number;
}

export interface OrbitState {
  azimuth: number;
  polar: number;
  distance: number;
  target: THREE.Vector3;
  autoRotate: boolean;
  dragging: boolean;
}

export const clock: ClockState = { t: 0, playing: true, speed: 1 };

export const orbit: OrbitState = {
  azimuth: 0.7,
  polar: 1.15,
  distance: 22,
  target: new THREE.Vector3(0, 0, 0),
  autoRotate: true,
  dragging: false,
};

const POLAR_MIN = 0.25;
const POLAR_MAX = Math.PI - 0.25;
const DIST_MIN = 10;
const DIST_MAX = 64;

export function dragOrbit(dx: number, dy: number): void {
  orbit.azimuth -= dx * 0.005;
  orbit.polar = Math.min(POLAR_MAX, Math.max(POLAR_MIN, orbit.polar - dy * 0.005));
}

export function zoomOrbit(deltaY: number): void {
  orbit.distance = Math.min(DIST_MAX, Math.max(DIST_MIN, orbit.distance * (1 + deltaY * 0.001)));
}

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
