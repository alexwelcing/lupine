// @ts-nocheck
/**
 * Layout engine built on @chenglou/pretext.
 *
 * Uses pretext for fast, accurate text measurement (zero DOM reads),
 * then performs greedy line-breaking and column flow ourselves.
 */

import { prepareWithSegments, walkLineRanges } from '@chenglou/pretext';
import type { Block, InlineElement, PaperDocument } from './document';

export type LayoutElement =
  | { kind: 'text-line'; id: string; x: number; y: number; width: number; height: number; pageIndex: number; text: string; font: string; lineHeight: number }
  | { kind: 'math-inline'; id: string; x: number; y: number; width: number; height: number; pageIndex: number; latex: string }
  | { kind: 'heading'; id: string; x: number; y: number; width: number; height: number; pageIndex: number; text: string; level: number; font: string; lineHeight: number }
  | { kind: 'equation'; id: string; x: number; y: number; width: number; height: number; pageIndex: number; latex: string; label?: string; number?: number }
  | { kind: 'figure'; id: string; x: number; y: number; width: number; height: number; pageIndex: number; src: string; caption: string; label?: string; displayWidth: number; displayHeight: number }
  | { kind: 'table'; id: string; x: number; y: number; width: number; height: number; pageIndex: number; rows: string[][]; caption: string; label?: string };

export interface PageLayout {
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginInner: number;
  marginOuter: number;
  gutter: number;
  columnWidth: number;
}

export const DEFAULT_LAYOUT: PageLayout = {
  width: 816,
  height: 1056,
  marginTop: 72,
  marginBottom: 72,
  marginInner: 72,
  marginOuter: 72,
  gutter: 28,
  columnWidth: 322,
};

const BODY_FONT = '13px "Source Serif 4", Georgia, serif';
const BODY_LINE_HEIGHT = 18;
const ABSTRACT_FONT = '11px "Source Serif 4", Georgia, serif';
const ABSTRACT_LINE_HEIGHT = 16;
const HEADING_SPECS: Record<number, { font: string; lineHeight: number; before: number; after: number }> = {
  1: { font: '700 15px "Source Serif 4", Georgia, serif', lineHeight: 19, before: 16, after: 8 },
  2: { font: '700 14px "Source Serif 4", Georgia, serif', lineHeight: 18, before: 14, after: 6 },
  3: { font: '700 13px "Source Serif 4", Georgia, serif', lineHeight: 17, before: 12, after: 4 },
};

let _id = 0;
function uid(): string {
  return `el-${++_id}`;
}

function colX(layout: PageLayout, col: number): number {
  return col === 0 ? layout.marginInner : layout.marginInner + layout.columnWidth + layout.gutter;
}

function maxY(layout: PageLayout): number {
  return layout.height - layout.marginBottom;
}

export interface LayoutState {
  page: number;
  col: number;
  y: number;
  elements: LayoutElement[];
  eqCounter: number;
}

function ensureSpace(s: LayoutState, layout: PageLayout, h: number): LayoutState {
  if (s.y + h <= maxY(layout)) return s;
  if (s.col === 0) return { ...s, col: 1, y: layout.marginTop };
  return { ...s, page: s.page + 1, col: 0, y: layout.marginTop };
}

function push(s: LayoutState, el: LayoutElement): LayoutState {
  return { ...s, elements: [...s.elements, el] };
}

function fits(s: LayoutState, layout: PageLayout, h: number): boolean {
  return s.y + h <= maxY(layout);
}

/** Cache for pretext measurements */
const _widthCache = new Map<string, number>();

export function measureWidth(text: string, font: string): number {
  const key = `${font}::${text}`;
  const cached = _widthCache.get(key);
  if (cached !== undefined) return cached;
  const prepared = prepareWithSegments(text, font);
  let w = 0;
  walkLineRanges(prepared, 1_000_000, (line) => {
    w = line.width;
  });
  _widthCache.set(key, w);
  return w;
}

function collectAllMath(doc: PaperDocument): Set<string> {
  const set = new Set<string>();
  const scan = (children: InlineElement[]) => {
    for (const c of children) {
      if (c.kind === 'math') set.add(c.latex);
    }
  };
  for (const para of doc.abstract) scan(para);
  for (const b of doc.blocks) {
    if (b.kind === 'paragraph') scan(b.children);
  }
  return set;
}

export function measureAllMath(doc: PaperDocument): Map<string, number> {
  const widths = new Map<string, number>();
  const root = document.getElementById('math-measure-root');
  // @ts-ignore
  const k = window.katex;
  if (!root || !k) return widths;

  for (const latex of collectAllMath(doc)) {
    const span = document.createElement('span');
    span.style.cssText = 'display:inline-block;position:absolute;visibility:hidden;white-space:nowrap;';
    root.appendChild(span);
    k.render(latex, span, { throwOnError: false, displayMode: false });
    widths.set(latex, span.getBoundingClientRect().width);
    root.removeChild(span);
  }
  return widths;
}

interface Run {
  kind: 'text' | 'math' | 'cite';
  text?: string;
  latex?: string;
  width?: number;
}

function toRuns(children: InlineElement[], mathWidths: Map<string, number>): Run[] {
  const runs: Run[] = [];
  for (const c of children) {
    switch (c.kind) {
      case 'text':
        runs.push({ kind: 'text', text: c.text });
        break;
      case 'math':
        runs.push({ kind: 'math', latex: c.latex, width: mathWidths.get(c.latex) ?? 36 });
        break;
      case 'cite':
        runs.push({ kind: 'cite', text: ` [${c.refId}]` });
        break;
    }
  }
  return runs;
}

/** Simple greedy line breaker using pretext word measurements. */
function layoutParagraph(
  children: InlineElement[],
  colWidth: number,
  lineHeight: number,
  startX: number,
  startY: number,
  pageIndex: number,
  mathWidths: Map<string, number>,
  font: string,
): { elements: LayoutElement[]; height: number } {
  const runs = toRuns(children, mathWidths);
  const elements: LayoutElement[] = [];
  let y = startY;

  type Atom = { kind: 'word'; text: string; width: number } | { kind: 'math'; latex: string; width: number };
  const atoms: Atom[] = [];

  for (const run of runs) {
    if (run.kind === 'text' || run.kind === 'cite') {
      const text = run.text ?? '';
      const parts = text.split(/(\s+)/g).filter((w) => w.length > 0);
      for (const part of parts) {
        atoms.push({ kind: 'word', text: part, width: measureWidth(part, font) });
      }
    } else if (run.kind === 'math') {
      atoms.push({ kind: 'math', latex: run.latex!, width: run.width! });
    }
  }

  let lineAtoms: Atom[] = [];
  let lineWidth = 0;

  function flushLine() {
    if (lineAtoms.length === 0) return;

    let text = '';
    const mathBoxes: LayoutElement[] = [];

    for (const atom of lineAtoms) {
      if (atom.kind === 'word') {
        text += atom.text;
      } else {
        const prefixWidth = text.length > 0 ? measureWidth(text, font) : 0;
        mathBoxes.push({
          id: uid(),
          kind: 'math-inline',
          x: Math.round(startX + prefixWidth),
          y: Math.round(y),
          width: atom.width,
          height: lineHeight,
          pageIndex,
          latex: atom.latex,
        });
        text += ' ';
      }
    }

    const cleanText = text.trimEnd();
    if (cleanText.length > 0) {
      elements.push({
        id: uid(),
        kind: 'text-line',
        x: startX,
        y: Math.round(y),
        width: measureWidth(cleanText, font),
        height: lineHeight,
        pageIndex,
        text: cleanText,
        font,
        lineHeight,
      });
    }

    elements.push(...mathBoxes);
    y += lineHeight;
    lineAtoms = [];
    lineWidth = 0;
  }

  for (const atom of atoms) {
    if (lineWidth > 0 && lineWidth + atom.width > colWidth) {
      flushLine();
    }
    lineAtoms.push(atom);
    lineWidth += atom.width;
  }
  flushLine();

  return { elements, height: y - startY };
}

function layoutBlock(state: LayoutState, block: Block, layout: PageLayout, mathWidths: Map<string, number>): LayoutState {
  const x = colX(layout, state.col);

  switch (block.kind) {
    case 'heading': {
      const spec = HEADING_SPECS[block.level] ?? HEADING_SPECS[3];
      const h = spec.before + spec.lineHeight + spec.after;
      state = ensureSpace(state, layout, h);
      state = push(state, {
        id: uid(), kind: 'heading',
        x, y: state.y + spec.before,
        width: layout.columnWidth, height: spec.lineHeight,
        pageIndex: state.page,
        text: block.text, level: block.level,
        font: spec.font, lineHeight: spec.lineHeight,
      });
      return { ...state, y: state.y + h };
    }

    case 'paragraph': {
      const { elements, height } = layoutParagraph(
        block.children, layout.columnWidth, BODY_LINE_HEIGHT, x, state.y, state.page, mathWidths, BODY_FONT,
      );
      if (!fits(state, layout, height)) {
        state = ensureSpace(state, layout, height);
        return layoutBlock(state, block, layout, mathWidths);
      }
      for (const el of elements) state = push(state, el);
      return { ...state, y: state.y + height + 2 };
    }

    case 'equation': {
      const h = 36;
      state = ensureSpace(state, layout, h + 8);
      const num = block.numbered ? ++state.eqCounter : undefined;
      state = push(state, {
        id: uid(), kind: 'equation',
        x, y: state.y + 4,
        width: layout.columnWidth, height: h,
        pageIndex: state.page,
        latex: block.latex, label: block.label, number: num,
      });
      return { ...state, y: state.y + h + 8 };
    }

    case 'figure': {
      const fw = block.width ?? layout.columnWidth;
      const fh = Math.round(fw * 0.55) + 24;
      state = ensureSpace(state, layout, fh + 8);
      state = push(state, {
        id: uid(), kind: 'figure',
        x: x + (layout.columnWidth - fw) / 2, y: state.y,
        width: fw, height: fh,
        pageIndex: state.page,
        src: block.src, caption: block.caption, label: block.label,
        displayWidth: fw, displayHeight: Math.round(fw * 0.55),
      });
      return { ...state, y: state.y + fh + 8 };
    }

    case 'table': {
      const rh = 18;
      const h = block.rows.length * rh + 24;
      state = ensureSpace(state, layout, h + 8);
      state = push(state, {
        id: uid(), kind: 'table',
        x, y: state.y,
        width: layout.columnWidth, height: h,
        pageIndex: state.page,
        rows: block.rows, caption: block.caption, label: block.label,
      });
      return { ...state, y: state.y + h + 8 };
    }

    default:
      return state;
  }
}

export function layoutPaper(
  doc: PaperDocument,
  mathWidths: Map<string, number>,
  pageLayout: PageLayout = DEFAULT_LAYOUT,
): LayoutElement[] {
  _id = 0;
  _widthCache.clear();
  console.log('[layout] starting layout, math widths:', mathWidths.size);

  let state: LayoutState = {
    page: 0, col: 0,
    y: pageLayout.marginTop,
    elements: [], eqCounter: 0,
  };

  const pageW = pageLayout.width - pageLayout.marginInner - pageLayout.marginOuter;

  // Title
  state = push(state, {
    id: uid(), kind: 'heading',
    x: pageLayout.marginInner, y: state.y,
    width: pageW, height: 22,
    pageIndex: state.page,
    text: doc.title, level: 0,
    font: '700 21px "Source Serif 4", Georgia, serif', lineHeight: 26,
  });
  state = { ...state, y: state.y + 28 };

  // Authors
  const authorLine = doc.authors.map((a) => `${a.name}, ${a.affiliation}`).join(' \u00B7 ');
  state = push(state, {
    id: uid(), kind: 'text-line',
    x: pageLayout.marginInner, y: state.y,
    width: pageW, height: 12,
    pageIndex: state.page,
    text: authorLine,
    font: '11px "Source Sans 3", sans-serif', lineHeight: 14,
  });
  state = { ...state, y: state.y + 18 };

  // Abstract
  state = ensureSpace(state, pageLayout, 30);
  state = push(state, {
    id: uid(), kind: 'heading',
    x: colX(pageLayout, state.col), y: state.y,
    width: pageLayout.columnWidth, height: 12,
    pageIndex: state.page,
    text: 'Abstract', level: 3,
    font: HEADING_SPECS[3].font, lineHeight: 12,
  });
  state = { ...state, y: state.y + 14 };

  for (const para of doc.abstract) {
    const { elements, height } = layoutParagraph(
      para, pageLayout.columnWidth, ABSTRACT_LINE_HEIGHT,
      colX(pageLayout, state.col), state.y, state.page, mathWidths, ABSTRACT_FONT,
    );
    for (const el of elements) state = push(state, el);
    state = { ...state, y: state.y + height + 4 };
  }
  state = { ...state, y: state.y + 10 };

  // Body blocks
  for (const block of doc.blocks) {
    state = layoutBlock(state, block, pageLayout, mathWidths);
  }

  console.log('[layout] generated', state.elements.length, 'elements across', state.page + 1, 'pages');
  return state.elements;
}
