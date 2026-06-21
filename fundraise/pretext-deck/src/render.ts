// Slide composition. Every glyph is positioned by pretext (via the helpers in
// layout.ts); this module only decides geometry, color, and hierarchy.

import { PALETTE, SLIDE, font } from './brand.js';
import { drawAtomMark } from './logo.js';
import { parseInline } from './text.js';
import { slides, CONFIDENTIAL, type Slide, type Block } from './slides.js';
import { drawContentFigure, applyFilmFinish } from './figures.js';
import { hasPlate, drawPlate } from './plates.js';
import {
  autofitHeadline,
  drawRuns,
  drawRunsFlow,
  drawSingle,
  measureRunsHeight,
} from './layout.js';

const { w: W, h: H, margin: M } = SLIDE;
const CONTENT_W = W - 2 * M;

type BlockStyle = { size: number; lh: number; weight: number; gap: number; width: number; indent: number };

function blockStyle(kind: Block['kind'], scale: number): BlockStyle {
  switch (kind) {
    case 'lead':
      return { size: 30 * scale, lh: 30 * scale * 1.4, weight: 400, gap: 26 * scale, width: CONTENT_W, indent: 0 };
    case 'para':
      return { size: 25 * scale, lh: 25 * scale * 1.5, weight: 400, gap: 24 * scale, width: CONTENT_W, indent: 0 };
    case 'bullet':
      return { size: 25 * scale, lh: 25 * scale * 1.46, weight: 400, gap: 18 * scale, width: CONTENT_W - 38, indent: 38 };
    case 'quote':
      return { size: 27 * scale, lh: 27 * scale * 1.4, weight: 500, gap: 30 * scale, width: CONTENT_W - 34, indent: 34 };
  }
}

function bodyHeight(blocks: Block[], scale: number): number {
  let total = 0;
  blocks.forEach((b, i) => {
    const s = blockStyle(b.kind, scale);
    if (i > 0) total += s.gap;
    total += measureRunsHeight(parseInline(b.text), s.width, s.size, s.lh, s.weight);
  });
  return total;
}

function paperBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, W, H);
  // faint warm vignette in a corner for depth
  const g = ctx.createRadialGradient(W * 0.82, H * 0.12, 40, W * 0.82, H * 0.12, 720);
  g.addColorStop(0, 'rgba(61,77,179,0.05)');
  g.addColorStop(1, 'rgba(61,77,179,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function hairline(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number): void {
  ctx.strokeStyle = PALETTE.hairline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y + 0.5);
  ctx.lineTo(x2, y + 0.5);
  ctx.stroke();
}

function footer(ctx: CanvasRenderingContext2D, idx: number, total: number): void {
  const y = H - 84;
  hairline(ctx, M, y, W - M);
  drawAtomMark(ctx, M + 9, y + 30, 20, { stroke: PALETTE.lupine, strokePx: 1.2, alpha: 0.9 });
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(400, 15);
  ctx.fillStyle = PALETTE.inkMuted;
  ctx.textAlign = 'left';
  ctx.fillText(CONFIDENTIAL, M + 30, y + 35);
  ctx.textAlign = 'right';
  ctx.fillText(`${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, W - M, y + 35);
  ctx.textAlign = 'left';
}

function header(ctx: CanvasRenderingContext2D, slide: Slide): void {
  if (slide.kicker) {
    drawSingle(ctx, slide.kicker.toUpperCase(), font(500, 17), PALETTE.lupine, M, 78, CONTENT_W - 120, 17, 24);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(300, 38);
  ctx.fillStyle = PALETTE.inkMuted;
  ctx.textAlign = 'right';
  ctx.fillText(slide.no, W - M, 96);
  ctx.textAlign = 'left';
  hairline(ctx, M, 120, W - M);
}

function drawBlocks(ctx: CanvasRenderingContext2D, blocks: Block[], top: number, scale: number): void {
  let y = top;
  blocks.forEach((b, i) => {
    const s = blockStyle(b.kind, scale);
    if (i > 0) y += s.gap;
    const runs = parseInline(b.text);
    if (b.kind === 'bullet') {
      ctx.fillStyle = PALETTE.lupine;
      ctx.beginPath();
      ctx.arc(M + 6, y + s.size * 0.52, 3.2, 0, Math.PI * 2);
      ctx.fill();
      y = drawRuns(ctx, runs, M + s.indent, y, s.width, s.size, s.lh, s.weight, PALETTE.ink);
    } else if (b.kind === 'quote') {
      const startY = y;
      const yEnd = drawRuns(ctx, runs, M + s.indent, y, s.width, s.size, s.lh, s.weight, PALETTE.ink);
      ctx.fillStyle = PALETTE.lupine;
      ctx.fillRect(M, startY + 2, 3, yEnd - startY - 6);
      y = yEnd;
    } else {
      const color = b.kind === 'lead' ? PALETTE.ink : PALETTE.inkSoft;
      y = drawRuns(ctx, runs, M, y, s.width, s.size, s.lh, s.weight, color);
    }
  });
}

function renderContent(ctx: CanvasRenderingContext2D, slide: Slide, idx: number, total: number): void {
  paperBackground(ctx);
  // FAL hero plate where we have one; procedural brand geometry otherwise.
  if (hasPlate(slide.no)) drawPlate(ctx, slide.no, 'content');
  else drawContentFigure(ctx, slide.no);
  header(ctx, slide);

  // Headline — auto-fit into the band under the header.
  const hRuns = parseInline(slide.headline);
  const headTop = 152;
  const headMaxH = 234;
  const fit = autofitHeadline(hRuns, CONTENT_W, headMaxH, { min: 42, max: 86, lineHeightRatio: 1.07, baseWeight: 500 });
  const headBottom = drawRuns(ctx, hRuns, M, headTop, CONTENT_W, fit.size, fit.lineHeight, 500, PALETTE.ink);

  // Body — auto-scale so even dense slides fit cleanly.
  const bodyTop = headBottom + 42;
  const bodyAvail = H - 110 - bodyTop;
  let scale = 1;
  for (const s of [1, 0.94, 0.88, 0.82, 0.76, 0.7]) {
    if (bodyHeight(slide.blocks, s) <= bodyAvail) { scale = s; break; }
    scale = s;
  }
  drawBlocks(ctx, slide.blocks, bodyTop, scale);

  footer(ctx, idx, total);
}

function renderCover(ctx: CanvasRenderingContext2D, slide: Slide, idx: number, total: number): void {
  paperBackground(ctx);
  // FAL "shape of wrongness" hero plate (its detail is on the right; left stays clear).
  drawPlate(ctx, '01', 'cover');

  // Hero atom mark, right side — the obstacle the lead text flows around.
  const markCx = W - 264;
  const markCy = 388;
  const markSize = 312;
  drawAtomMark(ctx, markCx, markCy, markSize, { stroke: PALETTE.lupine, strokePx: 1.4, alpha: 0.45 });

  // Wordmark, top-left.
  drawAtomMark(ctx, M + 16, 92, 30, { stroke: PALETTE.lupine, strokePx: 1.4 });
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = font(500, 24);
  ctx.fillStyle = PALETTE.lupineDeep;
  ctx.fillText((slide.kicker ?? 'Lupine Science').toUpperCase(), M + 42, 100);

  // One-liner headline (auto-fit), left-aligned, kept clear of the mark.
  const hRuns = parseInline(slide.headline);
  const headW = markCx - markSize / 2 - 44 - M; // width left of the mark band
  const fit = autofitHeadline(hRuns, headW, 300, { min: 44, max: 74, lineHeightRatio: 1.08, baseWeight: 500 });
  const headTop = 176;
  const headBottom = drawRuns(ctx, hRuns, M, headTop, headW, fit.size, fit.lineHeight, 500, PALETTE.ink);

  // Lead sentence — flows around the hero mark (technique c).
  const lead = slide.blocks.find((b) => b.kind === 'lead');
  let y = headBottom + 38;
  if (lead) {
    const markLeft = markCx - markSize / 2 - 30;
    const half = markSize / 2;
    const inBand = (lineTop: number) => lineTop + 34 > markCy - half && lineTop < markCy + half;
    y = drawRunsFlow(ctx, parseInline(lead.text), M, y, 27, 27 * 1.5, 400, PALETTE.ink, (lineTop) =>
      inBand(lineTop) ? markLeft - M : W - 2 * M,
    );
  }

  // Raise line — clamped to stay clear of the footer.
  const raise = slide.blocks.find((b) => b.kind === 'para');
  if (raise) {
    const raiseY = Math.min(y + 16, H - 84 - 30);
    drawRuns(ctx, parseInline(raise.text), M, raiseY, W - 2 * M, 22, 22 * 1.5, 400, PALETTE.inkSoft);
  }

  // Footer (founder line + counter).
  const fy = H - 84;
  hairline(ctx, M, fy, W - M);
  ctx.font = font(400, 17);
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'left';
  ctx.fillText(slide.footnote ?? '', M, fy + 36);
  ctx.font = font(400, 15);
  ctx.fillStyle = PALETTE.inkMuted;
  ctx.textAlign = 'right';
  ctx.fillText(`${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, W - M, fy + 35);
  ctx.textAlign = 'left';
}

export function renderSlide(ctx: CanvasRenderingContext2D, index: number): void {
  const slide = slides[index]!;
  ctx.save();
  if (slide.kind === 'cover') renderCover(ctx, slide, index, slides.length);
  else renderContent(ctx, slide, index, slides.length);
  applyFilmFinish(ctx); // unified grain + vignette over the whole comp
  ctx.restore();
}

export const slideCount = slides.length;
