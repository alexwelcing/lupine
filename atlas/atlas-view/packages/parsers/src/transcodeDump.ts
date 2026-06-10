/**
 * Typed main-thread façade over the transcode worker.
 *
 * Owns the worker lifecycle (one worker per import, terminated on
 * settle) and translates the postMessage protocol into callbacks the
 * UI can wire straight into the store: frame-0 slabs for progressive
 * paint, throttled trajectory progress for the growing timeline, and a
 * single resolution describing where the transcoded .glimbin landed.
 */

import type { DatasetMeta } from '@atlas/core/glimbin';

export interface TranscodeFrame0Header {
  natoms: number;
  timestep: number;
  boxBounds: Float64Array;
  columns: string[];
}

export interface TranscodeFrame0Chunk {
  start: number;
  count: number;
  positions: Float32Array;
  types: Int32Array;
  ids: Int32Array;
}

export interface TranscodeProgress {
  framesParsed: number;
  bytesWritten: number;
}

export type TranscodeResult =
  | { kind: 'single' }
  | { kind: 'multi'; storage: 'opfs'; meta: DatasetMeta }
  | { kind: 'multi'; storage: 'blob'; blob: Blob; meta: DatasetMeta };

export interface TranscodeCallbacks {
  onFrame0Header?: (header: TranscodeFrame0Header) => void;
  onFrame0Chunk?: (chunk: TranscodeFrame0Chunk) => void;
  onFrame0Complete?: (loadedAtoms: number) => void;
  onProgress?: (progress: TranscodeProgress) => void;
}

/**
 * Stream-parse a LAMMPS dump File off the main thread and, when it turns
 * out to be a multi-frame trajectory, transcode it to .glimbin as it
 * parses. `opfs` names the directory/file the worker should write into
 * (the local trajectory library); pass null to force the in-memory Blob
 * fallback. Rejects on parse/transcode failure — callers fall back to
 * the WASM path.
 */
export function transcodeDumpFile(
  file: File,
  opfs: { dir: string; name: string } | null,
  callbacks: TranscodeCallbacks = {},
): Promise<TranscodeResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./workers/transcode.worker.ts', import.meta.url),
      { type: 'module' },
    );
    const settle = <T>(fn: (v: T) => void) => (v: T) => {
      worker.terminate();
      fn(v);
    };
    const done = settle(resolve);
    const fail = settle(reject);

    worker.onerror = (e) => fail(new Error(e.message || 'transcode worker crashed'));
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      switch (msg.type) {
        case 'frame0-header':
          callbacks.onFrame0Header?.(msg);
          break;
        case 'frame0-chunk':
          callbacks.onFrame0Chunk?.(msg);
          break;
        case 'frame0-complete':
          callbacks.onFrame0Complete?.(msg.loadedAtoms);
          break;
        case 'progress':
          callbacks.onProgress?.(msg);
          break;
        case 'done':
          if (msg.kind === 'single') done({ kind: 'single' });
          else if (msg.storage === 'blob') done({ kind: 'multi', storage: 'blob', blob: msg.blob, meta: msg.meta });
          else done({ kind: 'multi', storage: 'opfs', meta: msg.meta });
          break;
        case 'error':
          fail(new Error(msg.message));
          break;
      }
    };

    worker.postMessage({ type: 'transcode-dump', file, opfs });
  });
}
