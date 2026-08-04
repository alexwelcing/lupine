#!/usr/bin/env node
/**
 * verify-exports.mjs — drive the 3D file export pipeline (GLB + USDZ) across a
 * matrix of molecules × view settings with Playwright Chromium, capture the
 * REAL exported bytes, and validate them. Companion to verify-gallery.mjs.
 *
 * Why: the 3D export reconstructs sphere/bond meshes from atom data + the
 * current view state (bondTolerance / atomScale / colorScheme / frame) and runs
 * GLTFExporter (GLB) or USDZExporter (USDZ). It is data-driven, so it does NOT
 * need the canvas to be actively rendering — we trigger it via the store and
 * read the resulting Blob, which is far more reliable than clicking the panel.
 *
 * For each (molecule × view × format) it:
 *   - loads the molecule (gallery card → viewer, store.file set),
 *   - applies the view (setBondTolerance / setAtomScale / setColorScheme),
 *   - triggers triggerExport({type}) and awaits onComplete(success, blob),
 *   - validates the container magic (GLB: "glTF" 0x676C5446; USDZ: zip "PK"),
 *   - writes the file to .verify-artifacts/exports/ for inspection.
 *
 * Usage:
 *   node tools/verify-exports.mjs                  # headless, asserts, writes samples
 *   VERIFY_URL=http://localhost:5180/ node tools/verify-exports.mjs
 *   node tools/verify-exports.mjs --no-write       # skip writing sample files
 *
 * Requires: a dev server (default http://localhost:3000/), Playwright (devDep).
 * Exit 0 = every (molecule × view × format) produced a valid file, 1 = any failed.
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const OUT = resolve(REPO_ROOT, '.verify-artifacts', 'exports');
const URL = process.env.VERIFY_URL ?? 'http://localhost:3000/';
const args = new Set(process.argv.slice(2));
const skipWrite = args.has('--no-write');
// USDZ expands instanced meshes, so large molecules take a while + transfer big
// blobs back to Node; give each export generous headroom (override with env).
const timeout = Number(process.env.VERIFY_TIMEOUT ?? 120000);
const perExportMs = Number(process.env.VERIFY_EXPORT_MS ?? 90000);

// Small→medium molecules (avoid the million-atom cards — huge/slow GLBs).
const MOLECULES = [
  'mlip_lifepo4_li_channel',     // ~28 atoms
  'mlip_mg_slip_playthrough',    // ~96 atoms
  'mlip_ni_vacancy_playthrough', // ~107 atoms
  'coudert_mof_flexibility',     // ~540 atoms
];

// Distinct geometric views: changing bondTolerance adds/removes bond cylinders,
// atomScale changes sphere radii, colorScheme changes materials.
const VIEWS = [
  { name: 'atoms', state: { bondTolerance: 0, atomScale: 1.0, colorScheme: 'element' } },
  { name: 'bonded', state: { bondTolerance: 0.8, atomScale: 0.6, colorScheme: 'botanical' } },
];

const FORMATS = [
  { type: 'glb', ext: 'glb', magic: [0x67, 0x6c, 0x54, 0x46], magicName: '"glTF"' }, // GLB header
  { type: 'usdz', ext: 'usdz', magic: [0x50, 0x4b], magicName: 'zip "PK"' },          // USDZ is a zip
];

if (!skipWrite && !existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const rows = [];
function record(mol, view, fmt, ok, detail) {
  rows.push({ mol, view, fmt, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${mol} · ${view} · ${fmt.toUpperCase()}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--use-vulkan'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log(`  [page error] ${e.message}`));

async function loadMolecule(id) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => typeof window?.__atlas?.getState === 'function', null, { timeout });
  await page.locator('#gallery').scrollIntoViewIfNeeded();
  const card = page.locator(`[data-testid="gallery-card-${id}"]`);
  await card.waitFor({ timeout });
  await card.click();
  await page.waitForFunction(() => !!window.__atlas.getState().file, null, { timeout });
  return page.evaluate(() => window.__atlas.getState().file?.name ?? null);
}

async function applyView(state) {
  await page.evaluate((v) => {
    const s = window.__atlas.getState();
    if (v.bondTolerance != null && s.setBondTolerance) s.setBondTolerance(v.bondTolerance);
    if (v.atomScale != null && s.setAtomScale) s.setAtomScale(v.atomScale);
    if (v.colorScheme != null && s.setColorScheme) s.setColorScheme(v.colorScheme);
  }, state);
}

// Trigger an export through the store and return the real blob bytes.
async function exportOnce(type, baseName) {
  return page.evaluate(
    ({ type, baseName, ms }) =>
      new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ success: false, error: 'timeout' }), ms);
        try {
          window.__atlas.getState().triggerExport({
            type,
            format: type,
            baseName,
            onComplete: async (success, blob, filename) => {
              clearTimeout(timer);
              if (!success || !blob) {
                resolve({ success: false, error: 'no blob (success=' + success + ')' });
                return;
              }
              const u8 = new Uint8Array(await blob.arrayBuffer());
              let bin = '';
              const step = 0x8000;
              for (let i = 0; i < u8.length; i += step) {
                bin += String.fromCharCode.apply(null, u8.subarray(i, i + step));
              }
              resolve({
                success: true,
                filename,
                size: blob.size,
                mime: blob.type,
                head: Array.from(u8.slice(0, 8)),
                b64: btoa(bin),
              });
            },
          });
        } catch (e) {
          clearTimeout(timer);
          resolve({ success: false, error: String(e) });
        }
      }),
    { type, baseName, ms: perExportMs },
  );
}

try {
  console.log(`[verify-exports] → ${URL}\n`);
  for (const mol of MOLECULES) {
    let fileName;
    try {
      fileName = await loadMolecule(mol);
    } catch (e) {
      for (const view of VIEWS) for (const fmt of FORMATS) record(mol, view.name, fmt.type, false, `load failed: ${e.message}`);
      continue;
    }
    for (const view of VIEWS) {
      await applyView(view.state);
      for (const fmt of FORMATS) {
        const baseName = `Lupi-${mol}-${view.name}`;
        const out = await exportOnce(fmt.type, baseName);
        if (!out.success) {
          record(mol, view.name, fmt.type, false, out.error);
          // A timed-out/slow export can leave the pipeline busy; reload to reset
          // so the next case is judged on its own, not a false-negative cascade.
          try {
            await loadMolecule(mol);
            await applyView(view.state);
          } catch { /* next case will surface its own load error */ }
          continue;
        }
        const headOk = fmt.magic.every((b, i) => out.head[i] === b);
        const sizeOk = out.size > 256;
        const ok = headOk && sizeOk;
        record(mol, view.name, fmt.type, ok, `${(out.size / 1024).toFixed(1)} KB · ${out.mime} · magic ${headOk ? fmt.magicName : `BAD ${JSON.stringify(out.head.slice(0, 4))}`}`);
        if (ok && !skipWrite) {
          const p = resolve(OUT, `${mol}-${view.name}.${fmt.ext}`);
          writeFileSync(p, Buffer.from(out.b64, 'base64'));
        }
      }
    }
  }
} catch (err) {
  console.log(`[verify-exports] FATAL ${err.message}`);
  record('harness', '-', { type: '-', toUpperCase: () => '-' }, false, err.message);
} finally {
  await browser.close();
}

const failed = rows.filter((r) => !r.ok);
console.log(`\n[verify-exports] ${rows.length - failed.length}/${rows.length} exports valid`);
if (!skipWrite) console.log(`[verify-exports] sample files → ${OUT}`);
if (failed.length) {
  console.log('[verify-exports] FAILURES:');
  for (const f of failed) console.log(`   - ${f.mol} · ${f.view} · ${f.fmt} — ${f.detail}`);
}
process.exit(failed.length === 0 ? 0 : 1);
