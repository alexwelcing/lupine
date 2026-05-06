#!/usr/bin/env node
/**
 * verify-viewer.mjs — drive the live dev server with Playwright Chromium,
 * snapshot what's on screen, and dump live state from window.__atlas to
 * stdout. Lets the agent / user prove that store changes actually move
 * pixels, not just typecheck values.
 *
 * Usage:
 *   node tools/verify-viewer.mjs                 # default checks
 *   node tools/verify-viewer.mjs --preset=cinematic
 *   node tools/verify-viewer.mjs --no-screenshot # state-only, faster
 *
 * Requires:
 *   - Dev server running at http://localhost:3000/
 *   - Playwright + Chromium installed (already in repo devDeps)
 *
 * Output:
 *   - JSON state snapshots streamed to stdout, prefixed with [STATE].
 *   - Screenshots written to .verify-artifacts/<timestamp>-<label>.png.
 *   - Console messages from the page streamed with [PAGE] prefix.
 */

import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const ARTIFACTS = resolve(REPO_ROOT, '.verify-artifacts');
const URL = process.env.VERIFY_URL ?? 'http://localhost:3000/';

const args = parseArgs(process.argv.slice(2));
const presetToTest = args.preset; // e.g. 'cinematic'
const skipScreenshots = args['no-screenshot'] ?? false;
const headless = args.headless ?? !process.stdout.isTTY;
const timeout = Number(args.timeout ?? 30000);

if (!existsSync(ARTIFACTS)) mkdirSync(ARTIFACTS, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

console.log(`[verify] launching chromium (headless=${headless}) → ${URL}`);
if (args.radioactive) console.log('[verify] --radioactive: fixture will use U/Ra/Pu/Au');

const browser = await chromium.launch({
  headless,
  // WebGPU in Chromium needs these flags. Without them, navigator.gpu is
  // undefined and the GPU bond pipeline reports `unsupported` — not what
  // we're trying to measure.
  args: [
    '--enable-unsafe-webgpu',
    '--enable-features=Vulkan',
    '--use-vulkan',
    '--enable-features=WebGPU',
  ],
});

const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

// Stream console messages from the page so we see [atlas dev] markers and
// any errors the runtime emits.
page.on('console', (msg) => {
  const type = msg.type();
  const text = msg.text();
  // Suppress only the loud GL_CLOSE_PATH_NV ReadPixels warning; show everything else.
  if (text.includes('GPU stall due to ReadPixels')) return;
  console.log(`[PAGE ${type}] ${text}`);
});
page.on('pageerror', (err) => {
  console.log(`[PAGE ERROR] ${err.message}`);
  if (err.stack) console.log(`[PAGE STACK] ${err.stack.split('\n').slice(0, 6).join(' | ')}`);
});

const t0 = Date.now();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout });

// Set the radioactive flag in the page before fixture load.
if (args.radioactive) {
  await page.evaluate(() => { window.__VERIFY_RADIOACTIVE = true; });
}

// Wait for the app shell + Canvas to mount. window.__atlas.three is set by
// DevProbe inside the Canvas, so its presence proves the R3F tree is live.
let mountedOk = true;
try {
  await page.waitForFunction(
    () => window?.__atlas?.three?.scene !== undefined,
    null,
    { timeout },
  );
} catch (err) {
  mountedOk = false;
  console.log(`[verify] WARN: window.__atlas.three not seen within ${timeout}ms — ${err.message}`);
  if (!skipScreenshots) {
    const path = join(ARTIFACTS, `${stamp}-mount-timeout.png`);
    await page.screenshot({ path, fullPage: false });
    console.log(`[verify] saved: ${path}`);
  }
}

console.log(`[verify] mount time: ${Date.now() - t0}ms`);

await snapshot('landing');

// --file=<url> loads a real file via the parseFile() pipeline (WASM parser
// → store.setFile → smart defaults → render). Validates end-to-end through
// the same path FileDropZone uses; not a synthesized fixture.
if (args.file) {
  // Git Bash on Windows translates a leading `/` in the arg to `C:/Program Files/Git/`.
  // Strip any directory prefix so we always end up with just the basename, then
  // mount it under the dev server URL. Fully-qualified URLs pass through unchanged.
  let fileArg = args.file;
  if (!fileArg.startsWith('http')) {
    fileArg = fileArg.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? fileArg;
  }
  const fileUrl = fileArg.startsWith('http') ? fileArg : `${URL}${fileArg}`;
  console.log(`[verify] loading real file via parseFile(): ${fileUrl}`);
  try {
    const summary = await page.evaluate(async (u) => {
      return await window.__atlas.loadFromURL(u);
    }, fileUrl);
    console.log(`[verify] loaded: natoms=${summary.natoms}, frames=${summary.frames}, atomTypes=${JSON.stringify(summary.atomTypes)}`);
    // Re-fit the camera to the loaded scene. The default camera position
    // [0,0,50] may not face the loaded atoms (e.g. LJ melt is centered at
    // [25,25,25]); explicitly point at the scene's center via OrbitControls.
    await page.evaluate(() => {
      const w = window;
      const t = w.__atlas?.three;
      if (!t) return;
      const file = w.__atlas.getState().file;
      const f = file?.trajectory?.frames?.[0];
      if (!f?.boxBounds) return;
      const cx = (f.boxBounds[0] + f.boxBounds[1]) / 2;
      const cy = (f.boxBounds[2] + f.boxBounds[3]) / 2;
      const cz = (f.boxBounds[4] + f.boxBounds[5]) / 2;
      const dx = f.boxBounds[1] - f.boxBounds[0];
      const dy = f.boxBounds[3] - f.boxBounds[2];
      const dz = f.boxBounds[5] - f.boxBounds[4];
      const span = Math.max(dx, dy, dz);
      const dist = span * 1.5;
      t.camera.position.set(cx + dist, cy + dist * 0.6, cz + dist);
      t.camera.lookAt(cx, cy, cz);
      if (t.controls?.target) {
        t.controls.target.set(cx, cy, cz);
        t.controls.update?.();
      }
    });
    await page.waitForTimeout(3500);
    await snapshot('after-real-file');
  } catch (err) {
    console.log(`[verify] FILE LOAD FAILED: ${err.message}`);
  }
  await browser.close();
  console.log(`[verify] done in ${Date.now() - t0}ms`);
  process.exit(0);
}

// Load a synthetic cubic lattice via the store. --stress uses 16×16×16
// (4096 atoms) for the capacity-ratchet / large-fixture path; default is
// 4×4×4 (64 atoms) for fast iteration on rendering correctness.
const FIXTURE_SIDE = args.stress ? 16 : 4;
console.log(`[verify] loading synthetic ${FIXTURE_SIDE}×${FIXTURE_SIDE}×${FIXTURE_SIDE} fixture (${FIXTURE_SIDE ** 3} atoms)`);
await page.evaluate((SIDE) => {
  const N = SIDE * SIDE * SIDE;
  const positions = new Float32Array(N * 3);
  const types = new Int32Array(N);
  const ids = new Int32Array(N);
  let idx = 0;
  // Mix hero elements across the lattice so material/color paths exercise.
  // --radioactive swaps in U/Ra/Pu so the per-element emission term shows.
  const elementByY = window.__VERIFY_RADIOACTIVE
    ? [92, 88, 94, 79]   // U, Ra, Pu, Au — emission + metallic baseline
    : [29, 79, 8, 1];    // Cu, Au, O, H — chemistry baseline
  for (let x = 0; x < SIDE; x++) for (let y = 0; y < SIDE; y++) for (let z = 0; z < SIDE; z++) {
    positions[idx * 3] = x * 1.5;
    positions[idx * 3 + 1] = y * 1.5;
    positions[idx * 3 + 2] = z * 1.5;
    types[idx] = elementByY[y % elementByY.length];
    ids[idx] = idx;
    idx++;
  }
  const extent = SIDE * 1.5;
  const frame = {
    timestep: 0,
    natoms: N,
    boxBounds: new Float64Array([0, extent, 0, extent, 0, extent]),
    boxTilt: new Float64Array([0, 0, 0]),
    triclinic: false,
    columns: ['id', 'type', 'x', 'y', 'z'],
    ids,
    types,
    positions,
    bonds: new Int32Array(0),
    properties: new Map(),
  };
  window.__atlas.store.getState().setFile({
    name: `verify-fixture-${N}atoms`,
    size: 0,
    trajectory: {
      frames: [frame],
      totalFrames: 1,
      atomTypes: [29, 79, 8, 1],
      globalBounds: { min: [0, 0, 0], max: [extent, extent, extent] },
    },
    thermo: null,
  });
}, FIXTURE_SIDE);

// Allow time for: setFile → smart defaults trigger → bonds enable → worker
// or GPU pipeline runs → onBondsUpdate fires → store updated.
await page.waitForTimeout(2000);
await snapshot('after-fixture-load');

// Optional: drive a preset switch and re-snapshot.
if (presetToTest) {
  console.log(`[verify] switching preset → ${presetToTest}`);
  await page.evaluate((p) => {
    window.__atlas.store.getState().setPostprocessPreset(p);
  }, presetToTest);
  // Allow one frame for the composer to react.
  await page.waitForTimeout(300);
  await snapshot(`after-preset-${presetToTest}`);
}

// Toggle CPU/GPU backends and snapshot each.
console.log('[verify] flipping useGpuBonds → false (CPU worker)');
await page.evaluate(() => window.__atlas.store.getState().setUseGpuBonds(false));
await page.waitForTimeout(800);
await snapshot('cpu-backend');

console.log('[verify] flipping useGpuBonds → true (GPU)');
await page.evaluate(() => window.__atlas.store.getState().setUseGpuBonds(true));
await page.waitForTimeout(1500);
await snapshot('gpu-backend');

// ─── Perf measurement sweep ──────────────────────────────────────────
// When --measure is passed, drive a matrix of (preset × scheme) and report
// FPS for each cell. Useful as a regression baseline: run before and after
// a perf-targeted change, eyeball the delta.
if (args.measure) {
  console.log('[verify] entering --measure mode: sweeping preset × scheme');

  // Load a denser fixture to stress the pipeline. 16×16×16 = 4096 atoms.
  console.log('[verify] loading 16×16×16 stress fixture');
  await page.evaluate(() => {
    const SIDE = 16;
    const N = SIDE * SIDE * SIDE;
    const positions = new Float32Array(N * 3);
    const types = new Int32Array(N);
    const ids = new Int32Array(N);
    let idx = 0;
    for (let x = 0; x < SIDE; x++) for (let y = 0; y < SIDE; y++) for (let z = 0; z < SIDE; z++) {
      positions[idx * 3] = x * 1.5;
      positions[idx * 3 + 1] = y * 1.5;
      positions[idx * 3 + 2] = z * 1.5;
      // Cycle through hero elements so material+color paths exercise.
      const elements = [29, 79, 8, 6];
      types[idx] = elements[(x + y + z) % elements.length];
      ids[idx] = idx;
      idx++;
    }
    const frame = {
      timestep: 0, natoms: N,
      boxBounds: new Float64Array([0, SIDE * 1.5, 0, SIDE * 1.5, 0, SIDE * 1.5]),
      boxTilt: new Float64Array([0, 0, 0]),
      triclinic: false,
      columns: ['id', 'type', 'x', 'y', 'z'],
      ids, types, positions,
      bonds: new Int32Array(0),
      properties: new Map(),
    };
    window.__atlas.store.getState().setFile({
      name: 'measure-fixture-4096atoms',
      size: 0,
      trajectory: {
        frames: [frame], totalFrames: 1, atomTypes: [29, 79, 8, 6],
        globalBounds: { min: [0, 0, 0], max: [SIDE * 1.5, SIDE * 1.5, SIDE * 1.5] },
      },
      thermo: null,
    });
  });
  await page.waitForTimeout(3000); // Allow bonds + first render to settle.

  const presets = ['diagram', 'paper', 'studio', 'editorial', 'cinematic'];
  const schemes = ['element', 'family', 'uniform'];
  const results = [];
  for (const preset of presets) {
    for (const scheme of schemes) {
      await page.evaluate(([p, s]) => {
        const st = window.__atlas.store.getState();
        st.setPostprocessPreset(p);
        st.setColorScheme(s);
      }, [preset, scheme]);
      await page.waitForTimeout(1800); // Settle + accumulate FPS samples.
      const perf = await page.evaluate(() => {
        const p = window.__atlas?.perf ?? {};
        const three = window.__atlas?.three;
        return {
          avgFps1s: p.avgFps1s ?? 0,
          avgFps5s: p.avgFps5s ?? 0,
          frameTimeMs: p.frameTimeMs ?? 0,
          drawCalls: three?.gl?.info?.render?.calls ?? 0,
          triangles: three?.gl?.info?.render?.triangles ?? 0,
        };
      });
      results.push({ preset, scheme, ...perf });
      console.log(
        `[MEASURE] preset=${preset.padEnd(10)} scheme=${scheme.padEnd(8)} ` +
        `fps1s=${String(perf.avgFps1s).padStart(3)} ` +
        `frame=${perf.frameTimeMs.toFixed(2).padStart(6)}ms ` +
        `calls=${String(perf.drawCalls).padStart(3)} ` +
        `tri=${perf.triangles.toLocaleString().padStart(8)}`,
      );
    }
  }
  console.log(`[verify] measure done — ${results.length} cells`);
}

await browser.close();
console.log(`[verify] done in ${Date.now() - t0}ms`);

// --------------------------------------------------------------------

async function snapshot(label) {
  const state = await page.evaluate(() => {
    const w = window;
    if (!w.__atlas) return { error: 'window.__atlas missing' };
    const s = w.__atlas.getState ? w.__atlas.getState() : null;
    const three = w.__atlas.three;
    return {
      // Postprocess
      postprocessPreset: s?.postprocessPreset,
      postprocessIntensity: s?.postprocessIntensity,
      // Coloring
      colorScheme: s?.colorScheme,
      atomColorSource: s?.atomColorSource,
      colorMode: s?.colorMode,
      colormap: s?.colormap,
      // Bonds
      showBonds: s?.showBonds,
      useGpuBonds: s?.useGpuBonds,
      gpuBondsStatus: s?.gpuBondsStatus,
      bondSource: s?.bondSource,
      lastBondCount: s?.lastBondCount,
      bondColorMode: s?.bondColorMode,
      // File / playback
      fileName: s?.file?.name ?? null,
      natoms: s?.file?.trajectory?.frames?.[s.frame]?.natoms ?? 0,
      frame: s?.frame,
      totalFrames: s?.file?.trajectory?.frames?.length ?? 0,
      playing: s?.playing,
      // Three.js render stats
      drawCalls: three?.gl?.info?.render?.calls ?? null,
      triangles: three?.gl?.info?.render?.triangles ?? null,
      sceneChildren: three?.scene?.children?.length ?? null,
      hasWebGPU: !!navigator.gpu,
      // Perf (from DevProbe FPS sampler)
      fps: w.__atlas?.perf?.fps ?? null,
      avgFps1s: w.__atlas?.perf?.avgFps1s ?? null,
      avgFps5s: w.__atlas?.perf?.avgFps5s ?? null,
      frameTimeMs: w.__atlas?.perf?.frameTimeMs ?? null,
      totalFrames_rendered: w.__atlas?.perf?.frameCount ?? null,
    };
  });
  console.log(`[STATE ${label}] ${JSON.stringify(state)}`);
  if (!skipScreenshots) {
    const path = join(ARTIFACTS, `${stamp}-${label}.png`);
    // Heavy scenes (10k+ atoms, dense bonds) are slow to render on the
    // software-rasterized headless chromium. Bump the screenshot timeout
    // so we capture state even when the per-frame render takes seconds.
    await page.screenshot({ path, fullPage: false, timeout: 90000 });
    console.log(`[verify] screenshot: ${path}`);
  }
  return state;
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v ?? true;
    }
  }
  return out;
}
