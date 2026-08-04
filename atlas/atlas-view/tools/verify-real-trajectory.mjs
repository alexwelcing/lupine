#!/usr/bin/env node
/**
 * verify-real-trajectory.mjs — push a REAL multi-frame .lammpstrj through
 * the exact bring-your-own-data pipeline the viewer uses, in Node:
 *
 *   bytes → canStreamDump gate → multi-frame streaming parse →
 *   GlimbinStreamWriter transcode (one frame in flight, like the worker) →
 *   LocalGlimbinSource read-back → physics sanity check that the file
 *   actually shows a transformation (atoms displaced between first and
 *   last frame).
 *
 * Usage:  npx -y tsx tools/verify-real-trajectory.mjs <file.lammpstrj> [...]
 *         (defaults to the tools/sims/output/ demo files if none given)
 *
 * Exit 0 = all files pass. Reports frames/atoms/throughput/peak RSS so
 * regressions in parse cost are visible, not just correctness.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GlimbinStreamWriter } from '../packages/core/src/glimbin.ts';
import { LocalGlimbinSource } from '../packages/parsers/src/LocalGlimbinSource.ts';
import { canStreamDump, parseDumpStreamFromBytes } from '../packages/parsers/src/dumpStreamParser.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const files = args.length > 0
  ? args
  : ['cu-melt-demo.lammpstrj', 'cu-solidify-demo.lammpstrj']
      .map((f) => path.join(here, 'sims', 'output', f))
      .filter((f) => fs.existsSync(f));

if (files.length === 0) {
  console.error('No input files. Generate some first:');
  console.error('  python3 tools/sims/make_phase_trajectories.py all --size demo');
  process.exit(1);
}

let allOk = true;

async function* fileBytes(filePath) {
  // 256 KB chunks — same order of magnitude as File.stream() in browsers.
  const stream = fs.createReadStream(filePath, { highWaterMark: 256 * 1024 });
  for await (const chunk of stream) yield new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
}

for (const filePath of files) {
  const name = path.basename(filePath);
  const sizeMB = fs.statSync(filePath).size / 1e6;
  console.log(`\n━━ ${name} (${sizeMB.toFixed(1)} MB) ━━`);
  const results = [];
  const check = (label, ok, detail = '') => {
    results.push(ok);
    console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  };

  try {
    // ── Gate: the viewer's pre-flight check accepts this dialect ──
    const head = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' }).slice(0, 4096);
    check('canStreamDump accepts the file head', canStreamDump(head));

    // ── Worker-equivalent pass: parse + transcode, one frame in flight ──
    const writer = new GlimbinStreamWriter();
    const records = [];
    let frame0 = null;
    let first = null;
    let last = null;
    let frames = 0;
    const t0 = Date.now();

    for await (const ev of parseDumpStreamFromBytes(fileBytes(filePath), { multiFrame: true })) {
      if (ev.type === 'header') {
        frame0 = ev.frame;
      } else if (ev.type === 'frame') {
        if (frame0) {
          // First later-frame ⇒ frame 0 is complete (mirrors the worker).
          first = { positions: frame0.positions.slice(), natoms: frame0.natoms };
          records.push(writer.addFrame(frame0));
          frames++;
          frame0 = null;
        }
        last = { positions: ev.frame.positions.slice(), natoms: ev.frame.natoms };
        records.push(writer.addFrame(ev.frame));
        frames++;
      }
    }
    const parseMs = Date.now() - t0;
    check('multi-frame parse + incremental transcode', frames > 1, `${frames} frames in ${parseMs} ms`);

    const fin = writer.finalize();
    const blob = new Blob([fin.header, ...records, fin.index]);
    check('.glimbin assembled', blob.size > 256, `${(blob.size / 1e6).toFixed(1)} MB (${(blob.size / (sizeMB * 1e6) * 100).toFixed(0)}% of text)`);

    // ── Read back through the viewer's local streaming source ──
    const source = new LocalGlimbinSource(blob);
    const meta = await source.open();
    check('LocalGlimbinSource metadata', meta.totalFrames === frames, `${meta.totalFrames} frames, ${meta.atomsPerFrame} atoms/frame`);

    const f0 = await source.fetchFrame(0);
    const fLast = await source.fetchFrame(meta.totalFrames - 1);
    const f0ok = first && f0.positions.length === first.positions.length &&
      f0.positions[0] === first.positions[0] &&
      f0.positions[f0.positions.length - 1] === first.positions[first.positions.length - 1];
    const fLastOk = last && fLast.positions[0] === last.positions[0] &&
      fLast.positions[fLast.positions.length - 1] === last.positions[last.positions.length - 1];
    check('first frame reads back exactly', !!f0ok);
    check('last frame reads back exactly', !!fLastOk);

    // ── Physics: did a transformation actually happen? ──
    // Fraction of atoms displaced > 1 lattice spacing between the first
    // and last frame. The threshold comes from the generator's sidecar
    // manifest when present (sintering legitimately moves far fewer atoms
    // than melting — the expectation is part of the scenario's
    // provenance); 0.3 is the default for unattributed files.
    if (first && last && first.natoms === last.natoms) {
      let minMoved = 0.3;
      const manifestPath = `${filePath}.manifest.json`;
      if (fs.existsSync(manifestPath)) {
        try {
          const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          if (typeof m?.expected?.min_moved_fraction === 'number') {
            minMoved = m.expected.min_moved_fraction;
          }
        } catch { /* unreadable manifest — keep the default */ }
      }
      const CUTOFF = 3.6; // Å ≈ one Cu lattice constant
      let moved = 0;
      for (let i = 0; i < first.natoms; i++) {
        const dx = last.positions[i * 3] - first.positions[i * 3];
        const dy = last.positions[i * 3 + 1] - first.positions[i * 3 + 1];
        const dz = last.positions[i * 3 + 2] - first.positions[i * 3 + 2];
        if (dx * dx + dy * dy + dz * dz > CUTOFF * CUTOFF) moved++;
      }
      const frac = moved / first.natoms;
      check(
        `transformation visible (≥${(minMoved * 100).toFixed(0)}% of atoms past 1 lattice constant)`,
        frac >= minMoved,
        `${(frac * 100).toFixed(0)}% of ${first.natoms} atoms`,
      );
    }
    source.dispose();

    const rssMB = process.memoryUsage().rss / 1e6;
    console.log(`  · throughput ${(sizeMB / (parseMs / 1000)).toFixed(0)} MB/s parse+transcode, peak RSS ${rssMB.toFixed(0)} MB`);
  } catch (err) {
    check(`unexpected error: ${err?.message || err}`, false);
  }

  if (!results.every(Boolean)) allOk = false;
}

console.log(`\n[verify-real-trajectory] ${allOk ? 'ALL FILES PASS' : 'FAILURES PRESENT'}`);
process.exit(allOk ? 0 : 1);
