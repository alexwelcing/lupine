import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════
   ATLAS View — Example Gallery
   12 curated LAMMPS simulations for the launch website
   ═══════════════════════════════════════════════════════════ */

const C = {
  bg: "#06080c", bg2: "#0b0e16", bg3: "#10141e",
  card: "#0c0f18", cardHover: "#111622",
  border: "#161c2c", borderLight: "#1e2740",
  text: "#9aa3b8", bright: "#d0d8e8", white: "#f0f4fa",
  dim: "#4a5368", dimmer: "#2a3044",
  accent: "#00c8f0", accentDim: "#00c8f044",
  green: "#3ddea0", red: "#ff5472", gold: "#f0b840",
  violet: "#9b7cf0", orange: "#f08c3a", cyan: "#40d8e8",
  pink: "#f06090",
};

const DOMAINS = {
  "Fracture": { color: C.red, icon: "💥" },
  "Nanomechanics": { color: C.orange, icon: "🔨" },
  "Phase Transition": { color: C.gold, icon: "🔥" },
  "Granular": { color: C.green, icon: "⚙" },
  "Soft Matter": { color: C.pink, icon: "🫧" },
  "Fluid Dynamics": { color: C.cyan, icon: "🌊" },
  "Colloids": { color: C.violet, icon: "◉" },
  "Polymer": { color: C.orange, icon: "🧬" },
  "Nanomaterials": { color: C.accent, icon: "⬡" },
  "Plasticity": { color: C.red, icon: "⟐" },
  "Biomolecular": { color: C.green, icon: "🧪" },
  "Ionic": { color: C.gold, icon: "⊕" },
};

const EXAMPLES = [
  { id:"crack", title:"Crack Propagation", domain:"Fracture", atoms:16900, frames:100,
    desc:"Mode-I crack opening in a 2D EAM copper crystal. The crack tip stress concentration drives atomic separation.",
    colorBy:"Potential Energy", colormap:"viridis", potential:"EAM (Cu)", source:"examples/crack", hero:true },
  { id:"indent", title:"Nanoindentation", domain:"Nanomechanics", atoms:11760, frames:80,
    desc:"Spherical indenter pushes into a 2D solid surface, displaces the lattice, then retracts. Partial healing observed.",
    colorBy:"Atom Type", colormap:"type", potential:"LJ", source:"examples/indent" },
  { id:"melt", title:"Rapid Melt", domain:"Phase Transition", atoms:32000, frames:100,
    desc:"FCC lattice heated to 3.0 ε/k_B. Order → disorder transition as the crystal melts into a Lennard-Jones liquid.",
    colorBy:"Kinetic Energy", colormap:"inferno", potential:"LJ", source:"examples/melt" },
  { id:"pour", title:"Granular Pour", domain:"Granular", atoms:10000, frames:150,
    desc:"Macroscopic granular particles pour into a 3D container, collide, settle, then flow down a chute.",
    colorBy:"Atom Type", colormap:"type", potential:"Hertz", source:"examples/pour" },
  { id:"micelle", title:"Micelle Self-Assembly", domain:"Soft Matter", atoms:4800, frames:200,
    desc:"Random lipid-like molecules spontaneously form bilayer membranes and vesicles. Emergent mesoscale order.",
    colorBy:"Atom Type", colormap:"type", potential:"LJ (CG)", source:"examples/micelle" },
  { id:"flow", title:"Couette Flow", domain:"Fluid Dynamics", atoms:8000, frames:100,
    desc:"Poiseuille and Couette flow in a 2D channel. Moving walls drive a velocity gradient across the fluid.",
    colorBy:"Velocity (vx)", colormap:"coolwarm", potential:"LJ", source:"examples/flow" },
  { id:"colloid", title:"Colloid in Solvent", domain:"Colloids", atoms:5000, frames:50,
    desc:"Large colloidal particles suspended in a bath of small solvent particles. Brownian motion at the mesoscale.",
    colorBy:"Atom Type", colormap:"type", potential:"LJ", source:"examples/colloid" },
  { id:"polymer", title:"Polymer in Water", domain:"Polymer", atoms:15000, frames:100,
    desc:"A PEG-like polymer chain solvated in TIP4P/2005 water. Chain coils, unfolds, and diffuses through solvent.",
    colorBy:"Molecule", colormap:"type", potential:"OPLS-AA + TIP4P", source:"lammpstutorials/03" },
  { id:"cnt", title:"CNT Tensile Pull", domain:"Nanomaterials", atoms:2000, frames:200,
    desc:"Carbon nanotube under uniaxial tension. Bonds stretch and eventually break in a dramatic failure event.",
    colorBy:"Per-atom Stress", colormap:"viridis", potential:"AIREBO", source:"lammpstutorials/02" },
  { id:"shear", title:"Shear + Void Growth", domain:"Plasticity", atoms:16000, frames:100,
    desc:"2D solid with a central void sheared sideways. Plastic deformation and dislocation nucleation from the void surface.",
    colorBy:"Potential Energy", colormap:"viridis", potential:"LJ", source:"examples/shear" },
  { id:"peptide", title:"Solvated Peptide", domain:"Biomolecular", atoms:2004, frames:50,
    desc:"A 5-residue peptide chain solvated in explicit water. Backbone dynamics and hydrogen bond fluctuations.",
    colorBy:"Residue", colormap:"type", potential:"CHARMM", source:"examples/peptide" },
  { id:"nacl", title:"NaCl Crystal", domain:"Ionic", atoms:8000, frames:20,
    desc:"Rock salt crystal structure modeled with the EIM potential. Na⁺ and Cl⁻ ions in alternating lattice positions.",
    colorBy:"Atom Type", colormap:"type", potential:"EIM", source:"examples/eim" },
  { id:"multielement", title:"Multielement Nanoparticle", domain:"Nanomaterials", atoms:4100, frames:100,
    desc:"A 3-element core-shell nanoparticle undergoing thermal diffusion. Demonstrates multi-element scalar mapping over time.",
    colorBy:"Heat / Charge", colormap:"inferno", potential:"custom", source:"advanced_samples/dump.multielement_nanoparticle" },
  { id:"bondstrength", title:"Dynamic Bond Failure", domain:"Nanomaterials", atoms:2500, frames:100,
    desc:"Carbon nanotube stretched until yielding. Colored by dynamic per-atom bond strength parameters over time.",
    colorBy:"Bond Strength", colormap:"viridis", potential:"custom", source:"advanced_samples/dump.bondstrength_nanotube" },
];

/* ─── Canvas thumbnail renderers ─── */
function renderAtoms(ctx, w, h, config, time) {
  ctx.fillStyle = "#08090e";
  ctx.fillRect(0, 0, w, h);
  const { seed, pattern, colors, count, motion } = config;
  const cx = w / 2, cy = h / 2;

  for (let i = 0; i < count; i++) {
    const s = seed + i;
    let x, y, r, col;

    if (pattern === "crack") {
      const row = Math.floor(i / 40);
      const col2 = i % 40;
      x = col2 * (w / 40) + (row % 2) * (w / 80);
      y = row * (h / 25);
      const crackX = w * 0.3 + time * w * 0.002;
      const distToCrack = Math.abs(y - h / 2) + Math.max(0, crackX - x) * 0.3;
      const isCracked = x < crackX && Math.abs(y - h / 2) < 12 + (crackX - x) * 0.15;
      if (isCracked) { y += (y > h / 2 ? 1 : -1) * (6 + Math.sin(i) * 3); }
      const stress = isCracked ? 1 : Math.max(0, 1 - distToCrack / 80);
      r = 3.5;
      const t = stress;
      col = `rgb(${68 + t * 185},${t < 0.5 ? 1 + t * 2 * 200 : 200 - (t-0.5)*2*200},${84 - t * 50})`;
    } else if (pattern === "lattice2d") {
      const row = Math.floor(i / 30);
      const col2 = i % 30;
      x = 20 + col2 * ((w - 40) / 29) + Math.sin(s * 0.7 + time * 0.03) * motion;
      y = 10 + row * ((h - 20) / 19) + Math.cos(s * 1.1 + time * 0.03) * motion;
      r = 3.5;
      col = colors[Math.floor(s * 0.3) % colors.length];
    } else if (pattern === "melt3d") {
      const phase = Math.min(1, time / 40);
      const lx = (i % 10) * (w / 10) + 10;
      const ly = (Math.floor(i / 10) % 10) * (h / 10) + 10;
      const rx = (Math.sin(s * 1.7) * w * 0.4 + cx);
      const ry = (Math.cos(s * 2.3) * h * 0.4 + cy);
      x = lx * (1 - phase) + rx * phase + Math.sin(s * 0.9 + time * 0.08) * motion * phase;
      y = ly * (1 - phase) + ry * phase + Math.cos(s * 1.3 + time * 0.08) * motion * phase;
      const ke = phase * (0.3 + Math.sin(s * 0.5 + time * 0.1) * 0.3);
      r = 3.5;
      col = `rgb(${Math.floor(ke * 255)},${Math.floor(ke * 80)},${Math.floor(30 + ke * 40)})`;
    } else if (pattern === "pour") {
      const fallT = Math.max(0, time - i * 0.15);
      const gy = Math.min(h - 10 - (count - i) * 0.3, 10 + fallT * 3);
      x = cx + Math.sin(s * 2.1) * (w * 0.35) + Math.sin(time * 0.05 + s) * 2;
      y = Math.max(8, gy + Math.sin(s * 1.4) * 5);
      r = 4 + (s % 3) * 1.5;
      col = colors[s % colors.length];
    } else if (pattern === "micelle") {
      const angle = (i / count) * Math.PI * 2 + time * 0.01;
      const clusterR = 30 + Math.sin(i * 0.1 + time * 0.02) * 15;
      const clusterCx = cx + Math.cos(angle * 0.3 + s * 0.01) * (w * 0.25);
      const clusterCy = cy + Math.sin(angle * 0.5 + s * 0.01) * (h * 0.25);
      const inCluster = (i % 5 !== 0);
      if (inCluster) {
        const a2 = (i * 2.4) + time * 0.005;
        x = clusterCx + Math.cos(a2) * (8 + (i % 7) * 2);
        y = clusterCy + Math.sin(a2) * (8 + (i % 7) * 2);
      } else {
        x = Math.sin(s * 1.7 + time * 0.02) * (w * 0.4) + cx;
        y = Math.cos(s * 2.3 + time * 0.02) * (h * 0.4) + cy;
      }
      r = inCluster ? 3 : 2;
      col = colors[(i % 3 === 0) ? 0 : 1];
    } else if (pattern === "flow") {
      const row = Math.floor(i / 40);
      const col2 = i % 40;
      const yBase = 8 + row * ((h - 16) / 20);
      const vx = Math.sin((yBase / h) * Math.PI) * 3;
      x = (col2 * (w / 39) + time * vx * 0.5) % w;
      y = yBase + Math.sin(s * 0.8 + time * 0.05) * 1.5;
      r = 3;
      const vNorm = Math.abs(vx) / 3;
      col = vNorm > 0.5 ? `rgb(${180 + vNorm * 75},${80 - vNorm * 60},${80 - vNorm * 60})` : `rgb(${80 - vNorm * 60},${80 - vNorm * 60},${180 + vNorm * 75})`;
    } else if (pattern === "colloid") {
      const isBig = i < 8;
      if (isBig) {
        x = (w / 4) + (i % 3) * (w / 3) + Math.sin(time * 0.02 + i) * 8;
        y = (h / 3) + Math.floor(i / 3) * (h / 3) + Math.cos(time * 0.02 + i) * 8;
        r = 18;
        col = colors[0];
      } else {
        x = Math.sin(s * 1.3 + time * 0.04) * (w * 0.42) + cx;
        y = Math.cos(s * 1.7 + time * 0.04) * (h * 0.42) + cy;
        r = 2;
        col = colors[1];
      }
    } else if (pattern === "cnt") {
      const along = (i % 40) / 39;
      const around = Math.floor(i / 40) / (count / 40) * Math.PI * 2;
      const stretch = 1 + time * 0.003;
      const breakPoint = 0.6;
      const broken = stretch > 1.3 && Math.abs(along - breakPoint) < 0.05;
      x = 20 + along * (w - 40) * Math.min(stretch, 1.4);
      y = cy + Math.cos(around) * 20 + (broken ? (Math.random() - 0.5) * 15 : 0);
      r = 3;
      const stress = Math.abs(along - breakPoint) < 0.15 ? 1 : 0.2;
      col = broken ? C.red : `rgb(${68 + stress * 185},${200 - stress * 180},${84})`;
    } else if (pattern === "nacl") {
      const gx = i % 12, gy = Math.floor(i / 12) % 12;
      x = 30 + gx * ((w - 60) / 11);
      y = 15 + gy * ((h - 30) / 11);
      r = 4;
      col = (gx + gy) % 2 === 0 ? colors[0] : colors[1];
    } else {
      x = Math.sin(s * 1.3 + time * 0.03) * (w * 0.38) + cx;
      y = Math.cos(s * 1.7 + time * 0.03) * (h * 0.38) + cy;
      r = 3;
      col = colors[i % colors.length];
    }

    if (x < -r || x > w + r || y < -r || y > h + r) continue;

    ctx.globalAlpha = 0.85;
    const grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, "#ffffff30");
    grad.addColorStop(0.4, col);
    grad.addColorStop(1, "#00000080");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const CONFIGS = {
  crack:   { seed:0, pattern:"crack", colors:[C.accent,C.green], count:600, motion:1 },
  indent:  { seed:100, pattern:"lattice2d", colors:[C.accent,"#6090d0"], count:400, motion:2 },
  melt:    { seed:200, pattern:"melt3d", colors:[C.red,C.orange], count:300, motion:5 },
  pour:    { seed:300, pattern:"pour", colors:[C.green,C.gold,C.orange], count:200, motion:2 },
  micelle: { seed:400, pattern:"micelle", colors:[C.pink,C.cyan], count:300, motion:1 },
  flow:    { seed:500, pattern:"flow", colors:[C.accent,C.red], count:500, motion:1 },
  colloid: { seed:600, pattern:"colloid", colors:[C.violet,"#405880"], count:200, motion:1 },
  polymer: { seed:700, pattern:"melt3d", colors:[C.orange,C.accent], count:250, motion:3 },
  cnt:     { seed:800, pattern:"cnt", colors:[C.accent,C.green], count:280, motion:1 },
  shear:   { seed:900, pattern:"lattice2d", colors:["#5070c0",C.red], count:400, motion:3 },
  peptide: { seed:1000, pattern:"melt3d", colors:[C.green,"#4080a0"], count:150, motion:2 },
  nacl:    { seed:1100, pattern:"nacl", colors:[C.accent,C.green], count:144, motion:0 },
  multielement: { seed:1200, pattern:"colloid", colors:[C.orange, C.green, C.cyan], count:250, motion:0 },
  bondstrength: { seed:1300, pattern:"cnt", colors:[C.accent, C.red], count:280, motion:1 },
};

/* ─── Animated thumbnail ─── */
function Thumbnail({ id, playing }) {
  const ref = useRef(null);
  const frameRef = useRef(0);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = 2;
    const w = 280, h = 180;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const cfg = CONFIGS[id] || CONFIGS.melt;

    const draw = () => {
      frameRef.current += 0.5;
      renderAtoms(ctx, w, h, cfg, frameRef.current);
      if (playing) animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [id, playing]);

  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block", borderRadius: "8px 8px 0 0" }} />;
}

/* ─── Gallery Card ─── */
function Card({ example, onOpen, featured }) {
  const [hovered, setHovered] = useState(false);
  const domain = DOMAINS[example.domain] || { color: C.dim, icon: "•" };

  if (featured) {
    return (
      <div
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onClick={() => onOpen(example)}
        style={{
          gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr",
          background: C.card, border: `1px solid ${hovered ? C.accent + "66" : C.border}`,
          borderRadius: 12, overflow: "hidden", cursor: "pointer",
          transition: "all 0.4s", transform: hovered ? "translateY(-2px)" : "none",
          boxShadow: hovered ? `0 8px 40px ${C.accent}15` : "none",
        }}
      >
        <div style={{ height: 280, position: "relative" }}>
          <Thumbnail id={example.id} playing={hovered} />
          <div style={{
            position: "absolute", bottom: 10, left: 10,
            background: "#06080ccc", borderRadius: 4, padding: "3px 8px",
            fontSize: 9, color: C.dim, fontFamily: "'IBM Plex Mono', monospace",
            backdropFilter: "blur(4px)",
          }}>
            {example.atoms.toLocaleString()} atoms × {example.frames} frames
          </div>
          {hovered && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: "#06080c55", backdropFilter: "blur(2px)",
            }}>
              <div style={{
                background: C.accent, color: C.bg, padding: "8px 20px", borderRadius: 6,
                fontSize: 13, fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif",
              }}>Open in Viewer →</div>
            </div>
          )}
        </div>
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
              color: domain.color, background: domain.color + "18", border: `1px solid ${domain.color}33`,
              borderRadius: 3, padding: "2px 8px", fontFamily: "'IBM Plex Mono', monospace",
            }}>{domain.icon} {example.domain}</span>
            <span style={{ fontSize: 9, color: C.gold, fontFamily: "'IBM Plex Mono', monospace" }}>★ FEATURED</span>
          </div>
          <h3 style={{
            fontSize: 26, fontWeight: 700, color: C.white, margin: "0 0 10px",
            fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif",
          }}>{example.title}</h3>
          <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, margin: "0 0 16px", fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {example.desc}
          </p>
          <div style={{
            display: "flex", gap: 16, fontSize: 10, color: C.dim,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            <span>Color: <span style={{ color: C.text }}>{example.colorBy}</span></span>
            <span>Potential: <span style={{ color: C.text }}>{example.potential}</span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(example)}
      style={{
        background: C.card, border: `1px solid ${hovered ? domain.color + "55" : C.border}`,
        borderRadius: 10, overflow: "hidden", cursor: "pointer",
        transition: "all 0.35s", transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? `0 6px 30px ${domain.color}12` : "none",
      }}
    >
      <div style={{ height: 140, position: "relative" }}>
        <Thumbnail id={example.id} playing={hovered} />
        {hovered && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "#06080c44", backdropFilter: "blur(1px)",
          }}>
            <div style={{
              background: domain.color, color: C.bg, padding: "5px 14px", borderRadius: 5,
              fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif",
            }}>Open →</div>
          </div>
        )}
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{
            fontSize: 8, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase",
            color: domain.color, background: domain.color + "15", border: `1px solid ${domain.color}28`,
            borderRadius: 3, padding: "2px 6px", fontFamily: "'IBM Plex Mono', monospace",
          }}>{domain.icon} {example.domain}</span>
          <span style={{ fontSize: 9, color: C.dimmer, fontFamily: "'IBM Plex Mono', monospace" }}>
            {example.atoms >= 10000 ? `${(example.atoms / 1000).toFixed(0)}K` : example.atoms.toLocaleString()}
          </span>
        </div>
        <h4 style={{
          fontSize: 15, fontWeight: 600, color: C.white, margin: "0 0 6px",
          fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif",
        }}>{example.title}</h4>
        <p style={{
          fontSize: 11, color: C.dim, lineHeight: 1.5, margin: 0,
          fontFamily: "'IBM Plex Sans', sans-serif",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{example.desc}</p>
        <div style={{
          marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between",
          fontSize: 9, color: C.dimmer, fontFamily: "'IBM Plex Mono', monospace",
        }}>
          <span>{example.colorBy}</span>
          <span>{example.potential}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══ MAIN ═══ */
export default function Gallery() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const domains = ["all", ...new Set(EXAMPLES.map(e => e.domain))];
  const filtered = filter === "all" ? EXAMPLES : EXAMPLES.filter(e => e.domain === filter);
  const featured = filtered.find(e => e.hero) || filtered[0];
  const rest = filtered.filter(e => e !== featured);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: ${C.accent}33; color: ${C.accent}; }
        html { scroll-behavior: smooth; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        .fade-up { animation: fadeUp 0.6s ease both; }
      `}</style>

      {/* ─── NAV BAR ─── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50, height: 48,
        background: "#06080cee", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            ATLAS<span style={{ color: C.accent }}>View</span>
          </span>
          <span style={{ fontSize: 9, color: C.dimmer, fontFamily: "'IBM Plex Mono', monospace" }}>v0.1</span>
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 12, color: C.dim }}>
          <span style={{ color: C.accent, cursor: "pointer" }}>Gallery</span>
          <span style={{ cursor: "pointer" }}>Viewer</span>
          <span style={{ cursor: "pointer" }}>Docs</span>
          <span style={{ cursor: "pointer" }}>GitHub</span>
        </div>
      </nav>

      {/* ─── HERO HEADER ─── */}
      <header style={{
        padding: "56px 24px 40px", textAlign: "center",
        background: `radial-gradient(ellipse at 50% 80%, ${C.accent}08, transparent 60%)`,
      }}>
        <h1 style={{
          fontSize: 44, fontWeight: 400, color: C.white, margin: "0 0 12px",
          fontFamily: "'Instrument Serif', Georgia, serif",
        }}>
          Example Gallery
        </h1>
        <p style={{ fontSize: 15, color: C.dim, maxWidth: 520, margin: "0 auto 8px", lineHeight: 1.7 }}>
          12 curated LAMMPS simulations showcasing fracture, melting, self-assembly,
          granular flow, and more. Click any example to explore interactively.
        </p>
        <p style={{
          fontSize: 11, color: C.dimmer, fontFamily: "'IBM Plex Mono', monospace",
          marginTop: 12,
        }}>
          All examples generated from official LAMMPS scripts · Apache 2.0 · Zero install
        </p>
      </header>

      {/* ─── DOMAIN FILTER ─── */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 5, padding: "0 24px 32px",
        flexWrap: "wrap",
      }}>
        {domains.map(d => {
          const isActive = filter === d;
          const dc = d === "all" ? C.accent : DOMAINS[d]?.color || C.dim;
          return (
            <button key={d} onClick={() => setFilter(d)} style={{
              padding: "5px 12px", borderRadius: 5, fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              background: isActive ? dc + "1a" : "transparent",
              border: `1px solid ${isActive ? dc + "55" : C.border}`,
              color: isActive ? dc : C.dim,
              cursor: "pointer", transition: "all 0.2s",
              textTransform: d === "all" ? "none" : "none",
            }}>
              {d === "all" ? "All Examples" : `${DOMAINS[d]?.icon || ""} ${d}`}
            </button>
          );
        })}
      </div>

      {/* ─── GALLERY GRID ─── */}
      <div style={{
        maxWidth: 1040, margin: "0 auto", padding: "0 24px 48px",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 14,
      }}>
        {/* Featured card spans full width */}
        {featured && <Card example={featured} onOpen={setSelected} featured />}

        {/* Rest in grid */}
        {rest.map((ex, i) => (
          <div key={ex.id} className="fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <Card example={ex} onOpen={setSelected} />
          </div>
        ))}
      </div>

      {/* ─── DROP ZONE CTA ─── */}
      <div style={{
        maxWidth: 700, margin: "0 auto 60px", padding: "0 24px",
      }}>
        <div style={{
          border: `2px dashed ${C.borderLight}`,
          borderRadius: 14, padding: "36px 24px", textAlign: "center",
          background: `linear-gradient(180deg, ${C.bg2}, ${C.bg})`,
          transition: "all 0.3s",
        }}>
          <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>📂</div>
          <div style={{
            fontSize: 18, color: C.bright, marginBottom: 6,
            fontFamily: "'Instrument Serif', Georgia, serif",
          }}>Or visualize your own data</div>
          <div style={{ fontSize: 13, color: C.dim, marginBottom: 16, lineHeight: 1.6 }}>
            Drag a LAMMPS dump file here — any size, any format.<br />
            Publication-quality 3D visualization in 2 seconds. No install. No license.
          </div>
          <button style={{
            background: C.accent, color: C.bg, border: "none", borderRadius: 6,
            padding: "10px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}>Open Viewer</button>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer style={{
        borderTop: `1px solid ${C.border}`, padding: "24px",
        textAlign: "center", fontSize: 11, color: C.dimmer,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ color: C.white, fontWeight: 600 }}>ATLAS</span>
          <span style={{ color: C.accent, fontWeight: 600 }}>View</span>
          <span style={{ margin: "0 8px", color: C.border }}>·</span>
          WebGPU-powered LAMMPS visualization
          <span style={{ margin: "0 8px", color: C.border }}>·</span>
          Apache 2.0
        </div>
        <div>
          Examples from <a href="https://github.com/lammps/lammps" style={{ color: C.dim }}>LAMMPS</a> (Sandia National Labs)
          and <a href="https://lammpstutorials.github.io" style={{ color: C.dim }}>LammpsTutorials</a> (Gravelle et al., LiveCoMS 2025)
        </div>
        <div style={{ marginTop: 6, color: C.border }}>
          Part of ATLAS — Atomic-scale Theory, Learning, and Simulation
        </div>
      </footer>

      {/* ─── MODAL (simplified) ─── */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "#06080cdd", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.card, border: `1px solid ${C.borderLight}`,
            borderRadius: 14, width: "80%", maxWidth: 760, overflow: "hidden",
          }}>
            <div style={{ height: 340, position: "relative" }}>
              <Thumbnail id={selected.id} playing />
              <button onClick={() => setSelected(null)} style={{
                position: "absolute", top: 10, right: 10,
                background: "#06080ccc", border: `1px solid ${C.border}`,
                borderRadius: 6, color: C.text, padding: "4px 10px",
                fontSize: 12, cursor: "pointer",
              }}>✕ Close</button>
            </div>
            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
                  color: DOMAINS[selected.domain]?.color, background: DOMAINS[selected.domain]?.color + "18",
                  border: `1px solid ${DOMAINS[selected.domain]?.color}33`,
                  borderRadius: 3, padding: "2px 8px", fontFamily: "'IBM Plex Mono', monospace",
                }}>{DOMAINS[selected.domain]?.icon} {selected.domain}</span>
              </div>
              <h2 style={{ fontSize: 28, color: C.white, margin: "0 0 10px", fontFamily: "'Instrument Serif', serif" }}>
                {selected.title}
              </h2>
              <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, marginBottom: 16 }}>{selected.desc}</p>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, marginBottom: 20,
              }}>
                {[
                  { k: "Atoms", v: selected.atoms.toLocaleString() },
                  { k: "Frames", v: selected.frames },
                  { k: "Potential", v: selected.potential },
                  { k: "Source", v: selected.source },
                ].map(p => (
                  <div key={p.k} style={{ background: C.bg, borderRadius: 6, padding: "8px 10px", border: `1px solid ${C.border}` }}>
                    <div style={{ color: C.dimmer, fontSize: 8, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 }}>{p.k}</div>
                    <div style={{ color: C.bright }}>{p.v}</div>
                  </div>
                ))}
              </div>
              <button style={{
                background: C.accent, color: C.bg, border: "none", borderRadius: 6,
                padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                width: "100%", fontFamily: "'IBM Plex Sans', sans-serif",
              }}>Launch Interactive Viewer →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
