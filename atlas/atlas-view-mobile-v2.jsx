import { useState, useEffect, useRef, useCallback } from "react";

/* ══════════════════════════════════════════════════════════════
   ATLAS View — Mobile
   Full-bleed immersive molecular visualization
   The atoms ARE the interface. Everything else whispers.
   ══════════════════════════════════════════════════════════════ */

const D={"n":120,"bx":155.6,"by":68.8,"k":[{"t":0,"x":[-0.01,38.25,76.52,114.73,1.28,39.53,77.75,116.04,-0.04,38.26,76.49,114.76,1.25,39.53,77.81,116.04,0.01,38.23,76.5,114.75,1.3,39.54,77.78,116.01,0.05,38.23,76.51,114.76,1.26,39.51,77.78,116.01,0.01,38.22,76.5,114.76,1.29,39.51,77.78,116.01,-0.02,38.25,76.5,114.75,1.31,39.53,77.78,116.04,-0.01,38.28,76.5,114.76,1.26,39.5,77.75,116.01,0.01,38.25,76.49,114.74,1.24,39.53,77.75,116.02,-0.01,38.22,76.5,114.76,1.29,39.52,77.77,115.99,0.04,38.28,76.49,114.75,1.28,39.5,77.79,116.03,-0.03,38.28,76.5,114.74,1.28,39.51,77.77,116.04,-0.01,38.22,76.5,114.73,1.3,39.51,77.78,116.0,0.04,38.25,76.48,114.77,1.29,39.5,77.79,116.03,-0.01,38.26,76.49,114.73,1.25,39.51,77.78,116.05,0.02,38.24,76.49,114.74,1.29,39.56,77.79,116.02],"y":[0.01,0,0,-0.01,2.19,2.21,2.23,2.22,4.4,4.4,4.39,4.45,6.61,6.64,6.63,6.64,8.85,8.86,8.8,8.84,11.04,11.06,10.99,11.04,13.25,13.25,13.25,13.24,15.49,15.45,15.45,15.46,17.71,17.65,17.66,17.66,19.89,19.89,19.88,19.86,22.05,22.09,22.04,22.09,24.29,24.28,24.3,24.28,26.48,26.51,26.5,26.52,28.68,28.67,28.76,28.7,30.77,30.89,30.9,30.9,32.7,33.15,33.16,33.15,35.84,35.36,35.33,35.33,37.71,37.58,37.52,37.57,39.74,39.78,39.81,39.75,41.98,41.98,41.92,41.98,44.17,44.14,44.17,44.16,46.36,46.36,46.42,46.34,48.59,48.59,48.59,48.57,50.8,50.78,50.77,50.78,53.01,52.99,53.03,53.01,55.24,55.24,55.19,55.22,57.44,57.46,57.41,57.4,59.64,59.62,59.65,59.59,61.84,61.86,61.84,61.8,64.03,64.03,64.0,64.05],"s":[0.12,0.11,0.08,0.17,0.18,0.06,0.14,0.14,0.14,0.05,0.13,0.08,0.11,0.01,0.08,0.14,0.1,0.06,0.1,0.11,0.13,0.05,0,0.07,0.13,0.15,0.09,0.08,0.05,0.21,0.09,0.1,0.06,0.12,0.19,0.05,0.03,0.1,0.07,0.09,0.06,0.27,0.1,0.16,0.06,0.14,0.16,0.09,0.07,0.12,0.15,-0.01,0.14,0.13,0.12,0.11,0.17,0.08,0.06,0.02,0.13,0.04,0.12,0.07,1.12,0.14,0.12,0.13,0.17,0.09,0.15,0.02,0.2,0.13,0.08,0.17,0.13,0.17,0.1,0.18,0.05,0.06,0.04,0.14,0.11,0.13,0.09,0.05,0.14,0.14,0.08,0.13,0.12,0.11,0.06,0.05,0.13,0.05,-0.03,0.05,0.09,0.12,0.08,0.06,0.1,0.05,0.14,0.15,0.07,0.09,0.12,0.05,0.1,0.12,0.24,0.09,0.03,0.05,0.15,0.12]},{"t":1400,"x":[-0.02,38.22,76.54,114.77,1.23,39.5,77.76,116.03,-0.01,38.26,76.49,114.74,1.26,39.53,77.79,116.02,0,38.23,76.52,114.75,1.23,39.52,77.78,116.04,0,38.24,76.46,114.7,1.25,39.49,77.78,115.99,0.02,38.27,76.48,114.78,1.29,39.55,77.76,116.02,0,38.27,76.51,114.74,1.31,39.56,77.77,116.04,0.01,38.27,76.5,114.72,1.28,39.49,77.78,116.05,0.02,38.22,76.52,114.74,1.28,39.49,77.78,116.05,-0.07,38.2,76.46,114.73,1.3,39.47,77.77,116.02,-0.02,38.25,76.51,114.78,1.27,39.52,77.73,116.01,0.01,38.24,76.51,114.76,1.29,39.5,77.78,116.05,0.04,38.24,76.51,114.74,1.26,39.55,77.74,116.04,0.03,38.25,76.5,114.77,1.27,39.54,77.74,116.04,0.01,38.23,76.47,114.77,1.29,39.54,77.76,116.01,0,38.25,76.49,114.76,1.29,39.54,77.81,116.02],"y":[0.01,-0.01,-0.04,0.01,2.19,2.18,2.19,2.19,4.41,4.4,4.42,4.44,6.63,6.61,6.64,6.65,8.88,8.85,8.82,8.83,11.03,11.06,11.06,11.05,13.26,13.22,13.23,13.26,15.42,15.43,15.5,15.45,17.66,17.66,17.68,17.67,18.96,18.66,19.91,19.86,21.0,20.24,22.12,22.05,22.93,22.3,24.28,24.28,24.69,23.55,26.53,26.51,26.37,25.53,28.74,28.72,27.97,26.14,30.91,30.97,29.35,27.75,33.12,33.14,39.21,41.6,35.33,35.36,40.57,41.79,37.52,37.52,42.15,43.77,39.75,39.75,43.84,44.56,41.94,41.94,45.64,46.61,44.17,44.15,47.54,47.94,46.38,46.34,49.52,50.06,48.57,48.6,50.79,50.82,50.8,50.82,52.98,52.96,52.99,52.98,55.23,55.22,55.22,55.23,57.42,57.42,57.45,57.41,59.61,59.63,59.63,59.61,61.86,61.81,61.79,61.85,64.07,64.0,64.03,64.06],"s":[0.14,0.15,0.12,0.24,0.05,0.1,0.08,0.12,0.19,0.11,0.09,0.11,0.16,0.13,0.08,0.08,0.11,0.14,0.12,0.15,0.11,0.13,0.01,0.09,0.19,0.05,0.06,0.13,0.15,0.06,0.04,0.19,0.08,0.09,0.09,0.11,0.16,0.13,0.11,0.15,0.07,0.19,0.12,0.12,0.1,0.02,0.15,0.08,0.08,0.06,0.07,0,1.0,1.73,0.14,0.19,1.17,2.12,0.1,0.04,1.1,2.67,0.09,0.01,1.16,2.33,0.09,0.1,1.07,2.01,0.03,0.13,1.12,1.7,0.09,0.2,0.09,0.43,0.06,0.13,0.09,0.1,0.22,0.09,0.19,0.11,0.08,0.09,0.05,0.08,0.13,0.05,0.08,0.04,0.12,0.09,0.11,0.11,0.14,0.16,0.09,0.04,0.21,0.03,0.09,0.08,0.09,0.1,0.05,0,0.02,0.11,0.08,0.18,0.11,0.06,0.11,0.17,0.11,0.11]},{"t":2800,"x":[0.03,38.24,76.49,114.78,1.28,39.52,77.8,116.01,0.02,38.25,76.52,114.76,1.26,39.52,77.73,115.99,0.03,38.26,76.47,114.78,1.28,39.53,77.78,116.0,0,38.25,76.5,114.73,1.26,39.53,77.79,116.03,0.02,38.24,76.54,114.75,1.28,39.54,77.74,116.04,0.01,38.31,76.52,114.76,1.29,39.54,77.78,116.03,-0.03,38.23,76.51,114.76,1.25,39.51,77.76,116.03,0,38.24,76.46,114.75,1.3,39.58,77.81,116.05,-0.01,38.23,76.5,114.75,1.28,39.53,77.82,116.04,0,38.22,76.48,114.77,1.28,39.48,77.75,116.08,-0.02,38.27,76.51,114.75,1.23,39.52,77.78,116.04,0.02,38.26,76.5,114.75,1.26,39.51,77.77,116.02,0.03,38.28,76.55,114.74,1.27,39.53,77.76,116.02,0,38.22,76.48,114.75,1.27,39.54,77.77,116.0,0.01,38.25,76.5,114.73,1.3,39.5,77.8,116.01],"y":[-0.01,0.01,0.03,-0.02,2.17,2.18,2.21,2.23,4.43,4.41,4.41,4.44,6.61,6.62,6.62,6.65,8.82,8.83,8.82,8.83,9.2,9.23,11.05,11.06,11.19,11.16,13.24,13.25,13.03,13.03,15.45,15.46,14.93,14.89,17.64,17.66,16.71,16.67,19.87,19.85,18.45,18.47,22.08,22.06,20.1,20.11,24.29,24.28,21.69,21.71,26.51,26.51,23.25,23.19,28.72,28.67,24.61,24.62,30.98,30.93,25.92,25.96,33.18,33.16,42.71,42.68,35.31,35.3,43.95,43.95,37.58,37.54,45.32,45.34,39.74,39.77,46.79,46.81,41.94,41.95,48.4,48.41,44.16,44.16,50.09,50.04,46.37,46.35,51.79,51.81,48.59,48.59,53.6,53.65,50.84,50.77,55.48,55.45,53.03,53.0,57.3,57.33,55.18,55.2,59.28,59.26,57.38,57.42,61.25,61.28,59.64,59.62,61.88,61.85,61.82,61.87,64.07,64.05,64.06,64.05],"s":[0.09,0.14,0.16,0.14,0.02,0.16,0.08,-0.01,0.16,0.14,0.06,0.13,0.1,0.2,0,0.15,0.08,0.09,0.04,0.06,0.15,0.13,0.05,0.13,0.04,0.09,0.08,0.1,0.08,0.04,0.14,0.13,0.1,0.14,0.15,0.09,0.11,0.11,0.13,0.03,0.09,0.06,0.12,0.09,1.19,1.04,0.17,0.18,1.13,1.15,0.11,0.11,1.08,1.05,0.62,0.12,1.12,1.03,1.07,0.13,1.05,1.05,1.0,0.18,1.12,1.15,1.41,0.01,1.1,1.03,0.61,0.16,1.24,1.11,0.73,0.09,1.04,1.1,0.17,0.04,1.1,1.11,0.18,0.13,0.16,0.14,0,0.02,0.15,0.21,0.13,0.06,0.08,0.16,0.11,0.08,0.09,0.15,0.14,0.07,0.02,0.02,0.09,0.13,0.1,0.09,0.13,0.15,0.13,0.12,0.19,0.09,0.15,0.07,0.07,0.05,0.08,0.05,0.14,0.14]}],"th":[{"T":299,"P":-3.54,"K":0.038,"c":10},{"T":299,"P":-3.54,"K":0.039,"c":20},{"T":304,"P":-3.52,"K":0.041,"c":27},{"T":309,"P":-3.52,"K":0.04,"c":32},{"T":314,"P":-3.50,"K":0.044,"c":37},{"T":354,"P":-3.50,"K":0.068,"c":42},{"T":399,"P":-3.49,"K":0.097,"c":46},{"T":438,"P":-3.48,"K":0.119,"c":50},{"T":413,"P":-3.47,"K":0.1,"c":54},{"T":355,"P":-3.46,"K":0.069,"c":58},{"T":314,"P":-3.46,"K":0.047,"c":61},{"T":310,"P":-3.45,"K":0.041,"c":65},{"T":293,"P":-3.43,"K":0.038,"c":68},{"T":301,"P":-3.44,"K":0.038,"c":72},{"T":303,"P":-3.42,"K":0.043,"c":75}]};

const NF = 15;
const lerp = (a, b, t) => a + (b - a) * t;

function viridis(t) {
  t = Math.max(0, Math.min(1, t));
  const r = Math.min(255, Math.round(68 + t * 187 - t * t * 90));
  const g = Math.min(255, Math.round(2 + t * 230));
  const b = Math.min(255, Math.round(84 + (1 - t) * 130 * t * 2.8 + t * (37 - 84)));
  return `rgb(${r},${g},${b})`;
}

function viridisRGB(t) {
  t = Math.max(0, Math.min(1, t));
  return [
    Math.min(255, Math.round(68 + t * 187 - t * t * 90)),
    Math.min(255, Math.round(2 + t * 230)),
    Math.min(255, Math.round(84 + (1 - t) * 130 * t * 2.8 + t * (37 - 84))),
  ];
}

function getAtoms(fi) {
  const f = fi / (NF - 1);
  let A, B, lt;
  if (f <= 0.5) { A = D.k[0]; B = D.k[1]; lt = f * 2; }
  else { A = D.k[1]; B = D.k[2]; lt = (f - 0.5) * 2; }
  const o = [];
  for (let i = 0; i < D.n; i++)
    o.push({ x: lerp(A.x[i], B.x[i], lt), y: lerp(A.y[i], B.y[i], lt), s: lerp(A.s[i], B.s[i], lt) });
  return o;
}

// Inline sparkline as tiny SVG path
function Spark({ values, color, w, h, idx }) {
  const mn = Math.min(...values), mx = Math.max(...values), rng = mx - mn || 1;
  let path = "";
  values.forEach((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 1 - ((v - mn) / rng) * (h - 2);
    path += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
  });
  const cx = (idx / (values.length - 1)) * w;
  const cy = h - 1 - ((values[idx] - mn) / rng) * (h - 2);
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx={cx} cy={cy} r="3" fill={color} />
      <circle cx={cx} cy={cy} r="1.2" fill="#050710" />
    </svg>
  );
}

export default function Mobile() {
  const cvs = useRef(null);
  const wrap = useRef(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showHud, setShowHud] = useState(true);
  const timer = useRef(null);
  const hudTimer = useRef(null);

  // Auto-hide HUD after 4s of no interaction
  const touchHud = useCallback(() => {
    setShowHud(true);
    clearTimeout(hudTimer.current);
    hudTimer.current = setTimeout(() => setShowHud(false), 5000);
  }, []);

  useEffect(() => { touchHud(); return () => clearTimeout(hudTimer.current); }, []);

  // Play loop
  useEffect(() => {
    if (!playing) { clearInterval(timer.current); return; }
    timer.current = setInterval(() => setFrame(f => (f + 1) % NF), 480);
    return () => clearInterval(timer.current);
  }, [playing]);

  // Render atoms
  useEffect(() => {
    const c = cvs.current, w = wrap.current;
    if (!c || !w) return;
    const W = w.offsetWidth, H = w.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio || 2, 3);
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + "px"; c.style.height = H + "px";
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);

    // Deep black
    ctx.fillStyle = "#040610";
    ctx.fillRect(0, 0, W, H);

    // Ambient glow at crack zone
    const th = D.th[frame];
    const crackNorm = th.c / 75;
    const glowX = W * (0.08 + crackNorm * 0.5);
    const grd = ctx.createRadialGradient(glowX, H * 0.48, 0, glowX, H * 0.48, H * 0.55);
    grd.addColorStop(0, `rgba(255,70,100,${0.03 + crackNorm * 0.04})`);
    grd.addColorStop(0.5, `rgba(0,160,220,${0.015})`);
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Project atoms
    const pad = 8;
    const sc = Math.min((W - pad * 2) / D.bx, (H - pad * 2) / D.by);
    const offX = (W - D.bx * sc) / 2;
    const offY = (H - D.by * sc) / 2;

    const atoms = getAtoms(frame);
    atoms.sort((a, b) => a.s - b.s);
    const R = Math.max(3, 3.5 * sc);

    for (const a of atoms) {
      const px = offX + a.x * sc;
      const py = offY + a.y * sc;
      if (px < -R * 2 || px > W + R * 2 || py < -R * 2 || py > H + R * 2) continue;

      const norm = Math.max(0, Math.min(1, a.s / 1.5));
      const [cr, cg, cb] = viridisRGB(norm);

      // Soft shadow
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(px + 0.7, py + 1, R * 1.7, 0, Math.PI * 2);
      ctx.fill();

      // Sphere impostor
      ctx.globalAlpha = 0.95;
      const g = ctx.createRadialGradient(px - R * 0.2, py - R * 0.22, R * 0.05, px, py, R);
      g.addColorStop(0, `rgba(255,255,255,0.28)`);
      g.addColorStop(0.3, `rgb(${cr},${cg},${cb})`);
      g.addColorStop(0.85, `rgb(${cr * 0.55 | 0},${cg * 0.55 | 0},${cb * 0.55 | 0})`);
      g.addColorStop(1, `rgba(${cr * 0.3 | 0},${cg * 0.3 | 0},${cb * 0.3 | 0},0.7)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, R, 0, Math.PI * 2);
      ctx.fill();

      // High-stress glow
      if (norm > 0.6) {
        ctx.globalAlpha = (norm - 0.6) * 0.35;
        const bloom = ctx.createRadialGradient(px, py, R * 0.5, px, py, R * 2.5);
        bloom.addColorStop(0, `rgba(${cr},${cg},${cb},0.3)`);
        bloom.addColorStop(1, "transparent");
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(px, py, R * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Crack tip pulse
    const tipPx = offX + th.c * sc;
    const tipPy = offY + D.by * sc * 0.5;
    const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.3;
    const tipG = ctx.createRadialGradient(tipPx, tipPy, 0, tipPx, tipPy, 22);
    tipG.addColorStop(0, `rgba(255,84,114,${0.15 * pulse})`);
    tipG.addColorStop(1, "transparent");
    ctx.fillStyle = tipG;
    ctx.fillRect(tipPx - 24, tipPy - 24, 48, 48);

  }, [frame]);

  const th = D.th[frame];
  const hudO = showHud ? 1 : 0;
  const trans = `opacity 0.6s ease, transform 0.5s ease`;

  return (
    <div
      onClick={() => { touchHud(); setPlaying(p => !p); }}
      style={{
        position: "fixed", inset: 0, background: "#040610", overflow: "hidden",
        display: "flex", flexDirection: "column",
        fontFamily: "'SF Pro Display', -apple-system, 'Helvetica Neue', sans-serif",
        WebkitTapHighlightColor: "transparent", userSelect: "none",
        cursor: "pointer",
      }}
    >
      {/* ═══ Full-bleed viewport ═══ */}
      <div ref={wrap} style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <canvas ref={cvs} style={{ position: "absolute", inset: 0 }} />

        {/* ─── Top-left: title ─── */}
        <div style={{
          position: "absolute", top: 14, left: 16,
          opacity: hudO, transition: trans,
          transform: hudO ? "translateY(0)" : "translateY(-8px)",
          pointerEvents: "none",
        }}>
          <div style={{
            fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
            color: "rgba(220,228,240,0.85)",
          }}>
            ATLAS<span style={{ color: "rgba(0,200,240,0.9)" }}>View</span>
          </div>
        </div>

        {/* ─── Top-right: frame counter ─── */}
        <div style={{
          position: "absolute", top: 14, right: 16, textAlign: "right",
          opacity: hudO, transition: trans,
          transform: hudO ? "translateY(0)" : "translateY(-8px)",
          pointerEvents: "none",
        }}>
          <div style={{
            fontSize: 28, fontWeight: 200, letterSpacing: -2,
            color: "rgba(220,230,245,0.75)", lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}>
            {String(frame + 1).padStart(2, "0")}
            <span style={{ fontSize: 13, color: "rgba(90,110,140,0.6)", fontWeight: 400, letterSpacing: 0 }}>/{NF}</span>
          </div>
        </div>

        {/* ─── Center: play state indicator (brief) ─── */}
        {!playing && (
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 56, height: 56, borderRadius: 28,
            background: "rgba(0,200,240,0.1)",
            border: "1.5px solid rgba(0,200,240,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            pointerEvents: "none",
          }}>
            <div style={{
              width: 0, height: 0,
              borderTop: "9px solid transparent", borderBottom: "9px solid transparent",
              borderLeft: "15px solid rgba(0,200,240,0.7)",
              marginLeft: 3,
            }} />
          </div>
        )}

        {/* ─── Bottom-left: key metrics ─── */}
        <div style={{
          position: "absolute", bottom: 110, left: 16,
          opacity: hudO, transition: trans,
          transform: hudO ? "translateX(0)" : "translateX(-12px)",
          pointerEvents: "none",
        }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 8, letterSpacing: 1.5, color: "rgba(90,110,140,0.5)", textTransform: "uppercase", marginBottom: 2 }}>Crack Length</div>
            <div style={{ fontSize: 22, fontWeight: 300, color: "rgba(255,84,114,0.85)", letterSpacing: -1, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {th.c}<span style={{ fontSize: 10, color: "rgba(255,84,114,0.4)", fontWeight: 400 }}> Å</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 8, letterSpacing: 1.5, color: "rgba(90,110,140,0.5)", textTransform: "uppercase", marginBottom: 2 }}>Temperature</div>
            <div style={{ fontSize: 22, fontWeight: 300, color: "rgba(0,200,240,0.8)", letterSpacing: -1, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {th.T}<span style={{ fontSize: 10, color: "rgba(0,200,240,0.35)", fontWeight: 400 }}> K</span>
            </div>
          </div>
        </div>

        {/* ─── Bottom-right: sparks ─── */}
        <div style={{
          position: "absolute", bottom: 110, right: 16,
          opacity: hudO, transition: trans,
          transform: hudO ? "translateX(0)" : "translateX(12px)",
          pointerEvents: "none", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end",
        }}>
          {[
            { k: "T", label: "Temp", color: "rgba(255,84,114,0.7)" },
            { k: "K", label: "KE", color: "rgba(58,206,160,0.7)" },
            { k: "P", label: "PE", color: "rgba(0,200,240,0.7)" },
          ].map(s => (
            <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 7, color: "rgba(90,110,140,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</div>
              <Spark values={D.th.map(t => t[s.k])} color={s.color} w={52} h={18} idx={frame} />
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Timeline scrubber ═══ */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          height: 88, flexShrink: 0,
          padding: "0 20px",
          paddingBottom: "max(env(safe-area-inset-bottom, 12px), 12px)",
          display: "flex", flexDirection: "column", justifyContent: "center", gap: 6,
          background: "linear-gradient(to top, rgba(4,6,16,0.95), rgba(4,6,16,0.6))",
          opacity: hudO ? 1 : 0.3,
          transition: "opacity 0.6s",
        }}
      >
        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px" }}>
          {Array.from({ length: NF }, (_, i) => (
            <div
              key={i}
              onClick={(e) => { e.stopPropagation(); setPlaying(false); setFrame(i); touchHud(); }}
              style={{
                width: i === frame ? 10 : 5,
                height: i === frame ? 10 : 5,
                borderRadius: "50%",
                background: i === frame
                  ? "rgba(0,200,240,0.9)"
                  : i < frame
                    ? "rgba(0,200,240,0.25)"
                    : "rgba(90,110,140,0.15)",
                transition: "all 0.3s",
                cursor: "pointer",
                padding: 8, // touch target
                margin: -8,
                boxSizing: "content-box",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <div style={{
                width: i === frame ? 10 : 5,
                height: i === frame ? 10 : 5,
                borderRadius: "50%",
                background: i === frame
                  ? "rgba(0,200,240,0.9)"
                  : i < frame
                    ? "rgba(0,200,240,0.25)"
                    : "rgba(90,110,140,0.15)",
                boxShadow: i === frame ? "0 0 10px rgba(0,200,240,0.4)" : "none",
                transition: "all 0.3s",
              }} />
            </div>
          ))}
        </div>

        {/* Colorbar gradient strip */}
        <div style={{
          height: 3, borderRadius: 2, overflow: "hidden",
          background: `linear-gradient(90deg, 
            ${viridis(0)} 0%, ${viridis(0.25)} 25%, 
            ${viridis(0.5)} 50%, ${viridis(0.75)} 75%, 
            ${viridis(1)} 100%)`,
          opacity: 0.4,
        }} />

        {/* Labels */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 9, color: "rgba(90,110,140,0.4)", letterSpacing: 0.5,
        }}>
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 11, color: "rgba(200,210,225,0.5)" }}>
            Crack Propagation
          </span>
          <span style={{ fontVariantNumeric: "tabular-nums", color: "rgba(200,210,225,0.35)" }}>
            t = {frame * 200}
          </span>
        </div>
      </div>
    </div>
  );
}
