/**
 * useBackendTransition — watches the store for CPU→GPU backend transitions
 * and fires a one-shot "unlock" event that overlay components can consume.
 *
 * Architecture note: this hook is intentionally decoupled from the overlay
 * renderer. Phase 2 (Rive) will reuse the same transition signal by feeding
 * it into a Rive state machine trigger input instead of driving CSS classes.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store';

export type TransitionPhase =
  | 'idle'           // No transition in progress
  | 'initializing'   // GPU pipeline spinning up (gpuBondsStatus: idle → ready)
  | 'unlocking'      // Flash / cascade animation playing
  | 'active'         // GPU is online, steady-state badge visible
  | 'unsupported';   // GPU init failed — graceful fallback indicator

export interface BackendTransition {
  /** Current phase of the unlock animation lifecycle */
  phase: TransitionPhase;
  /** Timestamp (ms) when the current phase started */
  phaseStartedAt: number;
  /** Dismiss the unlock overlay (user clicked or animation completed) */
  dismiss: () => void;
  /** Whether this is the very first GPU activation in this session */
  isFirstUnlock: boolean;
}

const UNLOCK_DURATION_MS = 2800; // Total unlock animation time

export function useBackendTransition(): BackendTransition {
  const [phase, setPhase] = useState<TransitionPhase>('idle');
  const [phaseStartedAt, setPhaseStartedAt] = useState(0);
  const hasUnlockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setPhaseWith = useCallback((p: TransitionPhase) => {
    setPhase(p);
    setPhaseStartedAt(performance.now());
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhaseWith('active');
  }, [setPhaseWith]);

  useEffect(() => {
    // Track bondSource transitions: when it flips from cpu/none → gpu,
    // fire the unlock sequence. When gpuBondsStatus goes to 'unsupported',
    // show the fallback indicator.
    const unsub = useStore.subscribe(
      (s) => ({ bondSource: s.bondSource, gpuStatus: s.gpuBondsStatus }),
      ({ bondSource, gpuStatus }, prev) => {
        // GPU became unsupported
        if (gpuStatus === 'unsupported' && prev?.gpuStatus !== 'unsupported') {
          setPhaseWith('unsupported');
          return;
        }

        // GPU became ready (pipeline initialized)
        if (gpuStatus === 'ready' && prev?.gpuStatus !== 'ready') {
          setPhaseWith('initializing');
        }

        // Bond source flipped to GPU — fire the unlock!
        if (bondSource === 'gpu' && prev?.bondSource !== 'gpu') {
          const isFirst = !hasUnlockedRef.current;
          hasUnlockedRef.current = true;

          setPhaseWith('unlocking');

          // Auto-transition to 'active' after the animation completes
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            setPhaseWith('active');
          }, UNLOCK_DURATION_MS);
        }

        // Fell back to CPU
        if (bondSource === 'cpu' && prev?.bondSource === 'gpu') {
          if (timerRef.current) clearTimeout(timerRef.current);
          setPhaseWith('idle');
        }
      },
      { equalityFn: (a, b) => a.bondSource === b.bondSource && a.gpuStatus === b.gpuStatus }
    );

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [setPhaseWith]);

  return {
    phase,
    phaseStartedAt,
    dismiss,
    isFirstUnlock: !hasUnlockedRef.current,
  };
}
