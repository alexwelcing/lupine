/**
 * RiveEffectLayer — Global micro-effect overlay manager.
 *
 * Mounted once in App.tsx. Subscribes to the Zustand store and fires
 * visual effects on state transitions. Each effect is a transparent
 * overlay (CSS Phase 1 / Rive Phase 2) composited over the viewport.
 *
 * This component owns ALL viewport-level effects. Component-level effects
 * (button ripples, toggle sparks) are handled inline via useRiveEffect.
 */

import { useEffect } from 'react';
import { useStore } from '../../store';
import { useRiveEffect } from './useRiveEffect';

// ─── CSS Keyframes (injected once) ──────────────────────────────────────
const EFFECT_KEYFRAMES = `
/* ─── File Materialize ─── */
@keyframes fx-materialize-ring {
  0%   { transform: scale(0.3); opacity: 0; }
  40%  { opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes fx-materialize-flash {
  0%   { opacity: 0; }
  15%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes fx-materialize-text {
  0%   { opacity: 0; transform: translateY(8px); letter-spacing: 0.4em; }
  50%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(-4px); letter-spacing: 0.15em; }
}

/* ─── Panel Slide ─── */
@keyframes fx-panel-glow {
  0%   { opacity: 0; transform: scaleY(0.3); }
  50%  { opacity: 1; }
  100% { opacity: 0; transform: scaleY(1); }
}

/* ─── Mode Morph ─── */
@keyframes fx-mode-vignette {
  0%   { opacity: 0; }
  30%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes fx-mode-label {
  0%   { opacity: 0; transform: translateY(6px); }
  30%  { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-4px); }
}

/* ─── Export Complete ─── */
@keyframes fx-export-ring {
  0%   { transform: scale(0.5); opacity: 0; }
  50%  { opacity: 1; }
  100% { transform: scale(1.8); opacity: 0; }
}
@keyframes fx-export-check {
  0%   { stroke-dashoffset: 24; opacity: 0; }
  40%  { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}

/* ─── Bond Scan ─── */
@keyframes fx-bond-sweep {
  0%   { left: -60px; opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}

/* ─── Header Shimmer ─── */
@keyframes fx-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
`;

export function RiveEffectLayer() {
  // ─── Effect instances ───────────────────────────────────────────────
  const fileMaterialize = useRiveEffect({ id: 'file-materialize', duration: 900 });
  const panelSlide = useRiveEffect({ id: 'panel-slide', duration: 350 });
  const panelClose = useRiveEffect({ id: 'panel-close', duration: 250 });
  const modeMorph = useRiveEffect({ id: 'mode-morph', duration: 600 });
  const exportComplete = useRiveEffect({ id: 'export-complete', duration: 1000 });
  const bondScan = useRiveEffect({ id: 'bond-scan', duration: 500 });

  // ─── Store subscriptions ────────────────────────────────────────────

  // File loaded → materialize burst
  useEffect(() => {
    const unsub = useStore.subscribe(
      (s) => s.file,
      (file, prev) => {
        if (file && !prev) fileMaterialize.fire();
      }
    );
    return unsub;
  }, [fileMaterialize]);

  // Panel open/close → edge glow
  useEffect(() => {
    const unsub = useStore.subscribe(
      (s) => s.activePanel,
      (panel, prev) => {
        if (panel && !prev) panelSlide.fire({ direction: 'open' });
        if (!panel && prev) panelClose.fire({ direction: 'close' });
      }
    );
    return unsub;
  }, [panelSlide, panelClose]);

  // Viewport mode change → vignette morph
  useEffect(() => {
    const unsub = useStore.subscribe(
      (s) => s.viewportMode,
      (mode, prev) => {
        if (mode !== prev) modeMorph.fire({ from: prev, to: mode });
      }
    );
    return unsub;
  }, [modeMorph]);

  // Bond detection → scan sweep
  useEffect(() => {
    const unsub = useStore.subscribe(
      (s) => ({ src: s.bondSource, count: s.lastBondCount }),
      ({ src, count }, prev) => {
        if (src !== 'none' && prev && count !== prev.count && count > 0) {
          bondScan.fire({ source: src, count });
        }
      },
      { equalityFn: (a, b) => a.src === b.src && a.count === b.count }
    );
    return unsub;
  }, [bondScan]);

  // Export complete — listen via custom event (fired by ExportManager)
  useEffect(() => {
    const handler = () => exportComplete.fire();
    window.addEventListener('atlas:export-complete', handler);
    return () => window.removeEventListener('atlas:export-complete', handler);
  }, [exportComplete]);

  // ─── Don't render anything unless an effect is active ───────────────
  const anyActive = fileMaterialize.isPlaying
    || panelSlide.isPlaying
    || panelClose.isPlaying
    || modeMorph.isPlaying
    || exportComplete.isPlaying
    || bondScan.isPlaying;

  if (!anyActive) return null;

  return (
    <>
      <style>{EFFECT_KEYFRAMES}</style>

      {/* ─── File Materialize ─── */}
      {fileMaterialize.isPlaying && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 600,
          pointerEvents: 'none', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Expanding ring */}
          <div style={{
            position: 'absolute',
            width: 120, height: 120, borderRadius: '50%',
            border: '2px solid rgba(30, 220, 224, 0.6)',
            animation: 'fx-materialize-ring 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }} />
          {/* Inner flash */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at center, rgba(30, 220, 224, 0.12) 0%, transparent 50%)',
            animation: 'fx-materialize-flash 600ms ease-out forwards',
          }} />
          {/* Label */}
          <div style={{
            fontFamily: 'Space Grotesk, system-ui, sans-serif',
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(30, 220, 224, 0.8)',
            animation: 'fx-materialize-text 900ms ease-out forwards',
          }}>
            Loaded
          </div>
        </div>
      )}

      {/* ─── Panel Slide Glow ─── */}
      {panelSlide.isPlaying && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: 3, zIndex: 500, pointerEvents: 'none',
          background: 'linear-gradient(180deg, transparent, rgba(30, 220, 224, 0.5), transparent)',
          animation: 'fx-panel-glow 350ms ease-out forwards',
          transformOrigin: 'center',
        }} />
      )}

      {/* ─── Panel Close Glow ─── */}
      {panelClose.isPlaying && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: 2, zIndex: 500, pointerEvents: 'none',
          background: 'linear-gradient(180deg, transparent, rgba(100, 116, 139, 0.3), transparent)',
          animation: 'fx-panel-glow 250ms ease-out forwards',
          transformOrigin: 'center',
        }} />
      )}

      {/* ─── Mode Morph Vignette ─── */}
      {modeMorph.isPlaying && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 500,
          pointerEvents: 'none',
        }}>
          {/* Edge vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            boxShadow: `inset 0 0 80px 20px ${
              (modeMorph.meta?.to === 'volcanic') ? 'rgba(248, 113, 113, 0.15)' :
              (modeMorph.meta?.to === 'chronos') ? 'rgba(168, 85, 247, 0.15)' :
              'rgba(30, 220, 224, 0.1)'
            }`,
            animation: 'fx-mode-vignette 600ms ease-out forwards',
          }} />
          {/* Mode label flash */}
          <div style={{
            position: 'absolute', bottom: 100, left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'Space Grotesk, system-ui, sans-serif',
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            color: (modeMorph.meta?.to === 'volcanic') ? '#f87171' :
                   (modeMorph.meta?.to === 'chronos') ? '#a855f7' : '#1edce0',
            animation: 'fx-mode-label 600ms ease-out forwards',
            whiteSpace: 'nowrap',
          }}>
            {String(modeMorph.meta?.to ?? 'standard')} mode
          </div>
        </div>
      )}

      {/* ─── Export Complete ─── */}
      {exportComplete.isPlaying && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 600,
          pointerEvents: 'none', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Success ring */}
          <div style={{
            position: 'absolute',
            width: 80, height: 80, borderRadius: '50%',
            border: '2px solid rgba(52, 211, 153, 0.5)',
            animation: 'fx-export-ring 800ms ease-out forwards',
          }} />
          {/* Checkmark */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: 'fx-export-check 1000ms ease-out 200ms both' }}
          >
            <path d="M20 6L9 17l-5-5" strokeDasharray="24" />
          </svg>
        </div>
      )}

      {/* ─── Bond Scan Sweep ─── */}
      {bondScan.isPlaying && (
        <div style={{
          position: 'absolute', bottom: 48, left: 0, right: 0,
          height: 2, zIndex: 500, pointerEvents: 'none',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0,
            width: 60, height: 2,
            background: 'linear-gradient(90deg, transparent, #1edce0, transparent)',
            boxShadow: '0 0 12px 2px rgba(30, 220, 224, 0.4)',
            animation: 'fx-bond-sweep 500ms ease-out forwards',
          }} />
        </div>
      )}
    </>
  );
}
