/**
 * Streaming LAMMPS dump parser.
 *
 * Two transport modes share one parsing core (`parseDumpStreamCore`):
 *   - `parseDumpStream(text)` — caller has the whole file in memory.
 *   - `parseDumpStreamFromBytes(byteIter)` — caller has a ReadableStream /
 *     async iterable of byte chunks (from `Response.body.getReader()` or
 *     `File.stream()`). Bytes are decoded incrementally; atoms render
 *     before the file finishes downloading.
 *
 * Dialect coverage — the full common dump space, not a happy-path subset:
 *   - orthogonal AND triclinic boxes (tilt factors carried per frame),
 *   - unscaled (x y z), scaled (xs ys zs), and unwrapped (xu yu zu)
 *     coordinates — scaled coordinates are mapped to Cartesian with the
 *     proper triclinic transform (x = xlo + xs·lx + ys·xy + zs·xz),
 *   - extra per-atom columns (vx, c_pe, …) parsed into named Float32Array
 *     properties so property coloring works on streamed files,
 *   - variable atom counts and per-frame boxes (NPT) — every frame
 *     carries its own box.
 *
 * Performance: the per-row hot loop scans numbers directly by charCode —
 * no slice, no split, no parseFloat, zero allocations per row. That is
 * what lets a multi-GB trajectory ingest at memory-bandwidth-ish rates
 * while holding only the frame in flight.
 *
 * Multi-frame mode (`{ multiFrame: true }`) yields each frame past
 * frame 0 whole, one at a time, so a consumer (the transcode worker)
 * can process and release them — O(1 frame) memory for the initial
 * parse of a simulation over time. Frame 0 keeps the progressive
 * header/progress contract for the viewer's first paint.
 */

import type { Frame } from '@atlas/core/types';
import { analyzeDumpHead } from './dumpContract';

/** Yield-after-this-many-atoms granularity. Sized so each chunk fits
 *  comfortably in a single animation frame's parse budget on a phone
 *  so the renderer keeps painting between chunks. */
export const ATOM_CHUNK_SIZE = 10_000;

export interface DumpStreamHeaderEvent {
  type: 'header';
  /** Pre-allocated Frame with positions / types / ids / properties sized
   *  to natoms but populated only up to `loadedAtoms` (initially 0). The
   *  renderer takes ownership immediately so it can grow
   *  geometry.instanceCount as `loadedAtoms` increases. */
  frame: Frame;
}

export interface DumpStreamProgressEvent {
  type: 'progress';
  /** Number of atoms populated so far in the frame's arrays. Indices in
   *  [0, loadedAtoms) are valid; the tail is uninitialized memory. */
  loadedAtoms: number;
}

/** Multi-frame mode only: a complete trajectory frame past frame 0.
 *  Frame 0 still arrives via `header` + `progress` (the progressive-paint
 *  contract); later frames arrive whole, one event each, so a consumer
 *  (e.g. the transcode worker) can process and release them one at a
 *  time — the parser never holds more than the frame being parsed. */
export interface DumpStreamFrameEvent {
  type: 'frame';
  /** Index of this frame within the trajectory (1-based past frame 0). */
  frameIndex: number;
  frame: Frame;
}

export interface DumpStreamCompleteEvent {
  type: 'complete';
  /** Final atom count actually parsed for frame 0 (≤ frame.natoms — a
   *  truncated file may stop short). */
  loadedAtoms: number;
  /** Single-frame mode: true when the source contained at least one more
   *  `ITEM: TIMESTEP` block after frame 0, so the caller can recognize a
   *  trajectory ("simulation over time") and route it to a path that
   *  captures every frame instead of silently rendering only frame 0.
   *  Multi-frame mode consumes everything, so this is always false there. */
  hasMoreFrames: boolean;
  /** Total frames parsed (1 in single-frame mode; the full trajectory
   *  length in multi-frame mode). */
  totalFrames: number;
}

export type DumpStreamEvent =
  | DumpStreamHeaderEvent
  | DumpStreamProgressEvent
  | DumpStreamFrameEvent
  | DumpStreamCompleteEvent;

/** A puller that returns the next chunk of text from some source.
 *  Returns `null` when the source is exhausted. */
type TextPuller = () => Promise<string | null>;

/** Options for the parsing core (and its public wrappers). */
export interface DumpStreamOptions {
  /** Parse every frame in the trajectory, not just frame 0. */
  multiFrame?: boolean;
}

// ─── Fast ASCII number scanning ──────────────────────────────────────
// LAMMPS dumps are pure ASCII, whitespace-separated. Scanning by
// charCode removes the slice + split(/\s+/) + parseFloat allocation
// storm that capped the previous loop. `scanEnd` is a module-level
// cursor-out so the scanner returns a value without allocating a tuple.

let scanEnd = 0;

const POW10 = new Float64Array(23);
for (let i = 0; i < 23; i++) POW10[i] = Math.pow(10, i);

/** Parse a float starting at `i`. Handles sign, decimals, and e-notation
 *  (LAMMPS writes both `1.73148` and `2.169e+01` styles). Non-numeric
 *  tokens (e.g. an `element` column) yield NaN, with the cursor advanced
 *  past the token either way. Within float32 precision — where every
 *  parsed coordinate/property lands — results match parseFloat. */
function scanFloat(s: string, i: number, end: number): number {
  let c = s.charCodeAt(i);
  let neg = false;
  if (c === 45 /* - */) {
    neg = true;
    c = s.charCodeAt(++i);
  } else if (c === 43 /* + */) {
    c = s.charCodeAt(++i);
  }
  let mant = 0;
  let exp10 = 0;
  let any = false;
  while (c >= 48 && c <= 57) {
    mant = mant * 10 + (c - 48);
    any = true;
    c = s.charCodeAt(++i);
  }
  if (c === 46 /* . */) {
    c = s.charCodeAt(++i);
    while (c >= 48 && c <= 57) {
      mant = mant * 10 + (c - 48);
      exp10--;
      any = true;
      c = s.charCodeAt(++i);
    }
  }
  if (!any) {
    // Not a number — skip the rest of the token so the caller stays in sync.
    while (i < end && c !== 32 && c !== 9 && c !== 13 && c !== 10 && !Number.isNaN(c)) {
      c = s.charCodeAt(++i);
    }
    scanEnd = i;
    return NaN;
  }
  if (c === 101 || c === 69 /* e E */) {
    c = s.charCodeAt(++i);
    let eneg = false;
    if (c === 45) {
      eneg = true;
      c = s.charCodeAt(++i);
    } else if (c === 43) {
      c = s.charCodeAt(++i);
    }
    let e = 0;
    while (c >= 48 && c <= 57) {
      e = e * 10 + (c - 48);
      c = s.charCodeAt(++i);
    }
    exp10 += eneg ? -e : e;
  }
  scanEnd = i;
  let v: number;
  if (exp10 === 0) v = mant;
  else if (exp10 > 0) v = exp10 <= 22 ? mant * POW10[exp10] : mant * Math.pow(10, exp10);
  else v = exp10 >= -22 ? mant / POW10[-exp10] : mant * Math.pow(10, exp10);
  return neg ? -v : v;
}

const isWs = (c: number) => c === 32 || c === 9 || c === 13;

// Per-column write targets for the row loop. Small ints dispatch faster
// than string comparisons and let one loop serve every dialect.
const T_SKIP = 0;
const T_ID = 1;
const T_TYPE = 2;
const T_X = 3;
const T_Y = 4;
const T_Z = 5;
const T_PROP = 6; // property index lives in a parallel slot array

/** Shared core. Pulls text from `puller` into a sliding buffer, parses
 *  header then atom rows incrementally per frame. */
async function* parseDumpStreamCore(
  puller: TextPuller,
  opts: DumpStreamOptions = {},
): AsyncGenerator<DumpStreamEvent> {
  const multiFrame = opts.multiFrame === true;

  let buffer = '';
  let sourceDone = false;

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

  // Drop the consumed prefix only once it dominates the buffer: slicing
  // copies the *unconsumed* remainder, so shifting eagerly (every 64 KB)
  // re-copied the tail ~7× on a steady 256 KB-chunk stream. Waiting until
  // the prefix is ≥ half the buffer caps amplification at ~1× while still
  // bounding memory to a couple of chunks.
  const SHIFT_THRESHOLD = 64 * 1024;
  const shouldShift = (cursor: number, len: number) =>
    cursor >= SHIFT_THRESHOLD && cursor * 2 >= len;
  let frameIndex = 0;
  let frame0Loaded = 0;
  let hasMoreFrames = false;

  frames: while (true) {
    // ─── Header phase ────────────────────────────────────────────
    let timestep = 0;
    let natoms = -1;
    const boxBounds = new Float64Array(6);
    const boxTilt = new Float64Array(3);
    let triclinic = false;
    let boxBoundsSeen = 0;
    let columns: string[] | null = null;
    let atomBlockStart = -1;

    while (atomBlockStart < 0) {
      const itemAtomsIdx = buffer.indexOf('ITEM: ATOMS');
      const itemAtomsEol = itemAtomsIdx >= 0 ? buffer.indexOf('\n', itemAtomsIdx) : -1;
      if (itemAtomsEol < 0) {
        if (!(await pull())) {
          if (frameIndex > 0 && buffer.trim().length === 0) {
            break frames; // clean end-of-trajectory
          }
          throw new Error('streaming parser: stream ended before ATOMS header');
        }
        continue;
      }

      let lineStart = 0;
      while (lineStart < itemAtomsEol) {
        const lineEnd = buffer.indexOf('\n', lineStart);
        const line = (lineEnd === -1 ? buffer.slice(lineStart) : buffer.slice(lineStart, lineEnd)).trim();
        const nextLineStart = lineEnd === -1 ? buffer.length : lineEnd + 1;

        if (line === 'ITEM: TIMESTEP') {
          const tsEnd = buffer.indexOf('\n', nextLineStart);
          timestep = parseInt(
            (tsEnd === -1 ? buffer.slice(nextLineStart) : buffer.slice(nextLineStart, tsEnd)).trim(),
            10,
          ) | 0;
          lineStart = tsEnd === -1 ? buffer.length : tsEnd + 1;
        } else if (line === 'ITEM: NUMBER OF ATOMS') {
          const naEnd = buffer.indexOf('\n', nextLineStart);
          natoms = parseInt(
            (naEnd === -1 ? buffer.slice(nextLineStart) : buffer.slice(nextLineStart, naEnd)).trim(),
            10,
          ) | 0;
          lineStart = naEnd === -1 ? buffer.length : naEnd + 1;
        } else if (line.startsWith('ITEM: BOX BOUNDS')) {
          // Triclinic headers carry tilt tokens (xy xz yz) and a third
          // number per bounds line. Same raw-bounds-plus-tilt convention
          // as the WASM parser.
          triclinic = /\bxy\b|\bxz\b|\byz\b/.test(line);
          let cursor = nextLineStart;
          for (let i = 0; i < 3; i++) {
            const e = buffer.indexOf('\n', cursor);
            const bbLine = (e === -1 ? buffer.slice(cursor) : buffer.slice(cursor, e)).trim();
            const parts = bbLine.split(/\s+/);
            boxBounds[i * 2] = parseFloat(parts[0]);
            boxBounds[i * 2 + 1] = parseFloat(parts[1]);
            if (parts.length > 2) {
              boxTilt[i] = parseFloat(parts[2]);
              triclinic = true;
            }
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

    // ─── Column resolution ────────────────────────────────────────
    // Coordinates: unscaled (x y z), scaled (xs ys zs / xsu ysu zsu), or
    // unwrapped (xu yu zu) — scaled values are mapped to Cartesian below.
    const colIdx = (names: string[]) => {
      for (const n of names) {
        const i = columns!.indexOf(n);
        if (i >= 0) return i;
      }
      return -1;
    };
    const idIdx = columns.indexOf('id');
    const typeIdx = columns.indexOf('type');
    const xIdx = colIdx(['x', 'xu', 'xs', 'xsu']);
    const yIdx = colIdx(['y', 'yu', 'ys', 'ysu']);
    const zIdx = colIdx(['z', 'zu', 'zs', 'zsu']);
    if (xIdx < 0 || yIdx < 0 || zIdx < 0 || typeIdx < 0) {
      throw new Error(`streaming parser: required columns missing (got [${columns.join(', ')}])`);
    }
    const scaled =
      columns[xIdx].startsWith('xs') || columns[yIdx].startsWith('ys') || columns[zIdx].startsWith('zs');

    // Box vectors for the scaled→Cartesian map. LAMMPS triclinic BOX
    // BOUNDS lines are *bounding-box* extents (xlo_bound = xlo +
    // min(0,xy,xz,xy+xz), etc.) — recover the true cell edges before
    // unscaling, or tilted cells reconstruct with sheared positions.
    // Tilt is zero for orthogonal boxes, so one formula covers both.
    const xy = boxTilt[0], xz = boxTilt[1], yz = boxTilt[2];
    let xlo = boxBounds[0], xhi = boxBounds[1];
    let ylo = boxBounds[2], yhi = boxBounds[3];
    const zlo = boxBounds[4];
    if (triclinic) {
      xlo -= Math.min(0, xy, xz, xy + xz);
      xhi -= Math.max(0, xy, xz, xy + xz);
      ylo -= Math.min(0, yz);
      yhi -= Math.max(0, yz);
    }
    const lx = xhi - xlo;
    const ly = yhi - ylo;
    const lz = boxBounds[5] - boxBounds[4];

    // Extra columns become named per-atom properties. Whether a column is
    // numeric (c_pe: yes, element: no) is decided from the first data row.
    const ncols = columns.length;
    const targets = new Int8Array(ncols).fill(T_SKIP);
    const propSlot = new Int32Array(ncols).fill(-1);
    if (idIdx >= 0) targets[idIdx] = T_ID;
    targets[typeIdx] = T_TYPE;
    targets[xIdx] = T_X;
    targets[yIdx] = T_Y;
    targets[zIdx] = T_Z;
    const extraCols: number[] = [];
    for (let c = 0; c < ncols; c++) if (targets[c] === T_SKIP) extraCols.push(c);

    const frame: Frame = {
      timestep,
      natoms,
      boxBounds,
      boxTilt,
      triclinic,
      columns,
      ids: new Int32Array(natoms),
      types: new Int32Array(natoms),
      positions: new Float32Array(natoms * 3),
      bonds: new Int32Array(0),
      properties: new Map(),
    };
    const propArrays: Float32Array[] = [];

    buffer = buffer.slice(atomBlockStart);

    // Numeric-probe the first complete data row to finalize property
    // columns before allocating their arrays.
    if (extraCols.length > 0 && natoms > 0) {
      let probeEnd = buffer.indexOf('\n');
      while (probeEnd === -1 && (await pull())) probeEnd = buffer.indexOf('\n');
      if (probeEnd > 0) {
        const probe = buffer.slice(0, probeEnd).trim().split(/\s+/);
        for (const c of extraCols) {
          if (c < probe.length && Number.isFinite(parseFloat(probe[c]))) {
            const arr = new Float32Array(natoms);
            frame.properties.set(columns[c], arr);
            propSlot[c] = propArrays.length;
            propArrays.push(arr);
            targets[c] = T_PROP;
          }
        }
      }
    }

    if (frameIndex === 0) {
      yield { type: 'header', frame };
    }

    // ─── Atom phase: the hot loop ────────────────────────────────
    const positions = frame.positions;
    const types = frame.types;
    const ids = frame.ids;

    let i = 0;
    let lastYieldAt = 0;
    let cursor = 0;
    let nextFrameFollows = false;

    while (i < natoms) {
      const lineEnd = buffer.indexOf('\n', cursor);

      if (lineEnd === -1) {
        if (sourceDone) break;
        if (shouldShift(cursor, buffer.length)) {
          buffer = buffer.slice(cursor);
          cursor = 0;
        }
        await pull();
        continue;
      }

      // Next-frame `ITEM:` marker check (cheap prefix test).
      if (
        buffer.charCodeAt(cursor) === 73 /* I */ &&
        buffer.charCodeAt(cursor + 1) === 84 /* T */ &&
        buffer.charCodeAt(cursor + 2) === 69 /* E */ &&
        buffer.charCodeAt(cursor + 3) === 77 /* M */
      ) {
        nextFrameFollows = true;
        break;
      }

      if (lineEnd === cursor) {
        cursor = lineEnd + 1;
        continue;
      }

      // Scan the row in place: per column, skip whitespace then parse the
      // token straight out of the buffer. No slicing, no split, no
      // intermediate strings.
      let p = cursor;
      let rx = 0, ry = 0, rz = 0;
      for (let c = 0; c < ncols && p < lineEnd; c++) {
        let ch = buffer.charCodeAt(p);
        while (p < lineEnd && isWs(ch)) ch = buffer.charCodeAt(++p);
        if (p >= lineEnd) break;
        const v = scanFloat(buffer, p, lineEnd);
        p = scanEnd;
        switch (targets[c]) {
          case T_ID: ids[i] = v | 0; break;
          case T_TYPE: types[i] = v | 0; break;
          case T_X: rx = v; break;
          case T_Y: ry = v; break;
          case T_Z: rz = v; break;
          case T_PROP: propArrays[propSlot[c]][i] = v; break;
        }
      }

      const pi = i * 3;
      if (scaled) {
        // General (triclinic) fractional→Cartesian map; tilt terms vanish
        // for orthogonal boxes.
        positions[pi]     = xlo + rx * lx + ry * xy + rz * xz;
        positions[pi + 1] = ylo + ry * ly + rz * yz;
        positions[pi + 2] = zlo + rz * lz;
      } else {
        positions[pi]     = rx;
        positions[pi + 1] = ry;
        positions[pi + 2] = rz;
      }

      i++;
      cursor = lineEnd + 1;

      if (frameIndex === 0 && i - lastYieldAt >= ATOM_CHUNK_SIZE) {
        yield { type: 'progress', loadedAtoms: i };
        lastYieldAt = i;
      }
      if (shouldShift(cursor, buffer.length)) {
        buffer = buffer.slice(cursor);
        cursor = 0;
      }
    }

    // Final partial row (file truncated mid-line without trailing \n).
    if (i < natoms && cursor < buffer.length && !sourceDone) {
      await pull();
      const tailEnd = buffer.indexOf('\n', cursor);
      const tailEffectiveEnd = tailEnd === -1 ? buffer.length : tailEnd;
      if (tailEffectiveEnd > cursor) {
        const row = buffer.slice(cursor, tailEffectiveEnd).trim();
        if (row && !row.startsWith('ITEM:')) {
          let p = cursor;
          let rx = 0, ry = 0, rz = 0;
          for (let c = 0; c < ncols && p < tailEffectiveEnd; c++) {
            let ch = buffer.charCodeAt(p);
            while (p < tailEffectiveEnd && isWs(ch)) ch = buffer.charCodeAt(++p);
            if (p >= tailEffectiveEnd) break;
            const v = scanFloat(buffer, p, tailEffectiveEnd);
            p = scanEnd;
            switch (targets[c]) {
              case T_ID: ids[i] = v | 0; break;
              case T_TYPE: types[i] = v | 0; break;
              case T_X: rx = v; break;
              case T_Y: ry = v; break;
              case T_Z: rz = v; break;
              case T_PROP: propArrays[propSlot[c]][i] = v; break;
            }
          }
          const pi = i * 3;
          if (scaled) {
            positions[pi]     = xlo + rx * lx + ry * xy + rz * xz;
            positions[pi + 1] = ylo + ry * ly + rz * yz;
            positions[pi + 2] = zlo + rz * lz;
          } else {
            positions[pi] = rx;
            positions[pi + 1] = ry;
            positions[pi + 2] = rz;
          }
          i++;
          cursor = tailEffectiveEnd + 1;
        }
      }
    }

    // Filled the frame cleanly — look just past it for the next frame's
    // `ITEM:` so trajectories whose frames align exactly are recognized.
    if (!nextFrameFollows) {
      while (true) {
        while (cursor < buffer.length && /\s/.test(buffer[cursor])) cursor++;
        if (cursor < buffer.length) {
          // Don't conclude on a partial marker ("ITE" at a chunk edge).
          if (buffer.length - cursor >= 5 || sourceDone) {
            nextFrameFollows = buffer.startsWith('ITEM:', cursor);
            break;
          }
          if (!(await pull())) {
            nextFrameFollows = buffer.startsWith('ITEM:', cursor);
            break;
          }
          continue;
        }
        if (sourceDone) break;
        if (!(await pull())) break;
      }
    }

    if (frameIndex === 0) {
      frame0Loaded = i;
    } else if (i > 0) {
      // A truncated final frame reports the atoms it actually has.
      frame.natoms = i;
      yield { type: 'frame', frameIndex, frame };
    } else {
      frameIndex--; // empty trailing frame — drop it
    }

    frameIndex++;

    if (!nextFrameFollows) break;
    if (!multiFrame) {
      hasMoreFrames = true;
      break;
    }
    buffer = buffer.slice(cursor);
  }

  yield { type: 'complete', loadedAtoms: frame0Loaded, hasMoreFrames, totalFrames: frameIndex };
}

/** Parse a fully-buffered LAMMPS dump string. */
export async function* parseDumpStream(
  text: string,
  opts: DumpStreamOptions = {},
): AsyncGenerator<DumpStreamEvent> {
  let yielded = false;
  yield* parseDumpStreamCore(async () => {
    if (yielded) return null;
    yielded = true;
    return text;
  }, opts);
}

/** Parse from an async iterable of byte chunks (fetch body, File.stream()).
 *  Bytes are decoded incrementally via TextDecoder({ stream: true }) so
 *  multi-byte sequences split across chunks are handled correctly. */
export async function* parseDumpStreamFromBytes(
  source: AsyncIterable<Uint8Array>,
  opts: DumpStreamOptions = {},
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
  }, opts);
}

/** Adapt a `ReadableStream<Uint8Array>` to an `AsyncIterable<Uint8Array>`. */
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
          try { await reader.cancel(); } catch { /* ignore */ }
          try { reader.releaseLock(); } catch { /* ignore */ }
          return { value: undefined, done: true };
        },
      };
    },
  };
}

/** Fast pre-flight: can the streaming parser take this content? Thin
 *  wrapper over the executable compatibility contract in
 *  `dumpContract.ts` — use `analyzeDumpHead` directly when you need the
 *  reasons, not just the verdict. */
export function canStreamDump(textHead: string): boolean {
  return analyzeDumpHead(textHead).tier === 'streamable';
}
