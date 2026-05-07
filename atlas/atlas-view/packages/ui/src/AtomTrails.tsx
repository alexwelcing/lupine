/**
 * <AtomTrails /> — Fading worldline behind selected & annotated atoms.
 *
 * Per-atom rolling history of recent positions, rendered as a fading line
 * trail that decays toward transparent at the oldest sample. Pushes a new
 * sample each time the playback frame index changes — not each render —
 * so trail length is in *simulation time*, not wall-clock.
 *
 * Scoped intentionally: only atoms the user has either selected or
 * annotated get trails. Bounds memory at 1M-atom scenes (typically ≤ 20
 * tracked atoms × 60 history slots = 1200 vec3 = trivial). Diffusion and
 * dynamics studies become legible — atoms gain "memory" the eye can read.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';
import { TYPE_COLORS, DEFAULT_TYPE_COLOR } from '@atlas/scene';

interface AtomTrailsProps {
  frame: Frame;
  /** Stable identity of the currently-rendered playback frame. The
   *  trail samples one new point per change of this value. Use the
   *  trajectory frame index, not the timer. */
  frameKey: number;
  /** Atoms to follow. Typically selectedAtoms ∪ annotation.atomIndices. */
  atomIndices: number[];
  /** Max history length per atom (samples). Default 60 ≈ 1s at 60fps
   *  playback or longer at slower playback. */
  maxLength?: number;
  /** Toggle the entire layer off without unmounting. */
  visible?: boolean;
}

interface AtomHistory {
  /** Positions, oldest first. Length grows up to maxLength then evicts head. */
  positions: THREE.Vector3[];
  /** Last frameKey we sampled — guards against double-push within a frame. */
  lastFrameKey: number;
}

export function AtomTrails({
  frame,
  frameKey,
  atomIndices,
  maxLength = 60,
  visible = true,
}: AtomTrailsProps) {
  const historyRef = useRef<Map<number, AtomHistory>>(new Map());

  // Drop tracked atoms that are no longer in the watch set so memory
  // doesn't grow as the user clicks around.
  useMemo(() => {
    const wantSet = new Set(atomIndices);
    for (const key of historyRef.current.keys()) {
      if (!wantSet.has(key)) historyRef.current.delete(key);
    }
  }, [atomIndices]);

  useFrame(() => {
    if (!visible) return;
    for (const idx of atomIndices) {
      if (idx < 0 || idx >= frame.natoms) continue;
      let h = historyRef.current.get(idx);
      if (!h) {
        h = { positions: [], lastFrameKey: -1 };
        historyRef.current.set(idx, h);
      }
      // Only sample on a real frame change. Avoids 60 dupes/sec while paused.
      if (h.lastFrameKey === frameKey) continue;
      h.lastFrameKey = frameKey;
      const p = new THREE.Vector3(
        frame.positions[idx * 3],
        frame.positions[idx * 3 + 1],
        frame.positions[idx * 3 + 2],
      );
      h.positions.push(p);
      while (h.positions.length > maxLength) h.positions.shift();
    }
  });

  if (!visible) return null;

  return (
    <group>
      {atomIndices.map((idx) => (
        <TrailLine
          key={idx}
          atomIndex={idx}
          frame={frame}
          historyRef={historyRef}
          maxLength={maxLength}
        />
      ))}
    </group>
  );
}

function TrailLine({
  atomIndex,
  frame,
  historyRef,
  maxLength,
}: {
  atomIndex: number;
  frame: Frame;
  historyRef: React.MutableRefObject<Map<number, AtomHistory>>;
  maxLength: number;
}) {
  const lineRef = useRef<THREE.Line>(null);

  // Color per atom — use the existing element color so trails match the
  // sphere they came from (visually obvious "this trail belongs to that atom").
  const baseColor = useMemo(() => {
    if (atomIndex < 0 || atomIndex >= frame.natoms) return new THREE.Color(...DEFAULT_TYPE_COLOR);
    const t = frame.types[atomIndex];
    const c = (TYPE_COLORS as any)[t] ?? DEFAULT_TYPE_COLOR;
    return new THREE.Color(c[0], c[1], c[2]);
  }, [atomIndex, frame.natoms, frame.types]);

  // Pre-allocate position + color buffers sized to max history. We mutate
  // them in-place each frame and adjust the draw range to match the
  // current history length — avoids reallocating BufferAttributes when
  // history grows. Float32 RGB (no alpha): the fade is baked by ramping
  // brightness toward zero on the oldest samples.
  const posBuf = useMemo(() => new Float32Array(maxLength * 3), [maxLength]);
  const colBuf = useMemo(() => new Float32Array(maxLength * 3), [maxLength]);
  const positionAttr = useMemo(() => new THREE.BufferAttribute(posBuf, 3), [posBuf]);
  const colorAttr = useMemo(() => new THREE.BufferAttribute(colBuf, 3), [colBuf]);

  useFrame(() => {
    const h = historyRef.current.get(atomIndex);
    const line = lineRef.current;
    if (!h || !line) return;
    const pts = h.positions;
    if (pts.length < 2) {
      line.visible = false;
      return;
    }
    line.visible = true;

    for (let i = 0; i < pts.length; i++) {
      posBuf[i * 3 + 0] = pts[i].x;
      posBuf[i * 3 + 1] = pts[i].y;
      posBuf[i * 3 + 2] = pts[i].z;
      // Newest sample = full color; oldest fades to ~5%. LineBasicMaterial
      // doesn't honor per-vertex alpha so we ramp color toward black.
      const t = i / Math.max(1, pts.length - 1);
      const fade = 0.05 + 0.95 * t;
      colBuf[i * 3 + 0] = baseColor.r * fade;
      colBuf[i * 3 + 1] = baseColor.g * fade;
      colBuf[i * 3 + 2] = baseColor.b * fade;
    }
    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    const geo = line.geometry as THREE.BufferGeometry;
    geo.setDrawRange(0, pts.length);
  });

  return (
    <line ref={lineRef as any}>
      <bufferGeometry attach="geometry">
        <primitive object={positionAttr} attach="attributes-position" />
        <primitive object={colorAttr} attach="attributes-color" />
      </bufferGeometry>
      <lineBasicMaterial
        attach="material"
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        toneMapped={false}
      />
    </line>
  );
}
