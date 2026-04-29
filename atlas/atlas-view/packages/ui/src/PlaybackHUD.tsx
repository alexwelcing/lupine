/**
 * PlaybackHUD — lightweight FPS / drop-counter overlay.
 *
 * Two pieces:
 *   - <PlaybackFrameProbe /> mounts inside the R3F Canvas. It runs `useFrame`
 *     to sample the render clock, and writes the result into a module-local
 *     mutable record (no React state — so the probe itself does not cause
 *     re-renders).
 *   - <PlaybackHUD /> mounts outside the Canvas. When `showStats` is on (or
 *     `?stats=1` is in the URL) it polls the record at ~4 Hz and renders a
 *     small overlay.
 *
 * Toggling on:
 *   - Append `?stats=1` to the URL.
 *   - Or in devtools: `useStore.setState({ showStats: true })`.
 */

import { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from './store';

const tracker = {
  frames: 0,
  lastSampleAt: 0,
  fps: 0,
  // Frames where the gap to the previous tick exceeded the typical budget.
  // Heuristic: > 25 ms means we missed at least one display refresh on a
  // 60 Hz panel, which is what stutter feels like.
  drops: 0,
  lastFrameTime: 0,
};

export function PlaybackFrameProbe() {
  useFrame(() => {
    const now = performance.now();
    if (tracker.lastFrameTime > 0) {
      const delta = now - tracker.lastFrameTime;
      if (delta > 25) tracker.drops++;
    }
    tracker.lastFrameTime = now;
    tracker.frames++;
    if (now - tracker.lastSampleAt >= 1000) {
      tracker.fps = tracker.frames;
      tracker.frames = 0;
      tracker.lastSampleAt = now;
    }
  });
  return null;
}

export function PlaybackHUD() {
  const showStats = useStore(s => s.showStats);

  const [forced, setForced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('stats') === '1') {
      useStore.setState({ showStats: true });
      setForced(true);
    }
  }, []);

  const visible = showStats || forced;
  const [snap, setSnap] = useState({ fps: 0, drops: 0 });
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setSnap({ fps: tracker.fps, drops: tracker.drops });
      tracker.drops = 0;
    }, 250);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  // Color the FPS reading by how close it is to the display refresh rate.
  // We assume 60 Hz baseline; values >= 120 are "smooth", >= 60 is "ok",
  // below is "concerning".
  let color = '#94a3b8';
  if (snap.fps >= 120) color = '#22d3ee';
  else if (snap.fps >= 60) color = '#a3e635';
  else if (snap.fps > 0) color = '#f59e0b';

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 9999,
        padding: '6px 10px',
        background: 'rgba(10, 10, 12, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid #1f2937',
        borderRadius: 0,
        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        fontSize: 11,
        color,
        letterSpacing: '0.05em',
        pointerEvents: 'none',
        fontVariantNumeric: 'tabular-nums',
      }}
      aria-hidden="true"
    >
      {String(snap.fps).padStart(3, ' ')} fps
      <span style={{ color: snap.drops > 0 ? '#f59e0b' : '#475569', marginLeft: 8 }}>
        drops {snap.drops}
      </span>
    </div>
  );
}
