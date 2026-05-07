/**
 * useRiveUnlock — Rive state machine bridge for the GPU unlock animation.
 *
 * Consumes the `useBackendTransition` hook and maps its lifecycle phases
 * to Rive state machine inputs:
 *   - TransitionPhase 'initializing' → fires `triggerUnlock` trigger
 *   - TransitionPhase 'unlocking'    → sets `progress` to 100
 *   - TransitionPhase 'active'       → sets `gpuReady` to true
 *   - TransitionPhase 'idle'         → resets `gpuReady` to false
 *
 * This hook is the ONLY bridge between React state and Rive. All animation
 * logic lives inside the .riv state machine — React just dispatches inputs.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { useBackendTransition, type TransitionPhase } from './useBackendTransition';

// ─── Constants matching the .riv file contract ──────────────────────────
const STATE_MACHINE_NAME = 'GpuUnlockStateMachine';
const INPUT_TRIGGER_UNLOCK = 'triggerUnlock';
const INPUT_GPU_READY = 'gpuReady';
const INPUT_PROGRESS = 'progress';

interface UseRiveUnlockOptions {
  /** Path to the .riv file relative to the public/assets directory */
  src: string;
  /** Whether to auto-play on mount. Default: true */
  autoplay?: boolean;
}

interface RiveUnlockResult {
  /** The React component to render the Rive canvas */
  RiveComponent: ReturnType<typeof useRive>['RiveComponent'];
  /** Current transition phase from the store hook */
  phase: TransitionPhase;
  /** Whether the Rive runtime loaded successfully */
  isLoaded: boolean;
  /** Dismiss callback (click to skip) */
  dismiss: () => void;
}

export function useRiveUnlock({ src, autoplay = true }: UseRiveUnlockOptions): RiveUnlockResult {
  const { phase, dismiss, phaseStartedAt } = useBackendTransition();
  const prevPhaseRef = useRef<TransitionPhase>('idle');

  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: STATE_MACHINE_NAME,
    autoplay,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
  });

  // ─── Bind state machine inputs ──────────────────────────────────────
  const triggerUnlockInput = useStateMachineInput(rive, STATE_MACHINE_NAME, INPUT_TRIGGER_UNLOCK);
  const gpuReadyInput = useStateMachineInput(rive, STATE_MACHINE_NAME, INPUT_GPU_READY);
  const progressInput = useStateMachineInput(rive, STATE_MACHINE_NAME, INPUT_PROGRESS);

  // ─── Phase → Rive input mapping ─────────────────────────────────────
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Skip if phase hasn't changed
    if (prev === phase) return;

    switch (phase) {
      case 'initializing':
        // Fire the trigger to start the animation sequence
        if (triggerUnlockInput) {
          triggerUnlockInput.fire();
        }
        // Start progress at 0
        if (progressInput) {
          progressInput.value = 0;
        }
        break;

      case 'unlocking':
        // Ramp progress to 100 to transition past the init state
        if (progressInput) {
          progressInput.value = 100;
        }
        break;

      case 'active':
        // Set the persistent boolean for the steady-state badge
        if (gpuReadyInput) {
          gpuReadyInput.value = true;
        }
        break;

      case 'idle':
        // Reset everything — GPU went back to CPU
        if (gpuReadyInput) {
          gpuReadyInput.value = false;
        }
        if (progressInput) {
          progressInput.value = 0;
        }
        break;

      case 'unsupported':
        // Could map to a separate "error" state in the .riv
        if (gpuReadyInput) {
          gpuReadyInput.value = false;
        }
        break;
    }
  }, [phase, triggerUnlockInput, gpuReadyInput, progressInput]);

  return {
    RiveComponent,
    phase,
    isLoaded: rive !== null,
    dismiss,
  };
}
