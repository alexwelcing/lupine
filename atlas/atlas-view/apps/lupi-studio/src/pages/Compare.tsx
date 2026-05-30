// The Comparison Theater page: three locked R3F panes relaxing the SAME strained
// crystal under baseline / distill / distill+accelerate, atoms recoloring by their
// per-atom residual as time advances. Side-by-side-by-side + time-lapse color in
// one view — a direct visual of distill lowering error (cooler) and the accelerate
// variant converging sooner (faster).

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Orbit } from "lucide-react";
import Pane from "../compare/Pane";
import { makeTheater } from "../compare/trajectory";
import { COLORMAPS, type ColormapName, colormapCss } from "../compare/colormaps";
import { clock, orbit, dragOrbit, zoomOrbit } from "../compare/theaterState";

const COLORMAP_NAMES: ColormapName[] = ["inferno", "viridis", "turbo"];
const SPEEDS = [0.5, 1, 2];

export default function Compare() {
  const theater = useMemo(() => makeTheater(), []);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cmapName, setCmapName] = useState<ColormapName>("inferno");
  const colormap = COLORMAPS[cmapName];

  const drag = useRef({ active: false, x: 0, y: 0 });

  // Single animation clock — drives every pane (and the shared orbit auto-spin).
  useEffect(() => {
    clock.maxStep = 1;
    let raf = 0;
    let last = performance.now();
    let holdT = 0;
    let uiAcc = 0;
    const DURATION = 11; // seconds for a full strained -> relaxed sweep at 1x
    const HOLD = 1.5; // pause on the converged state before restarting
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (clock.playing) {
        if (clock.step >= 1) {
          holdT += dt;
          if (holdT >= HOLD) {
            clock.step = 0;
            holdT = 0;
          }
        } else {
          clock.step = Math.min(1, clock.step + (dt * clock.speed) / DURATION);
        }
      }
      if (orbit.autoRotate && !orbit.dragging) orbit.azimuth += dt * 0.12;
      uiAcc += dt;
      if (uiAcc >= 0.05) {
        uiAcc = 0;
        setT(clock.step);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // mirror UI toggles into the shared singletons
  useEffect(() => {
    clock.playing = playing;
  }, [playing]);
  useEffect(() => {
    clock.speed = speed;
  }, [speed]);
  useEffect(() => {
    orbit.autoRotate = autoRotate;
  }, [autoRotate]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { active: true, x: e.clientX, y: e.clientY };
    orbit.dragging = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    dragOrbit(e.clientX - drag.current.x, e.clientY - drag.current.y);
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
  };
  const onPointerUp = () => {
    drag.current.active = false;
    orbit.dragging = false;
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-void-black text-white px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-content mx-auto">
        {/* Heading */}
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-lupi-violet/80 font-medium">Lupi Viewer · Comparison Theater</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Watch distill relax the same crystal — <span className="text-lupi-violet">cooler</span> and{" "}
            <span className="text-[#00E5FF]">faster</span>
          </h1>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-white/55">
            One strained FCC nanocrystal, three relaxations. Cameras and clock are locked across all panes — drag any pane to
            orbit them together. Atoms are colored by their <span className="text-white/80">per-atom residual</span> (distance
            still to travel); as time advances you see the baseline stay warm, distill cool further, and the accelerate variant
            reach equilibrium first.
          </p>
        </header>

        {/* Panes */}
        <div
          className="flex flex-col lg:flex-row gap-4 h-[64vh] min-h-[420px] touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={(e) => zoomOrbit(e.deltaY)}
        >
          {theater.variants.map((variant) => (
            <Pane
              key={variant.id}
              lattice={theater.lattice}
              pos0={theater.pos0}
              variant={variant}
              colormap={colormap}
              tNorm={t}
            />
          ))}
        </div>

        {/* Transport + legend */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lupi-violet text-white text-[13px] font-medium hover:bg-[#8B6CFF] transition-colors"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => {
                clock.step = 0;
                setT(0);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 text-white/70 text-[13px] hover:bg-white/10 transition-colors"
              aria-label="Restart"
            >
              <RotateCcw className="w-4 h-4" /> Restart
            </button>

            {/* Scrubber */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={t}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                clock.step = v;
                setT(v);
              }}
              className="flex-1 min-w-[160px] accent-lupi-violet"
              aria-label="Timeline"
            />
            <span className="font-mono text-[12px] text-white/50 w-12 text-right">{(t * 100).toFixed(0)}%</span>

            {/* Speed */}
            <div className="flex items-center gap-1 rounded-full bg-white/5 p-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-mono transition-colors ${
                    speed === s ? "bg-lupi-violet text-white" : "text-white/55 hover:text-white"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>

            {/* Auto-orbit */}
            <button
              type="button"
              onClick={() => setAutoRotate((a) => !a)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-[13px] transition-colors ${
                autoRotate ? "bg-[#00E5FF]/15 text-[#00E5FF]" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <Orbit className="w-4 h-4" /> Auto-orbit
            </button>
          </div>

          {/* Legend + colormap picker */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[11px] uppercase tracking-[0.12em] text-white/40">relaxed</span>
              <div className="h-3 w-40 rounded-full" style={{ background: colormapCss(cmapName) }} />
              <span className="text-[11px] uppercase tracking-[0.12em] text-white/40">strained</span>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/5 p-1">
              {COLORMAP_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCmapName(name)}
                  className={`px-2.5 py-1 rounded-full text-[12px] capitalize transition-colors ${
                    cmapName === name ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-white/40">
              Residual settles to <span className="text-[#8A8AA0]">20%</span> /{" "}
              <span className="text-lupi-violet">6%</span> / <span className="text-[#00E5FF]">5%</span> — the accelerate variant
              gets there in a quarter of the steps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
