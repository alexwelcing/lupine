import { useMemo, type CSSProperties } from 'react';

/**
 * MoleculeThumbnail — a branded, deterministic SVG fallback for a gallery card
 * when its rendered snapshot (gallery/snapshots/{id}.jpg) is missing in prod.
 *
 * Instead of a bare dark gradient (the old display:none-on-error behavior, which
 * left ~3/8 featured cards looking broken), this draws an on-brand "ball-and-
 * stick" molecular motif tinted with the card's own palette. It's fully
 * deterministic per id, so the same card always shows the same figure, and it
 * needs no network — so it can never 404.
 */

interface Props {
  id: string;
  colors?: string[];
  style?: CSSProperties;
}

// Cheap deterministic PRNG (mulberry32) seeded from the card id, so each card
// gets a stable-but-distinct atom arrangement.
function seedFromId(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Atom { x: number; y: number; r: number; c: string }
interface Bond { a: number; b: number }

const W = 320;
const H = 200;
const DEFAULT_PALETTE = ['#6b9fff', '#94a3b8', '#f8fafc'];

export function MoleculeThumbnail({ id, colors, style }: Props) {
  const { atoms, bonds, palette } = useMemo(() => {
    const pal = (colors && colors.length >= 1 ? colors : DEFAULT_PALETTE).slice(0, 3);
    const rnd = mulberry32(seedFromId(id));
    const count = 7 + Math.floor(rnd() * 5); // 7–11 atoms
    const cx = W / 2;
    const cy = H / 2;
    const atoms: Atom[] = [];
    // Place atoms on a loose spiral so they read as a coherent cluster, never a
    // random scatter; jitter keeps each card distinct.
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 2 * (1.6 + rnd() * 0.8) + rnd() * 0.6;
      const radius = 18 + t * 64 + (rnd() - 0.5) * 16;
      atoms.push({
        x: cx + Math.cos(angle) * radius * 1.25,
        y: cy + Math.sin(angle) * radius * 0.85,
        r: 8 + rnd() * 12,
        c: pal[i % pal.length],
      });
    }
    // Bond each atom to its nearest already-placed neighbor → a connected graph.
    const bonds: Bond[] = [];
    for (let i = 1; i < atoms.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let j = 0; j < i; j++) {
        const d = (atoms[i].x - atoms[j].x) ** 2 + (atoms[i].y - atoms[j].y) ** 2;
        if (d < bestD) { bestD = d; best = j; }
      }
      bonds.push({ a: i, b: best });
    }
    return { atoms, bonds, palette: pal };
  }, [id, colors]);

  const gradId = `mt-grad-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      role="img"
      aria-label="Molecular preview"
      style={{ display: 'block', ...style }}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor={palette[0]} stopOpacity="0.16" />
          <stop offset="55%" stopColor={palette[palette.length - 1]} stopOpacity="0.05" />
          <stop offset="100%" stopColor="#05070d" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#05070d" />
      <rect width={W} height={H} fill={`url(#${gradId})`} />

      {/* Bonds */}
      <g stroke={palette[1] ?? palette[0]} strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round">
        {bonds.map((bd, i) => {
          const a = atoms[bd.a];
          const b = atoms[bd.b];
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>

      {/* Atoms — soft sphere shading via a per-atom highlight */}
      <g>
        {atoms.map((at, i) => (
          <g key={i}>
            <circle cx={at.x} cy={at.y} r={at.r} fill={at.c} fillOpacity="0.92" />
            <circle cx={at.x - at.r * 0.3} cy={at.y - at.r * 0.32} r={at.r * 0.42} fill="#ffffff" fillOpacity="0.35" />
          </g>
        ))}
      </g>
    </svg>
  );
}
