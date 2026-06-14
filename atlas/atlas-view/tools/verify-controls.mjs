#!/usr/bin/env node
/**
 * Portless Controls verification for Lupi.
 *
 * By default this script starts the Vite app in-process on an OS-assigned
 * localhost port, drives the real viewer with Playwright, then closes both the
 * browser and server. Set VERIFY_URL to target an existing dev/preview/Vercel
 * URL instead.
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const WEB_ROOT = resolve(REPO_ROOT, 'apps/web');
const ARTIFACTS = resolve(REPO_ROOT, '.verify-artifacts', 'controls');
const requireFromWeb = createRequire(resolve(WEB_ROOT, 'package.json'));
const { createServer } = await import(pathToFileURL(requireFromWeb.resolve('vite')).href);

const args = parseArgs(process.argv.slice(2));
const timeout = Number(args.timeout ?? process.env.VERIFY_TIMEOUT ?? 45000);
const headless = args.headless ?? !process.stdout.isTTY;
const writeScreenshot = !args['no-screenshot'];
const disableWebGpu = args.webgpu ? false : true;
const externalUrl = process.env.VERIFY_URL || args.url;

if (!existsSync(ARTIFACTS)) mkdirSync(ARTIFACTS, { recursive: true });

let server = null;
let browser = null;
const failures = [];
const report = {
  generatedAt: new Date().toISOString(),
  url: '',
  states: [],
  resize: null,
  collapseExpand: null,
  consoleWarnings: [],
  pageErrors: [],
  screenshotPath: null,
};

try {
  const baseUrl = externalUrl || await startPortlessVite();
  report.url = withTrailingSlash(baseUrl);
  console.log(`[verify-controls] -> ${report.url}`);

  browser = await chromium.launch({
    headless,
    args: disableWebGpu ? ['--disable-webgpu'] : [
      '--enable-unsafe-webgpu',
      '--enable-features=Vulkan,WebGPU',
      '--use-vulkan',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() !== 'warning' && msg.type() !== 'error') return;
    if (text.includes('[DEPRECATED] Default export is deprecated')) return;
    if (text.includes('THREE.Clock: This module has been deprecated')) return;
    if (text.includes('GPU stall due to ReadPixels')) return;
    if (text.includes('No WebGPU adapter found')) return;
    if (text.includes('No available adapters')) return;
    if (text.includes('powerPreference option is currently ignored')) return;
    if (text.includes('WebGPU init exceeded')) return;
    report.consoleWarnings.push({ type: msg.type(), text });
    console.log(`[PAGE ${msg.type()}] ${text}`);
  });
  page.on('pageerror', (err) => {
    report.pageErrors.push(err.message);
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  const viewerUrl = new URL(report.url);
  viewerUrl.searchParams.set('load', '/gallery/curated/c60_buckyball.xyz');
  await page.goto(viewerUrl.toString(), { waitUntil: 'domcontentloaded', timeout });
  await page.getByRole('button', { name: /^Controls$/ }).waitFor({ state: 'visible', timeout });
  await page.getByRole('button', { name: /^Controls$/ }).click();

  const panel = page.getByRole('region', { name: /Controls tool panel/i });
  await panel.waitFor({ state: 'visible', timeout: 10000 });
  const drawer = page.getByTestId('viewer-controls-drawer');
  await drawer.waitFor({ state: 'visible', timeout: 10000 });

  assertEqual(await drawer.locator('[role="group"][aria-label="Viewer control modes"]').count(), 1, 'control mode group');
  await captureMode(page, panel, drawer, 'look', 'Look', [/GRADE/i, /ATOMS/i]);
  await captureMode(page, panel, drawer, 'surface', 'Surface', [/SHAPE/i, /MATERIAL/i]);
  await captureMode(page, panel, drawer, 'world', 'World', [/BACKDROP/i, /SCENE/i]);
  await captureMode(page, panel, drawer, 'export', 'Export', [/PNG/i, /GLB/i, /MP4/i]);

  report.resize = await resizeViaPointerHandlers(page);
  if (!report.resize.changed) failures.push('resize did not change panel size');

  await panel.getByRole('button', { name: /^Collapse$/ }).click();
  const chip = page.getByRole('button', { name: /Expand Controls panel/i });
  await chip.waitFor({ state: 'visible', timeout: 5000 });
  const chipText = await chip.innerText();
  await chip.click();
  await panel.waitFor({ state: 'visible', timeout: 5000 });
  report.collapseExpand = {
    chipText,
    visibleAgain: await panel.isVisible(),
  };
  if (!report.collapseExpand.visibleAgain) failures.push('collapsed panel did not expand again');

  if (writeScreenshot) {
    const path = join(ARTIFACTS, `${stamp()}-controls.png`);
    await page.screenshot({ path, fullPage: false, timeout: 30000 });
    report.screenshotPath = path;
    console.log(`[verify-controls] screenshot: ${path}`);
  }
} catch (err) {
  failures.push(err?.message ?? String(err));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) await server.close().catch(() => {});
}

const reportPath = join(ARTIFACTS, `${stamp()}-report.json`);
writeFileSync(reportPath, JSON.stringify({ ...report, failures }, null, 2) + '\n');
console.log(`[verify-controls] report: ${reportPath}`);

if (failures.length || report.pageErrors.length) {
  for (const failure of failures) console.log(`[verify-controls] FAIL ${failure}`);
  for (const error of report.pageErrors) console.log(`[verify-controls] PAGE ERROR ${error}`);
  process.exit(1);
}

console.log(`[verify-controls] PASS ${report.states.length} control states checked`);

async function startPortlessVite() {
  const port = await getFreePort();
  process.env.VITE_DEV_PORT = String(port);
  server = await createServer({
    root: WEB_ROOT,
    configFile: resolve(WEB_ROOT, 'vite.config.ts'),
    server: {
      host: '127.0.0.1',
      port,
      strictPort: false,
      hmr: false,
    },
    logLevel: 'warn',
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') {
    throw new Error('Vite did not expose a TCP address');
  }
  return `http://127.0.0.1:${address.port}/`;
}

async function captureMode(page, panel, drawer, id, label, requiredPatterns) {
  if (label !== 'Look') {
    await drawer.getByRole('button', { name: label }).click();
    await page.waitForTimeout(120);
  }
  const text = await drawer.innerText();
  const closeLabels = await panel.locator('button').evaluateAll((buttons) => buttons
    .map((button) => button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent?.trim() || '')
    .filter((value) => /Close/i.test(value)));
  const activeModes = await drawer.locator('button[aria-pressed="true"]').evaluateAll((buttons) => buttons
    .map((button) => button.getAttribute('aria-label') || button.textContent?.trim() || ''));

  report.states.push({
    id,
    closeLabels,
    activeModes,
    textHead: text.slice(0, 360),
  });

  assertEqual(closeLabels.length, 1, `${label} close affordance count`);
  if (!activeModes.includes(label)) failures.push(`${label} tab is not marked active`);
  for (const pattern of requiredPatterns) {
    if (!pattern.test(text)) failures.push(`${label} drawer missing ${pattern}`);
  }
}

async function resizeViaPointerHandlers(page) {
  return await page.evaluate(async () => {
    const rect = (value) => ({
      x: Math.round(value.x),
      y: Math.round(value.y),
      width: Math.round(value.width),
      height: Math.round(value.height),
    });
    const panel = document.querySelector('[aria-label="Controls tool panel"]');
    const grip = panel?.querySelector('[title="Resize"]');
    if (!panel || !grip) throw new Error('panel/grip missing');
    const before = panel.getBoundingClientRect();
    const g = grip.getBoundingClientRect();
    grip.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: g.right - 2,
      clientY: g.bottom - 2,
    }));
    window.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: g.right + 80,
      clientY: g.bottom - 64,
    }));
    window.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: g.right + 80,
      clientY: g.bottom - 64,
    }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    const after = panel.getBoundingClientRect();
    return {
      before: rect(before),
      after: rect(after),
      changed: Math.abs(after.width - before.width) > 20 || Math.abs(after.height - before.height) > 20,
    };
  });
}

async function getFreePort() {
  return await new Promise((resolvePort, reject) => {
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

function assertEqual(actual, expected, label) {
  if (actual !== expected) failures.push(`${label}: expected ${expected}, got ${actual}`);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (arg === '--') continue;
    if (!arg.startsWith('--')) continue;
    const [key, raw] = arg.slice(2).split('=');
    out[key] = raw ?? true;
  }
  return out;
}
