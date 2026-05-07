/**
 * Micro-effects library — CSS Phase 1 / Rive Phase 2.
 *
 * Viewport-level effects are managed by RiveEffectLayer (mounted in App.tsx).
 * Component-level effects (ToolbarRipple, ToggleSpark, etc.) are used inline.
 * Ambient effects (HeaderShimmer, BreathingDot) loop continuously.
 */

// ─── Core ───
export { useRiveEffect } from './useRiveEffect';
export type { EffectId, RiveEffectConfig, RiveEffectResult } from './useRiveEffect';

// ─── Viewport-level (global manager) ───
export { RiveEffectLayer } from './RiveEffectLayer';

// ─── Component-level (inline) ───
export { ToolbarRipple } from './ToolbarRipple';
export { ToggleSpark } from './ToggleSpark';
export { AnimatedOrbitalToggle } from './AnimatedOrbitalToggle';

// ─── Ambient (always-on) ───
export { HeaderShimmer } from './HeaderShimmer';
export { BreathingDot } from './BreathingDot';
