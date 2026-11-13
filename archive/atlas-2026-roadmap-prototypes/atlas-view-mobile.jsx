import { useState, useEffect, useRef } from "react";

const D={"n":120,"bx":155.6,"by":68.8,"k":[{"t":0,"x":[-0.01,38.25,76.52,114.73,1.28,39.53,77.75,116.04,-0.04,38.26,76.49,114.76,1.25,39.53,77.81,116.04,0.01,38.23,76.5,114.75,1.3,39.54,77.78,116.01,0.05,38.23,76.51,114.76,1.26,39.51,77.78,116.01,0.01,38.22,76.5,114.76,1.29,39.51,77.78,116.01,-0.02,38.25,76.5,114.75,1.31,39.53,77.78,116.04,-0.01,38.28,76.5,114.76,1.26,39.5,77.75,116.01,0.01,38.25,76.49,114.74,1.24,39.53,77.75,116.02,-0.01,38.22,76.5,114.76,1.29,39.52,77.77,115.99,0.04,38.28,76.49,114.75,1.28,39.5,77.79,116.03,-0.03,38.28,76.5,114.74,1.28,39.51,77.77,116.04,-0.01,38.22,76.5,114.73,1.3,39.51,77.78,116.0,0.04,38.25,76.48,114.77,1.29,39.5,77.79,116.03,-0.01,38.26,76.49,114.73,1.25,39.51,77.78,116.05,0.02,38.24,76.49,114.74,1.29,39.56,77.79,116.02],"y":[0.01,-0.0,-0.0,-0.01,2.19,2.21,2.23,2.22,4.4,4.4,4.39,4.45,6.61,6.64,6.63,6.64,8.85,8.86,8.8,8.84,11.04,11.06,10.99,11.04,13.25,13.25,13.25,13.24,15.49,15.45,15.45,15.46,17.71,17.65,17.66,17.66,19.89,19.89,19.88,19.86,22.05,22.09,22.04,22.09,24.29,24.28,24.3,24.28,26.48,26.51,26.5,26.52,28.68,28.67,28.76,28.7,30.77,30.89,30.9,30.9,32.7,33.15,33.16,33.15,35.84,35.36,35.33,35.33,37.71,37.58,37.52,37.57,39.74,39.78,39.81,39.75,41.98,41.98,41.92,41.98,44.17,44.14,44.17,44.16,46.36,46.36,46.42,46.34,48.59,48.59,48.59,48.57,50.8,50.78,50.77,50.78,53.01,52.99,53.03,53.01,55.24,55.24,55.19,55.22,57.44,57.46,57.41,57.4,59.64,59.62,59.65,59.59,61.84,61.86,61.84,61.8,64.03,64.03,64.0,64.05],"s":[0.12,0.11,0.08,0.17,0.18,0.06,0.14,0.14,0.14,0.05,0.13,0.08,0.11,0.01,0.08,0.14,0.1,0.06,0.1,0.11,0.13,0.05,0.0,0.07,0.13,0.15,0.09,0.08,0.05,0.21,0.09,0.1,0.06,0.12,0.19,0.05,0.03,0.1,0.07,0.09,0.06,0.27,0.1,0.16,0.06,0.14,0.16,0.09,0.07,0.12,0.15,-0.01,0.14,0.13,0.12,0.11,0.17,0.08,0.06,0.02,0.13,0.04,0.12,0.07,1.12,0.14,0.12,0.13,0.17,0.09,0.15,0.02,0.2,0.13,0.08,0.17,0.13,0.17,0.1,0.18,0.05,0.06,0.04,0.14,0.11,0.13,0.09,0.05,0.14,0.14,0.08,0.13,0.12,0.11,0.06,0.05,0.13,0.05,-0.03,0.05,0.09,0.12,0.08,0.06,0.1,0.05,0.14,0.15,0.07,0.09,0.12,0.05,0.1,0.12,0.24,0.09,0.03,0.05,0.15,0.12]},{"t":1400,"x":[-0.02,38.22,76.54,114.77,1.23,39.5,77.76,116.03,-0.01,38.26,76.49,114.74,1.26,39.53,77.79,116.02,-0.0,38.23,76.52,114.75,1.23,39.52,77.78,116.04,0.0,38.24,76.46,114.7,1.25,39.49,77.78,115.99,0.02,38.27,76.48,114.78,1.29,39.55,77.76,116.02,-0.0,38.27,76.51,114.74,1.31,39.56,77.77,116.04,0.01,38.27,76.5,114.72,1.28,39.49,77.78,116.05,0.02,38.22,76.52,114.74,1.28,39.49,77.78,116.05,-0.07,38.2,76.46,114.73,1.3,39.47,77.77,116.02,-0.02,38.25,76.51,114.78,1.27,39.52,77.73,116.01,0.01,38.24,76.51,114.76,1.29,39.5,77.78,116.05,0.04,38.24,76.51,114.74,1.26,39.55,77.74,116.04,0.03,38.25,76.5,114.77,1.27,39.54,77.74,116.04,0.01,38.23,76.47,114.77,1.29,39.54,77.76,116.01,0.0,38.25,76.49,114.76,1.29,39.54,77.81,116.02],"y":[0.01,-0.01,-0.04,0.01,2.19,2.18,2.19,2.19,4.41,4.4,4.42,4.44,6.63,6.61,6.64,6.65,8.88,8.85,8.82,8.83,11.03,11.06,11.06,11.05,13.26,13.22,13.23,13.26,15.42,15.43,15.5,15.45,17.66,17.66,17.68,17.67,18.96,18.66,19.91,19.86,21.0,20.24,22.12,22.05,22.93,22.3,24.28,24.28,24.69,23.55,26.53,26.51,26.37,25.53,28.74,28.72,27.97,26.14,30.91,30.97,29.35,27.75,33.12,33.14,39.21,41.6,35.33,35.36,40.57,41.79,37.52,37.52,42.15,43.77,39.75,39.75,43.84,44.56,41.94,41.94,45.64,46.61,44.17,44.15,47.54,47.94,46.38,46.34,49.52,50.06,48.57,48.6,50.79,50.82,50.8,50.82,52.98,52.96,52.99,52.98,55.23,55.22,55.22,55.23,57.42,57.42,57.45,57.41,59.61,59.63,59.63,59.61,61.86,61.81,61.79,61.85,64.07,64.0,64.03,64.06],"s":[0.14,0.15,0.12,0.24,0.05,0.1,0.08,0.12,0.19,0.11,0.09,0.11,0.16,0.13,0.08,0.08,0.11,0.14,0.12,0.15,0.11,0.13,0.01,0.09,0.19,0.05,0.06,0.13,0.15,0.06,0.04,0.19,0.08,0.09,0.09,0.11,0.16,0.13,0.11,0.15,0.07,0.19,0.12,0.12,0.1,0.02,0.15,0.08,0.08,0.06,0.07,0.0,1.0,1.73,0.14,0.19,1.17,2.12,0.1,0.04,1.1,2.67,0.09,0.01,1.16,2.33,0.09,0.1,1.07,2.01,0.03,0.13,1.12,1.7,0.09,0.2,0.09,0.43,0.06,0.13,0.09,0.1,0.22,0.09,0.19,0.11,0.08,0.09,0.05,0.08,0.13,0.05,0.08,0.04,0.12,0.09,0.11,0.11,0.14,0.16,0.09,0.04,0.21,0.03,0.09,0.08,0.09,0.1,0.05,0.0,0.02,0.11,0.08,0.18,0.11,0.06,0.11,0.17,0.11,0.11]},{"t":2800,"x":[0.03,38.24,76.49,114.78,1.28,39.52,77.8,116.01,0.02,38.25,76.52,114.76,1.26,39.52,77.73,115.99,0.03,38.26,76.47,114.78,1.28,39.53,77.78,116.0,-0.0,38.25,76.5,114.73,1.26,39.53,77.79,116.03,0.02,38.24,76.54,114.75,1.28,39.54,77.74,116.04,0.01,38.31,76.52,114.76,1.29,39.54,77.78,116.03,-0.03,38.23,76.51,114.76,1.25,39.51,77.76,116.03,0.0,38.24,76.46,114.75,1.3,39.58,77.81,116.05,-0.01,38.23,76.5,114.75,1.28,39.53,77.82,116.04,-0.0,38.22,76.48,114.77,1.28,39.48,77.75,116.08,-0.02,38.27,76.51,114.75,1.23,39.52,77.78,116.04,0.02,38.26,76.5,114.75,1.26,39.51,77.77,116.02,0.03,38.28,76.55,114.74,1.27,39.53,77.76,116.02,-0.0,38.22,76.48,114.75,1.27,39.54,77.77,116.0,0.01,38.25,76.5,114.73,1.3,39.5,77.8,116.01],"y":[-0.01,0.01,0.03,-0.02,2.17,2.18,2.21,2.23,4.43,4.41,4.41,4.44,6.61,6.62,6.62,6.65,8.82,8.83,8.82,8.83,9.2,9.23,11.05,11.06,11.19,11.16,13.24,13.25,13.03,13.03,15.45,15.46,14.93,14.89,17.64,17.66,16.71,16.67,19.87,19.85,18.45,18.47,22.08,22.06,20.1,20.11,24.29,24.28,21.69,21.71,26.51,26.51,23.25,23.19,28.72,28.67,24.61,24.62,30.98,30.93,25.92,25.96,33.18,33.16,42.71,42.68,35.31,35.3,43.95,43.95,37.58,37.54,45.32,45.34,39.74,39.77,46.79,46.81,41.94,41.95,48.4,48.41,44.16,44.16,50.09,50.04,46.37,46.35,51.79,51.81,48.59,48.59,53.6,53.65,50.84,50.77,55.48,55.45,53.03,53.0,57.3,57.33,55.18,55.2,59.28,59.26,57.38,57.42,61.25,61.28,59.64,59.62,61.88,61.85,61.82,61.87,64.07,64.05,64.06,64.05],"s":[0.09,0.14,0.16,0.14,0.02,0.16,0.08,-0.01,0.16,0.14,0.06,0.13,0.1,0.2,0.0,0.15,0.08,0.09,0.04,0.06,0.15,0.13,0.05,0.13,0.04,0.09,0.08,0.1,0.08,0.04,0.14,0.13,0.1,0.14,0.15,0.09,0.11,0.11,0.13,0.03,0.09,0.06,0.12,0.09,1.19,1.04,0.17,0.18,1.13,1.15,0.11,0.11,1.08,1.05,0.62,0.12,1.12,1.03,1.07,0.13,1.05,1.05,1.0,0.18,1.12,1.15,1.41,0.01,1.1,1.03,0.61,0.16,1.24,1.11,0.73,0.09,1.04,1.1,0.17,0.04,1.1,1.11,0.18,0.13,0.16,0.14,0.0,0.02,0.15,0.21,0.13,0.06,0.08,0.16,0.11,0.08,0.09,0.15,0.14,0.07,0.02,0.02,0.09,0.13,0.1,0.09,0.13,0.15,0.13,0.12,0.19,0.09,0.15,0.07,0.07,0.05,0.08,0.05,0.14,0.14]}],"thermo":[{"pe":-3.5407,"ke":0.0377,"temp":299.4,"press":-43.0,"k1":0.49,"crack":10.0},{"pe":-3.5389,"ke":0.0387,"temp":298.7,"press":-37.9,"k1":0.68,"crack":20.2},{"pe":-3.5217,"ke":0.0405,"temp":303.6,"press":-20.3,"k1":0.82,"crack":26.6},{"pe":-3.5194,"ke":0.04,"temp":309.2,"press":-6.0,"k1":1.03,"crack":32.1},{"pe":-3.5031,"ke":0.0435,"temp":313.6,"press":19.5,"k1":1.26,"crack":37.0},{"pe":-3.4983,"ke":0.0682,"temp":354.2,"press":68.8,"k1":1.34,"crack":41.6},{"pe":-3.4857,"ke":0.0973,"temp":399.0,"press":137.1,"k1":1.53,"crack":45.9},{"pe":-3.4756,"ke":0.1193,"temp":437.9,"press":208.5,"k1":1.7,"crack":50.0},{"pe":-3.4719,"ke":0.0997,"temp":412.7,"press":180.0,"k1":1.96,"crack":53.9},{"pe":-3.4611,"ke":0.0687,"temp":355.4,"press":111.8,"k1":2.07,"crack":57.7},{"pe":-3.4566,"ke":0.0474,"temp":313.9,"press":123.7,"k1":2.24,"crack":61.4},{"pe":-3.4512,"ke":0.041,"temp":309.7,"press":112.9,"k1":2.51,"crack":64.9},{"pe":-3.43,"ke":0.038,"temp":293.2,"press":116.1,"k1":2.69,"crack":68.4},{"pe":-3.4358,"ke":0.0381,"temp":301.3,"press":132.6,"k1":2.86,"crack":71.7},{"pe":-3.4171,"ke":0.0426,"temp":303.1,"press":143.9,"k1":2.97,"crack":75.0}]};

const NF = 15;
const lerp = (a, b, t) => a + (b - a) * t;

function viridis(t) {
  t = Math.max(0, Math.min(1, t));
  return [
    Math.min(255, Math.round(68 + t * 150 * (1 - t * 0.6) + t * t * 170)),
    Math.min(255, Math.round(1 + t * 220)),
    Math.min(255, Math.round(84 + t * (37 - 84) + (1 - t) * 130 * t * 2.5)),
  ];
}

function getAtoms(fi) {
  const frac = fi / (NF - 1);
  let kA, kB, lt;
  if (frac <= 0.5) { kA = D.k[0]; kB = D.k[1]; lt = frac * 2; }
  else { kA = D.k[1]; kB = D.k[2]; lt = (frac - 0.5) * 2; }
  const out = [];
  for (let i = 0; i < D.n; i++)
    out.push({ x: lerp(kA.x[i], kB.x[i], lt), y: lerp(kA.y[i], kB.y[i], lt), s: lerp(kA.s[i], kB.s[i], lt) });
  return out;
}

function MiniSpark({ data, k, color, w = 60, h = 18 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = 3; c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const vals = data.map(d => d[k]);
    const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
    ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.beginPath();
    vals.forEach((v, i) => {
      const x = (i / (vals.length - 1)) * w, y = h - 2 - ((v - mn) / rng) * (h - 4);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }); ctx.stroke();
  }, [data, k, w, h, color]);
  return <canvas ref={ref} style={{ width: w, height: h, display: "block" }} />;
}

export default function MobileViewer() {
  const ref = useRef(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!playing) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setFrame(f => (f + 1) % NF), 450);
    return () => clearInterval(timerRef.current);
  }, [playing]);

  // Render
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const rect = c.parentElement.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 2;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + "px"; c.style.height = H + "px";
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#050710"; ctx.fillRect(0, 0, W, H);

    // Subtle radial glow behind crack zone
    const grd = ctx.createRadialGradient(W * 0.35, H * 0.5, 0, W * 0.35, H * 0.5, H * 0.6);
    grd.addColorStop(0, "rgba(0,200,240,0.025)"); grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

    const pad = 12;
    const sc = Math.min((W - pad * 2) / D.bx, (H - pad * 2) / D.by);
    const offX = (W - D.bx * sc) / 2, offY = (H - D.by * sc) / 2;

    // Faint cell
    ctx.strokeStyle = "#0f1520"; ctx.lineWidth = 0.5;
    ctx.strokeRect(offX, offY, D.bx * sc, D.by * sc);

    const atoms = getAtoms(frame);
    atoms.sort((a, b) => a.s - b.s);
    const R = Math.max(2.8, 3.2 * sc);

    atoms.forEach(a => {
      const px = offX + a.x * sc, py = offY + a.y * sc;
      if (px < -R * 2 || px > W + R * 2 || py < -R * 2 || py > H + R * 2) return;
      const norm = Math.max(0, Math.min(1, a.s / 1.5));
      const [cr, cg, cb] = viridis(norm);

      // Shadow
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(px + 0.8, py + 1.2, R * 1.6, 0, Math.PI * 2); ctx.fill();

      // Sphere
      ctx.globalAlpha = 0.94;
      const g = ctx.createRadialGradient(px - R * 0.22, py - R * 0.25, R * 0.05, px, py, R);
      g.addColorStop(0, `rgba(255,255,255,0.22)`);
      g.addColorStop(0.32, `rgb(${cr},${cg},${cb})`);
      g.addColorStop(1, `rgba(${cr >> 1},${cg >> 1},${cb >> 1},0.85)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Crack tip glow
    const crackLen = D.thermo[frame].crack;
    const tipX = offX + crackLen * sc, tipY = offY + D.by * sc * 0.5;
    const tipGlow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 28);
    tipGlow.addColorStop(0, "rgba(255,84,114,0.18)"); tipGlow.addColorStop(1, "transparent");
    ctx.fillStyle = tipGlow; ctx.fillRect(tipX - 30, tipY - 30, 60, 60);

  }, [frame]);

  const th = D.thermo[frame];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#050710", overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: "'SF Pro Text', -apple-system, system-ui, sans-serif",
      color: "#8090aa", WebkitTapHighlightColor: "transparent",
    }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        input[type=range]{-webkit-appearance:none;background:transparent;height:44px;width:100%;padding:0;margin:0}
        input[type=range]::-webkit-slider-runnable-track{height:3px;background:#141c2c;border-radius:2px}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#00c8f0;margin-top:-9px;border:3px solid #050710;box-shadow:0 0 12px #00c8f066}
      `}</style>

      {/* ─── Top bar: ultra-minimal ─── */}
      <div style={{
        height: 44, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, color: "#d8e0ee" }}>
          ATLAS<span style={{ color: "#00c8f0" }}>View</span>
        </div>
        <div style={{ fontSize: 11, color: "#3a4860", fontVariantNumeric: "tabular-nums" }}>
          {D.n} atoms · {NF}f
        </div>
      </div>

      {/* ─── Viewport: fills all space ─── */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <canvas ref={ref} />
        </div>

        {/* Floating info — top left, very subtle */}
        <div style={{
          position: "absolute", top: 8, left: 12,
          fontSize: 10, lineHeight: 1.7, color: "#4a5a78",
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: 20, fontWeight: 300, color: "#c8d4e4", letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 4,
            fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}>
            Crack Propagation
          </div>
          <div>2D Cu · EAM · Mode-I</div>
        </div>

        {/* Floating metrics — top right */}
        <div style={{
          position: "absolute", top: 8, right: 12, textAlign: "right",
          fontSize: 10, lineHeight: 1.8, pointerEvents: "none",
        }}>
          <div>
            <span style={{ color: "#3a4860" }}>K</span>
            <sub style={{ color: "#3a4860", fontSize: 8 }}>I</sub>
            <span style={{ color: "#c084fc", fontWeight: 600, fontVariantNumeric: "tabular-nums", marginLeft: 4 }}>{th.k1.toFixed(2)}</span>
            <span style={{ color: "#3a4860", fontSize: 8 }}> MPa√m</span>
          </div>
          <div>
            <span style={{ color: "#3a4860" }}>crack </span>
            <span style={{ color: "#ff5472", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{th.crack.toFixed(0)}</span>
            <span style={{ color: "#3a4860", fontSize: 8 }}> Å</span>
          </div>
        </div>

        {/* Colorbar — right edge, very thin */}
        <div style={{
          position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
          width: 4, height: 120, borderRadius: 2, overflow: "hidden",
          background: "linear-gradient(to bottom, rgb(253,231,37), rgb(33,145,140), rgb(68,1,84))",
          opacity: 0.5, pointerEvents: "none",
        }} />
      </div>

      {/* ─── Thermo strip: 4 micro-charts ─── */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-around",
        padding: "0 8px", borderTop: "1px solid #0c1018", flexShrink: 0,
        background: "#070a12",
      }}>
        {[
          { k: "temp", label: "T", val: th.temp.toFixed(0), unit: "K", color: "#ff5472" },
          { k: "pe", label: "PE", val: th.pe.toFixed(2), unit: "eV", color: "#00c8f0" },
          { k: "ke", label: "KE", val: th.ke.toFixed(3), unit: "eV", color: "#3acea0" },
          { k: "press", label: "P", val: th.press.toFixed(0), unit: "bar", color: "#e8b840" },
        ].map(t => (
          <div key={t.k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <MiniSpark data={D.thermo} k={t.k} color={t.color} w={48} h={20} />
            <div style={{ minWidth: 44 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{t.val}</div>
              <div style={{ fontSize: 7, color: "#3a4860", letterSpacing: 0.5 }}>{t.label} {t.unit}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Timeline: full-width touch scrubber ─── */}
      <div style={{
        height: 64, display: "flex", alignItems: "center",
        padding: "0 12px", gap: 10, flexShrink: 0,
        background: "#060810",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
      }}>
        <button onClick={() => setPlaying(!playing)} style={{
          width: 40, height: 40, borderRadius: 20, border: "none",
          background: playing ? "#ff547220" : "#00c8f020",
          color: playing ? "#ff5472" : "#00c8f0",
          fontSize: 16, cursor: "pointer", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {playing ? "■" : "▶"}
        </button>

        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="range" min={0} max={NF - 1} step={1} value={frame}
            onChange={e => { setPlaying(false); setFrame(+e.target.value); }}
            style={{ width: "100%" }}
          />
          {/* Progress fill */}
          <div style={{
            position: "absolute", left: 0, top: "50%", marginTop: -1.5, height: 3,
            width: `${(frame / (NF - 1)) * 100}%`,
            background: "linear-gradient(90deg, #00c8f0, #3acea0)",
            borderRadius: 2, pointerEvents: "none",
          }} />
        </div>

        <div style={{
          fontSize: 13, fontWeight: 600, color: "#d0d8e8",
          fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right",
          flexShrink: 0,
        }}>
          {frame + 1}<span style={{ fontSize: 9, color: "#3a4860", fontWeight: 400 }}>/{NF}</span>
        </div>
      </div>
    </div>
  );
}
