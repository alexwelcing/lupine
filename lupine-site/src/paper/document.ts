/**
 * Paper document model — structured representation of an academic paper.
 * This is the input to the layout engine.
 */

export interface Author {
  name: string;
  affiliation: string;
  email?: string;
}

export interface Reference {
  id: string;
  text: string;
}

export type InlineElement =
  | { kind: 'text'; text: string }
  | { kind: 'math'; latex: string }
  | { kind: 'cite'; refId: string };

export type Block =
  | { kind: 'title'; text: string }
  | { kind: 'authors'; authors: Author[] }
  | { kind: 'abstract'; paragraphs: InlineElement[][] }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; children: InlineElement[] }
  | { kind: 'equation'; latex: string; label?: string; numbered: boolean }
  | { kind: 'figure'; src: string; caption: string; label?: string; width?: number }
  | { kind: 'table'; rows: string[][]; caption: string; label?: string }
  | { kind: 'references'; items: Reference[] };

export interface PaperDocument {
  title: string;
  authors: Author[];
  abstract: InlineElement[][];
  blocks: Block[];
}

/**
 * Helper to build inline text quickly.
 */
export function t(text: string): InlineElement {
  return { kind: 'text', text };
}

/**
 * Helper to build inline math.
 */
export function m(latex: string): InlineElement {
  return { kind: 'math', latex };
}

/**
 * Helper to build a citation.
 */
export function c(refId: string): InlineElement {
  return { kind: 'cite', refId };
}

/**
 * Helper to build a paragraph block from inline elements.
 */
export function p(...children: InlineElement[]): Block {
  return { kind: 'paragraph', children };
}

/**
 * Helper to build a heading block.
 */
export function h(level: number, text: string): Block {
  return { kind: 'heading', level, text };
}

/**
 * Helper to build an equation block.
 */
export function eq(latex: string, opts?: { label?: string; numbered?: boolean }): Block {
  return { kind: 'equation', latex, label: opts?.label, numbered: opts?.numbered ?? true };
}

/**
 * Helper to build a figure block.
 */
export function fig(src: string, caption: string, opts?: { label?: string; width?: number }): Block {
  return { kind: 'figure', src, caption, label: opts?.label, width: opts?.width };
}

export function table(rows: string[][], caption: string, opts?: { label?: string }): Block {
  return { kind: 'table', rows, caption, label: opts?.label };
}
