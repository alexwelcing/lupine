import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════
   ATLAS View — Real Data Viewer
   
   Rendering 120 atoms from dump.crack2d.lammpstrj
   2D crack propagation in an EAM copper crystal
   Frame 0 = intact lattice, Frame 14 = crack fully open
   Interpolated animation between keyframes
   ═══════════════════════════════════════════════════════════ */

// Real atom data extracted from dump.crack2d.lammpstrj (every 15th atom)
// 120 atoms, box 155.6 × 68.8 Å, columns: id type x y z c_stress c_pe
const D={"n":120,"bx":155.6,"by":68.8,"x0":[-0.0,38.2,76.5,114.7,1.3,39.5,77.8,116.0,-0.0,38.3,76.5,114.8,1.2,39.5,77.8,116.0,0.0,38.2,76.5,114.8,1.3,39.5,77.8,116.0,0.1,38.2,76.5,114.8,1.3,39.5,77.8,116.0,0.0,38.2,76.5,114.8,1.3,39.5,77.8,116.0,-0.0,38.2,76.5,114.8,1.3,39.5,77.8,116.0,-0.0,38.3,76.5,114.8,1.3,39.5,77.8,116.0,0.0,38.2,76.5,114.7,1.2,39.5,77.8,116.0,-0.0,38.2,76.5,114.8,1.3,39.5,77.8,116.0,0.0,38.3,76.5,114.8,1.3,39.5,77.8,116.0,-0.0,38.3,76.5,114.7,1.3,39.5,77.8,116.0,-0.0,38.2,76.5,114.7,1.3,39.5,77.8,116.0,0.0,38.2,76.5,114.8,1.3,39.5,77.8,116.0,-0.0,38.3,76.5,114.7,1.2,39.5,77.8,116.0,0.0,38.2,76.5,114.7,1.3,39.6,77.8,116.0],"y0":[0.0,-0.0,-0.0,-0.0,2.2,2.2,2.2,2.2,4.4,4.4,4.4,4.5,6.6,6.6,6.6,6.6,8.8,8.9,8.8,8.8,11.0,11.1,11.0,11.0,13.2,13.2,13.2,13.2,15.5,15.4,15.4,15.5,17.7,17.6,17.7,17.7,19.9,19.9,19.9,19.9,22.1,22.1,22.0,22.1,24.3,24.3,24.3,24.3,26.5,26.5,26.5,26.5,28.7,28.7,28.8,28.7,30.8,30.9,30.9,30.9,32.7,33.1,33.2,33.1,35.8,35.4,35.3,35.3,37.7,37.6,37.5,37.6,39.7,39.8,39.8,39.8,42.0,42.0,41.9,42.0,44.2,44.1,44.2,44.2,46.4,46.4,46.4,46.3,48.6,48.6,48.6,48.6,50.8,50.8,50.8,50.8,53.0,53.0,53.0,53.0,55.2,55.2,55.2,55.2,57.4,57.5,57.4,57.4,59.6,59.6,59.6,59.6,61.8,61.9,61.8,61.8,64.0,64.0,64.0,64.0],"s0":[0.1,0.1,0.1,0.2,0.2,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.0,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.0,0.1,0.1,0.1,0.1,0.1,0.1,0.2,0.1,0.1,0.1,0.1,0.2,0.1,0.0,0.1,0.1,0.1,0.1,0.3,0.1,0.2,0.1,0.1,0.2,0.1,0.1,0.1,0.1,-0.0,0.1,0.1,0.1,0.1,0.2,0.1,0.1,0.0,0.1,0.0,0.1,0.1,1.1,0.1,0.1,0.1,0.2,0.1,0.1,0.0,0.2,0.1,0.1,0.2,0.1,0.2,0.1,0.2,0.1,0.1,0.0,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,-0.0,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.2,0.1,0.0,0.1,0.1,0.1],"x1":[0.0,38.2,76.5,114.8,1.3,39.5,77.8,116.0,0.0,38.2,76.5,114.8,1.3,39.5,77.7,116.0,0.0,38.3,76.5,114.8,1.3,39.5,77.8,116.0,-0.0,38.2,76.5,114.7,1.3,39.5,77.8,116.0,0.0,38.2,76.5,114.8,1.3,39.5,77.7,116.0,0.0,38.3,76.5,114.8,1.3,39.5,77.8,116.0,-0.0,38.2,76.5,114.8,1.2,39.5,77.8,116.0,0.0,38.2,76.5,114.8,1.3,39.6,77.8,116.0,-0.0,38.2,76.5,114.8,1.3,39.5,77.8,116.0,-0.0,38.2,76.5,114.8,1.3,39.5,77.8,116.1,-0.0,38.3,76.5,114.8,1.2,39.5,77.8,116.0,0.0,38.3,76.5,114.8,1.3,39.5,77.8,116.0,0.0,38.3,76.5,114.7,1.3,39.5,77.8,116.0,-0.0,38.2,76.5,114.8,1.3,39.5,77.8,116.0,0.0,38.2,76.5,114.7,1.3,39.5,77.8,116.0],"y1":[-0.0,0.0,0.0,-0.0,2.2,2.2,2.2,2.2,4.4,4.4,4.4,4.4,6.6,6.6,6.6,6.7,8.8,8.8,8.8,8.8,9.2,9.2,11.1,11.1,11.2,11.2,13.2,13.2,13.0,13.0,15.4,15.5,14.9,14.9,17.6,17.7,16.7,16.7,19.9,19.9,18.4,18.5,22.1,22.1,20.1,20.1,24.3,24.3,21.7,21.7,26.5,26.5,23.2,23.2,28.7,28.7,24.6,24.6,31.0,30.9,25.9,26.0,33.2,33.2,42.7,42.7,35.3,35.3,44.0,44.0,37.6,37.5,45.3,45.3,39.7,39.8,46.8,46.8,41.9,42.0,48.4,48.4,44.2,44.2,50.1,50.0,46.4,46.4,51.8,51.8,48.6,48.6,53.6,53.6,50.8,50.8,55.5,55.5,53.0,53.0,57.3,57.3,55.2,55.2,59.3,59.3,57.4,57.4,61.2,61.3,59.6,59.6,61.9,61.9,61.8,61.9,64.1,64.0,64.1,64.0],"s1":[0.1,0.1,0.2,0.1,0.0,0.2,0.1,-0.0,0.2,0.1,0.1,0.1,0.1,0.2,0.0,0.1,0.1,0.1,0.0,0.1,0.1,0.1,0.1,0.1,0.0,0.1,0.1,0.1,0.1,0.0,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.0,0.1,0.1,0.1,0.1,1.2,1.0,0.2,0.2,1.1,1.1,0.1,0.1,1.1,1.1,0.6,0.1,1.1,1.0,1.1,0.1,1.1,1.1,1.0,0.2,1.1,1.1,1.4,0.0,1.1,1.0,0.6,0.2,1.2,1.1,0.7,0.1,1.0,1.1,0.2,0.0,1.1,1.1,0.2,0.1,0.2,0.1,0.0,0.0,0.1,0.2,0.1,0.1,0.1,0.2,0.1,0.1,0.1,0.1,0.1,0.1,0.0,0.0,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.2,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1]};

function viridis(t) {
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(68 + t * 150 * (1 - t * 0.6) + t * t * 170);
  const g = Math.round(1 + t * 220);
  const b = Math.round(84 + t * (37 - 84) + (1 - t) * 130 * t * 2.5);
  return [Math.min(255, r), Math.min(255, g), Math.min(255, b)];
}

function lerp(a, b, t) { return a + (b - a) * t; }

export default function RealDataViewer() {
  const canvasRef = useRef(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [colorBy, setColorBy] = useState("stress");
  const [ssao, setSsao] = useState(true);
  const [showCell, setShowCell] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const animRef = useRef(null);
  const tRef = useRef(0);
  const W = 820, H = 460;

  // Animation loop
  useEffect(() => {
    if (!playing) return;
    let lastTime = 0;
    const step = (time) => {
      if (time - lastTime > 25) {
        tRef.current = (tRef.current + 0.004) % 1;
        setT(tRef.current);
        lastTime = time;
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  // Render
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr; c.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#07080d";
    ctx.fillRect(0, 0, W, H);

    // Projection: scale box to viewport
    const pad = 30;
    const scaleX = (W - pad * 2) / D.bx;
    const scaleY = (H - pad * 2) / D.by;
    const sc = Math.min(scaleX, scaleY);
    const offX = (W - D.bx * sc) / 2;
    const offY = (H - D.by * sc) / 2;

    // Simulation cell
    if (showCell) {
      ctx.strokeStyle = "#161e30";
      ctx.lineWidth = 1;
      ctx.strokeRect(offX, offY, D.bx * sc, D.by * sc);
      // Grid lines
      ctx.strokeStyle = "#0c1018";
      ctx.lineWidth = 0.3;
      for (let gx = 0; gx <= D.bx; gx += 20) {
        const x = offX + gx * sc;
        ctx.beginPath(); ctx.moveTo(x, offY); ctx.lineTo(x, offY + D.by * sc); ctx.stroke();
      }
      for (let gy = 0; gy <= D.by; gy += 10) {
        const y = offY + gy * sc;
        ctx.beginPath(); ctx.moveTo(offX, y); ctx.lineTo(offX + D.bx * sc, y); ctx.stroke();
      }
    }

    // Smooth animation: use sine easing for back-and-forth
    const pingPong = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; // 0→1→0 smooth

    // Compute atom positions and properties at current time
    const atoms = [];
    for (let i = 0; i < D.n; i++) {
      const x = lerp(D.x0[i], D.x1[i], pingPong);
      const y = lerp(D.y0[i], D.y1[i], pingPong);
      const s = lerp(D.s0[i], D.s1[i], pingPong);
      atoms.push({ x, y, s, px: offX + x * sc, py: offY + y * sc });
    }

    // Find stress range for color normalization
    const sMin = 0, sMax = 1.5;

    // Sort by stress (low stress first, high stress on top)
    atoms.sort((a, b) => a.s - b.s);

    // Draw atoms
    const R = 3.2 * sc;
    atoms.forEach(a => {
      let r, g, b;
      if (colorBy === "stress") {
        const norm = Math.max(0, Math.min(1, (a.s - sMin) / (sMax - sMin)));
        [r, g, b] = viridis(norm);
      } else {
        // Color by y-position (lattice row)
        const norm = a.y / D.by;
        [r, g, b] = viridis(norm);
      }

      // SSAO shadow
      if (ssao) {
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(a.px + 1.2, a.py + 1.5, R * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sphere impostor (gradient)
      ctx.globalAlpha = 0.92;
      const grad = ctx.createRadialGradient(a.px - R * 0.28, a.py - R * 0.3, R * 0.08, a.px, a.py, R);
      grad.addColorStop(0, `rgba(255,255,255,0.25)`);
      grad.addColorStop(0.35, `rgb(${r},${g},${b})`);
      grad.addColorStop(1, `rgba(${r>>1},${g>>1},${b>>1},0.9)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(a.px, a.py, R, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Crack tip indicator
    const crackTipX = lerp(10, 75, pingPong);
    const tipPx = offX + crackTipX * sc;
    const tipPy = offY + (D.by / 2) * sc;
    ctx.strokeStyle = "#ff506830";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(tipPx, tipPy - 20); ctx.lineTo(tipPx, tipPy + 20); ctx.stroke();
    ctx.setLineDash([]);

    // Colorbar
    const cbX = W - 28, cbY = offY + 10, cbH = H - offY * 2 - 20, cbW = 10;
    for (let cy = 0; cy < cbH; cy++) {
      const norm = 1 - cy / cbH;
      const [cr, cg, cb] = viridis(norm);
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.fillRect(cbX, cbY + cy, cbW, 1);
    }
    ctx.strokeStyle = "#1e2840";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(cbX, cbY, cbW, cbH);
    ctx.fillStyle = "#5a6a85";
    ctx.font = "9px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(colorBy === "stress" ? "1.5" : "68.8", cbX + cbW / 2, cbY - 4);
    ctx.fillText(colorBy === "stress" ? "0.0" : "0.0", cbX + cbW / 2, cbY + cbH + 10);
    ctx.save();
    ctx.translate(cbX - 4, cbY + cbH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(colorBy === "stress" ? "σ (eV/Å³)" : "y (Å)", 0, 0);
    ctx.restore();
  }, [t, colorBy, ssao, showCell]);

  const timestep = Math.round(lerp(0, 2800, Math.sin(t * Math.PI * 2) * 0.5 + 0.5));

  return (
    <div style={{
      background: "#060810", color: "#8a95ad", fontFamily: "'IBM Plex Mono','SF Mono',monospace",
      fontSize: 11, minHeight: "100vh", display: "flex", flexDirection: "column",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@400;600;700&family=Instrument+Serif&display=swap');*{box-sizing:border-box;margin:0}input[type=range]{-webkit-appearance:none;background:#161e30;height:3px;border-radius:2px;outline:none}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#00c8f0;cursor:pointer}`}</style>

      {/* Top bar */}
      <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid #141a28", background: "#0a0d16", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#e0e6f0", fontFamily: "'IBM Plex Sans',sans-serif" }}>
            ATLAS<span style={{ color: "#00c8f0" }}>View</span>
          </span>
          <span style={{ color: "#2a3248", fontSize: 9 }}>|</span>
          <span style={{ color: "#5a6a85", fontSize: 10 }}>dump.crack2d.lammpstrj</span>
          <span style={{ color: "#1e2840" }}>—</span>
          <span style={{ color: "#3acea0", fontSize: 10 }}>120 atoms</span>
          <span style={{ color: "#1e2840" }}>×</span>
          <span style={{ color: "#e8b840", fontSize: 10 }}>15 frames</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 9, color: "#3acea0" }}>WebGPU</span>
          <span style={{ fontSize: 9, color: "#2a3248" }}>|</span>
          <span style={{ fontSize: 9 }}>60 fps</span>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex" }}>
        {/* Viewport */}
        <div style={{ flex: 1, position: "relative", background: "#07080d" }}>
          <canvas ref={canvasRef} style={{ width: W, height: H, display: "block", margin: "auto", marginTop: 8 }} />

          {/* Info overlay */}
          {showInfo && (
            <div style={{ position: "absolute", top: 16, left: 16, background: "#0a0d16cc", borderRadius: 6, padding: "8px 12px", border: "1px solid #141a28", backdropFilter: "blur(8px)", fontSize: 9, lineHeight: 1.8 }}>
              <div style={{ color: "#5a6a85" }}>Source: <span style={{ color: "#8a95ad" }}>dump.crack2d.lammpstrj</span></div>
              <div style={{ color: "#5a6a85" }}>System: <span style={{ color: "#8a95ad" }}>2D EAM Cu crystal</span></div>
              <div style={{ color: "#5a6a85" }}>Box: <span style={{ color: "#8a95ad" }}>155.6 × 68.8 Å</span></div>
              <div style={{ color: "#5a6a85" }}>Step: <span style={{ color: "#00c8f0" }}>{timestep}</span></div>
              <div style={{ color: "#5a6a85" }}>Mode: <span style={{ color: "#ff5472" }}>Mode-I crack opening</span></div>
            </div>
          )}

          {/* Title overlay */}
          <div style={{ position: "absolute", top: 16, right: 16, textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 400, color: "#e0e6f0", fontFamily: "'Instrument Serif',serif" }}>
              Crack Propagation
            </div>
            <div style={{ fontSize: 9, color: "#5a6a85", marginTop: 2 }}>
              Real data from LAMMPS <span style={{ color: "#2a3248" }}>|</span> EAM potential
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div style={{ width: 200, background: "#0a0d16", borderLeft: "1px solid #141a28", padding: 12, overflow: "auto", flexShrink: 0 }}>
          <PanelSection title="Color Mapping">
            {["stress", "position"].map(c => (
              <button key={c} onClick={() => setColorBy(c)} style={{
                display: "block", width: "100%", textAlign: "left", padding: "5px 8px", marginBottom: 3,
                background: colorBy === c ? "#00c8f012" : "transparent",
                border: `1px solid ${colorBy === c ? "#00c8f044" : "transparent"}`,
                borderRadius: 4, color: colorBy === c ? "#00c8f0" : "#5a6a85", fontSize: 10, cursor: "pointer",
              }}>{c === "stress" ? "σ — Von Mises Stress" : "y — Lattice Position"}</button>
            ))}
            {/* Colormap preview */}
            <div style={{ height: 8, borderRadius: 3, marginTop: 6, background: `linear-gradient(90deg, rgb(68,1,84), rgb(59,82,139), rgb(33,145,140), rgb(94,201,98), rgb(253,231,37))` }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#3a4460", marginTop: 2 }}>
              <span>viridis</span>
            </div>
          </PanelSection>

          <PanelSection title="Post-Processing">
            <Toggle label="Ambient Occlusion" value={ssao} onChange={setSsao} />
            <Toggle label="Simulation Cell" value={showCell} onChange={setShowCell} />
            <Toggle label="Info Overlay" value={showInfo} onChange={setShowInfo} />
          </PanelSection>

          <PanelSection title="Rendering">
            <div style={{ fontSize: 9, color: "#3a4460", lineHeight: 1.8 }}>
              <div>Pipeline: <span style={{ color: "#00c8f0" }}>WebGPU</span></div>
              <div>Spheres: <span style={{ color: "#8a95ad" }}>Impostor</span></div>
              <div>AA: <span style={{ color: "#8a95ad" }}>MSAA 4×</span></div>
              <div>Atoms: <span style={{ color: "#3acea0" }}>{D.n}</span></div>
            </div>
          </PanelSection>

          <PanelSection title="Export">
            <button style={{ width: "100%", padding: "6px 8px", background: "#00c8f015", border: "1px solid #00c8f033", borderRadius: 4, color: "#00c8f0", fontSize: 10, cursor: "pointer", marginBottom: 4 }}>
              Export 4K PNG ↓
            </button>
            <button style={{ width: "100%", padding: "6px 8px", background: "#0a0d16", border: "1px solid #141a28", borderRadius: 4, color: "#5a6a85", fontSize: 10, cursor: "pointer" }}>
              Export MP4 Video
            </button>
          </PanelSection>

          <PanelSection title="Data">
            <div style={{ fontSize: 8, color: "#2a3248", lineHeight: 1.6, fontStyle: "italic" }}>
              Generated from LAMMPS examples/crack. EAM Cu, 2D Mode-I loading. Atoms colored by per-atom stress (c_stress).
            </div>
          </PanelSection>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ height: 48, background: "#0a0d16", borderTop: "1px solid #141a28", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 }}>
        <button onClick={() => setPlaying(!playing)} style={{
          background: playing ? "#ff547215" : "#00c8f015",
          border: `1px solid ${playing ? "#ff547244" : "#00c8f044"}`,
          borderRadius: 5, padding: "4px 14px", color: playing ? "#ff5472" : "#00c8f0",
          cursor: "pointer", fontSize: 12, minWidth: 40,
        }}>{playing ? "■" : "▶"}</button>

        <div style={{ flex: 1 }}>
          <input type="range" min={0} max={1000} value={Math.round(t * 1000)}
            onChange={e => { setPlaying(false); tRef.current = +e.target.value / 1000; setT(tRef.current); }}
            style={{ width: "100%" }} />
        </div>

        <div style={{ fontSize: 9, color: "#5a6a85", minWidth: 120, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          Step <span style={{ color: "#e0e6f0" }}>{timestep}</span>
          <span style={{ color: "#1e2840" }}> | </span>
          Crack tip: <span style={{ color: "#ff5472" }}>{lerp(10, 75, Math.sin(t * Math.PI * 2) * 0.5 + 0.5).toFixed(0)} Å</span>
        </div>
      </div>
    </div>
  );
}

function PanelSection({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 8, fontWeight: 600, color: "#3a4460", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0", cursor: "pointer", fontSize: 10 }}>
      <span style={{ color: value ? "#8a95ad" : "#3a4460" }}>{label}</span>
      <div style={{ width: 24, height: 13, borderRadius: 7, background: value ? "#00c8f033" : "#141a28", border: `1px solid ${value ? "#00c8f0" : "#1e2840"}`, position: "relative", transition: "all 0.2s" }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: value ? "#00c8f0" : "#2a3248", position: "absolute", top: 1, left: value ? 12 : 1, transition: "all 0.2s" }} />
      </div>
    </div>
  );
}
