#!/usr/bin/env node
/**
 * bench-ingest.mjs — repeatable throughput measurement for the dump
 * ingest pipeline, split by phase so regressions are attributable:
 *
 *   parse      multi-frame streaming parse only (events consumed)
 *   transcode  parse + GlimbinStreamWriter.addFrame (records discarded)
 *
 * Usage:  npx -y tsx tools/bench-ingest.mjs <file.lammpstrj> [--runs N]
 * Reports best-of-N MB/s per phase (best-of isolates steady-state from
 * GC/JIT noise; the deltas between phases are the costs to attack).
 */

import fs from 'node:fs';
import path from 'node:path';
import { GlimbinStreamWriter } from '../packages/core/src/glimbin.ts';
import { parseDumpStreamFromBytes } from '../packages/parsers/src/dumpStreamParser.ts';

const argv = process.argv.slice(2);
const runsIdx = argv.indexOf('--runs');
const runs = runsIdx >= 0 ? parseInt(argv[runsIdx + 1], 10) : 3;
const file = argv.filter((a, i) => a !== '--runs' && (runsIdx < 0 || i !== runsIdx + 1))[0];

if (!file || !fs.existsSync(file)) {
  console.error('usage: bench-ingest.mjs <file.lammpstrj> [--runs N]');
  process.exit(1);
}

const sizeMB = fs.statSync(file).size / 1e6;
// Read fully into memory once so disk speed doesn't pollute the numbers;
// stream it to the parser in 256 KB chunks like File.stream() would.
const fileBytes = fs.readFileSync(file);

function chunkSource() {
  return {
    async *[Symbol.asyncIterator]() {
      for (let i = 0; i < fileBytes.length; i += 256 * 1024) {
        yield new Uint8Array(
          fileBytes.buffer,
          fileBytes.byteOffset + i,
          Math.min(256 * 1024, fileBytes.length - i),
        );
      }
    },
  };
}

async function parseOnly() {
  let frames = 0;
  for await (const ev of parseDumpStreamFromBytes(chunkSource(), { multiFrame: true })) {
    if (ev.type === 'frame') frames++;
    else if (ev.type === 'complete') frames = ev.totalFrames;
  }
  return frames;
}

async function parseTranscode() {
  const writer = new GlimbinStreamWriter();
  let frame0 = null;
  for await (const ev of parseDumpStreamFromBytes(chunkSource(), { multiFrame: true })) {
    if (ev.type === 'header') frame0 = ev.frame;
    else if (ev.type === 'frame') {
      if (frame0) {
        writer.addFrame(frame0);
        frame0 = null;
      }
      writer.addFrame(ev.frame); // record discarded — measuring CPU, not sink
    }
  }
  return writer.frameCount;
}

async function bench(label, fn) {
  let best = Infinity;
  let result = 0;
  for (let r = 0; r < runs + 1; r++) {
    const t0 = performance.now();
    result = await fn();
    const dt = performance.now() - t0;
    if (r > 0 && dt < best) best = dt; // run 0 is warm-up
  }
  console.log(
    `  ${label.padEnd(10)} ${(sizeMB / (best / 1000)).toFixed(0).padStart(5)} MB/s  ` +
    `(${best.toFixed(0)} ms, ${result} frames, best of ${runs})`,
  );
  return best;
}

console.log(`bench-ingest: ${path.basename(file)} (${sizeMB.toFixed(1)} MB)`);
const p = await bench('parse', parseOnly);
const t = await bench('transcode', parseTranscode);
console.log(`  writer cost: ${(t - p).toFixed(0)} ms (${((t - p) / t * 100).toFixed(0)}% of transcode phase)`);
