/**
 * Parser orchestration layer
 * 
 * Coordinates file reading → web worker parsing → store hydration.
 * Handles drag-drop, file input, and URL-loaded example files.
 */

import type { Frame, Trajectory, ThermoData } from '@atlas/core/types';
import { parseDumpStream, parseDumpStreamFromBytes, readableStreamToAsyncIterable } from './dumpStreamParser';

let worker: Worker | null = null;
let messageId = 0;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('./workers/parse.worker.ts', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (e) => {
      const { type, id } = e.data;
      if (type === 'progress') {
        // Emit progress events (consumed by store)
        window.dispatchEvent(new CustomEvent('atlas:parse-progress', {
          detail: { total: e.data.total, parsed: e.data.parsed },
        }));
        return;
      }
      const p = pending.get(id);
      if (!p) return;
      if (type === 'error') {
        p.reject(new Error(e.data.message));
      } else {
        p.resolve(e.data);
      }
      pending.delete(id);
    };
  }
  return worker;
}

function send(type: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ type, payload, id });
  });
}

/** Parse a LAMMPS dump file and return a Trajectory */
export async function parseDumpFile(file: File): Promise<Trajectory> {
  const result = await send('parse-dump', file);
  if (!result.frames || result.frames.length === 0) {
    throw new Error('No frames parsed; possibly wrong format.');
  }

  const frames: Frame[] = result.frames.map((f: any) => ({
    timestep: f.timestep,
    natoms: f.natoms,
    boxBounds: new Float64Array(f.boxBounds),
    boxTilt: new Float64Array(f.boxTilt),
    triclinic: f.triclinic,
    columns: f.columns,
    ids: new Int32Array(f.ids),
    types: new Int32Array(f.types),
    positions: new Float32Array(f.positions),
    bonds: new Int32Array(f.bonds),
    properties: new Map(
      f.properties.map((p: any) => [p.name, new Float32Array(p.data)])
    ),
  }));

  // Compute global bounds and structural properties (e.g. Displacement)
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const allTypes = new Set<number>();

  // To handle Displacement, we map atom IDs from Frame 0 to their current positions.
  const f0 = frames[0];
  const f0IdToIndex = new Map<number, number>();
  if (f0) {
    for (let i = 0; i < f0.natoms; i++) {
      f0IdToIndex.set(f0.ids[i], i);
    }
  }

  for (const frame of frames) {
    const displacement = new Float32Array(frame.natoms);
    for (let i = 0; i < frame.natoms; i++) {
      const x = frame.positions[i * 3], y = frame.positions[i * 3 + 1], z = frame.positions[i * 3 + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      allTypes.add(frame.types[i]);

      // Compute Displacement from Frame 0
      const f0Index = f0IdToIndex.get(frame.ids[i]);
      if (f0Index !== undefined && f0) {
        const dx = x - f0.positions[f0Index * 3];
        const dy = y - f0.positions[f0Index * 3 + 1];
        const dz = z - f0.positions[f0Index * 3 + 2];
        displacement[i] = Math.sqrt(dx * dx + dy * dy + dz * dz);
      } else {
        displacement[i] = 0;
      }
    }
    if (!frame.properties) {
      frame.properties = new Map();
    }
    frame.properties.set('Displacement', displacement);
  }

  return {
    frames,
    totalFrames: frames.length,
    atomTypes: Array.from(allTypes).sort(),
    globalBounds: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
  };
}

/** Parse a LAMMPS log file and return ThermoData */
export async function parseLogFile(file: File): Promise<ThermoData> {
  const result = await send('parse-log', file);
  if (!result.runs || result.runs.length === 0) {
    throw new Error('No thermo runs parsed; possibly wrong format.');
  }

  return {
    numRuns: result.runs.length,
    runs: result.runs.map((r: any) => ({
      columns: r.columns,
      nrows: r.nrows,
      getColumn: (name: string) => r.data[name] ? new Float64Array(r.data[name]) : null,
    })),
  };
}

/** Detect file type from extension */
export function detectFileType(filename: string): 'dump' | 'log' | 'data' | 'xyz' | 'unknown' {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.lammpstrj') || lower.includes('dump.') || lower.endsWith('.dump')
      || lower.endsWith('.lammpstrj.gz')) {
    return 'dump';
  }
  if (lower.startsWith('log.') || lower.endsWith('.log')) {
    return 'log';
  }
  if (lower.startsWith('data.') || lower.endsWith('.data') || lower.endsWith('.lmp')) {
    return 'data';
  }
  if (lower.endsWith('.xyz')) {
    return 'xyz';
  }
  return 'unknown';
}

/** Parse an XYZ file and return a Trajectory */
export async function parseXyzFile(file: File): Promise<Trajectory> {
  const result = await send('parse-xyz', file);
  if (!result.frames || result.frames.length === 0) {
    throw new Error('No frames parsed; possibly wrong format.');
  }

  const frames: Frame[] = result.frames.map((f: any) => ({
    timestep: f.timestep,
    natoms: f.natoms,
    boxBounds: new Float64Array(f.boxBounds),
    boxTilt: new Float64Array(f.boxTilt),
    triclinic: f.triclinic,
    columns: f.columns,
    ids: new Int32Array(f.ids),
    types: new Int32Array(f.types),
    positions: new Float32Array(f.positions),
    bonds: new Int32Array(f.bonds),
    properties: new Map(
      f.properties.map((p: any) => [p.name, new Float32Array(p.data)])
    ),
  }));

  // Compute global bounds and structural properties (e.g. Displacement)
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const allTypes = new Set<number>();

  // To handle Displacement, we map atom IDs from Frame 0 to their current positions.
  const f0 = frames[0];
  const f0IdToIndex = new Map<number, number>();
  if (f0) {
    for (let i = 0; i < f0.natoms; i++) {
      f0IdToIndex.set(f0.ids[i], i);
    }
  }

  for (const frame of frames) {
    const displacement = new Float32Array(frame.natoms);
    for (let i = 0; i < frame.natoms; i++) {
      const x = frame.positions[i * 3], y = frame.positions[i * 3 + 1], z = frame.positions[i * 3 + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      allTypes.add(frame.types[i]);

      // Compute Displacement from Frame 0
      const f0Index = f0IdToIndex.get(frame.ids[i]);
      if (f0Index !== undefined && f0) {
        const dx = x - f0.positions[f0Index * 3];
        const dy = y - f0.positions[f0Index * 3 + 1];
        const dz = z - f0.positions[f0Index * 3 + 2];
        displacement[i] = Math.sqrt(dx * dx + dy * dy + dz * dz);
      } else {
        displacement[i] = 0;
      }
    }
    if (!frame.properties) {
      frame.properties = new Map();
    }
    frame.properties.set('Displacement', displacement);
  }

  return {
    frames,
    totalFrames: frames.length,
    atomTypes: Array.from(allTypes).sort(),
    globalBounds: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
  };
}

/** Parse a LAMMPS data file and return a Trajectory of 1 frame */
export async function parseDataFile(file: File): Promise<Trajectory> {
  const result = await send('parse-data', file);
  if (!result.frames || result.frames.length === 0) {
    throw new Error('No frames parsed; possibly wrong format.');
  }

  const frames: Frame[] = result.frames.map((f: any) => ({
    timestep: f.timestep,
    natoms: f.natoms,
    boxBounds: new Float64Array(f.boxBounds),
    boxTilt: new Float64Array(f.boxTilt),
    triclinic: f.triclinic,
    columns: f.columns,
    ids: new Int32Array(f.ids),
    types: new Int32Array(f.types),
    positions: new Float32Array(f.positions),
    bonds: new Int32Array(f.bonds),
    properties: new Map(
      f.properties.map((p: any) => [p.name, new Float32Array(p.data)])
    ),
  }));

  // Compute global bounds
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const allTypes = new Set<number>();

  for (const frame of frames) {
    for (let i = 0; i < frame.natoms; i++) {
      const x = frame.positions[i * 3], y = frame.positions[i * 3 + 1], z = frame.positions[i * 3 + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      allTypes.add(frame.types[i]);
    }
  }

  return {
    frames,
    totalFrames: frames.length,
    atomTypes: Array.from(allTypes).sort(),
    globalBounds: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
  };
}

/**
 * Streaming dump parser entry. Yields a `header` event first (with the
 * Frame's TypedArrays pre-allocated to natoms but populated to 0), then
 * `progress` events as atom batches land, then a final `complete`.
 *
 * Suitable for the within-frame progressive rendering path: callers
 * mount the Frame in the store on `header`, then bump a
 * `loadedAtomCount` field on each `progress` so the renderer can grow
 * `geometry.instanceCount` without waiting for the whole file to finish.
 *
 * The streaming parser handles only orthogonal-box, simple-column LAMMPS
 * dumps (id type x y z, any order). Triclinic boxes, scaled coordinates,
 * and per-atom properties fall back to the WASM all-at-once path —
 * `canStreamDump()` checks the file head and reports whether streaming
 * is safe before we commit to it. Caller is expected to read the
 * file's text once (via `file.text()` or fetched stream) and pass it in
 * — we don't try to be clever with FileReader.
 *
 * The Trajectory wrapper is mounted on `header` with a single
 * partial-frame, then mutated in-place as atoms arrive — keeping the
 * render path's "Frame is fixed-natoms" invariant intact while the
 * `loadedAtomCount` gates visible work.
 */
export async function* parseDumpFileStreaming(text: string): AsyncGenerator<
  | { type: 'header'; trajectory: Trajectory; frame: Frame }
  | { type: 'progress'; loadedAtoms: number }
  | { type: 'complete'; loadedAtoms: number }
> {
  let trajectory: Trajectory | null = null;
  for await (const event of parseDumpStream(text)) {
    if (event.type === 'header') {
      trajectory = {
        frames: [event.frame],
        totalFrames: 1,
        atomTypes: [], // populated lazily by the renderer/store as atoms arrive
        globalBounds: {
          min: [event.frame.boxBounds[0], event.frame.boxBounds[2], event.frame.boxBounds[4]],
          max: [event.frame.boxBounds[1], event.frame.boxBounds[3], event.frame.boxBounds[5]],
        },
      };
      yield { type: 'header', trajectory, frame: event.frame };
    } else if (event.type === 'progress') {
      yield { type: 'progress', loadedAtoms: event.loadedAtoms };
    } else if (event.type === 'complete') {
      yield { type: 'complete', loadedAtoms: event.loadedAtoms };
    }
  }
}

/** Stream-parse from a network Response. Atoms render before the file
 *  finishes downloading — the dominant network-bound case for the
 *  gallery's huge fixtures. The Trajectory wrapper is mounted on the
 *  `header` event with a single partial-frame, then mutated in place
 *  as bytes arrive (same contract as `parseDumpFileStreaming`).
 *
 *  Falls back to fully-buffered text parsing if `response.body` is
 *  unavailable (older runtimes, or after `.text()` has already
 *  consumed the body upstream). Caller is expected to have called
 *  `canStreamDump()` on a peeked head; if the stream turns out to be
 *  unsupported (triclinic, missing columns), the underlying parser
 *  throws and the caller falls back to the WASM path. */
export async function* parseDumpResponseStreaming(
  response: Response,
): AsyncGenerator<
  | { type: 'header'; trajectory: Trajectory; frame: Frame }
  | { type: 'progress'; loadedAtoms: number }
  | { type: 'complete'; loadedAtoms: number }
> {
  if (!response.body) {
    const text = await response.text();
    yield* parseDumpFileStreaming(text);
    return;
  }
  const byteIter = readableStreamToAsyncIterable(response.body);
  let trajectory: Trajectory | null = null;
  for await (const event of parseDumpStreamFromBytes(byteIter)) {
    if (event.type === 'header') {
      trajectory = {
        frames: [event.frame],
        totalFrames: 1,
        atomTypes: [],
        globalBounds: {
          min: [event.frame.boxBounds[0], event.frame.boxBounds[2], event.frame.boxBounds[4]],
          max: [event.frame.boxBounds[1], event.frame.boxBounds[3], event.frame.boxBounds[5]],
        },
      };
      yield { type: 'header', trajectory, frame: event.frame };
    } else if (event.type === 'progress') {
      yield { type: 'progress', loadedAtoms: event.loadedAtoms };
    } else if (event.type === 'complete') {
      yield { type: 'complete', loadedAtoms: event.loadedAtoms };
    }
  }
}

/** Stream-parse from a `File`'s `.stream()`. Same contract as the
 *  Response variant; used by FileDropZone for big drag-dropped dumps.
 *  Note: in many browsers `File.stream()` actually delivers the whole
 *  blob in one chunk (no progressive read for local files), but the
 *  parser progress events still drive the renderer's incremental
 *  upload — the network round-trip win disappears, but the parse-
 *  blocks-everything regression we saw with `.text()` is gone. */
export async function* parseDumpFileStreamingFromFile(
  file: File,
): AsyncGenerator<
  | { type: 'header'; trajectory: Trajectory; frame: Frame }
  | { type: 'progress'; loadedAtoms: number }
  | { type: 'complete'; loadedAtoms: number }
> {
  const stream = file.stream() as ReadableStream<Uint8Array>;
  const byteIter = readableStreamToAsyncIterable(stream);
  let trajectory: Trajectory | null = null;
  for await (const event of parseDumpStreamFromBytes(byteIter)) {
    if (event.type === 'header') {
      trajectory = {
        frames: [event.frame],
        totalFrames: 1,
        atomTypes: [],
        globalBounds: {
          min: [event.frame.boxBounds[0], event.frame.boxBounds[2], event.frame.boxBounds[4]],
          max: [event.frame.boxBounds[1], event.frame.boxBounds[3], event.frame.boxBounds[5]],
        },
      };
      yield { type: 'header', trajectory, frame: event.frame };
    } else if (event.type === 'progress') {
      yield { type: 'progress', loadedAtoms: event.loadedAtoms };
    } else if (event.type === 'complete') {
      yield { type: 'complete', loadedAtoms: event.loadedAtoms };
    }
  }
}

/** Re-export so callers can decide streaming vs. WASM up-front without
 *  digging into the implementation module. */
export { canStreamDump } from './dumpStreamParser';

/** Auto-parse a file based on detected type */
export async function parseFile(file: File): Promise<{
  trajectory?: Trajectory;
  thermo?: ThermoData;
}> {
  const type = detectFileType(file.name);

  if (type === 'xyz') {
    const trajectory = await parseXyzFile(file);
    return { trajectory };
  }

  if (type === 'dump' || type === 'unknown') {
    // Try dump first, fall back to log, then xyz
    try {
      const trajectory = await parseDumpFile(file);
      return { trajectory };
    } catch {
      try {
        const thermo = await parseLogFile(file);
        return { thermo };
      } catch {
        const trajectory = await parseXyzFile(file);
        return { trajectory };
      }
    }
  }

  if (type === 'log') {
    const thermo = await parseLogFile(file);
    return { thermo };
  }

  if (type === 'data') {
    const trajectory = await parseDataFile(file);
    return { trajectory };
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}

/**
 * Two-Phase Loading — Phase 1: Parse rest frame
 * 
 * Sends the file to the worker, waits for the full parse,
 * but returns ONLY frame 0 immediately. The full frame array
 * is cached internally for Phase 2 streaming.
 */
let _cachedFullParse: { file: File; trajectory: Trajectory } | null = null;

export async function parseDumpFileRest(file: File): Promise<{
  restFrame: Frame;
  totalFrames: number;
  atomTypes: number[];
  globalBounds: { min: [number, number, number]; max: [number, number, number] };
}> {
  const trajectory = await parseDumpFile(file);
  // Cache for Phase 2
  _cachedFullParse = { file, trajectory };

  return {
    restFrame: trajectory.frames[0],
    totalFrames: trajectory.totalFrames,
    atomTypes: trajectory.atomTypes,
    globalBounds: trajectory.globalBounds as { min: [number, number, number]; max: [number, number, number] },
  };
}

/**
 * Two-Phase Loading — Phase 2: Stream remaining frames
 * 
 * Uses the cached full parse from Phase 1 to deliver remaining
 * frames in chunks via the onChunk callback. Each chunk is yielded
 * via microtask to avoid blocking the main thread.
 */
export async function streamDumpFrames(
  _restFrame: Frame,
  onChunk: (frames: Frame[], progress: number) => void,
): Promise<void> {
  if (!_cachedFullParse) {
    throw new Error('streamDumpFrames called before parseDumpFileRest');
  }

  const { trajectory } = _cachedFullParse;
  const allFrames = trajectory.frames;
  const total = allFrames.length;

  if (total <= 1) {
    onChunk([], 1);
    return;
  }

  // Deliver remaining frames in chunks of ~10 to avoid blocking
  const CHUNK_SIZE = 10;
  for (let i = 1; i < total; i += CHUNK_SIZE) {
    const chunk = allFrames.slice(i, Math.min(i + CHUNK_SIZE, total));
    const progress = Math.min(i + CHUNK_SIZE, total) / total;
    onChunk(chunk, progress);
    // Yield to main thread between chunks
    await new Promise(r => setTimeout(r, 0));
  }

  // Release cache
  _cachedFullParse = null;
}
