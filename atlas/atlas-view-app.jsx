import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════
   ATLAS VIEW — LAMMPS Web Visualization Platform Prototype
   WebGPU + React Three Fiber architecture (simulated in 2D canvas)
   ═══════════════════════════════════════════════════════════════ */

// --- Simulated atom data ---
function generateAtoms(n = 800, frame = 0) {
  const atoms = [];
  const types = [1, 1, 1, 2, 2, 3];
  const seed = frame * 0.01;
  for (let i = 0; i < n; i++) {
    const latticeX = (i % 10) * 32 + ((Math.floor(i / 10) % 2) * 16);
    const latticeY = (Math.floor(i / 10) % 10) * 32;
    const latticeZ = Math.floor(i / 100) * 32;
    const thermal = 2.5 + frame * 0.015;
    const x = latticeX + Math.sin(i * 1.37 + seed * 3.1) * thermal;
    const y = latticeY + Math.cos(i * 2.41 + seed * 2.7) * thermal;
    const z = latticeZ + Math.sin(i * 0.83 + seed * 4.2) * thermal;
    const type = types[i % types.length];
    const ke = 0.5 * (Math.sin(i * 0.7 + frame * 0.05) ** 2) * 0.3 + 0.01;
    const pe = -2.1 + Math.sin(i * 0.3 + frame * 0.02) * 0.4;
    const stress = Math.sin(i * 0.5 + frame * 0.03) * 100;
    atoms.push({ x, y, z, type, ke, pe, stress, id: i });
  }
  return atoms;
}

function generateThermo(frames = 300) {
  const data = [];
  for (let i = 0; i < frames; i++) {
    const eq = 1 - Math.exp(-i / 40);
    data.push({
      step: i * 100,
      temp: 300 * eq + (Math.random() - 0.5) * 24 * eq,
      pe: -4.2 + 0.3 * (1 - eq) + (Math.random() - 0.5) * 0.015 * eq,
      ke: 0.3 * eq + (Math.random() - 0.5) * 0.01,
      press: (Math.random() - 0.5) * 600 * (eq < 0.5 ? 3 : 1),
    });
  }
  return data;
}

// --- Color maps ---
const TYPE_COLORS = { 1: "#4db8ff", 2: "#ff6b8a", 3: "#7ddf64" };
const TYPE_RADII = { 1: 1.0, 2: 0.75, 3: 1.2 };
const TYPE_LABELS = { 1: "Cu", 2: "O", 3: "Zr" };

function viridis(t) {
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(68 + t * (253 - 68) * (1 - t) + t * t * (231 - 68));
  const g = Math.round(1 + t * 215);
  const b = Math.round(84 + t * (37 - 84) + (1 - t) * (150 - 84) * t * 2);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
}
function inferno(t) {
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(t < 0.5 ? t * 2 * 200 : 200 + (t - 0.5) * 2 * 55);
  const g = Math.round(t < 0.5 ? t * 2 * 50 : 50 + (t - 0.5) * 2 * 200);
  const b = Math.round(t < 0.3 ? 80 + t * 3 * 120 : 200 - (t - 0.3) * 1.4 * 200);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
}

// --- 3D Viewport (Canvas) ---
function Viewport({ atoms, colorBy, rotation, zoom, effects, showBonds, showCell }) {
  const canvasRef = useRef(null);
  const W = 720, H = 520;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#08090e";
    ctx.fillRect(0, 0, W, H);

    // Simple projection
    const cx = W / 2, cy = H / 2;
    const cosR = Math.cos(rotation), sinR = Math.sin(rotation);
    const sc = zoom * 1.6;

    // Project atoms
    const projected = atoms.map(a => {
      const ax = a.x - 144, ay = a.y - 144, az = a.z - 128;
      const rx = ax * cosR - az * sinR;
      const rz = ax * sinR + az * cosR;
      const ry = ay;
      const depth = rz;
      const px = cx + rx * sc;
      const py = cy + ry * sc - depth * sc * 0.3;
      return { ...a, px, py, depth, rx, ry, rz };
    });
    projected.sort((a, b) => a.depth - b.depth);

    // Simulation cell
    if (showCell) {
      ctx.strokeStyle = "#1e2a40";
      ctx.lineWidth = 0.5;
      const corners = [
        [-144,-144,-128],[176,-144,-128],[176,176,-128],[-144,176,-128],
        [-144,-144,128],[176,-144,128],[176,176,128],[-144,176,128]
      ].map(([x,y,z]) => {
        const rx2 = x * cosR - z * sinR;
        const rz2 = x * sinR + z * cosR;
        return [cx + rx2 * sc, cy + y * sc - rz2 * sc * 0.3];
      });
      [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([i,j]) => {
        ctx.beginPath();
        ctx.moveTo(corners[i][0], corners[i][1]);
        ctx.lineTo(corners[j][0], corners[j][1]);
        ctx.stroke();
      });
    }

    // Bonds (simple nearest-neighbor)
    if (showBonds) {
      ctx.strokeStyle = "#1a2538";
      ctx.lineWidth = 1;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < Math.min(i + 8, projected.length); j++) {
          const dx = projected[i].px - projected[j].px;
          const dy = projected[i].py - projected[j].py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 28 * sc) {
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            ctx.moveTo(projected[i].px, projected[i].py);
            ctx.lineTo(projected[j].px, projected[j].py);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // Draw atoms
    const minPe = Math.min(...atoms.map(a => a.pe));
    const maxPe = Math.max(...atoms.map(a => a.pe));
    const minKe = Math.min(...atoms.map(a => a.ke));
    const maxKe = Math.max(...atoms.map(a => a.ke));
    const minStress = Math.min(...atoms.map(a => a.stress));
    const maxStress = Math.max(...atoms.map(a => a.stress));

    projected.forEach(a => {
      const depthFade = 0.35 + Math.max(0, Math.min(0.65, (a.depth + 160) / 320));
      let color, baseR;
      if (colorBy === "type") {
        color = TYPE_COLORS[a.type] || "#888";
        baseR = (TYPE_RADII[a.type] || 1) * 5.5;
      } else if (colorBy === "pe") {
        const t = (a.pe - minPe) / (maxPe - minPe || 1);
        color = viridis(t);
        baseR = 5.5;
      } else if (colorBy === "ke") {
        const t = (a.ke - minKe) / (maxKe - minKe || 1);
        color = inferno(t);
        baseR = 5.5;
      } else if (colorBy === "stress") {
        const t = (a.stress - minStress) / (maxStress - minStress || 1);
        color = viridis(t);
        baseR = 5.5;
      } else {
        color = "#6e8caa";
        baseR = 5.5;
      }

      const r = baseR * sc * depthFade;
      if (a.px < -20 || a.px > W + 20 || a.py < -20 || a.py > H + 20) return;

      // SSAO shadow
      if (effects.ssao) {
        ctx.globalAlpha = 0.12 * depthFade;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(a.px + 1, a.py + 2, r * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Atom sphere with highlight
      ctx.globalAlpha = depthFade;
      const grad = ctx.createRadialGradient(a.px - r * 0.3, a.py - r * 0.35, r * 0.1, a.px, a.py, r);
      grad.addColorStop(0, "#ffffff44");
      grad.addColorStop(0.3, color);
      grad.addColorStop(1, "#00000088");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(a.px, a.py, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Bloom glow overlay
    if (effects.bloom) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.06;
      projected.slice(-100).forEach(a => {
        const r = 18 * sc;
        const c = colorBy === "type" ? TYPE_COLORS[a.type] : "#4488cc";
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(a.px, a.py, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    // DOF vignette
    if (effects.dof) {
      const vg = ctx.createRadialGradient(cx, cy, H * 0.35, cx, cy, H * 0.7);
      vg.addColorStop(0, "transparent");
      vg.addColorStop(1, "rgba(8,9,14,0.5)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    // Grid overlay
    ctx.strokeStyle = "#0d1220";
    ctx.lineWidth = 0.3;
    for (let gx = 0; gx < W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
  }, [atoms, colorBy, rotation, zoom, effects, showBonds, showCell]);

  return <canvas ref={canvasRef} style={{ width: W, height: H, borderRadius: 0, display: "block" }} />;
}

// --- Thermo sparkline ---
function Sparkline({ data, dataKey, width = 130, height = 32, color = "#4db8ff" }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !data.length) return;
    const ctx = c.getContext("2d");
    const dpr = 2;
    c.width = width * dpr; c.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const vals = data.map(d => d[dataKey]);
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const range = mx - mn || 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    vals.forEach((v, i) => {
      const x = (i / (vals.length - 1)) * width;
      const y = height - ((v - mn) / range) * (height - 4) - 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data, dataKey, width, height, color]);
  return <canvas ref={canvasRef} style={{ width, height, display: "block" }} />;
}

/* ═══ MAIN APP ═══ */
export default function AtlasViewApp() {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [colorBy, setColorBy] = useState("type");
  const [rotation, setRotation] = useState(0.4);
  const [zoom, setZoom] = useState(1.0);
  const [effects, setEffects] = useState({ ssao: true, bloom: false, dof: false });
  const [showBonds, setShowBonds] = useState(false);
  const [showCell, setShowCell] = useState(true);
  const [panel, setPanel] = useState("style");
  const [showStats, setShowStats] = useState(true);
  const [fileLoaded, setFileLoaded] = useState(false);
  const totalFrames = 300;
  const thermoData = useMemo(() => generateThermo(totalFrames), []);
  const atoms = useMemo(() => generateAtoms(800, frame), [frame]);

  // Playback
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => setFrame(f => (f + 1) % totalFrames), 33);
    return () => clearInterval(iv);
  }, [playing]);

  // Mouse drag rotation
  const vpRef = useRef(null);
  const dragRef = useRef(null);
  const onMouseDown = (e) => { dragRef.current = { x: e.clientX, rot: rotation, zm: zoom }; };
  const onMouseMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    setRotation(dragRef.current.rot + dx * 0.005);
  };
  const onMouseUp = () => { dragRef.current = null; };
  const onWheel = (e) => { setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001))); };

  const currentThermo = thermoData[frame] || thermoData[0];
  const C = {
    bg: "#0a0b10", panel: "#0e1018", border: "#1a1d2a",
    text: "#8892a8", bright: "#c4cede", accent: "#4db8ff",
    green: "#5de8a0", red: "#ff5c72", gold: "#e8b84d",
    dim: "#3a3f52",
  };

  return (
    <div style={{
      width: "100%", height: "100vh", background: C.bg, color: C.text, display: "flex", flexDirection: "column",
      fontFamily: "'IBM Plex Mono', 'SF Mono', 'Consolas', monospace", fontSize: 11, overflow: "hidden", userSelect: "none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { -webkit-appearance: none; background: ${C.border}; height: 3px; border-radius: 2px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%; background: ${C.accent}; cursor: pointer; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${C.dim}; border-radius: 2px; }
      `}</style>

      {/* ─── TOP BAR ─── */}
      <div style={{
        height: 36, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 12px", borderBottom: `1px solid ${C.border}`, background: C.panel, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 600, color: C.bright, fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: -0.5 }}>
            ATLAS<span style={{ color: C.accent }}>View</span>
          </span>
          <span style={{ color: C.dim, fontSize: 9 }}>v0.1.0</span>
          <div style={{ width: 1, height: 16, background: C.border, margin: "0 4px" }} />
          {!fileLoaded ? (
            <button onClick={() => setFileLoaded(true)} style={{
              background: `${C.accent}18`, border: `1px solid ${C.accent}44`, borderRadius: 4,
              color: C.accent, padding: "2px 10px", fontSize: 10, cursor: "pointer",
            }}>Load dump.Cu3Zr.lammpstrj</button>
          ) : (
            <span style={{ color: C.text, fontSize: 10 }}>
              dump.Cu3Zr.lammpstrj — <span style={{ color: C.green }}>800 atoms</span> × <span style={{ color: C.gold }}>{totalFrames} frames</span>
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setShowStats(!showStats)} style={{
            background: "none", border: "none", color: showStats ? C.accent : C.dim, cursor: "pointer", fontSize: 10,
          }}>Stats</button>
          <button style={{
            background: C.accent, border: "none", borderRadius: 4,
            color: "#0a0b10", padding: "3px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer",
          }}>Export PNG ↓</button>
        </div>
      </div>

      {/* ─── MAIN AREA ─── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ─── VIEWPORT ─── */}
        <div style={{ flex: 1, position: "relative", background: "#08090e", overflow: "hidden" }}
          ref={vpRef}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Viewport atoms={atoms} colorBy={colorBy} rotation={rotation} zoom={zoom}
              effects={effects} showBonds={showBonds} showCell={showCell} />
          </div>

          {/* Overlay stats */}
          {showStats && (
            <div style={{
              position: "absolute", top: 8, left: 8, background: "#0a0b10cc", borderRadius: 4,
              padding: "6px 10px", border: `1px solid ${C.border}`, fontSize: 9, lineHeight: 1.8,
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ color: C.dim }}>Frame <span style={{ color: C.bright }}>{frame}</span> / {totalFrames - 1}</div>
              <div style={{ color: C.dim }}>Atoms <span style={{ color: C.green }}>800</span></div>
              <div style={{ color: C.dim }}>Renderer <span style={{ color: C.accent }}>WebGPU</span></div>
              <div style={{ color: C.dim }}>FPS <span style={{ color: C.green }}>60</span></div>
              <div style={{ color: C.dim }}>VRAM <span style={{ color: C.text }}>128 MB</span></div>
            </div>
          )}

          {/* Thermo overlay */}
          {showStats && (
            <div style={{
              position: "absolute", top: 8, right: 8, background: "#0a0b10cc", borderRadius: 4,
              padding: "6px 10px", border: `1px solid ${C.border}`, backdropFilter: "blur(8px)",
            }}>
              {[
                { key: "temp", label: "T", val: currentThermo.temp.toFixed(1), unit: "K", color: C.red },
                { key: "pe", label: "PE", val: currentThermo.pe.toFixed(3), unit: "eV", color: C.accent },
                { key: "ke", label: "KE", val: currentThermo.ke.toFixed(3), unit: "eV", color: C.green },
                { key: "press", label: "P", val: currentThermo.press.toFixed(0), unit: "bar", color: C.gold },
              ].map(t => (
                <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ color: C.dim, width: 18, fontSize: 9 }}>{t.label}</span>
                  <Sparkline data={thermoData.slice(0, frame + 1)} dataKey={t.key} color={t.color} width={80} height={18} />
                  <span style={{ color: t.color, fontSize: 9, minWidth: 52, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{t.val}</span>
                  <span style={{ color: C.dim, fontSize: 8 }}>{t.unit}</span>
                </div>
              ))}
            </div>
          )}

          {/* Axis indicator */}
          <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 9, color: C.dim }}>
            <span style={{ color: "#ff4444" }}>x</span>{" "}
            <span style={{ color: "#44ff44" }}>y</span>{" "}
            <span style={{ color: "#4488ff" }}>z</span>
          </div>
        </div>

        {/* ─── SIDE PANEL ─── */}
        <div style={{
          width: 220, background: C.panel, borderLeft: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          {/* Panel tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
            {[
              { key: "style", label: "Style" },
              { key: "effects", label: "Effects" },
              { key: "export", label: "Export" },
            ].map(t => (
              <button key={t.key} onClick={() => setPanel(t.key)} style={{
                flex: 1, padding: "7px 0", fontSize: 10, cursor: "pointer",
                background: panel === t.key ? "#14161f" : "transparent",
                border: "none", borderBottom: panel === t.key ? `2px solid ${C.accent}` : "2px solid transparent",
                color: panel === t.key ? C.bright : C.dim,
              }}>{t.label}</button>
            ))}
          </div>

          <div style={{ flex: 1, padding: 12, overflowY: "auto" }}>
            {/* STYLE PANEL */}
            {panel === "style" && (<>
              <PanelSection title="Color By">
                {["type", "pe", "ke", "stress"].map(c => (
                  <button key={c} onClick={() => setColorBy(c)} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "4px 8px",
                    background: colorBy === c ? `${C.accent}18` : "transparent",
                    border: colorBy === c ? `1px solid ${C.accent}44` : `1px solid transparent`,
                    borderRadius: 3, color: colorBy === c ? C.accent : C.text,
                    fontSize: 10, cursor: "pointer", marginBottom: 2,
                  }}>
                    {c === "type" ? "Atom Type" : c === "pe" ? "Potential Energy" : c === "ke" ? "Kinetic Energy" : "Stress (σ_xx)"}
                  </button>
                ))}
              </PanelSection>
              {colorBy === "type" && (
                <PanelSection title="Legend">
                  {Object.entries(TYPE_COLORS).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: v }} />
                      <span style={{ fontSize: 10 }}>Type {k} — {TYPE_LABELS[k]}</span>
                    </div>
                  ))}
                </PanelSection>
              )}
              {colorBy !== "type" && (
                <PanelSection title="Colormap">
                  <div style={{ height: 10, borderRadius: 2, background: `linear-gradient(90deg, ${Array.from({length:20}, (_,i) => (colorBy==="ke"?inferno:viridis)(i/19)).join(",")})`, marginBottom: 4 }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: C.dim }}>
                    <span>min</span><span>{colorBy === "ke" ? "inferno" : "viridis"}</span><span>max</span>
                  </div>
                </PanelSection>
              )}
              <PanelSection title="Display">
                <Toggle label="Simulation Cell" value={showCell} onChange={setShowCell} />
                <Toggle label="Bonds" value={showBonds} onChange={setShowBonds} />
              </PanelSection>
              <PanelSection title="Camera">
                <SliderRow label="Zoom" value={zoom} min={0.3} max={3} step={0.01} onChange={setZoom} format={v => v.toFixed(1) + "×"} />
              </PanelSection>
            </>)}

            {/* EFFECTS PANEL */}
            {panel === "effects" && (<>
              <PanelSection title="Post-Processing">
                <Toggle label="Ambient Occlusion (SSAO)" value={effects.ssao} onChange={v => setEffects(e => ({...e, ssao: v}))} />
                <Toggle label="Bloom" value={effects.bloom} onChange={v => setEffects(e => ({...e, bloom: v}))} />
                <Toggle label="Depth of Field" value={effects.dof} onChange={v => setEffects(e => ({...e, dof: v}))} />
              </PanelSection>
              <PanelSection title="Rendering">
                <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.6, padding: "4px 0" }}>
                  <div>Pipeline: <span style={{ color: C.accent }}>WebGPU Compute</span></div>
                  <div>Spheres: <span style={{ color: C.text }}>Impostor (raycast)</span></div>
                  <div>Culling: <span style={{ color: C.text }}>GPU frustum + occlusion</span></div>
                  <div>LOD: <span style={{ color: C.text }}>Distance-adaptive</span></div>
                  <div>AA: <span style={{ color: C.text }}>MSAA 4×</span></div>
                </div>
              </PanelSection>
            </>)}

            {/* EXPORT PANEL */}
            {panel === "export" && (<>
              <PanelSection title="Image Export">
                {[
                  { label: "Viewport (720×520)", res: "720×520" },
                  { label: "2K (1920×1080)", res: "1920×1080" },
                  { label: "4K (3840×2160)", res: "3840×2160" },
                  { label: "8K (7680×4320)", res: "7680×4320" },
                ].map(r => (
                  <button key={r.res} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "5px 8px",
                    background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3,
                    color: C.text, fontSize: 10, cursor: "pointer", marginBottom: 3,
                  }}>{r.label} <span style={{ float: "right", color: C.dim }}>PNG</span></button>
                ))}
              </PanelSection>
              <PanelSection title="Video Export">
                <div style={{ fontSize: 9, color: C.dim, marginBottom: 6 }}>
                  WebCodecs API — hardware-accelerated encoding
                </div>
                <button style={{
                  width: "100%", padding: "6px 8px", background: `${C.accent}18`,
                  border: `1px solid ${C.accent}44`, borderRadius: 4,
                  color: C.accent, fontSize: 10, fontWeight: 500, cursor: "pointer",
                }}>Export MP4 — {totalFrames} frames</button>
                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                  <button style={{ flex: 1, padding: "4px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, color: C.text, fontSize: 9, cursor: "pointer" }}>720p</button>
                  <button style={{ flex: 1, padding: "4px", background: `${C.accent}18`, border: `1px solid ${C.accent}44`, borderRadius: 3, color: C.accent, fontSize: 9, cursor: "pointer" }}>1080p</button>
                  <button style={{ flex: 1, padding: "4px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, color: C.text, fontSize: 9, cursor: "pointer" }}>4K</button>
                </div>
              </PanelSection>
              <PanelSection title="Share">
                <div style={{ fontSize: 9, color: C.dim, marginBottom: 4 }}>
                  Encode full scene state in URL — camera, colors, effects, frame
                </div>
                <button style={{
                  width: "100%", padding: "5px 8px", background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 3, color: C.text, fontSize: 10, cursor: "pointer",
                }}>Copy Shareable Link</button>
              </PanelSection>
            </>)}
          </div>
        </div>
      </div>

      {/* ─── TIMELINE ─── */}
      <div style={{
        height: 52, background: C.panel, borderTop: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", padding: "0 12px", gap: 10, flexShrink: 0,
      }}>
        <button onClick={() => setFrame(0)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 12 }}>⏮</button>
        <button onClick={() => setPlaying(!playing)} style={{
          background: playing ? `${C.red}22` : `${C.accent}22`,
          border: `1px solid ${playing ? C.red + "44" : C.accent + "44"}`,
          borderRadius: 4, padding: "3px 10px",
          color: playing ? C.red : C.accent, cursor: "pointer", fontSize: 11, minWidth: 36,
        }}>{playing ? "■" : "▶"}</button>
        <button onClick={() => setFrame(totalFrames - 1)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 12 }}>⏭</button>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <input type="range" min={0} max={totalFrames - 1} value={frame}
            onChange={e => { setPlaying(false); setFrame(+e.target.value); }}
            style={{ width: "100%" }}
          />
          {/* Mini thermo graph under timeline */}
          <div style={{ height: 14, position: "relative" }}>
            <svg width="100%" height="14" preserveAspectRatio="none" viewBox={`0 0 ${totalFrames} 14`}>
              <polyline fill="none" stroke={C.accent + "44"} strokeWidth="0.8"
                points={thermoData.map((d, i) => `${i},${14 - ((d.temp - 200) / 120) * 12}`).join(" ")} />
              <line x1={frame} y1={0} x2={frame} y2={14} stroke={C.accent} strokeWidth="1" />
            </svg>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9, color: C.dim, fontVariantNumeric: "tabular-nums", minWidth: 140 }}>
          <span>Step <span style={{ color: C.bright }}>{(frame * 100).toLocaleString()}</span></span>
          <span>|</span>
          <span>Frame <span style={{ color: C.bright }}>{frame}</span>/{totalFrames - 1}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable panel components ─── */
function PanelSection({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: "#5a6078", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "4px 0", cursor: "pointer", fontSize: 10,
    }}>
      <span style={{ color: value ? "#c4cede" : "#5a6078" }}>{label}</span>
      <div style={{
        width: 26, height: 14, borderRadius: 7,
        background: value ? "#4db8ff44" : "#1a1d2a",
        border: `1px solid ${value ? "#4db8ff" : "#2a2f42"}`,
        position: "relative", transition: "all 0.2s",
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: value ? "#4db8ff" : "#3a3f52",
          position: "absolute", top: 1, left: value ? 13 : 1,
          transition: "all 0.2s",
        }} />
      </div>
    </div>
  );
}

function SliderRow({ label, value, min, max, step, onChange, format }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
        <span style={{ color: "#8892a8" }}>{label}</span>
        <span style={{ color: "#c4cede", fontVariantNumeric: "tabular-nums" }}>{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)} style={{ width: "100%" }} />
    </div>
  );
}
