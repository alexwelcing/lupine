/**
 * Transcode Worker — single-pass dump → .glimbin off the main thread.
 *
 * The reliability core of bring-your-own-data for simulations over time:
 * reads the dropped File as a byte stream, parses every frame with the
 * multi-frame streaming parser, and writes each frame's binary record
 * straight into a .glimbin (OPFS sync-access handle when available) the
 * moment it is parsed. Peak memory is one frame plus the parser's
 * sliding text buffer — never the whole text, never the whole
 * trajectory — and the main thread (where the React Three Fiber canvas
 * lives) does zero parsing work.
 *
 * Frame 0 is forwarded to the main thread in transferable slabs as it
 * parses, so the viewer's existing progressive-paint path (atoms
 * appearing while the file decodes) is preserved exactly.
 *
 * Protocol (one-shot; the orchestrator spawns one worker per import):
 *   in : { type: 'transcode-dump', file: File,
 *          opfs: { dir: string, name: string } | null }
 *   out: { type: 'frame0-header', natoms, timestep, boxBounds, columns }
 *        { type: 'frame0-chunk', start, count, positions, types, ids }   (transferred)
 *        { type: 'frame0-complete', loadedAtoms }
 *        { type: 'progress', framesParsed, bytesWritten }                (throttled)
 *        { type: 'done', kind: 'single' }
 *        { type: 'done', kind: 'multi', storage: 'opfs' | 'blob',
 *          blob?: Blob, meta: DatasetMeta }
 *        { type: 'error', message }
 */
// @ts-nocheck — runs in a DedicatedWorkerGlobalScope the repo's DOM-lib
// tsconfig doesn't model (postMessage transfer-list overloads, OPFS sync
// handles). Matches packages/parsers/src/workers/parse.worker.ts.

import type { Frame } from '@atlas/core/types';
import { GlimbinStreamWriter, HEADER_SIZE } from '@atlas/core/glimbin';
import { parseDumpStreamFromBytes, readableStreamToAsyncIterable } from '../dumpStreamParser';

/** Minimal typing for the worker-only OPFS sync-access handle (absent
 *  from the DOM lib this repo compiles against). */
interface SyncAccessHandle {
  write(buffer: ArrayBuffer | ArrayBufferView, options?: { at?: number }): number;
  truncate(size: number): void;
  flush(): void;
  close(): void;
}

interface ByteSink {
  write(buf: ArrayBuffer, at: number): void;
  /** Write index + header, release resources. Returns the Blob for the
   *  in-memory fallback ('blob' storage); OPFS storage returns nothing —
   *  the file is already on disk under the requested name. */
  finalize(header: ArrayBuffer, index: ArrayBuffer, indexOffset: number):
    | { storage: 'opfs' }
    | { storage: 'blob'; blob: Blob };
  /** Discard everything (single-frame file, or error). */
  abort(): Promise<void>;
}

async function openOpfsSink(dir: string, name: string): Promise<ByteSink | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const dirHandle = await root.getDirectoryHandle(dir, { create: true });
    const fileHandle = await dirHandle.getFileHandle(name, { create: true });
    const createSync = (fileHandle as unknown as {
      createSyncAccessHandle?: () => Promise<SyncAccessHandle>;
    }).createSyncAccessHandle;
    if (typeof createSync !== 'function') return null;
    const handle = await createSync.call(fileHandle);
    handle.truncate(0);
    // Reserve the header slot; real header lands at finalize.
    handle.write(new ArrayBuffer(HEADER_SIZE), { at: 0 });
    return {
      write: (buf, at) => {
        handle.write(buf, { at });
      },
      finalize: (header, index, indexOffset) => {
        handle.write(index, { at: indexOffset });
        handle.write(header, { at: 0 });
        handle.flush();
        handle.close();
        return { storage: 'opfs' as const };
      },
      abort: async () => {
        try { handle.close(); } catch { /* already closed */ }
        try { await dirHandle.removeEntry(name); } catch { /* never created */ }
      },
    };
  } catch {
    return null;
  }
}

/** In-memory fallback when OPFS sync handles are unavailable (e.g.
 *  Safari < 15.2 or non-secure contexts). Holds binary records — still
 *  far smaller than text + Frame objects — and assembles a Blob at the
 *  end for the caller to persist/stream from. */
function memorySink(): ByteSink {
  const records: ArrayBuffer[] = [];
  return {
    write: (buf) => {
      records.push(buf);
    },
    finalize: (header, index) => ({
      storage: 'blob' as const,
      blob: new Blob([header, ...records, index], { type: 'application/octet-stream' }),
    }),
    abort: async () => {
      records.length = 0;
    },
  };
}

const PROGRESS_INTERVAL_MS = 200;

self.onmessage = async (e: MessageEvent) => {
  const { type, file, opfs } = e.data as {
    type: string;
    file: File;
    opfs: { dir: string; name: string } | null;
  };
  if (type !== 'transcode-dump') return;

  let sink: ByteSink | null = null;
  try {
    sink = (opfs && (await openOpfsSink(opfs.dir, opfs.name))) || memorySink();

    // Transparent gzip: detect by magic, not extension — users rename files.
    let stream = file.stream() as ReadableStream<Uint8Array>;
    const magic = new Uint8Array(await file.slice(0, 2).arrayBuffer());
    if (magic.length === 2 && magic[0] === 0x1f && magic[1] === 0x8b) {
      stream = stream.pipeThrough(new DecompressionStream('gzip'));
    }
    const byteIter = readableStreamToAsyncIterable(stream);
    const writer = new GlimbinStreamWriter();

    let frame0: Frame | null = null;
    let frame0Sent = 0;
    let frame0Written = false;
    let lastProgressAt = 0;

    const sendFrame0Slab = (upTo: number) => {
      if (!frame0 || upTo <= frame0Sent) return;
      const positions = frame0.positions.slice(frame0Sent * 3, upTo * 3);
      const types = frame0.types.slice(frame0Sent, upTo);
      const ids = frame0.ids.slice(frame0Sent, upTo);
      self.postMessage(
        { type: 'frame0-chunk', start: frame0Sent, count: upTo - frame0Sent, positions, types, ids },
        [positions.buffer, types.buffer, ids.buffer] as Transferable[],
      );
      frame0Sent = upTo;
    };

    const writeFrame = (frame: Frame) => {
      const at = writer.bytesWritten;
      const record = writer.addFrame(frame);
      sink!.write(record, at);
    };

    for await (const event of parseDumpStreamFromBytes(byteIter, { multiFrame: true })) {
      if (event.type === 'header') {
        frame0 = event.frame;
        self.postMessage({
          type: 'frame0-header',
          natoms: frame0.natoms,
          timestep: frame0.timestep,
          boxBounds: Float64Array.from(frame0.boxBounds),
          columns: frame0.columns,
        });
      } else if (event.type === 'progress') {
        sendFrame0Slab(event.loadedAtoms);
      } else if (event.type === 'frame') {
        // First later-frame proves frame 0 is complete: flush its tail to
        // the viewer and write it as record 0 before this one.
        if (!frame0Written && frame0) {
          sendFrame0Slab(frame0.natoms);
          self.postMessage({ type: 'frame0-complete', loadedAtoms: frame0.natoms });
          writeFrame(frame0);
          frame0Written = true;
        }
        writeFrame(event.frame);
        const now = Date.now();
        if (now - lastProgressAt >= PROGRESS_INTERVAL_MS) {
          lastProgressAt = now;
          self.postMessage({
            type: 'progress',
            framesParsed: writer.frameCount,
            bytesWritten: writer.bytesWritten,
          });
        }
      } else if (event.type === 'complete') {
        if (!frame0) throw new Error('transcode: stream ended before any frame');
        if (event.totalFrames <= 1) {
          // Single structure — nothing to transcode or persist. The main
          // thread already holds the full frame from the slabs.
          sendFrame0Slab(event.loadedAtoms);
          self.postMessage({ type: 'frame0-complete', loadedAtoms: event.loadedAtoms });
          await sink.abort();
          self.postMessage({ type: 'done', kind: 'single' });
          return;
        }
        const { header, index, indexOffset, meta } = writer.finalize();
        const result = sink.finalize(header, index, indexOffset);
        self.postMessage({
          type: 'done',
          kind: 'multi',
          storage: result.storage,
          blob: result.storage === 'blob' ? result.blob : undefined,
          meta,
        });
        return;
      }
    }
    throw new Error('transcode: parser ended without a complete event');
  } catch (err) {
    try { await sink?.abort(); } catch { /* best effort */ }
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
