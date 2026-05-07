/**
 * useRiveEffect — Universal micro-effect hook.
 *
 * Supports two rendering modes:
 *   - CSS Mode: Pure CSS keyframe animations (default, zero dependencies)
 *   - Rive Mode: @rive-app/react-canvas artboard from a .riv file
 *
 * Each effect is a one-shot or looping animation that can be fired
 * programmatically via the returned `fire()` function.
 *
 * Usage:
 *   const { fire, stop, isPlaying, cssClass } = useRiveEffect({
 *     id: 'panel-slide',
 *     duration: 300,
 *     oneShot: true,
 *   });
 */

import { useCallback, useRef, useState } from 'react';

// ─── Effect Registry ────────────────────────────────────────────────────

export type EffectId =
  | 'file-materialize'
  | 'panel-slide'
  | 'panel-close'
  | 'toolbar-ripple'
  | 'export-complete'
  | 'gpu-power-up'
  | 'mode-morph'
  | 'playback-pulse'
  | 'toggle-spark'
  | 'bond-scan'
  | 'anomaly-ping'
  | 'camera-snap'
  | 'breathing-dot'
  | 'header-shimmer'
  | 'dropzone-orbit';

export interface RiveEffectConfig {
  /** Unique effect identifier */
  id: EffectId;
  /** Duration in ms for CSS mode. Rive mode uses the .riv timeline. */
  duration: number;
  /** Auto-dispose after animation completes? Default: true */
  oneShot?: boolean;
  /** Rive artboard name (when Rive mode is active) */
  artboard?: string;
  /** Rive state machine name */
  stateMachine?: string;
}

export interface RiveEffectResult {
  /** Fire the effect. Optionally pass metadata (direction, origin point, etc.) */
  fire: (meta?: Record<string, unknown>) => void;
  /** Stop the effect mid-animation */
  stop: () => void;
  /** Whether the effect is currently playing */
  isPlaying: boolean;
  /** Timestamp (ms) when the effect was last fired */
  firedAt: number;
  /** Metadata from the last fire() call */
  meta: Record<string, unknown> | null;
  /** Effect ID for CSS class binding */
  id: EffectId;
}

export function useRiveEffect(config: RiveEffectConfig): RiveEffectResult {
  const { id, duration, oneShot = true } = config;
  const [isPlaying, setIsPlaying] = useState(false);
  const [firedAt, setFiredAt] = useState(0);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fire = useCallback((fireMeta?: Record<string, unknown>) => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setIsPlaying(true);
    setFiredAt(performance.now());
    setMeta(fireMeta ?? null);

    if (oneShot) {
      timerRef.current = setTimeout(() => {
        setIsPlaying(false);
        setMeta(null);
      }, duration);
    }
  }, [duration, oneShot]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(false);
    setMeta(null);
  }, []);

  return { fire, stop, isPlaying, firedAt, meta, id };
}
