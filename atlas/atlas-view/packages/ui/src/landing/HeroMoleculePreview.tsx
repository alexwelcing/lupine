import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * HeroMoleculePreview — a small, always-on "live viewer" teaser on the landing
 * page. It renders a gently rotating ball-and-stick molecule on a plain 2D
 * canvas (depth-sorted spheres with radial shading + bonds, simple perspective)
 * — no WebGPU / R3F, so it's light and safe to mount above the fold. Clicking it
 * opens the real viewer with the featured molecule.
 *
 * The molecule is a real Buckminsterfullerene (C60): the exact truncated
 * icosahedron, generated from golden-ratio coordinates — not a decorative
 * approximation — so the teaser shows genuine chemistry.
 */

interface Atom3 { x: number; y: number; z: number; r: number; c: string }
interface Bond { a: number; b: number }

// Carbon, rendered as a luminous slate that reads as carbon yet pops on the dark
// hero. (CPK black would vanish on the background.)
const CARBON = '#9fb4d6';

export function buildC60(): { atoms: Atom3[]; bonds: Bond[] } {
  const phi = (1 + Math.sqrt(5)) / 2;
  // Vertices of a truncated icosahedron = all even (cyclic) permutations of
  // these three sign-varied base triples → 60 unique vertices, 90 equal edges.
  const bases: Array<[number, number, number]> = [
    [0, 1, 3 * phi],
    [1, 2 + phi, 2 * phi],
    [phi, 2, 2 * phi + 1],
  ];
  const verts: Array<[number, number, number]> = [];
  const seen = new Set<string>();
  const add = (x: number, y: number, z: number) => {
    const key = `${x.toFixed(3)}|${y.toFixed(3)}|${z.toFixed(3)}`;
    if (seen.has(key)) return;
    seen.add(key);
    verts.push([x, y, z]);
  };
  for (const [a, b, c] of bases) {
    const sx = a === 0 ? [0] : [a, -a];
    const sy = b === 0 ? [0] : [b, -b];
    const sz = c === 0 ? [0] : [c, -c];
    for (const x of sx) for (const y of sy) for (const z of sz) {
      add(x, y, z); add(y, z, x); add(z, x, y); // 3 cyclic (even) permutations
    }
  }
  // Normalize onto a unit-ish sphere.
  const maxR = Math.max(...verts.map(([x, y, z]) => Math.hypot(x, y, z)));
  const atoms: Atom3[] = verts.map(([x, y, z]) => ({
    x: x / maxR, y: y / maxR, z: z / maxR, r: 0.082, c: CARBON,
  }));
  // Bonds = the cage edges: every vertex pair at the (single, uniform)
  // nearest-neighbor distance. Archimedean solid → all 90 edges share a length.
  const d2 = (i: number, j: number) =>
    (atoms[i].x - atoms[j].x) ** 2 + (atoms[i].y - atoms[j].y) ** 2 + (atoms[i].z - atoms[j].z) ** 2;
  let minD = Infinity;
  for (let i = 0; i < atoms.length; i++)
    for (let j = i + 1; j < atoms.length; j++) minD = Math.min(minD, d2(i, j));
  const thresh = minD * 1.12;
  const bonds: Bond[] = [];
  for (let i = 0; i < atoms.length; i++)
    for (let j = i + 1; j < atoms.length; j++)
      if (d2(i, j) <= thresh) bonds.push({ a: i, b: j });
  return { atoms, bonds };
}

const MOL = buildC60();

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
      const R = Math.min(w, h) * 0.42;
      const cos = Math.cos(angle), sin = Math.sin(angle);

      const pts = MOL.atoms.map((a) => project(a, cos, sin));

      // Bonds first (behind atoms), depth-faded.
      for (const b of MOL.bonds) {
        const p = pts[b.a], q = pts[b.b];
        const avgDepth = (p.depth + q.depth) / 2;
        const alpha = 0.16 + (avgDepth + 1) * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx + p.sx * R, cy + p.sy * R);
        ctx.lineTo(cx + q.sx * R, cy + q.sy * R);
        ctx.strokeStyle = `rgba(150, 190, 255, ${alpha})`;
        ctx.lineWidth = 1.1 + (avgDepth + 1) * 0.9;
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
      aria-label="Open the live molecular viewer — Buckminsterfullerene C₆₀"
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

      {/* Molecule identity — reinforces "this is a real molecule" */}
      <span style={molNameStyle}>C₆₀ · Buckminsterfullerene</span>

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
const molNameStyle: CSSProperties = {
  position: 'absolute', bottom: 12, left: 14,
  fontSize: 11, fontWeight: 600, letterSpacing: '0.01em',
  color: 'rgba(188,211,255,0.72)', pointerEvents: 'none',
};
const openHintStyle: CSSProperties = {
  position: 'absolute', bottom: 12, right: 14,
  fontSize: 12, fontWeight: 600, color: '#e2e8f0',
  transition: 'opacity 0.25s', pointerEvents: 'none',
};
