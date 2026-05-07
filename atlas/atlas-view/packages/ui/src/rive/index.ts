/**
 * Rive integration layer.
 *
 * Phase 1: CSS-driven animations wired to Zustand store transitions.
 * Phase 2: Swap CSS for @rive-app/react-canvas state machines.
 */

export { GpuUnlockOverlay } from './GpuUnlockOverlay';
export { useBackendTransition } from './useBackendTransition';
export type { TransitionPhase, BackendTransition } from './useBackendTransition';
