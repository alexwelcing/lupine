// Procedural brand-geometry figures — deterministic, canvas-drawn. The deck's
// visual language: the science itself (error vectors, manifolds, lattices) as
// elegant monograph-style line art, palette-locked to ink/indigo on paper.
//
// Craft rules (see fundraise/compositing-spec.md): thin precise strokes, single
// indigo light, depth falloff by opacity/scale, restraint + negative space, a
// reserved (calm) type zone, and one shared grain+vignette finishing pass so
// every slide reads as one system. Live text is always drawn ON TOP of these.

import { SLIDE } from './brand.js';

const { w: W, h: H } = SLIDE;

// ── palette as rgba (matches brand.ts) ───────────────────────────────────────
const IND = (a: number) => `rgba(61,77,179,${a})`; // lupine indigo
const INK = (a: number) => `rgba(20,22,29,${a})`;
const PAPER = (a: number) => `rgba(250,249,246,${a})`;

// ── deterministic RNG (mulberry32) ───────────────────────────────────────────
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type Region = { x: number; y: number; w: number; h: number };
const RIGHT: Region = { x: 690, y: 138, w: 590, h: 524 }; // bleeds off right edge

// ── a smooth ribbon (the hyper-ribbon / "shape" the scatter collapses onto) ──
function ribbonPt(t: number, cx: number, cy: number, span: number, amp: number, phase: number) {
  const x = cx + (t - 0.5) * span;
  const y = cy + Math.sin(t * Math.PI * 1.6 + phase) * amp * (0.6 + 0.4 * Math.cos(t * Math.PI));
  const dt = 0.001;
  const y2 = cy + Math.sin((t + dt) * Math.PI * 1.6 + phase) * amp * (0.6 + 0.4 * Math.cos((t + dt) * Math.PI));
  let tx = span * dt, ty = y2 - y;
  const m = Math.hypot(tx, ty) || 1;
  return { x, y, tx: tx / m, ty: ty / m };
}

function glowStroke(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  core: number,
  alpha: number,
) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // soft halo
  ctx.strokeStyle = IND(alpha * 0.22);
  ctx.lineWidth = core * 5;
  trace(ctx, pts);
  // bright core
  ctx.strokeStyle = IND(alpha);
  ctx.lineWidth = core;
  trace(ctx, pts);
}
function trace(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
}

// ── 1 · SHAPE OF WRONGNESS — scatter of error vectors aligning onto a ribbon ──
export function shapeOfWrongness(
  ctx: CanvasRenderingContext2D,
  focalX: number,
  focalY: number,
  scale: number,
  alpha: number,
  seed = 11,
) {
  const r = rng(seed);
  const span = 520 * scale;
  const amp = 86 * scale;
  const phase = 0.4;
  const samples = Array.from({ length: 90 }, (_, i) => ribbonPt(i / 89, focalX, focalY, span, amp, phase));

  // the manifold ribbon itself
  glowStroke(ctx, samples, 2.0 * scale, alpha);

  // scattered vectors: far = chaotic & faint, near = aligned to the tangent & indigo
  const N = 150;
  const box = { x: focalX - span * 0.62, y: focalY - amp - 150 * scale, w: span * 1.24, h: (amp + 150 * scale) * 2 };
  const maxD = 150 * scale;
  for (let i = 0; i < N; i++) {
    const px = box.x + r() * box.w;
    const py = box.y + r() * box.h;
    // nearest ribbon sample
    let best = samples[0]!, bd = Infinity;
    for (const s of samples) {
      const d = (s.x - px) ** 2 + (s.y - py) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    const dist = Math.sqrt(bd);
    const wgt = clamp(1 - dist / maxD, 0, 1);
    const ra = r() * Math.PI * 2;
    const dx = lerp(Math.cos(ra), best.tx, wgt);
    const dy = lerp(Math.sin(ra), best.ty, wgt);
    const m = Math.hypot(dx, dy) || 1;
    const len = (6 + 13 * wgt) * scale;
    const a = alpha * (0.16 + 0.62 * wgt);
    ctx.strokeStyle = IND(a);
    ctx.lineWidth = (0.7 + 0.8 * wgt) * scale;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + (dx / m) * len, py + (dy / m) * len);
    ctx.stroke();
  }
}

// ── 2 · HYPER-RIBBON MANIFOLD — folded surface as thin contour lines ─────────
function hyperRibbon(ctx: CanvasRenderingContext2D, reg: Region, alpha: number) {
  const lines = 18;
  const cx = reg.x + reg.w * 0.5;
  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1);
    const depth = 1 - t; // top lines farther = fainter
    const yb = reg.y + 60 + t * (reg.h - 120);
    const amp = 36 + 26 * Math.sin(t * Math.PI);
    const pts = [];
    for (let j = 0; j <= 60; j++) {
      const u = j / 60;
      const x = reg.x + 20 + u * (reg.w - 40);
      const fold = Math.sin(u * Math.PI * 1.5 + t * 1.2) * amp + Math.sin(u * Math.PI * 3) * 7;
      const skew = (x - cx) * 0.04 * (t - 0.5);
      pts.push({ x, y: yb + fold * (0.5 + 0.5 * t) + skew });
    }
    ctx.strokeStyle = IND(alpha * (0.32 + 0.68 * (1 - depth)));
    ctx.lineWidth = 1;
    trace(ctx, pts);
  }
}

// ── 3 · SCATTER CURVES — many faint curves, each wrong in its own way ─────────
function scatterCurves(ctx: CanvasRenderingContext2D, reg: Region, alpha: number, seed = 3) {
  const r = rng(seed);
  for (let k = 0; k < 11; k++) {
    const ph = r() * Math.PI * 2;
    const amp = 24 + r() * 46;
    const yb = reg.y + 70 + r() * (reg.h - 140);
    const freq = 1.2 + r() * 1.8;
    const pts = [];
    for (let j = 0; j <= 50; j++) {
      const u = j / 50;
      pts.push({ x: reg.x + u * reg.w, y: yb + Math.sin(u * Math.PI * freq + ph) * amp });
    }
    ctx.strokeStyle = IND(alpha * (0.3 + r() * 0.5));
    ctx.lineWidth = 1;
    trace(ctx, pts);
  }
}

// ── 4 · BITS → ATOMS (and bridge variant) ────────────────────────────────────
function bitsToAtoms(ctx: CanvasRenderingContext2D, reg: Region, alpha: number, seed = 5, arc = false) {
  const r = rng(seed);
  const midL = reg.x + reg.w * 0.34;
  const midR = reg.x + reg.w * 0.6;
  // left: dissolving pixel/glyph field
  const cols = 9, rows = 12, cell = Math.min((midL - reg.x) / cols, reg.h / rows);
  for (let c = 0; c < cols; c++)
    for (let ro = 0; ro < rows; ro++) {
      const gx = reg.x + c * cell + 4;
      const gy = reg.y + ro * cell + 30;
      const diss = clamp((c / cols) + (r() - 0.5) * 0.5, 0, 1); // dissolves toward the middle
      if (r() < diss * 0.8) continue;
      ctx.fillStyle = IND(alpha * (0.5 - 0.32 * diss));
      const s = cell * 0.42;
      ctx.fillRect(gx, gy, s, s);
    }
  // right: crystalline lattice (nodes + bonds)
  drawLatticeCluster(ctx, { x: midR, y: reg.y + 20, w: reg.x + reg.w - midR, h: reg.h - 40 }, alpha, seed + 1);
  // transition bridge arc
  if (arc) {
    const a1 = { x: reg.x + 30, y: reg.y + reg.h * 0.5 };
    const a2 = { x: reg.x + reg.w - 30, y: reg.y + reg.h * 0.46 };
    const cxp = (a1.x + a2.x) / 2;
    ctx.strokeStyle = IND(alpha * 0.5);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y);
    ctx.quadraticCurveTo(cxp, reg.y - 6, a2.x, a2.y);
    ctx.stroke();
  }
}

function drawLatticeCluster(ctx: CanvasRenderingContext2D, reg: Region, alpha: number, seed = 9) {
  const r = rng(seed);
  const nx = 5, ny = 6;
  const sx = reg.w / nx, sy = reg.h / ny;
  const nodes: { x: number; y: number; d: number }[] = [];
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= ny; j++) {
      const jit = 6;
      const x = reg.x + i * sx + (r() - 0.5) * jit;
      const y = reg.y + j * sy + (r() - 0.5) * jit;
      const d = clamp(1 - (i / nx) * 0.55 - (r() * 0.2), 0.2, 1); // depth falloff
      nodes.push({ x, y, d });
    }
  // bonds
  ctx.lineWidth = 1;
  nodes.forEach((n) => {
    nodes.forEach((m) => {
      const dist = Math.hypot(n.x - m.x, n.y - m.y);
      if (dist > 6 && dist < sx * 1.3) {
        ctx.strokeStyle = IND(alpha * 0.28 * Math.min(n.d, m.d));
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
      }
    });
  });
  // atoms
  nodes.forEach((n) => {
    ctx.fillStyle = IND(alpha * 0.7 * n.d);
    ctx.beginPath();
    ctx.arc(n.x, n.y, 2.4 * n.d + 0.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ── 5 · CALIBRATION GRID — scattered points pulled onto a manifold ───────────
function calibrationGrid(ctx: CanvasRenderingContext2D, reg: Region, alpha: number, seed = 13) {
  const r = rng(seed);
  // faint warped grid
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    const pts = [];
    for (let j = 0; j <= 40; j++) {
      const v = j / 40;
      pts.push({ x: reg.x + u * reg.w + Math.sin(v * Math.PI * 2) * 8, y: reg.y + v * reg.h });
    }
    ctx.strokeStyle = IND(alpha * 0.16);
    trace(ctx, pts);
  }
  // points snapping onto the manifold line (a smooth curve)
  for (let k = 0; k < 26; k++) {
    const v = r();
    const onX = reg.x + (0.5 + Math.sin(v * Math.PI * 1.5) * 0.32) * reg.w;
    const onY = reg.y + v * reg.h;
    const offX = onX + (r() - 0.5) * 120;
    const offY = onY + (r() - 0.5) * 50;
    ctx.strokeStyle = IND(alpha * 0.35);
    ctx.beginPath();
    ctx.moveTo(offX, offY);
    ctx.lineTo(onX, onY);
    ctx.stroke();
    ctx.fillStyle = IND(alpha * 0.3);
    ctx.beginPath(); ctx.arc(offX, offY, 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = IND(alpha * 0.85);
    ctx.beginPath(); ctx.arc(onX, onY, 2.4, 0, 7); ctx.fill();
  }
}

// ── 6 · COMPOUNDING FLYWHEEL — log-spiral lattice growth ─────────────────────
function flywheel(ctx: CanvasRenderingContext2D, reg: Region, alpha: number) {
  const cx = reg.x + reg.w * 0.52, cy = reg.y + reg.h * 0.5;
  for (let arm = 0; arm < 3; arm++) {
    const pts = [];
    const off = (arm / 3) * Math.PI * 2;
    for (let j = 0; j <= 120; j++) {
      const t = j / 120;
      const ang = off + t * Math.PI * 3.2;
      const rad = 14 + t * 220;
      pts.push({ x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad * 0.82 });
    }
    ctx.strokeStyle = IND(alpha * 0.5);
    ctx.lineWidth = 1;
    trace(ctx, pts);
    // nodes along the arm
    for (let j = 1; j <= 7; j++) {
      const p = pts[Math.floor((j / 7) * 120)]!;
      ctx.fillStyle = IND(alpha * (0.3 + 0.07 * j));
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 + j * 0.4, 0, 7); ctx.fill();
    }
  }
}

// ── 7 · CASCADE — one node lighting a rippling network (horizon-biased opt) ──
function cascade(ctx: CanvasRenderingContext2D, reg: Region, alpha: number, seed = 19, horizon = false) {
  const r = rng(seed);
  const cx = horizon ? reg.x + 30 : reg.x + reg.w * 0.3;
  const cy = reg.y + reg.h * 0.5;
  const rings = 5;
  let prev: { x: number; y: number }[] = [{ x: cx, y: cy }];
  // source
  ctx.fillStyle = IND(alpha); ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
  for (let ring = 1; ring <= rings; ring++) {
    const count = 2 + ring * 2;
    const rad = ring * (reg.w / (rings + 1)) * (horizon ? 1 : 0.7);
    const cur: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const spread = horizon ? Math.PI * 0.7 : Math.PI * 2;
      const ang = (horizon ? -spread / 2 : 0) + (i / (count - (horizon ? 1 : 0))) * spread + r() * 0.2;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad * (horizon ? 0.6 : 0.7);
      cur.push({ x, y });
    }
    const a = alpha * (1 - ring / (rings + 1));
    cur.forEach((n) => {
      const src = prev[Math.floor(r() * prev.length)]!;
      ctx.strokeStyle = IND(a * 0.5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(n.x, n.y); ctx.stroke();
      ctx.fillStyle = IND(a * 0.8);
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.8, 0, 7); ctx.fill();
    });
    prev = cur;
  }
}

// ── 10 · REPLICATOR ARC — matter coalescing from light along an arc ──────────
function replicatorArc(ctx: CanvasRenderingContext2D, reg: Region, alpha: number, seed = 23) {
  const r = rng(seed);
  const cy = reg.y + reg.h * 0.62;
  const arc = [];
  for (let j = 0; j <= 80; j++) {
    const u = j / 80;
    arc.push({ x: reg.x + u * reg.w, y: cy - Math.sin(u * Math.PI) * reg.h * 0.42 });
  }
  glowStroke(ctx, arc, 1.6, alpha * 0.8);
  // matter forming along the arc: sparse on left → lattice on right
  for (let j = 6; j <= 78; j += 3) {
    const u = j / 80;
    const p = arc[j]!;
    const dens = u; // more formed toward the right
    if (r() > dens * 0.9 + 0.1) {
      ctx.fillStyle = IND(alpha * (0.2 + 0.6 * dens));
      ctx.beginPath(); ctx.arc(p.x, p.y + (r() - 0.5) * 14, 1 + dens * 2, 0, 7); ctx.fill();
    }
    if (dens > 0.55 && r() < dens * 0.5) {
      const q = arc[j + 2] ?? p;
      ctx.strokeStyle = IND(alpha * 0.3 * dens); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y - 10); ctx.stroke();
    }
  }
}

// ── legibility scrim — keep the type zone calm over a figure ─────────────────
function typeScrim(ctx: CanvasRenderingContext2D, feature: boolean) {
  // protect the left column (dense text) and the headline band
  const gx = ctx.createLinearGradient(0, 0, 760, 0);
  gx.addColorStop(0, PAPER(feature ? 0.72 : 0.6));
  gx.addColorStop(1, PAPER(0));
  ctx.fillStyle = gx;
  ctx.fillRect(0, 120, 760, H - 200);
  const gy = ctx.createLinearGradient(0, 120, 0, 400);
  gy.addColorStop(0, PAPER(0.5));
  gy.addColorStop(1, PAPER(0));
  ctx.fillStyle = gy;
  ctx.fillRect(0, 120, W, 280);
}

// ── per-slide dispatch (content slides) ──────────────────────────────────────
export function drawContentFigure(ctx: CanvasRenderingContext2D, no: string): void {
  ctx.save();
  const A = 0.16; // subtle baseline
  const F = 0.24; // feature (hero) slides
  switch (no) {
    case '02': bitsToAtoms(ctx, { x: 150, y: 150, w: 1040, h: 380 }, A); break;
    case '03': scatterCurves(ctx, RIGHT, A); break;
    case '04': hyperRibbon(ctx, RIGHT, A); break;
    case '05': cascade(ctx, RIGHT, A); break;
    case '06': bitsToAtoms(ctx, { x: 150, y: 150, w: 1040, h: 410 }, F, 5, true); break; // bridge
    case '07': calibrationGrid(ctx, RIGHT, A); break;
    case '08': flywheel(ctx, RIGHT, A); break;
    case '09': ctx.restore(); return; // team = whitespace
    case '10': replicatorArc(ctx, { x: 150, y: 150, w: 1040, h: 420 }, F); break; // vision hero
    case '11': cascade(ctx, RIGHT, A, 19, true); break;
    case '12': drawLatticeCluster(ctx, { x: 900, y: 150, w: 360, h: 360 }, A * 0.8); break;
    default: ctx.restore(); return;
  }
  typeScrim(ctx, no === '06' || no === '10');
  ctx.restore();
}

// ── grain + vignette finishing pass (applied last, over everything) ──────────
let noiseTile: HTMLCanvasElement | null = null;
function getNoise(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const nctx = c.getContext('2d')!;
  const img = nctx.createImageData(96, 96);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 60);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

export function applyFilmFinish(ctx: CanvasRenderingContext2D): void {
  // unified grain (ties the whole comp together)
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  const pat = ctx.createPattern(getNoise(), 'repeat');
  if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
  // gentle edge vignette for depth
  ctx.save();
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, INK(0));
  v.addColorStop(1, INK(0.06));
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
