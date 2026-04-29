/**
 * Flythrough — Keyframe-based camera path system
 *
 * After Effects-style keyframe sequencer: up to 5 camera stops with
 * easing curves between them. Each keyframe captures camera position,
 * camera target, and optional visualization settings overrides.
 *
 * Supports:
 *   - 6 easing presets (linear, ease-in, ease-out, ease-in-out, slow-middle, fast-middle)
 *   - Compact serialization for share links
 *   - Cubic Bézier interpolation with configurable tension
 *   - Frame-accurate sampling for video export
 */

// ─── Types ──────────────────────────────────────────────────────────

export type EasingType =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'slow-middle'
  | 'fast-middle';

/** A single keyframe stop on the camera path */
export interface FlythroughKeyframe {
  /** Camera world position */
  position: [number, number, number];
  /** Camera look-at target */
  target: [number, number, number];
  /** Camera FOV override (null = inherit current) */
  fov: number | null;
  /** Duration of the transition FROM this keyframe TO the next (seconds) */
  transitionDuration: number;
  /** Easing curve for the transition TO the next keyframe */
  easing: EasingType;
  /** Optional hold time at this keyframe before transitioning (seconds) */
  holdDuration: number;
  /** Optional label for UI display */
  label: string;
  /**
   * Optional trajectory frame index pinned to this keyframe. When two adjacent
   * keyframes both have anchors, movie sync interpolates frames between them
   * (so "Stop 1 = frame 0, Stop 3 = frame 50" plays as a directed shot).
   */
  frameAnchor?: number;
}

/** Full flythrough sequence */
export interface FlythroughSequence {
  /** 2–5 keyframes */
  keyframes: FlythroughKeyframe[];
  /** Whether the path loops back to the first keyframe */
  loop: boolean;
}

// ─── Easing Functions ───────────────────────────────────────────────

/**
 * Standard easing functions. All take t ∈ [0,1] and return [0,1].
 */
export const EASING_FUNCTIONS: Record<EasingType, (t: number) => number> = {
  'linear':       (t) => t,
  'ease-in':      (t) => t * t * t,
  'ease-out':     (t) => 1 - Math.pow(1 - t, 3),
  'ease-in-out':  (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  'slow-middle':  (t) => {
    // Slow through the middle, fast at edges (inverted ease-in-out)
    if (t < 0.5) return 0.5 * (1 - Math.pow(1 - 2 * t, 3));
    return 0.5 + 0.5 * Math.pow(2 * t - 1, 3);
  },
  'fast-middle':  (t) => {
    // Fast through the middle, slow at edges (same as ease-in-out but more aggressive)
    const p = 4;
    if (t < 0.5) return Math.pow(2 * t, p) / 2;
    return 1 - Math.pow(2 - 2 * t, p) / 2;
  },
};

export const EASING_LABELS: Record<EasingType, string> = {
  'linear':       'Linear',
  'ease-in':      'Ease In (Slow Start)',
  'ease-out':     'Ease Out (Slow End)',
  'ease-in-out':  'Ease In-Out',
  'slow-middle':  'Slow Middle',
  'fast-middle':  'Fast Middle',
};

// ─── Interpolation ──────────────────────────────────────────────────

/** Lerp a 3-component vector */
function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** Catmull-Rom spline interpolation for smooth paths through multiple points */
function catmullRom(
  p0: [number, number, number],
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number],
  t: number,
  tension: number = 0.5,
): [number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  const result: [number, number, number] = [0, 0, 0];

  for (let i = 0; i < 3; i++) {
    const a = -tension * p0[i] + (2 - tension) * p1[i] + (tension - 2) * p2[i] + tension * p3[i];
    const b = 2 * tension * p0[i] + (tension - 3) * p1[i] + (3 - 2 * tension) * p2[i] - tension * p3[i];
    const c = -tension * p0[i] + tension * p2[i];
    const d = p1[i];

    result[i] = a * t3 + b * t2 + c * t + d;
  }

  return result;
}

/**
 * Sample the flythrough at a given global time (seconds).
 *
 * Returns the interpolated camera state, or null if time exceeds sequence.
 */
export interface FlythroughSample {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  /** Which segment (0-indexed) we're currently in */
  segment: number;
  /** Progress within the current segment [0, 1] */
  segmentProgress: number;
  /** Overall progress [0, 1] */
  totalProgress: number;
}

/** Calculate total duration of a flythrough sequence */
export function getSequenceDuration(seq: FlythroughSequence): number {
  let total = 0;
  for (let i = 0; i < seq.keyframes.length; i++) {
    const kf = seq.keyframes[i];
    total += kf.holdDuration;
    // Transition to next (no transition after last unless looping)
    if (i < seq.keyframes.length - 1 || seq.loop) {
      total += kf.transitionDuration;
    }
  }
  return total;
}

/**
 * Sample the camera path at a specific time.
 * Uses Catmull-Rom splines for smooth position curves and
 * linear interpolation for target/fov.
 */
export function sampleFlythrough(
  seq: FlythroughSequence,
  time: number,
  defaultFov: number = 50,
): FlythroughSample | null {
  const { keyframes, loop } = seq;
  if (keyframes.length < 2) return null;

  const totalDuration = getSequenceDuration(seq);
  if (totalDuration <= 0) return null;

  // Wrap or clamp time
  let t = loop ? ((time % totalDuration) + totalDuration) % totalDuration : Math.min(time, totalDuration);

  // Walk through segments to find which one we're in
  let elapsed = 0;
  const n = keyframes.length;

  for (let i = 0; i < n; i++) {
    const kf = keyframes[i];
    const isLast = i === n - 1;

    // Hold phase
    if (t < elapsed + kf.holdDuration) {
      return {
        position: [...kf.position],
        target: [...kf.target],
        fov: kf.fov ?? defaultFov,
        segment: i,
        segmentProgress: 0,
        totalProgress: t / totalDuration,
      };
    }
    elapsed += kf.holdDuration;

    // Transition phase (to next keyframe)
    if (!isLast || loop) {
      const nextIdx = (i + 1) % n;
      if (t < elapsed + kf.transitionDuration) {
        const localT = (t - elapsed) / kf.transitionDuration;
        const easedT = EASING_FUNCTIONS[kf.easing](localT);

        // Catmull-Rom needs 4 control points: prev, current, next, nextNext
        const prevIdx = (i - 1 + n) % n;
        const nextNextIdx = (i + 2) % n;

        // For non-looping, clamp ghost points
        const p0 = (i === 0 && !loop) ? kf.position : keyframes[prevIdx].position;
        const p1 = kf.position;
        const p2 = keyframes[nextIdx].position;
        const p3 = (nextIdx === n - 1 && !loop) ? p2 : keyframes[nextNextIdx].position;

        const position = catmullRom(p0, p1, p2, p3, easedT);
        const target = lerp3(kf.target, keyframes[nextIdx].target, easedT);
        const fov1 = kf.fov ?? defaultFov;
        const fov2 = keyframes[nextIdx].fov ?? defaultFov;

        return {
          position,
          target,
          fov: fov1 + (fov2 - fov1) * easedT,
          segment: i,
          segmentProgress: localT,
          totalProgress: t / totalDuration,
        };
      }
      elapsed += kf.transitionDuration;
    }
  }

  // End: park at last keyframe
  const last = keyframes[n - 1];
  return {
    position: [...last.position],
    target: [...last.target],
    fov: last.fov ?? defaultFov,
    segment: n - 1,
    segmentProgress: 1,
    totalProgress: 1,
  };
}

// ─── Serialization (compact share links) ─────────────────────────────

/** Short easing codes for URL encoding */
const EASING_CODES: Record<EasingType, string> = {
  'linear': 'L',
  'ease-in': 'I',
  'ease-out': 'O',
  'ease-in-out': 'IO',
  'slow-middle': 'SM',
  'fast-middle': 'FM',
};

const CODE_TO_EASING: Record<string, EasingType> = Object.fromEntries(
  Object.entries(EASING_CODES).map(([k, v]) => [v, k as EasingType])
);

/** Round to 1 decimal place for compact encoding */
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Encode a flythrough to a compact string for URL sharing */
export function encodeFlythrough(seq: FlythroughSequence): string {
  const compact = {
    l: seq.loop ? 1 : 0,
    k: seq.keyframes.map(kf => ({
      p: kf.position.map(r1),
      t: kf.target.map(r1),
      f: kf.fov !== null ? r1(kf.fov) : undefined,
      d: r1(kf.transitionDuration),
      e: EASING_CODES[kf.easing],
      h: kf.holdDuration > 0 ? r1(kf.holdDuration) : undefined,
      a: typeof kf.frameAnchor === 'number' ? Math.round(kf.frameAnchor) : undefined,
    })),
  };

  const json = JSON.stringify(compact);
  // URL-safe base64
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a flythrough from a compact URL string */
export function decodeFlythrough(encoded: string): FlythroughSequence | null {
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';

    const compact = JSON.parse(atob(b64));
    return {
      loop: compact.l === 1,
      keyframes: compact.k.map((k: any, i: number) => ({
        position: k.p as [number, number, number],
        target: k.t as [number, number, number],
        fov: k.f ?? null,
        transitionDuration: k.d ?? 2,
        easing: CODE_TO_EASING[k.e] ?? 'ease-in-out',
        holdDuration: k.h ?? 0,
        label: `Stop ${i + 1}`,
        frameAnchor: typeof k.a === 'number' ? k.a : undefined,
      })),
    };
  } catch {
    console.warn('Failed to decode flythrough');
    return null;
  }
}

// ─── Default Factory ─────────────────────────────────────────────────

/** Create a default keyframe from the current camera state */
export function createKeyframe(
  position: [number, number, number],
  target: [number, number, number],
  fov: number | null = null,
  label?: string,
): FlythroughKeyframe {
  return {
    position: [...position],
    target: [...target],
    fov,
    transitionDuration: 2.0,
    easing: 'ease-in-out',
    holdDuration: 0.5,
    label: label ?? 'Stop',
  };
}

/** Create a starter sequence with 2 keyframes from current + opposite angle */
export function createDefaultSequence(
  position: [number, number, number],
  target: [number, number, number],
): FlythroughSequence {
  // Second keyframe: orbit 90° around the target
  const dx = position[0] - target[0];
  const dz = position[2] - target[2];
  const pos2: [number, number, number] = [
    target[0] - dz,
    position[1],
    target[2] + dx,
  ];

  return {
    loop: false,
    keyframes: [
      createKeyframe(position, target, null, 'Start'),
      createKeyframe(pos2, target, null, 'End'),
    ],
  };
}
