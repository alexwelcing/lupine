/**
 * GpuUnlockOverlay — GPU "feature unlock" animation overlay.
 *
 * Triggered when the bond detection backend transitions from CPU to WebGPU.
 * The overlay is transparent and non-interactive, composited over the
 * Three.js viewport.
 *
 * Supports two rendering modes:
 *   - **CSS Mode** (Phase 1): Pure CSS keyframe animations. Always available.
 *   - **Rive Mode** (Phase 2): Rive state machine canvas overlay.
 *     Activated by setting ENABLE_RIVE = true after placing the .riv file
 *     in packages/ui/src/rive/assets/gpu-unlock.riv
 *
 * Both modes consume the same `useBackendTransition` hook interface.
 */

import { useEffect, useState } from 'react';
import { useBackendTransition, type TransitionPhase } from './useBackendTransition';
import { useRiveUnlock } from './useRiveUnlock';

// ─── Phase 2: Rive Mode ────────────────────────────────────────────────
// Set to `true` once the .riv file is authored and placed in assets/
const ENABLE_RIVE = false;
const RIVE_ASSET_PATH = new URL('./assets/gpu-unlock.riv', import.meta.url).href;


// ─── Feature chips that cascade during unlock ──────────────────────────
const UNLOCK_FEATURES = [
  { label: 'GPU Bonds', icon: '⚡' },
  { label: 'Parallel Compute', icon: '◆' },
  { label: 'Real-Time Detection', icon: '◉' },
];

export function GpuUnlockOverlay() {
  // ─── Rive Mode (Phase 2) ──────────────────────────────────────────
  // When ENABLE_RIVE is true, delegate entirely to the Rive canvas.
  // The useRiveUnlock hook handles all state machine input mapping.
  if (ENABLE_RIVE) {
    return <GpuUnlockOverlayRive />;
  }

  // ─── CSS Mode (Phase 1) ───────────────────────────────────────────
  return <GpuUnlockOverlayCss />;
}

/**
 * Rive-powered overlay renderer.
 * Renders a full-viewport transparent canvas controlled by the
 * GpuUnlockStateMachine state machine inside the .riv file.
 *
 * Note: The useRiveUnlock import is tree-shaken by Vite when ENABLE_RIVE
 * is false, since the GpuUnlockOverlayRive component is never referenced.
 */
function GpuUnlockOverlayRive() {
  const { RiveComponent, phase, dismiss, isLoaded } = useRiveUnlock({
    src: RIVE_ASSET_PATH,
  });

  // Don't render the canvas until Rive is loaded or if we're idle with no active animation
  if (!isLoaded && phase === 'idle') return null;

  return (
    <div
      onClick={phase === 'unlocking' ? dismiss : undefined}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 500,
        pointerEvents: phase === 'unlocking' ? 'auto' : 'none',
        cursor: phase === 'unlocking' ? 'pointer' : 'default',
      }}
    >
      <RiveComponent
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}

/** CSS-driven overlay renderer (Phase 1 — current default). */
function GpuUnlockOverlayCss() {
  const { phase, dismiss } = useBackendTransition();
  const [exitingPhase, setExitingPhase] = useState<TransitionPhase | null>(null);

  // When phase changes away from 'unlocking', let exit animations play
  useEffect(() => {
    if (phase === 'active') {
      setExitingPhase('unlocking');
      const t = setTimeout(() => setExitingPhase(null), 800);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Nothing to render
  if (phase === 'idle' && !exitingPhase) return null;

  const showUnlock = phase === 'unlocking' || exitingPhase === 'unlocking';
  const showBadge = phase === 'active';
  const showUnsupported = phase === 'unsupported';

  return (
    <>
      {/* ─── Inject keyframes ─── */}
      <style>{KEYFRAMES}</style>

      {/* ─── Scanline sweep ─── */}
      {phase === 'unlocking' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 500,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, #1edce0, #1edce0, transparent)',
            boxShadow: '0 0 20px 4px rgba(30, 220, 224, 0.6), 0 0 60px 8px rgba(30, 220, 224, 0.2)',
            animation: 'gpuScanline 600ms ease-out forwards',
          }} />
          {/* Bloom flash */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(30, 220, 224, 0.08) 0%, transparent 70%)',
            animation: 'gpuFlash 800ms ease-out forwards',
          }} />
        </div>
      )}

      {/* ─── Central unlock badge ─── */}
      {showUnlock && (
        <div
          onClick={dismiss}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 501,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: phase === 'unlocking' ? 'auto' : 'none',
            cursor: phase === 'unlocking' ? 'pointer' : 'default',
          }}
        >
          {/* Badge container */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            animation: exitingPhase
              ? 'gpuBadgeExit 600ms ease-in forwards'
              : 'gpuBadgeEnter 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}>
            {/* Energy ring */}
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: '2px solid rgba(30, 220, 224, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'gpuRingPulse 1.2s ease-in-out infinite',
              background: 'radial-gradient(circle, rgba(30, 220, 224, 0.1) 0%, transparent 70%)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1edce0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>

            {/* Title */}
            <div style={{
              fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
              color: '#1edce0',
              textShadow: '0 0 20px rgba(30, 220, 224, 0.5)',
            }}>
              WebGPU Online
            </div>

            {/* Divider */}
            <div style={{
              width: 120,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(30, 220, 224, 0.4), transparent)',
            }} />

            {/* Feature chips */}
            <div style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              {UNLOCK_FEATURES.map((feat, i) => (
                <div
                  key={feat.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    background: 'rgba(30, 220, 224, 0.08)',
                    border: '1px solid rgba(30, 220, 224, 0.2)',
                    fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#94e8ea',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    animation: `gpuChipIn 400ms cubic-bezier(0.16, 1, 0.3, 1) ${300 + i * 120}ms both`,
                  }}
                >
                  <span style={{ fontSize: 11 }}>{feat.icon}</span>
                  {feat.label}
                </div>
              ))}
            </div>

            {/* Dismiss hint */}
            {!exitingPhase && (
              <div style={{
                fontSize: 9,
                color: 'rgba(148, 163, 184, 0.6)',
                fontFamily: 'var(--font-mono, monospace)',
                letterSpacing: '0.05em',
                animation: 'gpuChipIn 400ms ease-out 1200ms both',
              }}>
                click to dismiss
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Persistent GPU badge (bottom-right, after unlock) ─── */}
      {showBadge && (
        <div style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          zIndex: 180,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'rgba(10, 10, 12, 0.7)',
          border: '1px solid rgba(30, 220, 224, 0.2)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'gpuBadgeSettle 600ms ease-out forwards',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#1edce0',
            boxShadow: '0 0 6px rgba(30, 220, 224, 0.6)',
            animation: 'gpuDotPulse 2s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: '#64748b',
          }}>
            GPU
          </span>
        </div>
      )}

      {/* ─── Unsupported fallback badge ─── */}
      {showUnsupported && (
        <div style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          zIndex: 180,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'rgba(10, 10, 12, 0.7)',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#f87171',
            opacity: 0.6,
          }} />
          <span style={{
            fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: '#64748b',
          }}>
            CPU FALLBACK
          </span>
        </div>
      )}
    </>
  );
}

// ─── CSS Keyframes ─────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes gpuScanline {
  0%   { top: -2px; opacity: 0; }
  10%  { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

@keyframes gpuFlash {
  0%   { opacity: 0; }
  20%  { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes gpuBadgeEnter {
  0%   { opacity: 0; transform: scale(0.8) translateY(12px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes gpuBadgeExit {
  0%   { opacity: 1; transform: scale(1) translateY(0); }
  100% { opacity: 0; transform: scale(0.9) translateY(-8px); }
}

@keyframes gpuRingPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(30, 220, 224, 0.3); }
  50%      { box-shadow: 0 0 0 8px rgba(30, 220, 224, 0); }
}

@keyframes gpuChipIn {
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes gpuBadgeSettle {
  0%   { opacity: 0; transform: translateX(8px); }
  100% { opacity: 1; transform: translateX(0); }
}

@keyframes gpuDotPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
`;
