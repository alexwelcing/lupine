#!/usr/bin/env node
/**
 * verify-configurator.mjs — drive the home-page molecule configurator end-to-end
 * with Playwright and assert the assembled MCP request actually applies to the
 * viewer. Companion to verify-gallery.mjs / verify-exports.mjs.
 *
 * Flow exercised (the real if-this-then-that UI, no chatbot):
 *   hero "type a molecule" → openConfigurator(seed)
 *   → pick a catalog molecule → Color → Bonds → Size → Review
 *   → assert the Review pane shows the lupi.set_viewer MCP JSON
 *   → Launch → molecule loads (?sim=) → assert the store reflects the chosen
 *     colorScheme / atomScale / showBonds / bondTolerance.
 *
 * Usage:  node tools/verify-configurator.mjs
 *         VERIFY_URL=http://localhost:5180/ node tools/verify-configurator.mjs
 * Exit 0 = the full loop applied the configured view; 1 = any step failed.
 */
import { chromium } from 'playwright';

const URL = process.env.VERIFY_URL ?? 'http://localhost:5180/';
const timeout = Number(process.env.VERIFY_TIMEOUT ?? 60000);

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--use-vulkan'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log(`  [page error] ${e.message}`));

const steps = [];
const record = (ok, label, detail) => {
  steps.push({ ok, label });
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

try {
  console.log(`[verify-configurator] → ${URL}\n`);

  // ── Boot to the landing page ──
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => typeof window?.__atlas?.getState === 'function', null, { timeout });
  record(true, 'app booted (store ready)');

  // ── 1. Hero search opens the configurator, seeded ──
  await page.fill('input[aria-label="Type a molecule to configure and view"]', 'copper');
  await page.getByRole('button', { name: 'Build a view' }).first().click();
  const dialog = page.locator('[role="dialog"][aria-label="Build a molecule view"]');
  await dialog.waitFor({ timeout });
  const seed = await page.evaluate(() => window.__atlas.getState().configuratorSeed);
  record(seed === 'copper', 'hero search opened configurator with seed', `seed="${seed}"`);

  // ── 2. Pick a catalog molecule (first matching result) ──
  const pick = dialog.locator('button', { hasText: /atoms/ }).first();
  const pickName = (await pick.innerText()).split('\n')[0];
  await pick.click();
  await page.getByRole('button', { name: /^Configure / }).click();
  record(true, 'picked molecule + advanced', pickName);

  // ── 3. Color → Botanical ──
  await dialog.getByRole('button', { name: /Botanical/ }).click();
  await dialog.getByRole('button', { name: /Next/ }).click();
  // ── 4. Bonds → Tight ──
  await dialog.getByRole('button', { name: /Tight/ }).click();
  await dialog.getByRole('button', { name: /Next/ }).click();
  // ── 5. Size → Large ──
  await dialog.getByRole('button', { name: /Large/ }).click();
  await dialog.getByRole('button', { name: /Next/ }).click();
  record(true, 'configured Color=Botanical · Bonds=Tight · Size=Large');

  // ── 6. Review pane shows the real MCP request ──
  const reviewText = await dialog.locator('pre').innerText();
  const showsMcp =
    reviewText.includes('lupi.generate_molecule') &&
    reviewText.includes('lupi.set_viewer') &&
    reviewText.includes('"colorScheme": "botanical"') &&
    reviewText.includes('"bondTolerance": 0.15') &&
    reviewText.includes('"atomScale": 1.5');
  record(showsMcp, 'Review pane renders the assembled MCP JSON',
    showsMcp ? 'generate_molecule + set_viewer with chosen args' : `unexpected: ${reviewText.slice(0, 120)}`);

  // ── 7. Launch → molecule loads → store reflects the configured view ──
  await dialog.getByRole('button', { name: /Launch in viewer/ }).click();
  await page.waitForFunction(() => !!window.__atlas.getState().file, null, { timeout });
  await page.waitForFunction(
    () => {
      const s = window.__atlas.getState();
      return s.colorScheme === 'botanical' && s.atomScale === 1.5 && s.showBonds === true && Math.abs(s.bondTolerance - 0.15) < 1e-6;
    },
    null,
    { timeout },
  ).catch(() => {});
  const after = await page.evaluate(() => {
    const s = window.__atlas.getState();
    return { fileName: s.file?.name ?? null, colorScheme: s.colorScheme, atomScale: s.atomScale, showBonds: s.showBonds, bondTolerance: s.bondTolerance, open: s.configuratorOpen };
  });
  const applied =
    !!after.fileName &&
    after.colorScheme === 'botanical' &&
    after.atomScale === 1.5 &&
    after.showBonds === true &&
    Math.abs(after.bondTolerance - 0.15) < 1e-6;
  record(applied, 'Launch loaded molecule + applied the MCP view', JSON.stringify(after));
  record(after.open === false, 'configurator closed after launch');
} catch (err) {
  record(false, 'harness error', err.message);
} finally {
  await browser.close();
}

const failed = steps.filter((s) => !s.ok);
console.log(`\n[verify-configurator] ${steps.length - failed.length}/${steps.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
