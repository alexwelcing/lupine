/**
 * Rive integration layer — GPU Feature Unlock + Micro-Effects.
 *
 * Two layers:
 *   - Macro: GpuUnlockOverlay (single-moment power-up animation)
 *   - Micro: effects/* (15+ small effects distributed across the UI)
 *
 * Each layer supports CSS (Phase 1) and Rive (Phase 2) rendering.
 */

// ─── Macro overlay ───
export { GpuUnlockOverlay } from './GpuUnlockOverlay';
export { useBackendTransition } from './useBackendTransition';
export { useRiveUnlock } from './useRiveUnlock';
export type { TransitionPhase, BackendTransition } from './useBackendTransition';

// ─── Micro-effects ───
export {
  RiveEffectLayer,
  useRiveEffect,
  ToolbarRipple,
  ToggleSpark,
  AnimatedOrbitalToggle,
  HeaderShimmer,
  BreathingDot,
} from './effects';


