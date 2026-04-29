/**
 * Parser Worker — Off-main-thread LAMMPS file parsing via WASM
 * 
 * Receives: { type: 'parse-dump' | 'parse-log', payload: string }
 * Sends:    { type: 'frames' | 'thermo' | 'progress' | 'error', ... }
 */
// @ts-nocheck

import init, {
  parseDump,
  parseDumpFrame,
  countDumpFrames,
  parseLog,
  parseDataFile,
  parseXyzFile,
} from 'atlas-parsers';

let wasmReady = false;

async function ensureWasm() {
  if (!wasmReady) {
    await init();
    wasmReady = true;
  }
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
  const text = await file.text();
  if (text.trim().toLowerCase().startsWith('<html') || text.trim().toLowerCase().startsWith('<!doctype html>')) {
    throw new Error('Received HTML instead of molecular data (file not found on server).');
  }
  return text;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    await ensureWasm();

    if (type === 'parse-dump') {
      const file = payload as File;
      const maxFrames = (e.data as any).maxFrames as number | undefined;
      const content = typeof file === 'string' ? file : await readFileAsText(file);

      // Quick count for progress
      const totalFrames = countDumpFrames(content);
      self.postMessage({ type: 'progress', id, total: totalFrames, parsed: 0 });

      // Decide whether to decimate at parse time. If the caller passed
      // `maxFrames` and the file exceeds it, sample every Nth frame so a
      // 300k-frame trajectory still fits in browser memory. The caller
      // receives `parseStride` and `sourceFrameCount` to surface this in UI.
      const useDecimation = typeof maxFrames === 'number' && maxFrames > 0 && totalFrames > maxFrames;
      const stride = useDecimation ? Math.ceil(totalFrames / maxFrames) : 1;
      const sampledIndices: number[] = [];
      if (useDecimation) {
        for (let i = 0; i < totalFrames; i += stride) sampledIndices.push(i);
      }

      const transformFrame = (f: any) => {
        const positions = f.positions;
        const ids = f.ids;
        const types = f.types;
        const bonds = f.bonds;
        const properties = (f.propertyNames && f.getProperty) ?
          f.propertyNames.map((name: string) => {
            const data = f.getProperty(name);
            if (data && data.buffer) transferables.push(data.buffer);
            return { name, data };
          }) :
          (f.properties ? f.properties.map(([name, data]: [string, any]) => {
            if (data && data.buffer) transferables.push(data.buffer);
            return { name, data };
          }) : []);

        if (positions && positions.buffer) transferables.push(positions.buffer);
        if (ids && ids.buffer) transferables.push(ids.buffer);
        if (types && types.buffer) transferables.push(types.buffer);
        if (bonds && bonds.buffer) transferables.push(bonds.buffer);

        return {
          timestep: f.timestep,
          natoms: f.natoms,
          boxBounds: f.boxBounds || f.box_bounds,
          boxTilt: f.boxTilt || f.box_tilt,
          triclinic: f.triclinic,
          columns: f.columns,
          ids,
          types,
          positions,
          bonds,
          properties,
        };
      };

      const transferables: Transferable[] = [];
      let result: any[];

      if (useDecimation) {
        // Lazy per-frame parse: only `sampledIndices.length` frames materialize,
        // not all `totalFrames`. The string `content` is still in memory once.
        result = sampledIndices.map((srcIdx, i) => {
          const f = parseDumpFrame(content, srcIdx);
          self.postMessage({ type: 'progress', id, total: sampledIndices.length, parsed: i + 1 });
          return transformFrame(f);
        });
      } else {
        const frames = parseDump(content);
        result = frames.map((f: any, i: number) => {
          self.postMessage({ type: 'progress', id, total: totalFrames, parsed: i + 1 });
          return transformFrame(f);
        });
      }

      self.postMessage({
        type: 'frames',
        id,
        frames: result,
        sourceFrameCount: totalFrames,
        parseStride: stride,
      }, transferables);

    } else if (type === 'parse-data') {
      const file = payload as File;
      const content = typeof file === 'string' ? file : await readFileAsText(file);
      const f = parseDataFile(content);
      
      const transferables: Transferable[] = [];
      const positions = f.positions;
      const ids = f.ids;
      const types = f.types;
      const bonds = f.bonds;
      const properties = (f.propertyNames && f.getProperty) ? 
        f.propertyNames.map((name: string) => {
          const data = f.getProperty(name);
          if (data && data.buffer) transferables.push(data.buffer);
          return { name, data };
        }) : 
        (f.properties ? f.properties.map(([name, data]: [string, any]) => {
          if (data && data.buffer) transferables.push(data.buffer);
          return { name, data };
        }) : []);

      if (positions && positions.buffer) transferables.push(positions.buffer);
      if (ids && ids.buffer) transferables.push(ids.buffer);
      if (types && types.buffer) transferables.push(types.buffer);
      if (bonds && bonds.buffer) transferables.push(bonds.buffer);

      self.postMessage({ type: 'frames', id, frames: [{
          timestep: f.timestep,
          natoms: f.natoms,
          boxBounds: f.boxBounds || f.box_bounds,
          boxTilt: f.boxTilt || f.box_tilt,
          triclinic: f.triclinic,
          columns: f.columns,
          ids,
          types,
          positions,
          bonds,
          properties,
      }]}, transferables);

    } else if (type === 'parse-xyz') {
      const file = payload as File;
      const content = typeof file === 'string' ? file : await readFileAsText(file);
      const frames = parseXyzFile(content);

      const transferables: Transferable[] = [];
      const result = frames.map((f: any) => {
        const positions = f.positions;
        const ids = f.ids;
        const types = f.types;
        const bonds = f.bonds;
        const properties = (f.propertyNames && f.getProperty) ? 
          f.propertyNames.map((name: string) => {
            const data = f.getProperty(name);
            if (data && data.buffer) transferables.push(data.buffer);
            return { name, data };
          }) : 
          (f.properties ? f.properties.map(([name, data]: [string, any]) => {
            if (data && data.buffer) transferables.push(data.buffer);
            return { name, data };
          }) : []);

        if (positions && positions.buffer) transferables.push(positions.buffer);
        if (ids && ids.buffer) transferables.push(ids.buffer);
        if (types && types.buffer) transferables.push(types.buffer);
        if (bonds && bonds.buffer) transferables.push(bonds.buffer);

        return {
          timestep: f.timestep,
          natoms: f.natoms,
          boxBounds: f.boxBounds || f.box_bounds,
          boxTilt: f.boxTilt || f.box_tilt,
          triclinic: f.triclinic,
          columns: f.columns,
          ids,
          types,
          positions,
          bonds,
          properties,
        };
      });

      self.postMessage({ type: 'frames', id, frames: result }, transferables);

    } else if (type === 'parse-log') {
      const file = payload as File;
      const content = typeof file === 'string' ? file : await readFileAsText(file);
      const thermo = parseLog(content);

      const runs = [];
      for (let r = 0; r < thermo.num_runs; r++) {
        const columns = thermo.getColumns(r);
        const colNames = columns.map((c: any) => String(c));
        const colData: Record<string, Float64Array> = {};
        for (const name of colNames) {
          const data = thermo.getColumn(r, name);
          if (data) colData[name] = data;
        }
        runs.push({ columns: colNames, data: colData, nrows: thermo.getRunLength(r) });
      }

      self.postMessage({ type: 'thermo', id, runs });
    }
  } catch (err: any) {
    self.postMessage({ type: 'error', id, message: err.message || String(err) });
  }
};
