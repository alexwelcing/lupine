/**
 * useTimelineDriver — single RAF loop that owns the playback clock.
 *
 * Two coupled timelines share this driver:
 *   1. Frame playthrough — advances `effectiveFrame` (and floored `frame`) in the store.
 *   2. Flythrough preview — advances `flythroughTime` and writes the camera pose
 *      to the store; the existing `CameraManager` in App.tsx applies it to the
 *      Three.js camera on the next render.
 *
 * Movie sync mode collapses both into one clock so the camera and the frames
 * move together. Without movie sync, only the active timeline runs.
 *
 * Design constraints:
 *   - The hook never holds React state; it only writes to the store. That keeps
 *     the RAF stable across parent re-renders (the previous version was killed
 *     every render by closure churn — that's the bug this rewrite fixes).
 *   - All mutable inputs live in `useStore.getState()` reads inside the loop,
 *     so the loop callback identity is constant for the lifetime of the hook.
 *   - Single source of truth: the store's `effectiveFrame` and `frame` are the
 *     only place anything reads "what frame are we on".
 */

import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import {
  getSequenceDuration,
  sampleFlythrough,
  type FlythroughSequence,
  type FlythroughSample,
} from '../flythrough';

const MD_FRAME_FPS_DEFAULT = 30; // assumed source rate of MD trajectories
const DISCRETE_DWELL_FPS = 1.5;  // small trajectories dwell on each frame so 1→2→3 reads as discrete

export function useTimelineDriver(): void {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = (time: number) => {
      const state = useStore.getState();
      const { file, playing, playbackSpeed, playbackStride, playbackMode, loopMode,
              flythrough, flythroughPreview, movieSync, cameraFov } = state;

      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const dtMs = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const flyActive = flythroughPreview && flythrough && flythrough.keyframes.length >= 2;
      const totalFrames = file?.trajectory.totalFrames ?? 0;
      const movieMode = !!flyActive && movieSync && totalFrames > 1;

      // ─── Flythrough advance (camera) ────────────────────────────────
      let flySample: FlythroughSample | null = null;
      if (flyActive) {
        const dur = getSequenceDuration(flythrough!);
        if (dur > 0) {
          let next = state.flythroughTime + (dtMs / 1000) * playbackSpeed;
          if (flythrough!.loop) {
            next = ((next % dur) + dur) % dur;
          } else if (next >= dur) {
            next = dur;
            useStore.getState().setFlythroughPreview(false);
          }
          useStore.getState().setFlythroughTime(next);
          flySample = sampleFlythrough(flythrough!, next, cameraFov);
          if (flySample) {
            useStore.getState().setCameraState(flySample.position, flySample.target);
          }
        }
      }

      // ─── Frame advance ──────────────────────────────────────────────
      // Movie mode: frame index is computed from the flythrough sample
      //             (anchor-aware if both endpoints have anchors).
      // Else if `playing`: frame index advances on its own clock.
      if (movieMode && flySample && totalFrames > 1) {
        const target = frameForFlySample(flythrough!, flySample, totalFrames);
        if (Math.abs(target - state.effectiveFrame) > 1e-4) {
          useStore.getState().setEffectiveFrame(target);
        }
      } else if (playing && totalFrames > 1) {
        const sourceFps =
          playbackMode === 'discrete' ? DISCRETE_DWELL_FPS : MD_FRAME_FPS_DEFAULT;
        const framesPerMs = (sourceFps * playbackSpeed * playbackStride) / 1000;
        let next = state.effectiveFrame + dtMs * framesPerMs;
        const max = totalFrames - 1;
        if (next >= totalFrames) {
          if (loopMode === 'loop') {
            next = ((next % totalFrames) + totalFrames) % totalFrames;
            if (next > max) next -= totalFrames; // (next % totalFrames) ∈ [0, totalFrames)
          } else {
            // 'once' (and 'bounce' until it lands) — clamp at end and stop.
            next = max;
            useStore.getState().togglePlay();
          }
        }
        // setEffectiveFrame clamps to [0, max], which is correct for
        // values just past `max` produced by floating-point drift.
        useStore.getState().setEffectiveFrame(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = null;
    };
  }, []);
}

/**
 * Map a flythrough sample to a fractional frame index. If both endpoints of the
 * current segment have a `frameAnchor`, interpolate between them with the same
 * eased segment progress the camera uses; otherwise fall back to a linear
 * mapping over total flythrough progress.
 */
function frameForFlySample(
  seq: FlythroughSequence,
  sample: FlythroughSample,
  totalFrames: number,
): number {
  const max = totalFrames - 1;
  const kfs = seq.keyframes;
  const a = kfs[sample.segment];
  const bIdx = sample.segment + 1 < kfs.length ? sample.segment + 1 : (seq.loop ? 0 : sample.segment);
  const b = kfs[bIdx];
  if (a && b && typeof a.frameAnchor === 'number' && typeof b.frameAnchor === 'number') {
    const fa = clampFrame(a.frameAnchor, max);
    const fb = clampFrame(b.frameAnchor, max);
    return fa + (fb - fa) * sample.segmentProgress;
  }
  return sample.totalProgress * max;
}

function clampFrame(v: number, max: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(max, v));
}

// ─── Backward-compatible exports ────────────────────────────────────────
// Older imports referenced `useSmoothFramePlayback` and `InterpolatedFrameState`.
// These exist now only so consumers can keep the same import names.

export interface InterpolatedFrameState {
  frameIndex: number;
  nextFrameIndex: number;
  interpolationFactor: number;
  isInterpolating: boolean;
  effectiveFrame: number;
}

/** Legacy alias — the driver no longer takes per-call options. */
export function useSmoothFramePlayback(): void {
  useTimelineDriver();
}
