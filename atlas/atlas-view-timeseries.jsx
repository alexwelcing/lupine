import { useState, useEffect, useRef, useCallback } from "react";

// Real data from dump.crack2d.lammpstrj — 120 atoms, 3 keyframes, 15 thermo points
const D={"n":120,"bx":155.6,"by":68.8,"k":[{"t":0,"x":[-0.01,38.25,76.52,114.73,1.28,39.53,77.75,116.04,-0.04,38.26,76.49,114.76,1.25,39.53,77.81,116.04,0.01,38.23,76.5,114.75,1.3,39.54,77.78,116.01,0.05,38.23,76.51,114.76,1.26,39.51,77.78,116.01,0.01,38.22,76.5,114.76,1.29,39.51,77.78,116.01,-0.02,38.25,76.5,114.75,1.31,39.53,77.78,116.04,-0.01,38.28,76.5,114.76,1.26,39.5,77.75,116.01,0.01,38.25,76.49,114.74,1.24,39.53,77.75,116.02,-0.01,38.22,76.5,114.76,1.29,39.52,77.77,115.99,0.04,38.28,76.49,114.75,1.28,39.5,77.79,116.03,-0.03,38.28,76.5,114.74,1.28,39.51,77.77,116.04,-0.01,38.22,76.5,114.73,1.3,39.51,77.78,116.0,0.04,38.25,76.48,114.77,1.29,39.5,77.79,116.03,-0.01,38.26,76.49,114.73,1.25,39.51,77.78,116.05,0.02,38.24,76.49,114.74,1.29,39.56,77.79,116.02],"y":[0.01,-0.0,-0.0,-0.01,2.19,2.21,2.23,2.22,4.4,4.4,4.39,4.45,6.61,6.64,6.63,6.64,8.85,8.86,8.8,8.84,11.04,11.06,10.99,11.04,13.25,13.25,13.25,13.24,15.49,15.45,15.45,15.46,17.71,17.65,17.66,17.66,19.89,19.89,19.88,19.86,22.05,22.09,22.04,22.09,24.29,24.28,24.3,24.28,26.48,26.51,26.5,26.52,28.68,28.67,28.76,28.7,30.77,30.89,30.9,30.9,32.7,33.15,33.16,33.15,35.84,35.36,35.33,35.33,37.71,37.58,37.52,37.57,39.74,39.78,39.81,39.75,41.98,41.98,41.92,41.98,44.17,44.14,44.17,44.16,46.36,46.36,46.42,46.34,48.59,48.59,48.59,48.57,50.8,50.78,50.77,50.78,53.01,52.99,53.03,53.01,55.24,55.24,55.19,55.22,57.44,57.46,57.41,57.4,59.64,59.62,59.65,59.59,61.84,61.86,61.84,61.8,64.03,64.03,64.0,64.05],"s":[0.12,0.11,0.08,0.17,0.18,0.06,0.14,0.14,0.14,0.05,0.13,0.08,0.11,0.01,0.08,0.14,0.1,0.06,0.1,0.11,0.13,0.05,0.0,0.07,0.13,0.15,0.09,0.08,0.05,0.21,0.09,0.1,0.06,0.12,0.19,0.05,0.03,0.1,0.07,0.09,0.06,0.27,0.1,0.16,0.06,0.14,0.16,0.09,0.07,0.12,0.15,-0.01,0.14,0.13,0.12,0.11,0.17,0.08,0.06,0.02,0.13,0.04,0.12,0.07,1.12,0.14,0.12,0.13,0.17,0.09,0.15,0.02,0.2,0.13,0.08,0.17,0.13,0.17,0.1,0.18,0.05,0.06,0.04,0.14,0.11,0.13,0.09,0.05,0.14,0.14,0.08,0.13,0.12,0.11,0.06,0.05,0.13,0.05,-0.03,0.05,0.09,0.12,0.08,0.06,0.1,0.05,0.14,0.15,0.07,0.09,0.12,0.05,0.1,0.12,0.24,0.09,0.03,0.05,0.15,0.12]},{"t":1400,"x":[-0.02,38.22,76.54,114.77,1.23,39.5,77.76,116.03,-0.01,38.26,76.49,114.74,1.26,39.53,77.79,116.02,-0.0,38.23,76.52,114.75,1.23,39.52,77.78,116.04,0.0,38.24,76.46,114.7,1.25,39.49,77.78,115.99,0.02,38.27,76.48,114.78,1.29,39.55,77.76,116.02,-0.0,38.27,76.51,114.74,1.31,39.56,77.77,116.04,0.01,38.27,76.5,114.72,1.28,39.49,77.78,116.05,0.02,38.22,76.52,114.74,1.28,39.49,77.78,116.05,-0.07,38.2,76.46,114.73,1.3,39.47,77.77,116.02,-0.02,38.25,76.51,114.78,1.27,39.52,77.73,116.01,0.01,38.24,76.51,114.76,1.29,39.5,77.78,116.05,0.04,38.24,76.51,114.74,1.26,39.55,77.74,116.04,0.03,38.25,76.5,114.77,1.27,39.54,77.74,116.04,0.01,38.23,76.47,114.77,1.29,39.54,77.76,116.01,0.0,38.25,76.49,114.76,1.29,39.54,77.81,116.02],"y":[0.01,-0.01,-0.04,0.01,2.19,2.18,2.19,2.19,4.41,4.4,4.42,4.44,6.63,6.61,6.64,6.65,8.88,8.85,8.82,8.83,11.03,11.06,11.06,11.05,13.26,13.22,13.23,13.26,15.42,15.43,15.5,15.45,17.66,17.66,17.68,17.67,18.96,18.66,19.91,19.86,21.0,20.24,22.12,22.05,22.93,22.3,24.28,24.28,24.69,23.55,26.53,26.51,26.37,25.53,28.74,28.72,27.97,26.14,30.91,30.97,29.35,27.75,33.12,33.14,39.21,41.6,35.33,35.36,40.57,41.79,37.52,37.52,42.15,43.77,39.75,39.75,43.84,44.56,41.94,41.94,45.64,46.61,44.17,44.15,47.54,47.94,46.38,46.34,49.52,50.06,48.57,48.6,50.79,50.82,50.8,50.82,52.98,52.96,52.99,52.98,55.23,55.22,55.22,55.23,57.42,57.42,57.45,57.41,59.61,59.63,59.63,59.61,61.86,61.81,61.79,61.85,64.07,64.0,64.03,64.06],"s":[0.14,0.15,0.12,0.24,0.05,0.1,0.08,0.12,0.19,0.11,0.09,0.11,0.16,0.13,0.08,0.08,0.11,0.14,0.12,0.15,0.11,0.13,0.01,0.09,0.19,0.05,0.06,0.13,0.15,0.06,0.04,0.19,0.08,0.09,0.09,0.11,0.16,0.13,0.11,0.15,0.07,0.19,0.12,0.12,0.1,0.02,0.15,0.08,0.08,0.06,0.07,0.0,1.0,1.73,0.14,0.19,1.17,2.12,0.1,0.04,1.1,2.67,0.09,0.01,1.16,2.33,0.09,0.1,1.07,2.01,0.03,0.13,1.12,1.7,0.09,0.2,0.09,0.43,0.06,0.13,0.09,0.1,0.22,0.09,0.19,0.11,0.08,0.09,0.05,0.08,0.13,0.05,0.08,0.04,0.12,0.09,0.11,0.11,0.14,0.16,0.09,0.04,0.21,0.03,0.09,0.08,0.09,0.1,0.05,0.0,0.02,0.11,0.08,0.18,0.11,0.06,0.11,0.17,0.11,0.11]},{"t":2800,"x":[0.03,38.24,76.49,114.78,1.28,39.52,77.8,116.01,0.02,38.25,76.52,114.76,1.26,39.52,77.73,115.99,0.03,38.26,76.47,114.78,1.28,39.53,77.78,116.0,-0.0,38.25,76.5,114.73,1.26,39.53,77.79,116.03,0.02,38.24,76.54,114.75,1.28,39.54,77.74,116.04,0.01,38.31,76.52,114.76,1.29,39.54,77.78,116.03,-0.03,38.23,76.51,114.76,1.25,39.51,77.76,116.03,0.0,38.24,76.46,114.75,1.3,39.58,77.81,116.05,-0.01,38.23,76.5,114.75,1.28,39.53,77.82,116.04,-0.0,38.22,76.48,114.77,1.28,39.48,77.75,116.08,-0.02,38.27,76.51,114.75,1.23,39.52,77.78,116.04,0.02,38.26,76.5,114.75,1.26,39.51,77.77,116.02,0.03,38.28,76.55,114.74,1.27,39.53,77.76,116.02,-0.0,38.22,76.48,114.75,1.27,39.54,77.77,116.0,0.01,38.25,76.5,114.73,1.3,39.5,77.8,116.01],"y":[-0.01,0.01,0.03,-0.02,2.17,2.18,2.21,2.23,4.43,4.41,4.41,4.44,6.61,6.62,6.62,6.65,8.82,8.83,8.82,8.83,9.2,9.23,11.05,11.06,11.19,11.16,13.24,13.25,13.03,13.03,15.45,15.46,14.93,14.89,17.64,17.66,16.71,16.67,19.87,19.85,18.45,18.47,22.08,22.06,20.1,20.11,24.29,24.28,21.69,21.71,26.51,26.51,23.25,23.19,28.72,28.67,24.61,24.62,30.98,30.93,25.92,25.96,33.18,33.16,42.71,42.68,35.31,35.3,43.95,43.95,37.58,37.54,45.32,45.34,39.74,39.77,46.79,46.81,41.94,41.95,48.4,48.41,44.16,44.16,50.09,50.04,46.37,46.35,51.79,51.81,48.59,48.59,53.6,53.65,50.84,50.77,55.48,55.45,53.03,53.0,57.3,57.33,55.18,55.2,59.28,59.26,57.38,57.42,61.25,61.28,59.64,59.62,61.88,61.85,61.82,61.87,64.07,64.05,64.06,64.05],"s":[0.09,0.14,0.16,0.14,0.02,0.16,0.08,-0.01,0.16,0.14,0.06,0.13,0.1,0.2,0.0,0.15,0.08,0.09,0.04,0.06,0.15,0.13,0.05,0.13,0.04,0.09,0.08,0.1,0.08,0.04,0.14,0.13,0.1,0.14,0.15,0.09,0.11,0.11,0.13,0.03,0.09,0.06,0.12,0.09,1.19,1.04,0.17,0.18,1.13,1.15,0.11,0.11,1.08,1.05,0.62,0.12,1.12,1.03,1.07,0.13,1.05,1.05,1.0,0.18,1.12,1.15,1.41,0.01,1.1,1.03,0.61,0.16,1.24,1.11,0.73,0.09,1.04,1.1,0.17,0.04,1.1,1.11,0.18,0.13,0.16,0.14,0.0,0.02,0.15,0.21,0.13,0.06,0.08,0.16,0.11,0.08,0.09,0.15,0.14,0.07,0.02,0.02,0.09,0.13,0.1,0.09,0.13,0.15,0.13,0.12,0.19,0.09,0.15,0.07,0.07,0.05,0.08,0.05,0.14,0.14]}],"thermo":[{"pe":-3.5407,"ke":0.0377,"temp":299.4,"press":-43.0,"k1":0.49,"crack":10.0},{"pe":-3.5389,"ke":0.0387,"temp":298.7,"press":-37.9,"k1":0.68,"crack":20.2},{"pe":-3.5217,"ke":0.0405,"temp":303.6,"press":-20.3,"k1":0.82,"crack":26.6},{"pe":-3.5194,"ke":0.04,"temp":309.2,"press":-6.0,"k1":1.03,"crack":32.1},{"pe":-3.5031,"ke":0.0435,"temp":313.6,"press":19.5,"k1":1.26,"crack":37.0},{"pe":-3.4983,"ke":0.0682,"temp":354.2,"press":68.8,"k1":1.34,"crack":41.6},{"pe":-3.4857,"ke":0.0973,"temp":399.0,"press":137.1,"k1":1.53,"crack":45.9},{"pe":-3.4756,"ke":0.1193,"temp":437.9,"press":208.5,"k1":1.7,"crack":50.0},{"pe":-3.4719,"ke":0.0997,"temp":412.7,"press":180.0,"k1":1.96,"crack":53.9},{"pe":-3.4611,"ke":0.0687,"temp":355.4,"press":111.8,"k1":2.07,"crack":57.7},{"pe":-3.4566,"ke":0.0474,"temp":313.9,"press":123.7,"k1":2.24,"crack":61.4},{"pe":-3.4512,"ke":0.041,"temp":309.7,"press":112.9,"k1":2.51,"crack":64.9},{"pe":-3.43,"ke":0.038,"temp":293.2,"press":116.1,"k1":2.69,"crack":68.4},{"pe":-3.4358,"ke":0.0381,"temp":301.3,"press":132.6,"k1":2.86,"crack":71.7},{"pe":-3.4171,"ke":0.0426,"temp":303.1,"press":143.9,"k1":2.97,"crack":75.0}]};

const NF = D.thermo.length; // 15 frames

function lerp(a, b, t) { return a + (b - a) * t; }
function viridis(t) {
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(68 + t * 150 * (1 - t * 0.6) + t * t * 170);
  const g = Math.round(1 + t * 220);
  const b2 = Math.round(84 + t * (37 - 84) + (1 - t) * 130 * t * 2.5);
  return [Math.min(255, r), Math.min(255, g), Math.min(255, b2)];
}

// Interpolate atom positions between 3 keyframes based on frame index 0–14
function getAtoms(frameIdx) {
  const frac = frameIdx / (NF - 1); // 0→1
  let kA, kB, localT;
  if (frac <= 0.5) { kA = D.k[0]; kB = D.k[1]; localT = frac * 2; }
  else { kA = D.k[1]; kB = D.k[2]; localT = (frac - 0.5) * 2; }
  const atoms = [];
  for (let i = 0; i < D.n; i++) {
    atoms.push({
      x: lerp(kA.x[i], kB.x[i], localT),
      y: lerp(kA.y[i], kB.y[i], localT),
      s: lerp(kA.s[i], kB.s[i], localT),
    });
  }
  return atoms;
}

// Sparkline chart component
function Chart({ data, dataKey, color, label, unit, currentIdx, width = 160, height = 48 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = 2; c.width = width * dpr; c.height = height * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const vals = data.map(d => d[dataKey]);
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const range = mx - mn || 1;
    const padT = 14, padB = 2;
    const ch = height - padT - padB;
    // Fill area
    ctx.fillStyle = color + "12";
    ctx.beginPath();
    ctx.moveTo(0, height - padB);
    vals.forEach((v, i) => {
      const x = (i / (vals.length - 1)) * width;
      const y = padT + ch - ((v - mn) / range) * ch;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(width, height - padB);
    ctx.closePath(); ctx.fill();
    // Line
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath();
    vals.forEach((v, i) => {
      const x = (i / (vals.length - 1)) * width;
      const y = padT + ch - ((v - mn) / range) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Current frame dot
    const cx = (currentIdx / (vals.length - 1)) * width;
    const cy2 = padT + ch - ((vals[currentIdx] - mn) / range) * ch;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#07080d"; ctx.beginPath(); ctx.arc(cx, cy2, 1.5, 0, Math.PI * 2); ctx.fill();
    // Label
    ctx.fillStyle = "#4a5570"; ctx.font = "bold 8px 'IBM Plex Mono',monospace"; ctx.textAlign = "left";
    ctx.fillText(label, 2, 9);
    ctx.fillStyle = color; ctx.font = "600 9px 'IBM Plex Mono',monospace"; ctx.textAlign = "right";
    ctx.fillText(vals[currentIdx].toFixed(dataKey === "crack" || dataKey === "temp" ? 1 : dataKey === "k1" ? 2 : 3) + " " + unit, width - 2, 9);
  }, [data, dataKey, color, currentIdx, width, height]);
  return <canvas ref={ref} style={{ width, height, display: "block" }} />;
}

export default function TimeSeriesViewer() {
  const canvasRef = useRef(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ssao, setSsao] = useState(true);
  const playRef = useRef(null);
  const W = 680, H = 380;

  useEffect(() => {
    if (!playing) { if (playRef.current) clearInterval(playRef.current); return; }
    playRef.current = setInterval(() => setFrame(f => (f + 1) % NF), 400);
    return () => clearInterval(playRef.current);
  }, [playing]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr; c.height = H * dpr; ctx.scale(dpr, dpr);
    ctx.fillStyle = "#07080d"; ctx.fillRect(0, 0, W, H);

    const pad = 24;
    const sc = Math.min((W - pad * 2) / D.bx, (H - pad * 2) / D.by);
    const offX = (W - D.bx * sc) / 2, offY = (H - D.by * sc) / 2;

    // Grid
    ctx.strokeStyle = "#0d1018"; ctx.lineWidth = 0.3;
    for (let gx = 0; gx <= D.bx; gx += 20) { const x = offX + gx * sc; ctx.beginPath(); ctx.moveTo(x, offY); ctx.lineTo(x, offY + D.by * sc); ctx.stroke(); }
    for (let gy = 0; gy <= D.by; gy += 10) { const y = offY + gy * sc; ctx.beginPath(); ctx.moveTo(offX, y); ctx.lineTo(offX + D.bx * sc, y); ctx.stroke(); }
    ctx.strokeStyle = "#1a2238"; ctx.lineWidth = 1; ctx.strokeRect(offX, offY, D.bx * sc, D.by * sc);

    const atoms = getAtoms(frame);
    atoms.sort((a, b) => a.s - b.s);
    const R = 3.0 * sc;

    atoms.forEach(a => {
      const px = offX + a.x * sc, py = offY + a.y * sc;
      if (px < -R || px > W + R || py < -R || py > H + R) return;
      const norm = Math.max(0, Math.min(1, a.s / 1.5));
      const [cr, cg, cb] = viridis(norm);
      if (ssao) { ctx.globalAlpha = 0.2; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(px + 1, py + 1.5, R * 1.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 0.92;
      const grad = ctx.createRadialGradient(px - R * 0.25, py - R * 0.28, R * 0.08, px, py, R);
      grad.addColorStop(0, "rgba(255,255,255,0.2)");
      grad.addColorStop(0.35, `rgb(${cr},${cg},${cb})`);
      grad.addColorStop(1, `rgba(${cr >> 1},${cg >> 1},${cb >> 1},0.9)`);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Crack tip marker
    const crackLen = D.thermo[frame].crack;
    const tipPx = offX + crackLen * sc;
    ctx.strokeStyle = "#ff506833"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(tipPx, offY); ctx.lineTo(tipPx, offY + D.by * sc); ctx.stroke();
    ctx.setLineDash([]);

    // Colorbar
    const cbX = W - 22, cbY = offY + 8, cbH = H - offY * 2 - 16;
    for (let cy = 0; cy < cbH; cy++) {
      const [cr, cg, cb] = viridis(1 - cy / cbH);
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`; ctx.fillRect(cbX, cbY + cy, 8, 1);
    }
    ctx.fillStyle = "#3a4a60"; ctx.font = "8px 'IBM Plex Mono',monospace"; ctx.textAlign = "center";
    ctx.fillText("1.5", cbX + 4, cbY - 3); ctx.fillText("0", cbX + 4, cbY + cbH + 9);
  }, [frame, ssao]);

  const th = D.thermo[frame];
  const timestep = Math.round(frame * 200);

  return (
    <div style={{ background: "#060810", color: "#8a95ad", fontFamily: "'IBM Plex Mono','SF Mono',monospace", fontSize: 11, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@400;600;700&family=Instrument+Serif&display=swap');*{box-sizing:border-box;margin:0}input[type=range]{-webkit-appearance:none;background:#161e30;height:4px;border-radius:2px;outline:none}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#00c8f0;cursor:pointer;border:2px solid #060810}`}</style>

      {/* Top bar */}
      <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", borderBottom: "1px solid #141a28", background: "#0a0d16", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#e0e6f0", fontFamily: "'IBM Plex Sans',sans-serif" }}>ATLAS<span style={{ color: "#00c8f0" }}>View</span></span>
          <span style={{ color: "#1e2840" }}>|</span>
          <span style={{ fontSize: 10, color: "#5a6a85" }}>dump.crack2d.lammpstrj</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 9 }}>
          <span style={{ color: "#3acea0" }}>{D.n} atoms</span>
          <span style={{ color: "#1e2840" }}>×</span>
          <span style={{ color: "#e8b840" }}>{NF} frames</span>
          <span style={{ color: "#1e2840" }}>|</span>
          <span style={{ color: "#00c8f0" }}>WebGPU</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Viewport */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: "#07080d" }}>
            <canvas ref={canvasRef} style={{ width: W, height: H }} />
            {/* Frame info overlay */}
            <div style={{ position: "absolute", top: 10, left: 10, background: "#0a0d16cc", borderRadius: 5, padding: "6px 10px", border: "1px solid #141a28", backdropFilter: "blur(6px)", fontSize: 9, lineHeight: 1.7 }}>
              <div style={{ color: "#5a6a85" }}>Step: <span style={{ color: "#00c8f0" }}>{timestep}</span></div>
              <div style={{ color: "#5a6a85" }}>Frame: <span style={{ color: "#e0e6f0" }}>{frame + 1}</span>/{NF}</div>
              <div style={{ color: "#5a6a85" }}>Crack: <span style={{ color: "#ff5472" }}>{th.crack.toFixed(1)} Å</span></div>
              <div style={{ color: "#5a6a85" }}>K<sub>I</sub>: <span style={{ color: "#e8b840" }}>{th.k1.toFixed(2)} MPa√m</span></div>
            </div>
            <div style={{ position: "absolute", top: 10, right: 10, textAlign: "right" }}>
              <div style={{ fontSize: 18, color: "#e0e6f0", fontFamily: "'Instrument Serif',serif" }}>Crack Propagation</div>
              <div style={{ fontSize: 8, color: "#3a4a60", marginTop: 2 }}>2D EAM Copper · Mode-I Loading</div>
            </div>
            {/* SSAO toggle */}
            <button onClick={() => setSsao(!ssao)} style={{ position: "absolute", bottom: 8, left: 10, background: ssao ? "#00c8f012" : "transparent", border: `1px solid ${ssao ? "#00c8f044" : "#1a2238"}`, borderRadius: 4, padding: "3px 8px", color: ssao ? "#00c8f0" : "#3a4a60", fontSize: 8, cursor: "pointer" }}>
              SSAO {ssao ? "ON" : "OFF"}
            </button>
          </div>

          {/* Timeline */}
          <div style={{ height: 50, background: "#0a0d16", borderTop: "1px solid #141a28", display: "flex", alignItems: "center", padding: "0 14px", gap: 8, flexShrink: 0 }}>
            <button onClick={() => setFrame(f => (f - 1 + NF) % NF)} style={{ background: "none", border: "none", color: "#5a6a85", cursor: "pointer", fontSize: 13, padding: "2px 4px" }}>⏮</button>
            <button onClick={() => setPlaying(!playing)} style={{ background: playing ? "#ff547218" : "#00c8f018", border: `1px solid ${playing ? "#ff547244" : "#00c8f044"}`, borderRadius: 5, padding: "4px 12px", color: playing ? "#ff5472" : "#00c8f0", cursor: "pointer", fontSize: 12, minWidth: 38 }}>{playing ? "■" : "▶"}</button>
            <button onClick={() => setFrame(f => (f + 1) % NF)} style={{ background: "none", border: "none", color: "#5a6a85", cursor: "pointer", fontSize: 13, padding: "2px 4px" }}>⏭</button>
            <div style={{ flex: 1, padding: "0 4px" }}>
              <input type="range" min={0} max={NF - 1} step={1} value={frame}
                onChange={e => { setPlaying(false); setFrame(+e.target.value); }}
                style={{ width: "100%" }} />
              {/* Frame ticks */}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0 0", fontSize: 7, color: "#2a3248" }}>
                {D.thermo.map((_, i) => <span key={i} style={{ color: i === frame ? "#00c8f0" : "#2a3248", fontWeight: i === frame ? 700 : 400 }}>|</span>)}
              </div>
            </div>
            <div style={{ fontSize: 9, color: "#5a6a85", minWidth: 70, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              t = <span style={{ color: "#e0e6f0" }}>{timestep}</span>
            </div>
          </div>
        </div>

        {/* Thermo panel */}
        <div style={{ width: 190, background: "#0a0d16", borderLeft: "1px solid #141a28", padding: "8px 6px", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ fontSize: 8, fontWeight: 600, color: "#3a4a60", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, padding: "0 4px" }}>Thermodynamics</div>
          <Chart data={D.thermo} dataKey="temp" color="#ff5472" label="Temperature" unit="K" currentIdx={frame} width={178} height={44} />
          <Chart data={D.thermo} dataKey="pe" color="#00c8f0" label="Pot. Energy" unit="eV" currentIdx={frame} width={178} height={44} />
          <Chart data={D.thermo} dataKey="ke" color="#3acea0" label="Kin. Energy" unit="eV" currentIdx={frame} width={178} height={44} />
          <Chart data={D.thermo} dataKey="press" color="#e8b840" label="Pressure" unit="bar" currentIdx={frame} width={178} height={44} />
          <div style={{ fontSize: 8, fontWeight: 600, color: "#3a4a60", textTransform: "uppercase", letterSpacing: 1, margin: "8px 0 6px", padding: "0 4px" }}>Fracture Mechanics</div>
          <Chart data={D.thermo} dataKey="k1" color="#c084fc" label="K_I (SIF)" unit="MPa√m" currentIdx={frame} width={178} height={44} />
          <Chart data={D.thermo} dataKey="crack" color="#ff5472" label="Crack Length" unit="Å" currentIdx={frame} width={178} height={44} />
          <div style={{ marginTop: 10, padding: "0 4px" }}>
            <div style={{ fontSize: 8, fontWeight: 600, color: "#3a4a60", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Export</div>
            <button style={{ width: "100%", padding: "5px 0", background: "#00c8f012", border: "1px solid #00c8f033", borderRadius: 4, color: "#00c8f0", fontSize: 9, cursor: "pointer", marginBottom: 3 }}>PNG 4K ↓</button>
            <button style={{ width: "100%", padding: "5px 0", background: "transparent", border: "1px solid #141a28", borderRadius: 4, color: "#5a6a85", fontSize: 9, cursor: "pointer" }}>MP4 Video</button>
          </div>
        </div>
      </div>
    </div>
  );
}
