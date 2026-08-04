#!/usr/bin/env node
/**
 * bake-glimbin.mjs — transcode a .lammpstrj (optionally gzipped) into the
 * frame-indexed .glimbin v2 artifact + manifest the gallery streams from.
 *
 * This is the Scenario-1 write path of docs/trajectory-architecture.md as a
 * CI-runnable command: the same parse → GlimbinStreamWriter pipeline the
 * in-browser ingest worker uses, with the bytes landing on disk instead of
 * OPFS. One frame in flight; the whole trajectory is never resident.
 *
 * Usage:  npx -y tsx tools/bake-glimbin.mjs <file.lammpstrj[.gz]> [...] [--out-dir DIR]
 *
 * For each input it writes, next to the input or under --out-dir:
 *   <name>.glimbin        — the artifact
 *   <name>.manifest.json  — the generator's sidecar manifest (when present)
 *                           augmented with a `glimbin` block; minimal
 *                           manifest otherwise. Gallery cards read this.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { GlimbinStreamWriter } from '../packages/core/src/glimbin.ts';
import { parseDumpStreamFromBytes } from '../packages/parsers/src/dumpStreamParser.ts';

const args = process.argv.slice(2);
const outDirIdx = args.indexOf('--out-dir');
const outDir = outDirIdx >= 0 ? args[outDirIdx + 1] : null;
const inputs = args.filter((a, i) => a !== '--out-dir' && i !== outDirIdx + 1);

if (inputs.length === 0) {
  console.error('Usage: npx -y tsx tools/bake-glimbin.mjs <file.lammpstrj[.gz]> [...] [--out-dir DIR]');
  process.exit(1);
}
if (outDir) fs.mkdirSync(outDir, { recursive: true });

const GZIP_MAGIC = [0x1f, 0x8b];

async function* fileBytes(filePath) {
  const raw = fs.createReadStream(filePath, { highWaterMark: 256 * 1024 });
  const head = fs.readFileSync(filePath, { flag: 'r' }).subarray(0, 2);
  const gz = head[0] === GZIP_MAGIC[0] && head[1] === GZIP_MAGIC[1];
  const stream = gz ? raw.pipe(zlib.createGunzip()) : raw;
  for await (const chunk of stream) {
    yield new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  }
}

function baseName(filePath) {
  return path.basename(filePath).replace(/\.gz$/i, '').replace(/\.(lammpstrj|dump)$/i, '');
}

let allOk = true;

for (const input of inputs) {
  const name = baseName(input);
  const dir = outDir ?? path.dirname(input);
  const glimbinPath = path.join(dir, `${name}.glimbin`);
  const manifestPath = path.join(dir, `${name}.manifest.json`);
  const sizeMB = fs.statSync(input).size / 1e6;
  console.log(`\n━━ ${path.basename(input)} (${sizeMB.toFixed(1)} MB) → ${path.basename(glimbinPath)} ━━`);

  try {
    const writer = new GlimbinStreamWriter();
    const fh = fs.openSync(glimbinPath, 'w');
    let offset = 0;
    const append = (buf) => {
      fs.writeSync(fh, new Uint8Array(buf), 0, buf.byteLength, offset);
      offset += buf.byteLength;
    };
    // Header slot is reserved up front and written last (see GlimbinStreamWriter docs).
    append(new ArrayBuffer(256));

    let frame0 = null;
    let frames = 0;
    const t0 = Date.now();
    for await (const ev of parseDumpStreamFromBytes(fileBytes(input), { multiFrame: true })) {
      if (ev.type === 'header') {
        frame0 = ev.frame;
      } else if (ev.type === 'frame') {
        if (frame0) {
          append(writer.addFrame(frame0));
          frames++;
          frame0 = null;
        }
        append(writer.addFrame(ev.frame));
        frames++;
      }
    }
    if (frame0) {
      // Single-frame dump: the only frame arrived via the header event.
      append(writer.addFrame(frame0));
      frames++;
    }
    if (frames === 0) throw new Error('no frames parsed — not a LAMMPS dump?');

    const fin = writer.finalize();
    if (fin.indexOffset !== offset) {
      throw new Error(`index offset mismatch: writer says ${fin.indexOffset}, file is at ${offset}`);
    }
    append(fin.index);
    fs.writeSync(fh, new Uint8Array(fin.header), 0, fin.header.byteLength, 0);
    fs.closeSync(fh);

    const ms = Date.now() - t0;
    const outBytes = fs.statSync(glimbinPath).size;
    console.log(`  ✓ ${frames} frames, ${fin.meta.atomsPerFrame} atoms/frame in ${ms} ms`);
    console.log(`  ✓ ${(outBytes / 1e6).toFixed(1)} MB (${((outBytes / (sizeMB * 1e6)) * 100).toFixed(0)}% of text)`);

    const sidecarPath = `${input}.manifest.json`;
    let manifest = {};
    if (fs.existsSync(sidecarPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
      } catch (err) {
        console.warn(`  ! sidecar manifest unreadable (${err?.message}); writing a minimal one`);
      }
    }
    const augmented = {
      ...manifest,
      glimbin: {
        file: path.basename(glimbinPath),
        bytes: outBytes,
        frames: fin.meta.totalFrames,
        atomsPerFrame: fin.meta.atomsPerFrame,
        triclinic: fin.meta.triclinic,
        hasProperties: fin.meta.hasProperties,
      },
    };
    fs.writeFileSync(manifestPath, `${JSON.stringify(augmented, null, 2)}\n`);
    console.log(`  ✓ manifest → ${path.basename(manifestPath)}`);
  } catch (err) {
    console.error(`  ✗ ${err?.message ?? err}`);
    allOk = false;
  }
}

console.log(`\n[bake-glimbin] ${allOk ? 'ALL BAKES OK' : 'FAILURES PRESENT'}`);
process.exit(allOk ? 0 : 1);
