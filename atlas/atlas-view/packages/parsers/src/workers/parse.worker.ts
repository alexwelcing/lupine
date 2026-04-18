/**
 * Parser Worker — Off-main-thread LAMMPS file parsing via WASM
 * 
 * Receives: { type: 'parse-dump' | 'parse-log', payload: string }
 * Sends:    { type: 'frames' | 'thermo' | 'progress' | 'error', ... }
 */
// @ts-nocheck

import init, {
  parseDump,
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

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    await ensureWasm();

    if (type === 'parse-dump') {
      const content = payload as string;

      // Quick count for progress
      const totalFrames = countDumpFrames(content);
      self.postMessage({ type: 'progress', id, total: totalFrames, parsed: 0 });

      // Parse all frames
      const frames = parseDump(content);

      // Transform WASM output to transferable typed arrays
      const result = frames.map((f: any, i: number) => {
        self.postMessage({ type: 'progress', id, total: totalFrames, parsed: i + 1 });
        return {
          timestep: f.timestep,
          natoms: f.natoms,
          boxBounds: f.boxBounds || f.box_bounds,
          boxTilt: f.boxTilt || f.box_tilt,
          triclinic: f.triclinic,
          columns: f.columns,
          ids: f.ids,
          types: f.types,
          positions: f.positions,
          bonds: f.bonds,
          properties: (f.propertyNames && f.getProperty) ? 
            f.propertyNames.map((name: string) => ({
              name,
              data: f.getProperty(name),
            })) : 
            (f.properties ? f.properties.map(([name, data]: [string, any]) => ({ name, data })) : []),
        };
      });

      self.postMessage({ type: 'frames', id, frames: result });

    } else if (type === 'parse-data') {
      const content = payload as string;
      const f = parseDataFile(content);
      
      self.postMessage({ type: 'frames', id, frames: [{
          timestep: f.timestep,
          natoms: f.natoms,
          boxBounds: f.boxBounds,
          boxTilt: f.boxTilt,
          triclinic: f.triclinic,
          columns: f.columns,
          ids: f.ids,
          types: f.types,
          positions: f.positions,
          bonds: f.bonds,
          properties: f.propertyNames?.map((name: string) => ({
            name,
            data: f.getProperty(name),
          })) ?? [],
      }]});

    } else if (type === 'parse-xyz') {
      const content = payload as string;
      const frames = parseXyzFile(content);

      const result = frames.map((f: any) => ({
        timestep: f.timestep,
        natoms: f.natoms,
        boxBounds: f.boxBounds,
        boxTilt: f.boxTilt,
        triclinic: f.triclinic,
        columns: f.columns,
        ids: f.ids,
        types: f.types,
        positions: f.positions,
        bonds: f.bonds,
        properties: f.propertyNames?.map((name: string) => ({
          name,
          data: f.getProperty(name),
        })) ?? [],
      }));

      self.postMessage({ type: 'frames', id, frames: result });

    } else if (type === 'parse-log') {
      const content = payload as string;
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
