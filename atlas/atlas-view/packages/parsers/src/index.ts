/**
 * Parser orchestration layer
 * 
 * Coordinates file reading → web worker parsing → store hydration.
 * Handles drag-drop, file input, and URL-loaded example files.
 */

import type { Frame, Trajectory, ThermoData } from '@atlas/core/types';

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

/** Read a File object as text */
async function readFileAsText(file: File): Promise<string> {
  // For gzipped files, decompress first
  if (file.name.endsWith('.gz')) {
    const buffer = await file.arrayBuffer();
    const ds = new DecompressionStream('gzip');
    const reader = new Blob([buffer]).stream().pipeThrough(ds).getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return new TextDecoder().decode(
      new Uint8Array(chunks.reduce((a, c) => a + c.length, 0)).map((_, i) => {
        let offset = 0;
        for (const chunk of chunks) {
          if (i < offset + chunk.length) return chunk[i - offset];
          offset += chunk.length;
        }
        return 0;
      })
    );
  }
  return file.text();
}

/** Parse a LAMMPS dump file and return a Trajectory */
export async function parseDumpFile(file: File): Promise<Trajectory> {
  const text = await readFileAsText(file);
  const result = await send('parse-dump', text);

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

/** Parse a LAMMPS log file and return ThermoData */
export async function parseLogFile(file: File): Promise<ThermoData> {
  const text = await readFileAsText(file);
  const result = await send('parse-log', text);

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
  const text = await readFileAsText(file);
  const result = await send('parse-xyz', text);

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

/** Parse a LAMMPS data file and return a Trajectory of 1 frame */
export async function parseDataFile(file: File): Promise<Trajectory> {
  const text = await readFileAsText(file);
  const result = await send('parse-data', text);

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
