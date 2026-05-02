/**
 * useSmoothFramePlayback — Smooth interpolated playback between MD frames
 * 
 * Provides interpolated frame positions for butter-smooth playback
 * even when MD data is sparse (e.g., 1 frame every 1000 steps).
 * 
 * Features:
 * - Linear interpolation between MD frames
 * - Display-synced animation (requestAnimationFrame)
 * - Variable playback speeds
 * - Loop/bounce modes
 * - Statistics reporting
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import type { Frame } from '@atlas/core/types';

interface SmoothPlaybackOptions {
  /** Array of MD frames */
  frames: Frame[];
  /** Initial playback speed (1.0 = real-time) */
  speed?: number;
  /** Target display rate (fps) */
  targetFPS?: number;
  /** MD source frame rate (fps) - default 30 */
  mdFrameRate?: number;
  /** Playback mode */
  loopMode?: 'loop' | 'bounce' | 'once';
  /** Called with interpolated frame data */
  onFrame: (state: InterpolatedFrameState) => void;
  /** Optional stats callback */
  onStats?: (stats: PlaybackStats) => void;
}

export interface InterpolatedFrameState {
  /** Current MD frame index */
  frameIndex: number;
  /** Next MD frame index (for interpolation) */
  nextFrameIndex: number;
  /** Interpolation factor: 0.0 = current, 1.0 = next */
  interpolationFactor: number;
  /** Whether we're currently interpolating (vs on exact frame) */
  isInterpolating: boolean;
  /** Current effective frame number (can be fractional) */
  effectiveFrame: number;
}

export interface PlaybackStats {
  /** Actual playback FPS */
  actualFPS: number;
  /** Number of MD frames advanced */
  framesAdvanced: number;
  /** Time spent in interpolation (ms) */
  interpolationTime: number;
}

export function useSmoothFramePlayback(
  isPlaying: boolean,
  options: SmoothPlaybackOptions
) {
  const {
    frames,
    speed = 1.0,
    targetFPS = 60,
    loopMode = 'loop',
    onFrame,
    onStats,
  } = options;

  // Playback state — use ref for hot path, state only for UI sync
  const stateRef = useRef<InterpolatedFrameState>({
    frameIndex: 0,
    nextFrameIndex: 1,
    interpolationFactor: 0,
    isInterpolating: false,
    effectiveFrame: 0,
  });
  const [currentState, setCurrentState] = useState<InterpolatedFrameState>(stateRef.current);

  // RAF refs
  const rafIdRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const accumulatorRef = useRef(0);

  // Stats refs
  const frameCountRef = useRef(0);
  const lastStatsTimeRef = useRef(0);
  const totalInterpolationTimeRef = useRef(0);
  // PERF: Throttle React state sync to ~15fps to avoid 120 re-renders/sec
  const lastUISyncRef = useRef(0);

  // Frame timing based on MD data
  // Assume frames are evenly spaced in simulation time
  const frameInterval = 1000 / targetFPS; // ms per display frame
  const mdFrameTime = 1000 / (options.mdFrameRate ?? 30); // ms per MD frame

  const loop = useCallback((time: number) => {
    if (lastTimeRef.current === undefined) {
      lastTimeRef.current = time;
    }

    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Fractional frames to advance based on elapsed wall-time, speed, and desired target MD framerate
    const effectiveDeltaFrames = (delta * speed) / mdFrameTime;
    
    if (effectiveDeltaFrames > 0) {
      const start = performance.now();

      // PERF: Update ref directly — no React setState in the hot loop
      const prev = stateRef.current;
      let newEffectiveFrame = prev.effectiveFrame + effectiveDeltaFrames;
      const totalFrames = frames.length;

      // Handle loop modes
      if (newEffectiveFrame >= totalFrames - 1) {
        if (loopMode === 'loop') {
          newEffectiveFrame = newEffectiveFrame % (totalFrames - 1);
        } else if (loopMode === 'bounce') {
          newEffectiveFrame = totalFrames - 1;
        } else {
          newEffectiveFrame = totalFrames - 1;
        }
      }

      const frameIndex = Math.floor(newEffectiveFrame);
      const interpolationFactor = newEffectiveFrame - frameIndex;
      const nextFrameIndex = Math.min(frameIndex + 1, totalFrames - 1);

      const state: InterpolatedFrameState = {
        frameIndex,
        nextFrameIndex,
        interpolationFactor,
        isInterpolating: interpolationFactor > 0 && interpolationFactor < 1,
        effectiveFrame: newEffectiveFrame,
      };

      stateRef.current = state;
      onFrame(state);

      // PERF: Only sync React state at ~15fps for UI display (frame counter, etc.)
      if (time - lastUISyncRef.current > 66) {
        setCurrentState(state);
        lastUISyncRef.current = time;
      }

      totalInterpolationTimeRef.current += performance.now() - start;
      frameCountRef.current++;
    }

    // Stats reporting
    if (onStats && time - lastStatsTimeRef.current >= 1000) {
      const elapsed = (time - lastStatsTimeRef.current) / 1000;
      onStats({
        actualFPS: Math.round(frameCountRef.current / elapsed),
        framesAdvanced: frameCountRef.current,
        interpolationTime: totalInterpolationTimeRef.current,
      });
      frameCountRef.current = 0;
      totalInterpolationTimeRef.current = 0;
      lastStatsTimeRef.current = time;
    }

    rafIdRef.current = requestAnimationFrame(loop);
  }, [frames.length, speed, targetFPS, loopMode, onFrame, onStats]);

  // Start/stop playback
  useEffect(() => {
    if (!isPlaying || frames.length < 2) {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = undefined;
      }
      lastTimeRef.current = undefined;
      return;
    }

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isPlaying, frames.length, loop]);

  // Control functions
  const setFrame = useCallback((frameIndex: number) => {
    const clamped = Math.max(0, Math.min(frames.length - 1, frameIndex));
    const intFrame = Math.floor(clamped);
    const interp = clamped - intFrame;
    const isInterp = interp > 0 && interp < 1;
    
    const state: InterpolatedFrameState = {
      frameIndex: intFrame,
      nextFrameIndex: Math.min(intFrame + 1, frames.length - 1),
      interpolationFactor: interp,
      isInterpolating: isInterp,
      effectiveFrame: clamped,
    };
    stateRef.current = state;
    setCurrentState(state);
    onFrame(state);
  }, [frames.length, onFrame]);

  const nextFrame = useCallback(() => {
    const prev = stateRef.current;
    const newIndex = Math.min(prev.frameIndex + 1, frames.length - 1);
    const state: InterpolatedFrameState = {
      frameIndex: newIndex,
      nextFrameIndex: Math.min(newIndex + 1, frames.length - 1),
      interpolationFactor: 0,
      isInterpolating: false,
      effectiveFrame: newIndex,
    };
    stateRef.current = state;
    setCurrentState(state);
    onFrame(state);
  }, [frames.length, onFrame]);

  const prevFrame = useCallback(() => {
    const prev = stateRef.current;
    const newIndex = Math.max(prev.frameIndex - 1, 0);
    const state: InterpolatedFrameState = {
      frameIndex: newIndex,
      nextFrameIndex: Math.min(newIndex + 1, frames.length - 1),
      interpolationFactor: 0,
      isInterpolating: false,
      effectiveFrame: newIndex,
    };
    stateRef.current = state;
    setCurrentState(state);
    onFrame(state);
  }, [frames.length, onFrame]);

  return {
    currentState,
    setFrame,
    nextFrame,
    prevFrame,
  };
}

/**
 * Hook for simple frame stepping without interpolation
 * Use this when you want exact MD frames (no smoothing)
 */
export function useStepPlayback(
  isPlaying: boolean,
  options: {
    totalFrames: number;
    speed?: number;
    loopMode?: 'loop' | 'once';
    onFrame: (frameIndex: number) => void;
  }
) {
  const { totalFrames, speed = 1.0, loopMode = 'loop', onFrame } = options;
  const [frame, setFrame] = useState(0);

  const rafIdRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const accumulatorRef = useRef(0);

  const loop = useCallback((time: number) => {
    if (lastTimeRef.current === undefined) {
      lastTimeRef.current = time;
    }

    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Assume MD is 30 fps
    accumulatorRef.current += delta * speed;
    const frameInterval = 1000 / 30;

    while (accumulatorRef.current >= frameInterval) {
      setFrame(prev => {
        let next = prev + 1;
        if (next >= totalFrames) {
          next = loopMode === 'loop' ? 0 : totalFrames - 1;
        }
        onFrame(next);
        return next;
      });
      accumulatorRef.current -= frameInterval;
    }

    rafIdRef.current = requestAnimationFrame(loop);
  }, [totalFrames, speed, loopMode, onFrame]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
      }
      return;
    }

    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isPlaying, loop]);

  return {
    frame,
    setFrame: (f: number) => {
      const clamped = Math.max(0, Math.min(totalFrames - 1, f));
      setFrame(clamped);
      onFrame(clamped);
    },
  };
}
