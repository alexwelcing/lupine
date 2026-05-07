/**
 * Streaming LAMMPS dump parser (single-frame focus).
 *
 * The Rust/WASM parser is faster per-atom but all-or-nothing — for the
 * 1M-atom test it produces ~500 ms of parse work followed by silence,
 * then the full Frame lands and the renderer starts. The user stares
 * at a spinner for the entire duration.
 *
 * This parser trades a constant-factor of speed (~3-5× slower per atom
 * than Rust) for progressive yield: it yields the Frame's TypedArrays
 * as soon as the header is parsed, then fills them in chunks of
 * ATOM_CHUNK_SIZE atoms, yielding a `progress` event after each chunk.
 * The renderer is partial-frame-aware (Phase 1) and grows
 * `geometry.instanceCount` to whatever count is loaded so far.
 *
 * Net effect on the 1M-atom test: time-to-first-atom drops from ~500
 * ms to ~50 ms; the user sees atoms appear and grow rather than a
 * stalled spinner followed by a popup of the finished scene.
 *
 * Scope: handles the dialect of LAMMPS dump that the gallery / public/
 * test fixtures use — single TIMESTEP, NUMBER OF ATOMS, BOX BOUNDS pp,
 * ATOMS id type x y z (any column order keyed by name). Multi-frame
 * dumps stop at the first `ITEM: TIMESTEP` past the initial frame and
 * report what they have. Scaled coordinates (`xs/ys/zs`), tilt factors,
 * triclinic boxes, and per-atom properties are intentionally NOT
 * supported here — they fall through to the existing WASM path.
 */

import type { Frame } from '@atlas/core/types';

/** Yield-after-this-many-atoms granularity. Sized so each chunk fits
 *  comfortably in a single animation frame's parse budget on a phone
 *  (parse cost on JS for 10K atoms is ~10-15 ms — under the 16.6 ms
 *  rAF budget) so the renderer keeps painting between chunks. */
export const ATOM_CHUNK_SIZE = 10_000;

export interface DumpStreamHeaderEvent {
  type: 'header';
  /** Pre-allocated Frame with positions / types / ids sized to natoms
   *  but populated only up to `loadedAtoms` (initially 0). The renderer
   *  takes ownership immediately so it can grow geometry.instanceCount
   *  as `loadedAtoms` increases on subsequent progress events. */
  frame: Frame;
}

export interface DumpStreamProgressEvent {
  type: 'progress';
  /** Number of atoms populated so far in `frame.positions / types / ids`.
   *  Indices in [0, loadedAtoms) are valid; [loadedAtoms, frame.natoms)
   *  is uninitialized memory. */
  loadedAtoms: number;
}

export interface DumpStreamCompleteEvent {
  type: 'complete';
  /** Final atom count actually parsed (≤ frame.natoms — a truncated or
   *  multi-frame file may stop short). */
  loadedAtoms: number;
}

export type DumpStreamEvent =
  | DumpStreamHeaderEvent
  | DumpStreamProgressEvent
  | DumpStreamCompleteEvent;

/** Parse a LAMMPS dump file as text, yielding a header + progress events.
 *
 *  Caller responsibility:
 *  - The caller keeps the same Frame reference across events (it's
 *    pre-allocated). Don't replace `frame.positions` etc. midstream —
 *    the parser writes through that reference.
 *  - Caller is expected to `await` between iterations so the runtime
 *    can paint between chunks. The simplest pattern:
 *
 *      for await (const event of parseDumpStream(text)) {
 *        if (event.type === 'header') store.setStreamingFrame(event.frame);
 *        if (event.type === 'progress') {
 *          store.setLoadedAtomCount(event.loadedAtoms);
 *          await new Promise(r => requestAnimationFrame(r));
 *        }
 *        if (event.type === 'complete') store.setLoadedAtomCount(event.loadedAtoms);
 *      }
 */
export async function* parseDumpStream(text: string): AsyncGenerator<DumpStreamEvent> {
  // Header parse. Walk lines until we find `ITEM: ATOMS …` (which
  // marks the end of the frame header) and absorb the metadata along
  // the way. We retain the offset where the atom block begins so the
  // tight per-atom loop below can start there without reparsing.
  let lineStart = 0;
  let timestep = 0;
  let natoms = -1;
  const boxBounds = new Float64Array(6);
  let boxBoundsSeen = 0;
  let columns: string[] | null = null;
  let atomBlockStart = -1;

  // Walk until ITEM: ATOMS. Stop early if header is malformed; we
  // throw rather than guess because partial frames render glitchy.
  while (lineStart < text.length) {
    const lineEnd = text.indexOf('\n', lineStart);
    const line = (lineEnd === -1 ? text.slice(lineStart) : text.slice(lineStart, lineEnd)).trim();
    const nextLineStart = lineEnd === -1 ? text.length : lineEnd + 1;

    if (line === 'ITEM: TIMESTEP') {
      const tsEnd = text.indexOf('\n', nextLineStart);
      const tsLine = (tsEnd === -1 ? text.slice(nextLineStart) : text.slice(nextLineStart, tsEnd)).trim();
      timestep = parseInt(tsLine, 10) | 0;
      lineStart = tsEnd === -1 ? text.length : tsEnd + 1;
    } else if (line === 'ITEM: NUMBER OF ATOMS') {
      const naEnd = text.indexOf('\n', nextLineStart);
      const naLine = (naEnd === -1 ? text.slice(nextLineStart) : text.slice(nextLineStart, naEnd)).trim();
      natoms = parseInt(naLine, 10) | 0;
      lineStart = naEnd === -1 ? text.length : naEnd + 1;
    } else if (line.startsWith('ITEM: BOX BOUNDS')) {
      // Three bound lines follow. Triclinic boxes have 3 numbers per
      // line (lo hi tilt) — we only support the 2-number orthogonal
      // case here; triclinic falls through to the WASM path.
      let cursor = nextLineStart;
      for (let i = 0; i < 3; i++) {
        const e = text.indexOf('\n', cursor);
        const bbLine = (e === -1 ? text.slice(cursor) : text.slice(cursor, e)).trim();
        const parts = bbLine.split(/\s+/);
        if (parts.length > 2) {
          throw new Error('streaming parser: triclinic box bounds not supported (use WASM path)');
        }
        boxBounds[i * 2] = parseFloat(parts[0]);
        boxBounds[i * 2 + 1] = parseFloat(parts[1]);
        boxBoundsSeen++;
        cursor = e === -1 ? text.length : e + 1;
      }
      lineStart = cursor;
    } else if (line.startsWith('ITEM: ATOMS')) {
      // Column spec: everything after "ITEM: ATOMS" is column names.
      columns = line.slice('ITEM: ATOMS'.length).trim().split(/\s+/);
      atomBlockStart = nextLineStart;
      break;
    } else {
      // Unknown ITEM line or stray content — skip.
      lineStart = nextLineStart;
    }
  }

  if (natoms < 0 || boxBoundsSeen !== 3 || !columns || atomBlockStart < 0) {
    throw new Error('streaming parser: incomplete LAMMPS dump header');
  }

  // Resolve column indices. We support id, type, x/y/z. Scaled
  // coordinates (xs/ys/zs) and unwrapped (xu/yu/zu) are rejected to
  // keep the per-atom loop tight and predictable.
  const idIdx = columns.indexOf('id');
  const typeIdx = columns.indexOf('type');
  const xIdx = columns.indexOf('x');
  const yIdx = columns.indexOf('y');
  const zIdx = columns.indexOf('z');
  if (xIdx < 0 || yIdx < 0 || zIdx < 0 || typeIdx < 0) {
    throw new Error(`streaming parser: required columns missing (got [${columns.join(', ')}])`);
  }

  // Pre-allocate the Frame's TypedArrays at full natoms. The renderer
  // reads only up to `loadedAtomCount` so the unfilled tail is invisible.
  const frame: Frame = {
    timestep,
    natoms,
    boxBounds,
    boxTilt: new Float64Array(3),
    triclinic: false,
    columns,
    ids: new Int32Array(natoms),
    types: new Int32Array(natoms),
    positions: new Float32Array(natoms * 3),
    bonds: new Int32Array(0),
    properties: new Map(),
  };

  yield { type: 'header', frame };

  // Tight per-atom loop. For each atom row:
  //   - Locate the next newline, slice the row.
  //   - Split on whitespace, parse the relevant columns into Frame
  //     TypedArrays at index `i`.
  //   - Stop on `ITEM: …` (next frame) or end of text.
  //   - Yield a progress event every ATOM_CHUNK_SIZE atoms.
  let i = 0;
  let cursor = atomBlockStart;
  let lastYieldAt = 0;
  const positions = frame.positions;
  const types = frame.types;
  const ids = frame.ids;

  while (i < natoms && cursor < text.length) {
    const lineEnd = text.indexOf('\n', cursor);
    const rowEnd = lineEnd === -1 ? text.length : lineEnd;
    // Skip blank lines (some files have a trailing newline before the
    // next ITEM block).
    if (rowEnd === cursor) {
      cursor = lineEnd === -1 ? text.length : lineEnd + 1;
      continue;
    }
    // ITEM markers terminate the current frame — multi-frame dumps
    // stop here; the caller handles those via the WASM path.
    // Cheap prefix check (avoids slicing the row on every iteration).
    if (
      text.charCodeAt(cursor) === 73 /* I */ &&
      text.charCodeAt(cursor + 1) === 84 /* T */ &&
      text.charCodeAt(cursor + 2) === 69 /* E */ &&
      text.charCodeAt(cursor + 3) === 77 /* M */
    ) {
      break;
    }

    // Parse the row. split-by-whitespace is faster than a regex split
    // for short rows; we restrict to the column count to skip trailing
    // junk if any.
    const row = text.slice(cursor, rowEnd);
    const parts = row.split(/\s+/);
    // First token may be empty if the row starts with whitespace.
    const baseOffset = parts[0] === '' ? 1 : 0;

    // Direct typed-array writes by column index. parseFloat / parseInt
    // are JIT-friendly for plain ASCII numerals.
    if (idIdx >= 0) ids[i] = parseInt(parts[idIdx + baseOffset], 10) | 0;
    types[i] = parseInt(parts[typeIdx + baseOffset], 10) | 0;
    const pi = i * 3;
    positions[pi]     = parseFloat(parts[xIdx + baseOffset]);
    positions[pi + 1] = parseFloat(parts[yIdx + baseOffset]);
    positions[pi + 2] = parseFloat(parts[zIdx + baseOffset]);

    i++;
    cursor = lineEnd === -1 ? text.length : lineEnd + 1;

    if (i - lastYieldAt >= ATOM_CHUNK_SIZE) {
      yield { type: 'progress', loadedAtoms: i };
      lastYieldAt = i;
    }
  }

  yield { type: 'complete', loadedAtoms: i };
}

/** Fast pre-flight: is this content a LAMMPS dump file the streaming
 *  parser can handle (orthogonal box, supported columns, single frame)?
 *  Only inspects the first few hundred bytes — does NOT scan the
 *  full atom block. Caller falls back to WASM when this returns false. */
export function canStreamDump(textHead: string): boolean {
  // Must start with ITEM: TIMESTEP (allow leading whitespace/BOM).
  const head = textHead.trimStart();
  if (!head.startsWith('ITEM: TIMESTEP')) return false;

  // Quick check for triclinic box (3-number bound lines).
  const bbIdx = head.indexOf('ITEM: BOX BOUNDS');
  if (bbIdx === -1) return false;
  const bbHeaderEnd = head.indexOf('\n', bbIdx);
  if (bbHeaderEnd === -1) return false;
  // Tilt indicator is the `xy xz yz` token in the header.
  const bbHeader = head.slice(bbIdx, bbHeaderEnd);
  if (/\bxy\b|\bxz\b|\byz\b/.test(bbHeader)) return false;

  // Required columns present in the ATOMS spec.
  const atIdx = head.indexOf('ITEM: ATOMS');
  if (atIdx === -1) return false;
  const atEnd = head.indexOf('\n', atIdx);
  if (atEnd === -1) return false;
  const colsLine = head.slice(atIdx + 'ITEM: ATOMS'.length, atEnd).trim();
  const cols = colsLine.split(/\s+/);
  return cols.includes('type') && cols.includes('x') && cols.includes('y') && cols.includes('z');
}
