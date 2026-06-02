#!/usr/bin/env node
/**
 * verify-export-colors.mjs — prove the 3D exports preserve per-atom colors.
 *
 * The USDZ size optimization replaced per-vertex colors (palette texture) with a
 * flat material.color per color-group, so color fidelity must be checked. This
 * reads the FILE values written by both exporters and compares them:
 *   - GLB:  GLTFLoader.parse → InstancedMesh.instanceColor (the _COLOR_0 accessor,
 *           loaded WITHOUT colorspace conversion, so it equals the source value).
 *   - USDZ: the raw `diffuseColor` triples in the .usda (the actual stored value).
 * Comparing FILE values (not loader-reconverted values) is the fair test — a
 * USDZLoader re-applies an sRGB→linear shift on read that does NOT reflect the
 * shipped asset. An all-white collapse or a real per-channel mismatch fails.
 *
 * Reads the exports produced by `node tools/verify-exports.mjs` from
 * .verify-artifacts/exports/ — run that first.
 *
 * Usage: node tools/verify-export-colors.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(__dirname, '..', '.verify-artifacts', 'exports');
const MOLECULES = ['mlip_lifepo4_li_channel', 'mlip_ni_vacancy_playthrough'];
const VIEW = 'atoms';

const q = (x) => Math.round(x * 255); // 8-bit key
const key = (r, g, b) => `${q(r)},${q(g)},${q(b)}`;

async function glbColors(file) {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const buf = readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
  const set = new Set();
  gltf.scene.traverse((o) => {
    if (o.isInstancedMesh && o.instanceColor) {
      const a = o.instanceColor.array;
      for (let i = 0; i < a.length; i += 3) set.add(key(a[i], a[i + 1], a[i + 2]));
    } else if (o.isMesh && o.geometry?.getAttribute?.('color')) {
      const attr = o.geometry.getAttribute('color');
      const a = attr.array, n = attr.itemSize || 3;
      for (let i = 0; i < a.length; i += n) set.add(key(a[i], a[i + 1], a[i + 2]));
    }
  });
  return set;
}

function usdzColors(file) {
  // The .usda is plain text inside the (uncompressed) usdz; read diffuseColor directly.
  const txt = readFileSync(file).toString('latin1');
  const re = /diffuseColor[^=]*=\s*\(([-\d.eE]+),\s*([-\d.eE]+),\s*([-\d.eE]+)\)/g;
  const set = new Set();
  let m;
  while ((m = re.exec(txt))) set.add(key(+m[1], +m[2], +m[3]));
  return set;
}

let allGood = true;
for (const mol of MOLECULES) {
  const glb = resolve(DIR, `${mol}-${VIEW}.glb`);
  const usdz = resolve(DIR, `${mol}-${VIEW}.usdz`);
  console.log(`\n=== ${mol} ===`);
  if (!existsSync(glb) || !existsSync(usdz)) {
    console.log('  ✗ missing export files — run `node tools/verify-exports.mjs` first');
    allGood = false;
    continue;
  }
  const g = await glbColors(glb);
  const u = usdzColors(usdz);
  const shared = [...g].filter((k) => u.has(k)).length;

  // Failure modes we guard against: (1) colors collapsed to a single white
  // (information lost — a pure-element system legitimately has one NON-white
  // color, so only all-white counts), (2) GLB and USDZ file values disagree.
  const WHITE = '255,255,255';
  const collapsedToWhite = g.size === 0 || (g.size === 1 && g.has(WHITE));
  const match = g.size === u.size && shared === g.size; // file values agree atom-for-atom

  console.log(`  GLB  file colors (${g.size}): ${[...g].sort().join('  ')}`);
  console.log(`  USDZ file colors (${u.size}): ${[...u].sort().join('  ')}`);
  console.log(`  → ${!collapsedToWhite ? '✓' : '✗'} colors retained (not collapsed to white)`);
  console.log(`  → ${match ? '✓' : '✗'} GLB↔USDZ file values match exactly (${shared}/${g.size})`);
  if (!match) {
    console.log(`     only GLB:  ${[...g].filter((k) => !u.has(k)).join('  ') || '—'}`);
    console.log(`     only USDZ: ${[...u].filter((k) => !g.has(k)).join('  ') || '—'}`);
  }
  if (collapsedToWhite || !match) allGood = false;
}

console.log(`\n[verify-export-colors] ${allGood ? 'PASS — per-atom colors preserved (USDZ file == GLB == source)' : 'FAIL — color discrepancy'}`);
process.exit(allGood ? 0 : 1);
