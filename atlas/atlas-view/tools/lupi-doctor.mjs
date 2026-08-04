#!/usr/bin/env node
/**
 * lupi-doctor — tell a LAMMPS user exactly how their dump file will
 * behave in the Lupi viewer, and what to change to get the best path.
 *
 * Runs the same executable compatibility contract the viewer uses
 * (packages/parsers/src/dumpContract.ts), so this report can never
 * drift from what the product actually does.
 *
 * Usage:
 *   npx -y tsx tools/lupi-doctor.mjs <file.lammpstrj> [more files...]
 *   npx -y tsx tools/lupi-doctor.mjs --deep <file>     # full parse: frames,
 *                                                      # types, transformation
 *
 * Exit code: 0 if every file is at least viewable, 1 if any is not.
 */

import fs from 'node:fs';
import path from 'node:path';
import { analyzeDumpHead, RECOMMENDED_DUMP_COMMAND } from '../packages/parsers/src/dumpContract.ts';
import { parseDumpStreamFromBytes } from '../packages/parsers/src/dumpStreamParser.ts';

const argv = process.argv.slice(2);
const deep = argv.includes('--deep');
const files = argv.filter((a) => a !== '--deep');

if (files.length === 0) {
  console.error('usage: lupi-doctor [--deep] <file.lammpstrj> [...]');
  process.exit(1);
}

const TIER_TEXT = {
  streamable: 'STREAMABLE — drag-and-drop takes the worker fast path: progressive paint, off-main-thread transcode, saved to "Your library".',
  standard: 'STANDARD — viewable, but parses whole in memory on the WASM path (no streaming, no library persistence yet).',
  'not-a-dump': 'NOT A LAMMPS DUMP — Lupi will try its XYZ / data-file / log parsers instead.',
};
const SEV_ICON = { blocker: '✗', warning: '⚠', info: 'ℹ' };

async function* fileBytes(filePath) {
  const stream = fs.createReadStream(filePath, { highWaterMark: 256 * 1024 });
  for await (const chunk of stream) yield new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
}

let anyUnviewable = false;

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`✗ ${file}: no such file`);
    anyUnviewable = true;
    continue;
  }
  const sizeMB = fs.statSync(file).size / 1e6;
  const fd = fs.openSync(file, 'r');
  const headBuf = Buffer.alloc(8192);
  const n = fs.readSync(fd, headBuf, 0, headBuf.length, 0);
  fs.closeSync(fd);
  const head = headBuf.subarray(0, n).toString('utf8');

  const report = analyzeDumpHead(head);
  console.log(`\n━━ ${path.basename(file)} (${sizeMB.toFixed(1)} MB) ━━`);
  console.log(`  ${report.tier === 'streamable' ? '✓' : report.tier === 'standard' ? '·' : '✗'} ${TIER_TEXT[report.tier]}`);
  if (report.natoms != null) console.log(`  · ${report.natoms.toLocaleString()} atoms/frame${report.columns ? `, columns: ${report.columns.join(' ')}` : ''}`);
  if (report.tier === 'streamable' && sizeMB * 1e6 <= 5 * 1024 * 1024) {
    console.log('  ℹ under 5 MB — small files skip streaming and load in memory (instant anyway).');
  }
  for (const f of report.findings) {
    console.log(`  ${SEV_ICON[f.severity]} ${f.message}`);
    if (f.fix) console.log(`      fix: ${f.fix}`);
  }
  if (report.tier === 'not-a-dump') anyUnviewable = true;

  if (deep && report.tier !== 'not-a-dump') {
    try {
      const t0 = Date.now();
      let frames = 0;
      let natoms = 0;
      let first = null;
      let last = null;
      const types = new Set();
      for await (const ev of parseDumpStreamFromBytes(fileBytes(file), { multiFrame: true })) {
        if (ev.type === 'header') {
          natoms = ev.frame.natoms;
          first = ev.frame; // filled in place by the stream
          frames = 1;
        } else if (ev.type === 'frame') {
          if (frames === 1 && first) for (let i = 0; i < first.natoms; i++) types.add(first.types[i]);
          last = ev.frame;
          frames++;
        }
      }
      const ms = Date.now() - t0;
      console.log(`  · deep: ${frames} frames parsed in ${ms} ms (${(sizeMB / (ms / 1000)).toFixed(0)} MB/s)`);
      const overTypes = [...types].some((t) => t < 0 || t > 255);
      if (overTypes) console.log('  ⚠ atom type ids exceed 255 — the .glimbin transcode will fall back to the standard path.');
      if (first && last && frames > 1 && first.natoms === last.natoms) {
        const firstPos = first.positions;
        const CUT = 3.6 * 3.6;
        let moved = 0;
        for (let i = 0; i < first.natoms; i++) {
          const dx = last.positions[i * 3] - firstPos[i * 3];
          const dy = last.positions[i * 3 + 1] - firstPos[i * 3 + 1];
          const dz = last.positions[i * 3 + 2] - firstPos[i * 3 + 2];
          if (dx * dx + dy * dy + dz * dz > CUT) moved++;
        }
        console.log(`  · transformation: ${((moved / first.natoms) * 100).toFixed(0)}% of atoms displaced > 3.6 Å between first and last frame`);
      }
    } catch (err) {
      console.log(`  ⚠ deep parse failed (file will use the standard path): ${err.message}`);
    }
  }
}

console.log(`\nThe dump command that always gets the fast path:\n  ${RECOMMENDED_DUMP_COMMAND}\n`);
process.exit(anyUnviewable ? 1 : 0);
