/**
 * XRMoleculeInteraction
 * ---------------------
 *
 * Wraps the molecule mesh and provides three layers of interaction:
 *
 *  1. **Pointer / mouse drag** (legacy) — used in 2D viewport and as a fallback
 *     when the XR runtime forwards controller rays as pointer events.
 *
 *  2. **Hand tracking pinch-grab** — when an XR session has hand tracking
 *     enabled, either hand can pinch (thumb tip + index tip < 2.5 cm) within
 *     reach of the model to grab it. While pinched, the model follows the
 *     hand. Releasing the pinch hands control back to physics.
 *
 *  3. **Throw physics** — once released, the molecule retains the hand's
 *     velocity, falls under gravity, and bounces off a virtual floor at y=0
 *     (with damping) so it settles instead of clipping through the ground.
 *
 * The visual scaling and the AR entry animation live in `SpatialAnchor` —
 * this component only mutates a single inner group's transform.
 */

import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useXR } from '@react-three/xr';
import { useXRHands } from './useXRHands';

// Tunables — feel free to tweak. These were chosen to feel "Quest-grade":
// reachable without lunging, throw weight similar to a tennis ball, soft
// floor bounce that always comes to rest.
const GRAB_RADIUS_M = 0.5;     // a hand within 50 cm of model center can grab
const GRAVITY_M_S2  = 6.5;     // softened gravity — a real-feeling 9.8 makes it crash
const RESTITUTION   = 0.45;    // floor bounce energy retained per hit
const AIR_DAMPING   = 0.995;   // ~0.5% velocity bleed per frame in flight
const FLOOR_FRICTION = 0.78;   // horizontal friction on contact
const FLOOR_Y_M     = 0.0;     // world-y of the virtual floor
const MIN_REST_VEL  = 0.06;    // below this, freeze to silence jitter
const THROW_SCALE   = 1.15;    // small momentum boost so a flick feels alive
const HOVER_SCALE   = 1.06;    // visual squish when grabbed/hovered

export function XRMoleculeInteraction({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);

  // Mode comes from @react-three/xr; we only enable hand grab + throw in immersive sessions.
  const mode = useXR(state => state.mode);
  const isImmersive = mode === 'immersive-ar' || mode === 'immersive-vr';

  const hands = useXRHands();

  // Hand-grab state
  const grabbedBy = useRef<'left' | 'right' | null>(null);
  const grabOffset = useRef(new THREE.Vector3()); // world: model - hand at grab moment
  const velocity = useRef(new THREE.Vector3());

  // Reusable scratch
  const worldPos = useRef(new THREE.Vector3());
  const desiredWorld = useRef(new THREE.Vector3());

  // Pointer-drag fallback state (mouse + controller-ray pointer events)
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragPlane = useRef(new THREE.Plane());
  const lastPoint = useRef(new THREE.Vector3());
  const { camera } = useThree();

  // ─── Pointer fallback handlers (unchanged behavior from prior version) ──
  const handlePointerDown = (e: any) => {
    if (isImmersive) return; // hand tracking owns interaction in XR
    e.stopPropagation();
    setIsDragging(true);
    const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
    dragPlane.current.setFromNormalAndCoplanarPoint(normal, e.point);
    const ray = e.ray as THREE.Ray;
    const intersection = new THREE.Vector3();
    const hit = ray.intersectPlane(dragPlane.current, intersection);
    if (hit) lastPoint.current.copy(hit);
    else lastPoint.current.copy(e.point);
    if (e.target?.setPointerCapture) {
      try { e.target.setPointerCapture(e.pointerId); } catch {}
    }
  };

  const handlePointerUp = (e: any) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (e.target?.releasePointerCapture) {
      try { e.target.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  const handlePointerMove = (e: any) => {
    if (isImmersive) return;
    if (!isDragging || !group.current) return;
    e.stopPropagation();
    const ray = e.ray as THREE.Ray;
    const intersection = new THREE.Vector3();
    const hit = ray.intersectPlane(dragPlane.current, intersection);
    if (hit) {
      const dx = intersection.x - lastPoint.current.x;
      const dy = intersection.y - lastPoint.current.y;
      group.current.rotation.y += dx * 5;
      group.current.rotation.x -= dy * 5;
      lastPoint.current.copy(intersection);
    }
  };

  const handleWheel = (e: any) => {
    if (isImmersive) return;
    e.stopPropagation();
    if (group.current) {
      const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
      group.current.scale.multiplyScalar(scaleDelta);
    }
  };

  // ─── Per-frame: hand-grab + throw physics in immersive mode ─────────────
  useFrame((_state, dt) => {
    const g = group.current;
    if (!g) return;

    if (!isImmersive) {
      // 2D fallback: gentle hover/active visual feedback.
      const t = isDragging ? HOVER_SCALE : 1.0;
      g.scale.lerp(new THREE.Vector3(t, t, t), 0.1);
      return;
    }

    const left = hands.left.current;
    const right = hands.right.current;

    // 1) GRAB / RELEASE detection
    if (grabbedBy.current === null) {
      // Look for a hand pinching within reach
      const candidates: Array<['left' | 'right', typeof left]> = [];
      if (left.present && left.pinching) candidates.push(['left', left]);
      if (right.present && right.pinching) candidates.push(['right', right]);
      if (candidates.length > 0) {
        g.getWorldPosition(worldPos.current);
        // Pick the closest pinching hand within GRAB_RADIUS_M
        let bestLabel: 'left' | 'right' | null = null;
        let bestDist = GRAB_RADIUS_M;
        let bestSnap: typeof left | null = null;
        for (const [label, snap] of candidates) {
          const d = snap.pinchPosition.distanceTo(worldPos.current);
          if (d < bestDist) {
            bestDist = d;
            bestLabel = label;
            bestSnap = snap;
          }
        }
        if (bestLabel && bestSnap) {
          grabbedBy.current = bestLabel;
          grabOffset.current.copy(worldPos.current).sub(bestSnap.pinchPosition);
          velocity.current.set(0, 0, 0);
        }
      }
    } else {
      const snap = grabbedBy.current === 'left' ? left : right;
      const stillHolding = snap.present && snap.pinching;
      if (!stillHolding) {
        // RELEASE — transfer hand velocity to the model
        velocity.current.copy(snap.pinchVelocity).multiplyScalar(THROW_SCALE);
        grabbedBy.current = null;
      } else {
        // Track hand: world-space target = pinch + grabOffset
        desiredWorld.current.copy(snap.pinchPosition).add(grabOffset.current);
        const parent = g.parent;
        if (parent) {
          parent.updateWorldMatrix(true, false);
          // Convert desired world position into our parent's local space
          const local = desiredWorld.current.clone();
          parent.worldToLocal(local);
          g.position.copy(local);
        } else {
          g.position.copy(desiredWorld.current);
        }
        velocity.current.set(0, 0, 0);
      }
    }

    // 2) PHYSICS — only when not held
    if (grabbedBy.current === null) {
      // Apply gravity
      velocity.current.y -= GRAVITY_M_S2 * dt;

      // Integrate. Parent is translation-only (SpatialAnchor) so adding
      // world-space velocity to local position is a valid simplification.
      g.position.x += velocity.current.x * dt;
      g.position.y += velocity.current.y * dt;
      g.position.z += velocity.current.z * dt;

      // Air drag
      velocity.current.multiplyScalar(AIR_DAMPING);

      // Floor collision in WORLD space
      g.getWorldPosition(worldPos.current);
      if (worldPos.current.y < FLOOR_Y_M) {
        const correction = FLOOR_Y_M - worldPos.current.y;
        g.position.y += correction;
        if (velocity.current.y < 0) {
          velocity.current.y = -velocity.current.y * RESTITUTION;
        }
        velocity.current.x *= FLOOR_FRICTION;
        velocity.current.z *= FLOOR_FRICTION;
        if (velocity.current.length() < MIN_REST_VEL) {
          velocity.current.set(0, 0, 0);
        }
      }
    }

    // 3) Visual feedback — gentle scale pulse when grabbed
    const grabbed = grabbedBy.current !== null;
    const targetMult = grabbed ? HOVER_SCALE : 1.0;
    const cur = g.scale.x;
    const next = cur + (targetMult - cur) * Math.min(1, dt * 12);
    g.scale.setScalar(next);
  });

  return (
    <group
      ref={group}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOut={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerOver={(e: any) => { e.stopPropagation(); setHovered(true); }}
      onPointerLeave={(e: any) => { e.stopPropagation(); setHovered(false); }}
      onWheel={handleWheel}
    >
      {children}
    </group>
  );
}
