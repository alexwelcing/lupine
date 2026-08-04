#!/usr/bin/env node
/**
 * verify-local-trajectory.mjs — exercise the bring-your-own-data
 * persistence/streaming pipeline end to end, in Node (no browser):
 *
 *   parsed Trajectory → assembleGlimbinBlob → LocalGlimbinSource reads
 *   every frame back identically; plus the multi-frame streaming-parser
 *   signal and the library manifest helpers.
 *
 * Run from atlas-view root:  npx -y tsx tools/verify-local-trajectory.mjs
 * Exit 0 = pass, 1 = fail. No network required.
 */

import { assembleGlimbinBlob, canEncodeGlimbin, GlimbinStreamWriter } from '../packages/core/src/glimbin.ts';
import { LocalGlimbinSource, isGlimbinBlob } from '../packages/parsers/src/LocalGlimbinSource.ts';
import { parseDumpStream, parseDumpStreamFromBytes } from '../packages/parsers/src/dumpStreamParser.ts';
import { parseManifest, upsertRecord, hashBlob } from '../packages/ui/src/trajectoryLibrary.ts';

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

function makeFrame(timestep, natoms, base, withProps = false, withBonds = false) {
  const ids = new Int32Array(natoms);
  const types = new Int32Array(natoms);
  const positions = new Float32Array(natoms * 3);
  for (let i = 0; i < natoms; i++) {
    ids[i] = i + 1;
    types[i] = (i % 3) + 1;
    positions[i * 3] = base + i;
    positions[i * 3 + 1] = base + i + 0.5;
    positions[i * 3 + 2] = base + i + 0.25;
  }
  const properties = new Map();
  if (withProps) {
    const e = new Float32Array(natoms);
    for (let i = 0; i < natoms; i++) e[i] = i * 0.1 + timestep;
    properties.set('energy', e);
  }
  return {
    timestep, natoms,
    boxBounds: new Float64Array([0, 10, 0, 20, 0, 30]),
    boxTilt: new Float64Array([0, 0, 0]),
    triclinic: false,
    columns: ['id', 'type', 'x', 'y', 'z'],
    ids, types, positions,
    bonds: withBonds ? new Int32Array([0, 1, 1, 2]) : new Int32Array(0),
    properties,
  };
}

const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

console.log('[verify-local-trajectory] encode → persist-shape → stream-read');

try {
  // ── 1. Round-trip a multi-frame trajectory with props + bonds ──
  const frames = [
    makeFrame(0, 8, 0, true, true),
    makeFrame(100, 8, 1, true, true),
    makeFrame(200, 8, 2, true, true),
    makeFrame(300, 8, 3, true, true),
  ];
  const trajectory = {
    frames, totalFrames: frames.length,
    atomTypes: [1, 2, 3], globalBounds: { min: [0, 0, 0], max: [10, 20, 30] },
  };

  check('canEncodeGlimbin accepts byte-range types', canEncodeGlimbin(frames) === true);

  const { blob, meta } = assembleGlimbinBlob(trajectory);
  check('assembleGlimbinBlob produced a Blob', blob.size > 256, `${blob.size} bytes`);
  check('meta.totalFrames correct', meta.totalFrames === 4);
  check('blob carries GLIM magic', await isGlimbinBlob(blob));

  const source = new LocalGlimbinSource(blob);
  const sMeta = await source.open();
  check('LocalGlimbinSource.open() metadata', sMeta.totalFrames === 4 && sMeta.atomsPerFrame === 8);

  let allMatch = true;
  let propsMatch = true;
  let bondsMatch = true;
  for (let fi = 0; fi < frames.length; fi++) {
    const f = await source.fetchFrame(fi);
    if (!eq(Array.from(f.positions), Array.from(frames[fi].positions))) allMatch = false;
    if (!eq(Array.from(f.types), Array.from(frames[fi].types))) allMatch = false;
    if (!eq(Array.from(f.ids), Array.from(frames[fi].ids))) allMatch = false;
    if (f.timestep !== frames[fi].timestep) allMatch = false;
    const e = f.properties.get('energy');
    if (!e || !eq(Array.from(e), Array.from(frames[fi].properties.get('energy')))) propsMatch = false;
    if (!eq(Array.from(f.bonds), [0, 1, 1, 2])) bondsMatch = false;
  }
  check('every frame round-trips (positions/types/ids/timestep)', allMatch);
  check('per-atom properties round-trip', propsMatch);
  check('bonds round-trip', bondsMatch);

  // ── 2. Cache identity + range guard ──
  const f2a = await source.fetchFrame(2);
  const f2b = await source.fetchFrame(2);
  check('repeated fetch returns cached reference', f2a === f2b);
  let threw = false;
  try { await source.fetchFrame(999); } catch { threw = true; }
  check('out-of-range frame rejects', threw);
  source.dispose();

  // ── 3. Variable atom counts ──
  const varTraj = {
    frames: [makeFrame(0, 5, 0), makeFrame(10, 9, 1)],
    totalFrames: 2, atomTypes: [1, 2, 3], globalBounds: { min: [0, 0, 0], max: [10, 20, 30] },
  };
  const vSource = new LocalGlimbinSource(assembleGlimbinBlob(varTraj).blob);
  await vSource.open();
  const vf1 = await vSource.fetchFrame(1);
  check('variable atom count preserved', vf1.natoms === 9 && vf1.positions.length === 27);
  vSource.dispose();

  // ── 4. Reject types beyond a byte ──
  const badFrame = makeFrame(0, 2, 0);
  badFrame.types = new Int32Array([1, 300]);
  check('canEncodeGlimbin rejects type id > 255', canEncodeGlimbin([badFrame]) === false);

  // ── 5. Multi-frame streaming-parser signal ──
  const ONE = `ITEM: TIMESTEP
1
ITEM: NUMBER OF ATOMS
3
ITEM: BOX BOUNDS pp pp pp
0 10
0 10
0 10
ITEM: ATOMS id type x y z
1 1 1.0 2.0 3.0
2 2 4.0 5.0 6.0
3 1 7.0 8.0 9.0
`;
  const collect = async (gen) => { const out = []; for await (const v of gen) out.push(v); return out; };
  const single = await collect(parseDumpStream(ONE));
  const singleLast = single[single.length - 1];
  check('single-frame: hasMoreFrames=false', singleLast.type === 'complete' && singleLast.hasMoreFrames === false);

  const multi = ONE + ONE.replace('TIMESTEP\n1', 'TIMESTEP\n2');
  const multiEvents = await collect(parseDumpStream(multi));
  const multiLast = multiEvents[multiEvents.length - 1];
  check('multi-frame: hasMoreFrames=true', multiLast.type === 'complete' && multiLast.hasMoreFrames === true);

  // ── 5b. Full worker-equivalent path: stream-parse multi-frame →
  //         incremental writer → local source read-back, holding ≤1 frame ──
  const traj3 = (ts, base) => `ITEM: TIMESTEP
${ts}
ITEM: NUMBER OF ATOMS
4
ITEM: BOX BOUNDS pp pp pp
0 10
0 10
0 10
ITEM: ATOMS id type x y z
1 1 ${base + 1}.0 2.0 3.0
2 2 ${base + 2}.0 5.0 6.0
3 1 ${base + 3}.0 8.0 9.0
4 2 ${base + 4}.0 1.0 2.0
`;
  const dumpText = traj3(0, 0) + traj3(50, 10) + traj3(100, 20) + traj3(150, 30);
  const dumpBytes = new TextEncoder().encode(dumpText);
  const byteSource = {
    async *[Symbol.asyncIterator]() {
      // 13-byte chunks: force frame/header boundaries to split across reads.
      for (let i = 0; i < dumpBytes.length; i += 13) yield dumpBytes.subarray(i, i + 13);
    },
  };
  const txRecs = [];
  let laterFrameCount = 0;
  for await (const ev of parseDumpStreamFromBytes(byteSource, { multiFrame: true })) {
    if (ev.type === 'frame') laterFrameCount++; // arrives whole, one at a time
  }
  check('multi-frame stream emitted 3 later-frame events', laterFrameCount === 3);

  // Re-run, this time driving the writer exactly as the worker does: frame 0
  // (the now-complete header frame) first, then each later frame as it lands.
  const w2 = new GlimbinStreamWriter();
  let f0 = null;
  for await (const ev of parseDumpStreamFromBytes({
    async *[Symbol.asyncIterator]() {
      for (let i = 0; i < dumpBytes.length; i += 13) yield dumpBytes.subarray(i, i + 13);
    },
  }, { multiFrame: true })) {
    if (ev.type === 'header') f0 = ev.frame;
    else if (ev.type === 'frame') {
      if (f0) { txRecs.push(w2.addFrame(f0)); f0 = null; } // flush frame 0 first
      txRecs.push(w2.addFrame(ev.frame));
    }
  }
  const fin = w2.finalize();
  const glimblob = new Blob([fin.header, ...txRecs, fin.index]);
  const src2 = new LocalGlimbinSource(glimblob);
  const m2 = await src2.open();
  check('transcoded trajectory reports 4 frames', m2.totalFrames === 4);
  let streamReadOk = true;
  const expectedX = [0, 10, 20, 30]; // base per frame, atom 0 x = base+1
  for (let fi = 0; fi < 4; fi++) {
    const fr = await src2.fetchFrame(fi);
    if (fr.positions[0] !== expectedX[fi] + 1) streamReadOk = false;
  }
  check('every transcoded frame reads back correctly via LocalGlimbinSource', streamReadOk);
  src2.dispose();

  // ── 6. Library manifest helpers + content hash ──
  check('parseManifest drops malformed entries',
    eq(parseManifest(JSON.stringify([{ id: 'a', name: 'a' }, { x: 1 }])).map((r) => r.id), ['a']));
  check('parseManifest tolerates corrupt JSON', eq(parseManifest('{bad').map(() => 1), []));
  const recs = upsertRecord([], { id: 'a', name: 'a', updatedAt: 1 });
  const recs2 = upsertRecord(recs, { id: 'a', name: 'a', updatedAt: 5 });
  check('upsertRecord dedupes by id', recs2.length === 1 && recs2[0].updatedAt === 5);
  const h = await hashBlob(blob);
  check('hashBlob returns a sha-256 hex string', /^[0-9a-f]{64}$/.test(h), h.slice(0, 12) + '…');

} catch (err) {
  check(`unexpected error: ${err?.stack || err}`, false);
}

const passed = results.filter(Boolean).length;
console.log(`\n[verify-local-trajectory] ${passed}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
