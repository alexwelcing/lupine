/**
 * Streaming LAMMPS dump parser (single-frame focus).
 *
 * Two transport modes share one parsing core (`parseDumpStreamCore`):
 *   - `parseDumpStream(text)` — caller has the whole file in memory
 *     (current Phase 2a behavior). Wraps the string in a one-shot
 *     async source.
 *   - `parseDumpStreamFromBytes(byteIter)` — Phase 2b. Caller has a
 *     ReadableStream / async iterable of byte chunks (from
 *     `Response.body.getReader()` or `File.stream()`). Bytes are
 *     decoded incrementally with TextDecoder; atoms render before
 *     the file finishes downloading.
 *
 * Why a JS parser at all: the Rust/WASM parser is faster per-atom but
 * all-or-nothing — for the 1M-atom test it produces ~500 ms of parse
 * work followed by silence, then the full Frame lands and the renderer
 * starts. This parser trades a constant-factor of per-atom speed
 * (~3-5× slower than Rust) for progressive yield: it yields the
 * Frame's TypedArrays as soon as the header is parsed, then fills
 * them in chunks of ATOM_CHUNK_SIZE atoms, yielding `progress`
 * events. The renderer (Phase 1 partial-frame-aware) grows
 * `geometry.instanceCount` to whatever count is loaded so far.
 *
 * Scope: handles the dialect of LAMMPS dump that the gallery / public/
 * test fixtures use — single TIMESTEP, NUMBER OF ATOMS, BOX BOUNDS pp,
 * ATOMS id type x y z (any column order keyed by name). Multi-frame
 * dumps stop at the first `ITEM: TIMESTEP` past the initial frame and
 * report what they have. Scaled coordinates (`xs/ys/zs`), tilt factors,
 * triclinic boxes, and per-atom properties are intentionally NOT
 * supported here — they fall through to the existing WASM path via
 * `canStreamDump()`'s pre-flight check.
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

/** A puller that returns the next chunk of text from some source.
 *  Returns `null` when the source is exhausted. The core parser calls
 *  this whenever it needs more data; the puller is what differentiates
 *  the in-memory text adapter from the byte-stream adapter. */
type TextPuller = () => Promise<string | null>;

/** Shared core. Pulls text from `puller` into a sliding buffer, parses
 *  header then atom rows incrementally, yields progress events as the
 *  Frame's TypedArrays fill. */
async function* parseDumpStreamCore(puller: TextPuller): AsyncGenerator<DumpStreamEvent> {
  // Sliding text buffer. Grown via `pull()`; consumed prefix is dropped
  // periodically to bound memory growth on a multi-MB stream.
  let buffer = '';
  let sourceDone = false;

  /** Pull more text into `buffer`. Returns true if anything new arrived. */
  async function pull(): Promise<boolean> {
    if (sourceDone) return false;
    const next = await puller();
    if (next === null) {
      sourceDone = true;
      return false;
    }
    buffer += next;
    return true;
  }

  // ─── Header phase ────────────────────────────────────────────────
  // We need the whole header through `ITEM: ATOMS …\n` before we can
  // pre-allocate the Frame and start yielding atom progress. Pull until
  // that line is present — usually the first chunk on a network stream
  // is large enough (~64 KB) that this is one iteration.
  let timestep = 0;
  let natoms = -1;
  const boxBounds = new Float64Array(6);
  let boxBoundsSeen = 0;
  let columns: string[] | null = null;
  let atomBlockStart = -1;

  while (atomBlockStart < 0) {
    // Are all the header pieces we need present in `buffer`?
    const itemAtomsIdx = buffer.indexOf('ITEM: ATOMS');
    const itemAtomsEol = itemAtomsIdx >= 0 ? buffer.indexOf('\n', itemAtomsIdx) : -1;
    if (itemAtomsEol < 0) {
      // Need more bytes before we have the full header. Pull and retry.
      if (!(await pull())) {
        throw new Error('streaming parser: stream ended before ATOMS header');
      }
      continue;
    }

    // We have everything through `ITEM: ATOMS …\n`. Walk it linearly.
    let lineStart = 0;
    while (lineStart < itemAtomsEol) {
      const lineEnd = buffer.indexOf('\n', lineStart);
      const line = (lineEnd === -1 ? buffer.slice(lineStart) : buffer.slice(lineStart, lineEnd)).trim();
      const nextLineStart = lineEnd === -1 ? buffer.length : lineEnd + 1;

      if (line === 'ITEM: TIMESTEP') {
        const tsEnd = buffer.indexOf('\n', nextLineStart);
        const tsLine = (tsEnd === -1 ? buffer.slice(nextLineStart) : buffer.slice(nextLineStart, tsEnd)).trim();
        timestep = parseInt(tsLine, 10) | 0;
        lineStart = tsEnd === -1 ? buffer.length : tsEnd + 1;
      } else if (line === 'ITEM: NUMBER OF ATOMS') {
        const naEnd = buffer.indexOf('\n', nextLineStart);
        const naLine = (naEnd === -1 ? buffer.slice(nextLineStart) : buffer.slice(nextLineStart, naEnd)).trim();
        natoms = parseInt(naLine, 10) | 0;
        lineStart = naEnd === -1 ? buffer.length : naEnd + 1;
      } else if (line.startsWith('ITEM: BOX BOUNDS')) {
        // Three bound lines follow. Triclinic boxes have 3 numbers per
        // line (lo hi tilt) — we only support the 2-number orthogonal
        // case here; triclinic falls through to the WASM path via
        // `canStreamDump()`'s pre-flight rejection.
        let cursor = nextLineStart;
        for (let i = 0; i < 3; i++) {
          const e = buffer.indexOf('\n', cursor);
          const bbLine = (e === -1 ? buffer.slice(cursor) : buffer.slice(cursor, e)).trim();
          const parts = bbLine.split(/\s+/);
          if (parts.length > 2) {
            throw new Error('streaming parser: triclinic box bounds not supported (use WASM path)');
          }
          boxBounds[i * 2] = parseFloat(parts[0]);
          boxBounds[i * 2 + 1] = parseFloat(parts[1]);
          boxBoundsSeen++;
          cursor = e === -1 ? buffer.length : e + 1;
        }
        lineStart = cursor;
      } else if (line.startsWith('ITEM: ATOMS')) {
        columns = line.slice('ITEM: ATOMS'.length).trim().split(/\s+/);
        atomBlockStart = nextLineStart;
        break;
      } else {
        lineStart = nextLineStart;
      }
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

  // Drop the consumed header prefix; the atom loop walks from buffer[0].
  buffer = buffer.slice(atomBlockStart);

  // ─── Atom phase ──────────────────────────────────────────────────
  // We carry an in-buffer cursor so we don't re-search from index 0
  // on every line; periodically we shift the buffer to keep its size
  // bounded (the streamed data could be tens of MB total — accumulating
  // it in one string would defeat the point of streaming).
  const positions = frame.positions;
  const types = frame.types;
  const ids = frame.ids;
  const SHIFT_THRESHOLD = 64 * 1024; // shift after this much consumed

  let i = 0;
  let lastYieldAt = 0;
  let cursor = 0;

  while (i < natoms) {
    const lineEnd = buffer.indexOf('\n', cursor);

    if (lineEnd === -1) {
      // No complete line in buffer. Either pull more, or end if source
      // is exhausted (last partial row, if any, is parsed below).
      if (sourceDone) break;
      // Shift consumed prefix out before pulling — keeps buffer size
      // bounded by the largest single chunk plus one line.
      if (cursor >= SHIFT_THRESHOLD) {
        buffer = buffer.slice(cursor);
        cursor = 0;
      }
      await pull();
      continue;
    }

    // Cheap prefix check for the next-frame `ITEM:` marker (avoids
    // slicing the row to test it).
    if (
      buffer.charCodeAt(cursor) === 73 /* I */ &&
      buffer.charCodeAt(cursor + 1) === 84 /* T */ &&
      buffer.charCodeAt(cursor + 2) === 69 /* E */ &&
      buffer.charCodeAt(cursor + 3) === 77 /* M */
    ) {
      break;
    }

    // Skip blank lines (some files have a trailing newline before the
    // next ITEM block).
    if (lineEnd === cursor) {
      cursor = lineEnd + 1;
      continue;
    }

    // Parse the row. split-by-whitespace is faster than a regex split
    // for short rows; we restrict to the column count to skip trailing
    // junk if any.
    const row = buffer.slice(cursor, lineEnd);
    const parts = row.split(/\s+/);
    const baseOffset = parts[0] === '' ? 1 : 0;

    if (idIdx >= 0) ids[i] = parseInt(parts[idIdx + baseOffset], 10) | 0;
    types[i] = parseInt(parts[typeIdx + baseOffset], 10) | 0;
    const pi = i * 3;
    positions[pi]     = parseFloat(parts[xIdx + baseOffset]);
    positions[pi + 1] = parseFloat(parts[yIdx + baseOffset]);
    positions[pi + 2] = parseFloat(parts[zIdx + baseOffset]);

    i++;
    cursor = lineEnd + 1;

    if (i - lastYieldAt >= ATOM_CHUNK_SIZE) {
      yield { type: 'progress', loadedAtoms: i };
      lastYieldAt = i;
      // After yielding, shift the buffer if we've accumulated a lot of
      // consumed prefix. This caps memory growth between progress
      // yields on slow networks.
      if (cursor >= SHIFT_THRESHOLD) {
        buffer = buffer.slice(cursor);
        cursor = 0;
      }
    }
  }

  // Final partial-row handling: if the last line lacked a trailing
  // newline AND we haven't hit natoms yet, parse it as the last atom.
  if (i < natoms && cursor < buffer.length && !sourceDone) {
    // Pull once more in case the trailing newline is just behind.
    await pull();
    const tailEnd = buffer.indexOf('\n', cursor);
    const tailEffectiveEnd = tailEnd === -1 ? buffer.length : tailEnd;
    if (tailEffectiveEnd > cursor) {
      const row = buffer.slice(cursor, tailEffectiveEnd).trim();
      if (row && !row.startsWith('ITEM:')) {
        const parts = row.split(/\s+/);
        const baseOffset = parts[0] === '' ? 1 : 0;
        if (idIdx >= 0) ids[i] = parseInt(parts[idIdx + baseOffset], 10) | 0;
        types[i] = parseInt(parts[typeIdx + baseOffset], 10) | 0;
        const pi = i * 3;
        positions[pi]     = parseFloat(parts[xIdx + baseOffset]);
        positions[pi + 1] = parseFloat(parts[yIdx + baseOffset]);
        positions[pi + 2] = parseFloat(parts[zIdx + baseOffset]);
        i++;
      }
    }
  }

  yield { type: 'complete', loadedAtoms: i };
}

/** Parse a fully-buffered LAMMPS dump string. The whole-text path: used
 *  by the WASM-fallback FileReader.text() flow and by tests. Phase 2b
 *  callers prefer the byte-streaming variant below. */
export async function* parseDumpStream(text: string): AsyncGenerator<DumpStreamEvent> {
  let yielded = false;
  yield* parseDumpStreamCore(async () => {
    if (yielded) return null;
    yielded = true;
    return text;
  });
}

/** Parse from an async iterable of byte chunks (e.g. a fetch response
 *  body or `File.stream()`). Atoms render before the file finishes
 *  downloading.
 *
 *  The puller decodes incrementally via `TextDecoder({ stream: true })`
 *  so multi-byte characters split across chunks are handled correctly,
 *  and emits a final `decoder.decode()` to flush any trailing partial
 *  sequence. */
export async function* parseDumpStreamFromBytes(
  source: AsyncIterable<Uint8Array>,
): AsyncGenerator<DumpStreamEvent> {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const iter = source[Symbol.asyncIterator]();
  let flushed = false;
  yield* parseDumpStreamCore(async () => {
    const r = await iter.next();
    if (r.done) {
      if (flushed) return null;
      flushed = true;
      const tail = decoder.decode();
      return tail.length > 0 ? tail : null;
    }
    return decoder.decode(r.value, { stream: true });
  });
}

/** Adapt a `ReadableStream<Uint8Array>` to an `AsyncIterable<Uint8Array>`.
 *  Modern browsers expose `ReadableStream`'s own `[Symbol.asyncIterator]`,
 *  but it's still flagged experimental in some runtimes — we wrap the
 *  reader manually so the parser's iteration contract is consistent. */
export function readableStreamToAsyncIterable(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<Uint8Array> {
  const reader = stream.getReader();
  return {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<Uint8Array>> {
          try {
            const r = await reader.read();
            if (r.done) {
              reader.releaseLock();
              return { value: undefined, done: true };
            }
            return { value: r.value, done: false };
          } catch (err) {
            try { reader.releaseLock(); } catch { /* already released */ }
            throw err;
          }
        },
        async return(): Promise<IteratorResult<Uint8Array>> {
          // Caller broke out of the for-await early; cancel the stream
          // so the network/file source can be released.
          try { await reader.cancel(); } catch { /* ignore */ }
          try { reader.releaseLock(); } catch { /* ignore */ }
          return { value: undefined, done: true };
        },
      };
    },
  };
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
