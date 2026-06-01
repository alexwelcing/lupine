import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * HeroMoleculePreview — a small, always-on "live viewer" teaser on the landing
 * page. It renders a gently rotating ball-and-stick molecule on a plain 2D
 * canvas (depth-sorted spheres with radial shading + bonds, simple perspective)
 * — no WebGPU / R3F, so it's light and safe to mount above the fold. Clicking it
 * opens the real viewer with the featured molecule.
 */

interface Atom3 { x: number; y: number; z: number; r: number; c: string }
interface Bond { a: number; b: number }

// A compact, recognizable cluster (loosely C60-ish cage + core) so the preview
// reads as "a real molecule" rather than random dots. Coordinates are unit-ish;
// scaled to the canvas at draw time.
const PALETTE = ['#6b9fff', '#8ad0ff', '#cbd5e1', '#f8fafc'];

function buildMolecule(): { atoms: Atom3[]; bonds: Bond[] } {
  const atoms: Atom3[] = [];
  // Icosahedron-ish shell (12 vertices) — gives a pleasing symmetric cage.
  const t = (1 + Math.sqrt(5)) / 2;
  const shell = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  const norm = Math.hypot(1, t);
  for (let i = 0; i < shell.length; i++) {
    const [x, y, z] = shell[i];
    atoms.push({ x: x / norm, y: y / norm, z: z / norm, r: 0.17, c: PALETTE[1] });
  }
  // A small bright core.
  atoms.push({ x: 0, y: 0, z: 0, r: 0.22, c: PALETTE[3] });

  // Bond each shell vertex to its 2 nearest shell neighbors → the cage edges,
  // plus core→a few shell atoms for visual depth.
  const bonds: Bond[] = [];
  const seen = new Set<string>();
  const addBond = (a: number, b: number) => {
    const k = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (seen.has(k)) return;
    seen.add(k);
    bonds.push({ a, b });
  };
  for (let i = 0; i < 12; i++) {
    const dists = [];
    for (let j = 0; j < 12; j++) {
      if (i === j) continue;
      const d = (atoms[i].x - atoms[j].x) ** 2 + (atoms[i].y - atoms[j].y) ** 2 + (atoms[i].z - atoms[j].z) ** 2;
      dists.push({ j, d });
    }
    dists.sort((p, q) => p.d - q.d);
    addBond(i, dists[0].j);
    addBond(i, dists[1].j);
  }
  const core = 12;
  for (const j of [0, 3, 5, 8]) addBond(core, j);

  return { atoms, bonds };
}

const MOL = buildMolecule();

interface Props {
  onOpen: () => void;
  style?: CSSProperties;
}

export function HeroMoleculePreview({ onOpen, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState(false);
  const hoverRef = useRef(false);
  useEffect(() => { hoverRef.current = hover; }, [hover]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Respect reduced-motion: render one static frame and stop.
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let angle = 0;
    let raf = 0;
    let last = performance.now();

    const project = (a: Atom3, cos: number, sin: number) => {
      // Rotate around Y, then a fixed tilt around X for a 3/4 view.
      const rx = a.x * cos - a.z * sin;
      const rz = a.x * sin + a.z * cos;
      const tiltedY = a.y * 0.94 - rz * 0.34;
      const tiltedZ = a.y * 0.34 + rz * 0.94;
      const persp = 1 / (1.9 - tiltedZ * 0.45); // mild perspective
      return { sx: rx * persp, sy: tiltedY * persp, depth: tiltedZ, scale: persp };
    };

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!reduce) angle += dt * (hoverRef.current ? 0.9 : 0.32);

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.4;
      const cos = Math.cos(angle), sin = Math.sin(angle);

      const pts = MOL.atoms.map((a) => project(a, cos, sin));

      // Bonds first (behind atoms), depth-faded.
      for (const b of MOL.bonds) {
        const p = pts[b.a], q = pts[b.b];
        const avgDepth = (p.depth + q.depth) / 2;
        const alpha = 0.22 + (avgDepth + 1) * 0.18;
        ctx.beginPath();
        ctx.moveTo(cx + p.sx * R, cy + p.sy * R);
        ctx.lineTo(cx + q.sx * R, cy + q.sy * R);
        ctx.strokeStyle = `rgba(150, 190, 255, ${alpha})`;
        ctx.lineWidth = 1.5 + (avgDepth + 1) * 1.1;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Atoms painter-sorted back-to-front.
      const order = MOL.atoms.map((_, i) => i).sort((i, j) => pts[i].depth - pts[j].depth);
      for (const i of order) {
        const a = MOL.atoms[i];
        const p = pts[i];
        const px = cx + p.sx * R;
        const py = cy + p.sy * R;
        const rad = a.r * R * p.scale;
        const depthMix = (p.depth + 1) / 2; // 0 back, 1 front

        const grad = ctx.createRadialGradient(px - rad * 0.35, py - rad * 0.4, rad * 0.1, px, py, rad);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.25, a.c);
        grad.addColorStop(1, shade(a.c, 0.35 + depthMix * 0.25));
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.55 + depthMix * 0.45;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Open the live molecular viewer"
      style={{
        position: 'relative',
        display: 'block',
        padding: 0,
        border: `1px solid ${hover ? 'rgba(124,160,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'rgba(8,12,22,0.55)',
        backdropFilter: 'blur(8px)',
        boxShadow: hover
          ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,160,255,0.35)'
          : '0 10px 40px rgba(0,0,0,0.4)',
        transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* Live chip */}
      <span style={liveChipStyle}>
        <span style={liveDotStyle} /> Live viewer
      </span>

      {/* Hover prompt */}
      <span style={{ ...openHintStyle, opacity: hover ? 1 : 0 }}>Open viewer →</span>
    </button>
  );
}

/** Darken a hex color toward black by `amt` (0..1). */
function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amt));
  const g = Math.round(((n >> 8) & 255) * (1 - amt));
  const b = Math.round((n & 255) * (1 - amt));
  return `rgb(${r}, ${g}, ${b})`;
}

const liveChipStyle: CSSProperties = {
  position: 'absolute', top: 12, left: 12,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '4px 10px', borderRadius: 100,
  fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
  color: '#bcd3ff', background: 'rgba(3,6,14,0.6)',
  border: '1px solid rgba(124,160,255,0.35)', backdropFilter: 'blur(6px)',
};
const liveDotStyle: CSSProperties = {
  width: 7, height: 7, borderRadius: '50%', background: '#5eead4',
  boxShadow: '0 0 8px #5eead4',
};
const openHintStyle: CSSProperties = {
  position: 'absolute', bottom: 12, right: 14,
  fontSize: 12, fontWeight: 600, color: '#e2e8f0',
  transition: 'opacity 0.25s', pointerEvents: 'none',
};
