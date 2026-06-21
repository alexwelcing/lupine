// All text placement runs through @chenglou/pretext — no DOM measurement, no reflow.
// Three techniques are used across the deck:
//   (a) auto-fit  : pick the largest size whose measured layout fits a box
//   (b) wrap      : lay styled runs into lines and draw each at its computed position
//   (c) flow      : variable-width lines that wrap around the atom logo
//
// Single-style text (kicker, footnote) uses the core API (prepareWithSegments /
// layout / layoutWithLines). Styled copy (bold/indigo inline) uses the rich-inline
// API (prepareRichInline / walkRichInlineLineRanges / layoutNextRichInlineLineRange),
// which measures each run with its own font so drawn ≡ measured.

import {
  prepareWithSegments,
  layout as coreLayout,
  layoutWithLines,
} from '@chenglou/pretext';
import {
  prepareRichInline,
  walkRichInlineLineRanges,
  materializeRichInlineLineRange,
  measureRichInlineStats,
  layoutNextRichInlineLineRange,
  type RichInlineItem,
  type RichInlineCursor,
} from '@chenglou/pretext/rich-inline';

import { PALETTE, PRELOAD_SPECS, font } from './brand.js';
import type { Run } from './text.js';

const ASCENT = 0.8; // baseline offset as a fraction of font size (Newsreader)

export async function ensureFonts(): Promise<void> {
  await Promise.all(PRELOAD_SPECS.map((spec) => document.fonts.load(spec).catch(() => undefined)));
  await document.fonts.ready;
}

// ── run styling ───────────────────────────────────────────────────────────
function runFont(run: Run, sizePx: number, baseWeight: number): string {
  return font(run.em ? 600 : baseWeight, sizePx, !!run.italic);
}
function runColor(run: Run, baseColor: string): string {
  return run.em ? PALETTE.lupine : baseColor;
}
function toItems(runs: Run[], sizePx: number, baseWeight: number): RichInlineItem[] {
  return runs.map((r) => ({ text: r.text, font: runFont(r, sizePx, baseWeight) }));
}

// ── (a) auto-fit a styled headline ─────────────────────────────────────────
export function autofitHeadline(
  runs: Run[],
  maxWidth: number,
  maxHeight: number,
  opts: { min: number; max: number; lineHeightRatio: number; baseWeight: number },
): { size: number; lineHeight: number } {
  for (let size = opts.max; size >= opts.min; size -= 1) {
    const lineHeight = size * opts.lineHeightRatio;
    const prepared = prepareRichInline(toItems(runs, size, opts.baseWeight));
    const stats = measureRichInlineStats(prepared, maxWidth);
    const height = stats.lineCount * lineHeight;
    if (height <= maxHeight && stats.maxLineWidth <= maxWidth) {
      return { size, lineHeight };
    }
  }
  return { size: opts.min, lineHeight: opts.min * opts.lineHeightRatio };
}

// measure the wrapped height of styled runs (used to auto-scale dense slides).
export function measureRunsHeight(
  runs: Run[],
  maxWidth: number,
  sizePx: number,
  lineHeight: number,
  baseWeight: number,
): number {
  const prepared = prepareRichInline(toItems(runs, sizePx, baseWeight));
  const stats = measureRichInlineStats(prepared, maxWidth);
  return stats.lineCount * lineHeight;
}

// ── (b) draw wrapped styled runs at a fixed column width ────────────────────
export function drawRuns(
  ctx: CanvasRenderingContext2D,
  runs: Run[],
  x: number,
  topY: number,
  maxWidth: number,
  sizePx: number,
  lineHeight: number,
  baseWeight: number,
  baseColor: string,
  align: 'left' | 'center' = 'left',
): number {
  const prepared = prepareRichInline(toItems(runs, sizePx, baseWeight));
  let lineTop = topY;
  ctx.textBaseline = 'alphabetic';
  walkRichInlineLineRanges(prepared, maxWidth, (range) => {
    const line = materializeRichInlineLineRange(prepared, range);
    const baseline = lineTop + sizePx * ASCENT;
    let penX = align === 'center' ? x + (maxWidth - line.width) / 2 : x;
    for (const frag of line.fragments) {
      penX += frag.gapBefore;
      const run = runs[frag.itemIndex]!;
      ctx.font = runFont(run, sizePx, baseWeight);
      ctx.fillStyle = runColor(run, baseColor);
      ctx.fillText(frag.text, penX, baseline);
      penX += frag.occupiedWidth;
    }
    lineTop += lineHeight;
  });
  return lineTop;
}

// ── (c) flow styled runs around an obstacle (variable width per line) ───────
export function drawRunsFlow(
  ctx: CanvasRenderingContext2D,
  runs: Run[],
  x: number,
  topY: number,
  sizePx: number,
  lineHeight: number,
  baseWeight: number,
  baseColor: string,
  widthAt: (lineTopY: number) => number,
): number {
  const prepared = prepareRichInline(toItems(runs, sizePx, baseWeight));
  let lineTop = topY;
  let cursor: RichInlineCursor | undefined;
  ctx.textBaseline = 'alphabetic';
  // Guard against pathological loops.
  for (let i = 0; i < 200; i++) {
    const width = Math.max(40, widthAt(lineTop));
    const range = layoutNextRichInlineLineRange(prepared, width, cursor);
    if (!range) break;
    const line = materializeRichInlineLineRange(prepared, range);
    const baseline = lineTop + sizePx * ASCENT;
    let penX = x;
    for (const frag of line.fragments) {
      penX += frag.gapBefore;
      const run = runs[frag.itemIndex]!;
      ctx.font = runFont(run, sizePx, baseWeight);
      ctx.fillStyle = runColor(run, baseColor);
      ctx.fillText(frag.text, penX, baseline);
      penX += frag.occupiedWidth;
    }
    lineTop += lineHeight;
    cursor = range.end;
  }
  return lineTop;
}

// ── single-style helpers (core API) for kicker / footnote ──────────────────
export function measureSingle(
  text: string,
  fontStr: string,
  maxWidth: number,
  lineHeight: number,
): { lineCount: number; height: number } {
  const prepared = prepareWithSegments(text, fontStr);
  return coreLayout(prepared, maxWidth, lineHeight);
}

export function drawSingle(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontStr: string,
  color: string,
  x: number,
  topY: number,
  maxWidth: number,
  sizePx: number,
  lineHeight: number,
): number {
  const prepared = prepareWithSegments(text, fontStr);
  const { lines } = layoutWithLines(prepared, maxWidth, lineHeight);
  ctx.textBaseline = 'alphabetic';
  ctx.font = fontStr;
  ctx.fillStyle = color;
  let lineTop = topY;
  for (const line of lines) {
    ctx.fillText(line.text, x, lineTop + sizePx * ASCENT);
    lineTop += lineHeight;
  }
  return lineTop;
}
