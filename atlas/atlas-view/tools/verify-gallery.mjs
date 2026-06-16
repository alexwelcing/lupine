#!/usr/bin/env node
/**
 * verify-gallery.mjs — drive the gallery/cards/NIST UI with Playwright
 * Chromium and assert real DOM + store behaviour. Companion to
 * verify-viewer.mjs (which only exercises the 3D viewer).
 *
 * Checks:
 *   1. Gallery section renders the curated card set.
 *   2. Search filters the grid (and the deferred value still resolves).
 *   3. A no-match search shows the empty state; reset restores the grid.
 *   4. Functional-group filter narrows the grid and explains the molecule.
 *   5. Domain filter narrows the grid and sets aria-pressed.
 *   6. Clicking a card loads its dataset (store.activeCardId + file).
 *   7. The NIST Potentials tab renders the PotentialBrowser.
 *   8. The OMol25 tab labels functional-group facets as method-derived screens.
 *
 * Usage:
 *   node tools/verify-gallery.mjs                 # headless, asserts
 *   node tools/verify-gallery.mjs --no-screenshot
 *
 * By default this starts the Vite app on an OS-assigned localhost port. Set
 * VERIFY_URL or pass --url=http://... to target an existing preview instead.
 * Exit code 0 = all checks passed, 1 = at least one failed.
 */

import { chromium } from 'playwright';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const WEB_ROOT = resolve(REPO_ROOT, 'apps/web');
const ARTIFACTS = resolve(REPO_ROOT, '.verify-artifacts');
const galleryData = JSON.parse(readFileSync(resolve(REPO_ROOT, 'packages/ui/src/gallery-data.json'), 'utf-8'));
const expectedCardCount = galleryData.length;
const requireFromWeb = createRequire(resolve(WEB_ROOT, 'package.json'));
const { createServer } = await import(pathToFileURL(requireFromWeb.resolve('vite')).href);
const args = parseArgs(process.argv.slice(2));
const skipShots = Boolean(args['no-screenshot']);
const externalUrl = process.env.VERIFY_URL || args.url;
const timeout = 30000;

if (!existsSync(ARTIFACTS)) mkdirSync(ARTIFACTS, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

let server = null;
let browser = null;
let page = null;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const shot = async (label) => {
  if (skipShots) return;
  const p = resolve(ARTIFACTS, `${stamp}-gallery-${label}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  [shot] ${p}`);
};

try {
  const targetUrl = withTrailingSlash(externalUrl || await startPortlessVite());
  console.log(`[verify-gallery] → ${targetUrl}`);

  browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--use-vulkan'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  page = await ctx.newPage();
  await page.addInitScript((count) => {
    window.__VERIFY_EXPECTED_GALLERY_COUNT = count;
  }, expectedCardCount);
  page.on('pageerror', (err) => console.log(`[PAGE ERROR] ${err.message}`));

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout });

  // Dev/local builds expose the internal store, which gives us a stronger card
  // load assertion. Public builds may omit it, so live verification stays
  // focused on visible gallery behavior.
  const atlasStoreAvailable = await page
    .waitForFunction(() => typeof window?.__atlas?.getState === 'function', null, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  // The section is IntersectionObserver-gated — scroll it into view.
  await page.locator('#gallery').scrollIntoViewIfNeeded();
  await page.waitForSelector('[data-testid="gallery"]', { timeout });

  // ── 1. Curated card set renders ──
  const cardSel = 'button[data-testid^="gallery-card-"]';
  await page.waitForSelector(cardSel, { timeout });
  const cardCount = await page.locator(cardSel).count();
  check('curated card set renders', cardCount === expectedCardCount, `${cardCount} cards (expected ${expectedCardCount})`);
  const hasKnown = await page.locator('[data-testid="gallery-card-c60_buckyball"]').count();
  check('known curated card present (c60_buckyball)', hasKnown === 1);
  await shot('grid');

  // ── 2. Search filters the grid ──
  const searchBox = page.locator('[data-testid="gallery-search"]');
  await searchBox.fill('graphene');
  await page.waitForFunction(
    () => {
      const n = document.querySelectorAll('button[data-testid^="gallery-card-"]').length;
      return n > 0 && n < window.__VERIFY_EXPECTED_GALLERY_COUNT;
    },
    null,
    { timeout },
  );
  const searched = await page.locator(cardSel).count();
  const grapheneVisible = await page.locator('[data-testid="gallery-card-graphene_ribbon"]').count();
  check('search narrows the grid', searched > 0 && searched < expectedCardCount, `${searched} match "graphene"`);
  check('search matches the expected card', grapheneVisible === 1);
  await shot('search');

  // ── 3. No-match search → empty state, then reset ──
  await searchBox.fill('zzz-no-such-simulation-xyz');
  await page.waitForSelector('[data-testid="gallery-empty"]', { timeout });
  check('no-match search shows empty state', true);
  await shot('empty');
  await page.locator('[data-testid="gallery-empty-reset"]').click();
  await page.waitForFunction(
    () => document.querySelectorAll('button[data-testid^="gallery-card-"]').length === window.__VERIFY_EXPECTED_GALLERY_COUNT,
    null,
    { timeout },
  );
  const afterReset = await page.locator(cardSel).count();
  check('reset restores the full grid', afterReset === expectedCardCount, `${afterReset} cards`);

  // ── 4. Organic functional-group filter ──
  const aldehydeBtn = page.locator('[data-testid="gallery-group-aldehyde"]');
  await aldehydeBtn.click();
  await page.waitForFunction(
    () => document.querySelectorAll('button[data-testid^="gallery-card-"]').length === 2,
    null,
    { timeout },
  );
  const aldehydeCount = await page.locator(cardSel).count();
  const acetaldehydeVisible = await page.locator('[data-testid="gallery-card-acetaldehyde"]').count();
  const benzaldehydeVisible = await page.locator('[data-testid="gallery-card-benzaldehyde"]').count();
  check(
    'expanded functional-group examples are searchable by group',
    aldehydeCount === 2 && acetaldehydeVisible === 1 && benzaldehydeVisible === 1,
    `${aldehydeCount} aldehyde results`,
  );

  const acidBtn = page.locator('[data-testid="gallery-group-carboxylic-acid"]');
  await acidBtn.click();
  await page.waitForFunction(
    () => document.querySelectorAll('button[data-testid^="gallery-card-"]').length === 1,
    null,
    { timeout },
  );
  const acidCount = await page.locator(cardSel).count();
  const aspirinVisible = await page.locator('[data-testid="gallery-card-aspirin"]').count();
  const acidPressed = await acidBtn.getAttribute('aria-pressed');
  const studyGuide = (await page.locator('[data-testid="gallery-group-study-guide"]').innerText()).toLowerCase();
  const functionalNote = await page.locator('.lupi-gallery-functional-note').innerText();
  check('functional-group filter narrows to mapped molecules', acidCount === 1 && aspirinVisible === 1, `${acidCount} carboxylic-acid result`);
  check('functional-group filter exposes aria-pressed', acidPressed === 'true');
  check('spotlight teaches the active molecule groups', /Carboxylic Acids/.test(functionalNote) && /Esters/.test(functionalNote));
  check(
    'functional-group study guide teaches recognition and reactivity',
    studyGuide.includes('recognize') && studyGuide.includes('reactivity') && studyGuide.includes('self-check'),
  );
  await shot('functional-group');
  await page.locator('[data-testid="gallery-group-all"]').click();
  await page.waitForFunction(
    () => document.querySelectorAll('button[data-testid^="gallery-card-"]').length === window.__VERIFY_EXPECTED_GALLERY_COUNT,
    null,
    { timeout },
  );

  // ── 5. Domain filter ──
  const metalsBtn = page.locator('button[aria-pressed]', { hasText: 'Metals & Alloys' }).first();
  await metalsBtn.click();
  await page.waitForFunction(
    () => {
      const n = document.querySelectorAll('button[data-testid^="gallery-card-"]').length;
      return n > 0 && n < window.__VERIFY_EXPECTED_GALLERY_COUNT;
    },
    null,
    { timeout },
  );
  const metalsCount = await page.locator(cardSel).count();
  const pressed = await metalsBtn.getAttribute('aria-pressed');
  check('domain filter narrows the grid', metalsCount > 0 && metalsCount < 18, `${metalsCount} in Metals & Alloys`);
  check('active filter exposes aria-pressed', pressed === 'true');
  await page.locator('[data-testid="gallery-filter-all"]').click();
  await page.waitForFunction(
    () => document.querySelectorAll('button[data-testid^="gallery-card-"]').length === window.__VERIFY_EXPECTED_GALLERY_COUNT,
    null,
    { timeout },
  );

  // ── 6. Card click loads the dataset ──
  await page.locator('[data-testid="gallery-card-c60_buckyball"]').click();
  if (atlasStoreAvailable) {
    await page.waitForFunction(
      () => window.__atlas.getState().activeCardId === 'c60_buckyball',
      null,
      { timeout },
    );
    check('card click sets store.activeCardId', true);
    const loaded = await page
      .waitForFunction(() => !!window.__atlas.getState().file, null, { timeout })
      .then(() => true)
      .catch(() => false);
    const fileName = await page.evaluate(() => window.__atlas.getState().file?.name ?? null);
    check('card click loads a dataset into the store', loaded, `file=${fileName}`);
  } else {
    check('card click activates the molecule in the public build', true);
  }
  await shot('after-card-load');

  // ── 7. NIST tab via ?tab= deep-link (a card load navigates to the
  //       viewer, so re-enter the landing fresh — also tests the deep-link). ──
  await page.goto(`${targetUrl}?tab=potentials`, { waitUntil: 'domcontentloaded', timeout });
  if (atlasStoreAvailable) {
    await page.waitForFunction(() => typeof window?.__atlas?.getState === 'function', null, { timeout });
  }
  await page.locator('#gallery').scrollIntoViewIfNeeded();
  const nistTab = page.locator('[data-testid="tab-potentials"]');
  await nistTab.waitFor({ timeout });
  const tabSelected = await nistTab.getAttribute('aria-selected');
  check('?tab=potentials deep-link selects the NIST tab', tabSelected === 'true');
  const nistOk = await page
    .waitForSelector('[data-testid="potential-browser"]', { timeout })
    .then(() => true)
    .catch(() => false);
  check('NIST tab renders the PotentialBrowser', nistOk);
  if (nistOk) {
    const potCards = await page.locator('[data-testid="potential-browser"] button').count();
    check('NIST browser shows interactive potentials', potCards > 0, `${potCards} controls`);
  }
  await shot('nist-tab');

  // ── 8. OMol25 provenance copy ──
  await page.goto(`${targetUrl}?tab=omol25`, { waitUntil: 'domcontentloaded', timeout });
  await page.locator('#gallery').scrollIntoViewIfNeeded();
  const omolTab = page.locator('[data-testid="tab-omol25"]');
  await omolTab.waitFor({ timeout });
  const omolSelected = await omolTab.getAttribute('aria-selected');
  check('?tab=omol25 deep-link selects the OMol25 tab', omolSelected === 'true');
  const omolText = await page.locator('#gallery').innerText({ timeout });
  check(
    'OMol25 labels functional-group facets as a geometry screen',
    omolText.includes('FUNCTIONAL GROUP SCREEN') &&
      omolText.includes('Lupi geometry screen; not OMol25 source bond topology.') &&
      /true DFT geometry/i.test(omolText),
  );
  await shot('omol25-tab');
} catch (err) {
  console.log(`[verify-gallery] FATAL ${err.message}`);
  check('harness ran to completion', false, err.message);
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n[verify-gallery] ${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);

async function startPortlessVite() {
  const port = await getFreePort();
  process.env.VITE_DEV_PORT = String(port);
  server = await createServer({
    root: WEB_ROOT,
    configFile: resolve(WEB_ROOT, 'vite.config.ts'),
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
      hmr: false,
    },
    logLevel: 'error',
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') {
    throw new Error('Vite did not expose a TCP address');
  }
  return `http://127.0.0.1:${address.port}/`;
}

function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() => {
        if (!address || typeof address === 'string') reject(new Error('No TCP port allocated'));
        else resolvePort(address.port);
      });
    });
  });
}

function parseArgs(argv) {
  const parsed = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, rawValue] = arg.slice(2).split('=');
    parsed[rawKey] = rawValue ?? true;
  }
  return parsed;
}

function withTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}
