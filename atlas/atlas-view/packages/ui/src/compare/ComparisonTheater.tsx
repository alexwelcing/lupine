// Comparison Theater — the standout view, in the REAL engine.
//
// Three @atlas/scene/AtomsOptimized panes (the genuine impostor-sphere renderer)
// relax the SAME strained FCC nanocrystal under baseline / distill / accelerate,
// with a LOCKED camera + clock. Atoms are colored by their per-atom residual via
// AtomsOptimized's built-in property colormode (+ propertyEmissionStrength glow),
// so the distill panes visibly cool to a lower residual and the accelerate pane
// reaches equilibrium first — the measured 5–7× faster + up to 50% lower-error
// result, rendered as motion. Mounted by apps/web/main.tsx at ?view=compare.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AtomsOptimized } from '@atlas/scene/AtomsOptimized';
import { makeVariants, type Variant } from './trajectory';
import { clock, orbit, dragOrbit, zoomOrbit, applyOrbit } from './theaterState';

const DURATION = 11; // seconds for a full strained -> relaxed sweep at 1x
const HOLD = 1.5; // pause on the converged state before restarting
const SPEEDS = [0.5, 1, 2];

function CameraRig() {
  const { camera } = useThree();
  useFrame(() => applyOrbit(camera));
  return null;
}

function Pane({ variant, frameIndex, nextIndex, interp, tUI }: {
  variant: Variant;
  frameIndex: number;
  nextIndex: number;
  interp: number;
  tUI: number;
}) {
  const frames = variant.trajectory.frames;
  const residualPct = variant.decay(tUI) * 100;
  const converged = tUI >= variant.convergeAt && variant.convergeAt < 0.999;

  return (
    <div style={{
      position: 'relative', flex: 1, minWidth: 0, borderRadius: 16, overflow: 'hidden',
      border: `1px solid ${variant.accent}40`, boxShadow: `0 0 60px -30px ${variant.accent}`,
    }}>
      <Canvas
        camera={{ position: [0, 0, 22], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        style={{ background: '#05050a', width: '100%', height: '100%' }}
      >
        <CameraRig />
        <AtomsOptimized
          frame={frames[frameIndex]}
          nextFrame={frames[nextIndex]}
          interpolationFactor={interp}
          colorMode="property"
          colorProperty="residual"
          colormap={variant.colormap}
          propRange={[0, 1]}
          propertyEmissionStrength={0.85}
          scale={0.55}
        />
      </Canvas>

      <div style={{ position: 'absolute', inset: '0 0 auto 0', padding: 16, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: variant.accent }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>{variant.title}</h3>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>{variant.badge}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 24, fontWeight: 600, color: variant.accent, lineHeight: 1 }}>{residualPct.toFixed(0)}%</div>
          <div style={{ marginTop: 4, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>residual</div>
        </div>
      </div>

      <div style={{ position: 'absolute', inset: 'auto 0 0 0', padding: 16, pointerEvents: 'none' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
          background: converged ? `${variant.accent}22` : 'rgba(255,255,255,0.06)',
          color: converged ? variant.accent : 'rgba(255,255,255,0.55)',
        }}>
          {converged ? `✓ converged @ ${(variant.convergeAt * 100).toFixed(0)}%` : '○ relaxing…'}
        </span>
      </div>
    </div>
  );
}

const btn: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999,
  border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#fff', background: '#7B5CFF',
};
const ghost: CSSProperties = { ...btn, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)' };

export default function ComparisonTheater() {
  const variants = useMemo(() => makeVariants(), []);
  const nFrames = variants[0].trajectory.totalFrames;
  const [tUI, setTUI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [autoRotate, setAutoRotate] = useState(true);
  const drag = useRef({ active: false, x: 0, y: 0 });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let holdT = 0;
    let uiAcc = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (clock.playing) {
        if (clock.t >= 1) {
          holdT += dt;
          if (holdT >= HOLD) { clock.t = 0; holdT = 0; }
        } else {
          clock.t = Math.min(1, clock.t + (dt * clock.speed) / DURATION);
        }
      }
      if (orbit.autoRotate && !orbit.dragging) orbit.azimuth += dt * 0.12;
      uiAcc += dt;
      if (uiAcc >= 0.033) { uiAcc = 0; setTUI(clock.t); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => { clock.playing = playing; }, [playing]);
  useEffect(() => { clock.speed = speed; }, [speed]);
  useEffect(() => { orbit.autoRotate = autoRotate; }, [autoRotate]);

  const last = nFrames - 1;
  const frameIndex = Math.min(last, Math.floor(tUI * last));
  const nextIndex = Math.min(last, frameIndex + 1);
  const interp = tUI * last - frameIndex;

  const onDown = (e: React.PointerEvent) => { drag.current = { active: true, x: e.clientX, y: e.clientY }; orbit.dragging = true; };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    dragOrbit(e.clientX - drag.current.x, e.clientY - drag.current.y);
    drag.current.x = e.clientX; drag.current.y = e.clientY;
  };
  const onUp = () => { drag.current.active = false; orbit.dragging = false; };

  return (
    <div style={{ minHeight: '100dvh', background: '#05050a', color: '#fff', padding: '32px 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1500, margin: '0 auto' }}>
        <header style={{ marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(123,92,255,0.85)', fontWeight: 600 }}>Lupi Viewer · Comparison Theater</p>
          <h1 style={{ margin: '6px 0 0', fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em' }}>
            Watch distill relax the same crystal — <span style={{ color: '#7B5CFF' }}>cooler</span> and <span style={{ color: '#00E5FF' }}>faster</span>
          </h1>
          <p style={{ margin: '10px 0 0', maxWidth: 820, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.55)' }}>
            One strained FCC nanocrystal, three relaxations, rendered by the real impostor engine. Camera + clock are locked across
            all panes — drag any pane to orbit them together. Atoms are colored by their per-atom residual; the baseline stays warm,
            distill cools further, and the accelerate variant reaches equilibrium first.
          </p>
        </header>

        <div
          style={{ display: 'flex', gap: 16, height: '62vh', minHeight: 420, touchAction: 'none', userSelect: 'none' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onWheel={(e) => zoomOrbit(e.deltaY)}
        >
          {variants.map((v) => (
            <Pane key={v.id} variant={v} frameIndex={frameIndex} nextIndex={nextIndex} interp={interp} tUI={tUI} />
          ))}
        </div>

        <div style={{ marginTop: 16, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', padding: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
          <button type="button" style={btn} onClick={() => setPlaying((p) => !p)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
          <button type="button" style={ghost} onClick={() => { clock.t = 0; setTUI(0); }}>↻ Restart</button>
          <input
            type="range" min={0} max={1} step={0.001} value={tUI}
            onChange={(e) => { const v = parseFloat(e.target.value); clock.t = v; setTUI(v); }}
            style={{ flex: 1, minWidth: 160, accentColor: '#7B5CFF' }}
            aria-label="Timeline"
          />
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'rgba(255,255,255,0.5)', width: 44, textAlign: 'right' }}>{(tUI * 100).toFixed(0)}%</span>
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }}>
            {SPEEDS.map((s) => (
              <button key={s} type="button" onClick={() => setSpeed(s)} style={{
                ...ghost, padding: '4px 10px', fontFamily: 'ui-monospace, monospace',
                background: speed === s ? '#7B5CFF' : 'transparent', color: speed === s ? '#fff' : 'rgba(255,255,255,0.55)',
              }}>{s}×</button>
            ))}
          </div>
          <button type="button" onClick={() => setAutoRotate((a) => !a)} style={{
            ...ghost, background: autoRotate ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.05)', color: autoRotate ? '#00E5FF' : 'rgba(255,255,255,0.6)',
          }}>⟳ Auto-orbit</button>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            residual settles to <span style={{ color: '#8A8AA0' }}>20%</span> / <span style={{ color: '#7B5CFF' }}>6%</span> / <span style={{ color: '#00E5FF' }}>5%</span> — accelerate gets there in a quarter of the steps
          </p>
        </div>
      </div>
    </div>
  );
}
