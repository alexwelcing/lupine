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
 *   4. Domain filter narrows the grid and sets aria-pressed.
 *   5. Clicking a card loads its dataset (store.activeCardId + file).
 *   6. The NIST Potentials tab renders the PotentialBrowser.
 *
 * Usage:
 *   node tools/verify-gallery.mjs                 # headless, asserts
 *   node tools/verify-gallery.mjs --no-screenshot
 *
 * Requires: dev server at http://localhost:3000/, Playwright (repo devDep).
 * Exit code 0 = all checks passed, 1 = at least one failed.
 */

import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const ARTIFACTS = resolve(REPO_ROOT, '.verify-artifacts');
const URL = process.env.VERIFY_URL ?? 'http://localhost:3000/';
const args = new Set(process.argv.slice(2));
const skipShots = args.has('--no-screenshot');
const timeout = 30000;

if (!existsSync(ARTIFACTS)) mkdirSync(ARTIFACTS, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--use-vulkan'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
page.on('pageerror', (err) => console.log(`[PAGE ERROR] ${err.message}`));

const shot = async (label) => {
  if (skipShots) return;
  const p = resolve(ARTIFACTS, `${stamp}-gallery-${label}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  [shot] ${p}`);
};

try {
  console.log(`[verify-gallery] → ${URL}`);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout });

  // Store is attached to window in dev regardless of Canvas mount.
  await page.waitForFunction(() => typeof window?.__atlas?.getState === 'function', null, { timeout });

  // The section is IntersectionObserver-gated — scroll it into view.
  await page.locator('#gallery').scrollIntoViewIfNeeded();
  await page.waitForSelector('[data-testid="gallery"]', { timeout });

  // ── 1. Curated card set renders ──
  const cardSel = 'button[data-testid^="gallery-card-"]';
  await page.waitForSelector(cardSel, { timeout });
  const cardCount = await page.locator(cardSel).count();
  check('curated card set renders', cardCount === 18, `${cardCount} cards (expected 18)`);
  const hasKnown = await page.locator('[data-testid="gallery-card-c60_buckyball"]').count();
  check('known curated card present (c60_buckyball)', hasKnown === 1);
  await shot('grid');

  // ── 2. Search filters the grid ──
  const searchBox = page.locator('[data-testid="gallery-search"]');
  await searchBox.fill('graphene');
  await page.waitForFunction(
    () => {
      const n = document.querySelectorAll('button[data-testid^="gallery-card-"]').length;
      return n > 0 && n < 18;
    },
    null,
    { timeout },
  );
  const searched = await page.locator(cardSel).count();
  const grapheneVisible = await page.locator('[data-testid="gallery-card-graphene_ribbon"]').count();
  check('search narrows the grid', searched > 0 && searched < 18, `${searched} match "graphene"`);
  check('search matches the expected card', grapheneVisible === 1);
  await shot('search');

  // ── 3. No-match search → empty state, then reset ──
  await searchBox.fill('zzz-no-such-simulation-xyz');
  await page.waitForSelector('[data-testid="gallery-empty"]', { timeout });
  check('no-match search shows empty state', true);
  await shot('empty');
  await page.locator('[data-testid="gallery-empty-reset"]').click();
  await page.waitForFunction(
    () => document.querySelectorAll('button[data-testid^="gallery-card-"]').length === 18,
    null,
    { timeout },
  );
  const afterReset = await page.locator(cardSel).count();
  check('reset restores the full grid', afterReset === 18, `${afterReset} cards`);

  // ── 4. Domain filter ──
  const metalsBtn = page.locator('button[aria-pressed]', { hasText: 'Metals & Alloys' }).first();
  await metalsBtn.click();
  await page.waitForFunction(
    () => {
      const n = document.querySelectorAll('button[data-testid^="gallery-card-"]').length;
      return n > 0 && n < 18;
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
    () => document.querySelectorAll('button[data-testid^="gallery-card-"]').length === 18,
    null,
    { timeout },
  );

  // ── 5. Card click loads the dataset ──
  await page.locator('[data-testid="gallery-card-c60_buckyball"]').click();
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
  await shot('after-card-load');

  // ── 6. NIST tab via ?tab= deep-link (a card load navigates to the
  //       viewer, so re-enter the landing fresh — also tests the deep-link). ──
  await page.goto(`${URL}?tab=potentials`, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => typeof window?.__atlas?.getState === 'function', null, { timeout });
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
} catch (err) {
  console.log(`[verify-gallery] FATAL ${err.message}`);
  check('harness ran to completion', false, err.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n[verify-gallery] ${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
