/**
 * useRAFPlayback — Smooth playback using requestAnimationFrame
 * 
 * Replaces setInterval-based playback with display-synced animation.
 * Handles variable frame rates and speed adjustments properly.
 */

import { useRef, useEffect, useCallback } from 'react';

interface PlaybackOptions {
  /** Target frame rate for MD data (typically 30 fps) */
  targetFPS?: number;
  /** Playback speed multiplier (0.25 = quarter speed) */
  speed?: number;
  /** Callback when it's time to advance frame */
  onFrame: () => void;
  /** Optional callback with playback statistics */
  onStats?: (stats: { fps: number; dropped: number }) => void;
}

export function useRAFPlayback(isPlaying: boolean, options: PlaybackOptions) {
  const { targetFPS = 30, speed = 1.0, onFrame, onStats } = options;
  
  // RAF state
  const rafIdRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const accumulatorRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastStatsTimeRef = useRef<number>(0);
  const droppedFramesRef = useRef(0);
  
  // Frame timing
  const frameInterval = 1000 / targetFPS;

  // Stable callback ref
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const loop = useCallback((time: number) => {
    if (lastTimeRef.current === undefined) {
      lastTimeRef.current = time;
    }

    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Accumulate time scaled by playback speed
    accumulatorRef.current += delta * speed;

    // Process all due frames
    let framesProcessed = 0;
    while (accumulatorRef.current >= frameInterval) {
      onFrameRef.current();
      accumulatorRef.current -= frameInterval;
      framesProcessed++;
      frameCountRef.current++;
    }

    // Track dropped frames (when processing takes too long)
    if (framesProcessed > 1) {
      droppedFramesRef.current += framesProcessed - 1;
    }

    // Stats reporting every second
    if (onStats && time - lastStatsTimeRef.current >= 1000) {
      const elapsed = (time - lastStatsTimeRef.current) / 1000;
      onStats({
        fps: Math.round(frameCountRef.current / elapsed),
        dropped: droppedFramesRef.current,
      });
      frameCountRef.current = 0;
      droppedFramesRef.current = 0;
      lastStatsTimeRef.current = time;
    }

    rafIdRef.current = requestAnimationFrame(loop);
  }, [frameInterval, speed, onStats]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = undefined;
      }
      lastTimeRef.current = undefined;
      accumulatorRef.current = 0;
      return;
    }

    // Start playback
    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isPlaying, loop]);

  // Reset accumulator when speed changes to prevent jumps
  useEffect(() => {
    accumulatorRef.current = 0;
  }, [speed]);
}

/**
 * Hook for smooth frame interpolation during playback
 * Renders interpolated positions between MD frames for smooth motion
 */
export function useSmoothPlayback(
  isPlaying: boolean,
  currentFrame: number,
  totalFrames: number,
  targetFPS: number = 60,
  onInterpolate: (frame: number) => void
) {
  const rafIdRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);
  const startFrameRef = useRef(currentFrame);

  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
      }
      return;
    }

    startTimeRef.current = performance.now();
    startFrameRef.current = currentFrame;

    const loop = (time: number) => {
      if (startTimeRef.current === undefined) return;

      const elapsed = (time - startTimeRef.current) / 1000;
      const framesElapsed = elapsed * targetFPS;
      const nextFrame = (startFrameRef.current + framesElapsed) % totalFrames;

      onInterpolate(nextFrame);

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isPlaying, currentFrame, totalFrames, targetFPS, onInterpolate]);
}
