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
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCanvas, loadImage } from 'canvas';
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
const writeVisualReport = writeScreenshot && args['visual-report'] !== 'false';
const disableWebGpu = args.webgpu ? false : true;
const externalUrl = process.env.VERIFY_URL || args.url;
const profile = args.profile === 'mobile' ? 'mobile' : 'desktop';
const mobileProfile = profile === 'mobile';
const viewport = parseViewport(args.viewport, mobileProfile ? '390x844' : '1440x900');
const runId = `${stamp()}-${profile}`;

if (!existsSync(ARTIFACTS)) mkdirSync(ARTIFACTS, { recursive: true });

let server = null;
let browser = null;
const failures = [];
const report = {
  generatedAt: new Date().toISOString(),
  profile,
  viewport,
  url: '',
  states: [],
  resize: null,
  collapseExpand: null,
  shareLink: null,
  viewerProbe: null,
  visualArtifacts: [],
  visualReportPath: null,
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
    viewport,
    deviceScaleFactor: 1,
    isMobile: mobileProfile,
    hasTouch: mobileProfile,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__lupiCopiedText = String(text);
        },
      },
    });
  });

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

  const viewerUrl = controlsSmokeUrl(report.url, Boolean(externalUrl));
  await page.goto(viewerUrl.toString(), { waitUntil: 'domcontentloaded', timeout });
  await page.getByRole('button', { name: /^Controls$/ }).waitFor({ state: 'visible', timeout });
  await page.waitForTimeout(1200);
  if (writeScreenshot) {
    report.viewerProbe = await captureViewerProbe(page, 'viewer-initial');
    if (!report.viewerProbe?.first?.stats?.nonBlank) failures.push('viewer canvas crop looked blank');
    if (!report.viewerProbe?.motion?.motionLikely) failures.push('viewer canvas did not visibly respond to camera drag');
  }
  await page.getByRole('button', { name: /^Controls$/ }).click({ noWaitAfter: true });

  const drawer = page.getByTestId('viewer-controls-drawer');
  await drawer.waitFor({ state: 'visible', timeout: 10000 });
  const panel = mobileProfile ? drawer : page.getByRole('region', { name: /Controls tool panel/i });
  await panel.waitFor({ state: 'visible', timeout: 10000 });

  assertEqual(await drawer.locator('[role="group"][aria-label="Viewer control modes"]').count(), 1, 'control mode group');
  await captureMode(page, panel, drawer, 'look', 'Look', [/GRADE/i, /ATOMS/i], [/Botanical/i]);
  report.shareLink = await copyLookLink(page);
  if (!report.shareLink.hasState) failures.push('copy look link did not include encoded view state');
  await captureMode(page, panel, drawer, 'surface', 'Surface', [/SHAPE/i, /MATERIAL/i], [/\bCOLOR\b/i, /\bUNIFORM\b/i]);
  await captureMode(page, panel, drawer, 'world', 'World', [/BACKDROP/i, /SCENE/i], [/\bCOLOR\b/i, /\bUNIFORM\b/i]);
  await captureMode(page, panel, drawer, 'export', 'Export', [/PNG/i, /GLB/i, /MP4/i]);

  if (!mobileProfile) {
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
  }

  if (writeScreenshot) {
    const path = join(ARTIFACTS, `${runId}-controls-final.png`);
    await page.screenshot({ path, fullPage: false, timeout: 30000 });
    report.screenshotPath = path;
    report.visualArtifacts.push({
      kind: 'full-page',
      label: 'controls-final',
      path,
    });
    console.log(`[verify-controls] screenshot: ${path}`);
  }
} catch (err) {
  failures.push(err?.message ?? String(err));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) await server.close().catch(() => {});
}

if (writeVisualReport && report.visualArtifacts.length) {
  report.visualReportPath = join(ARTIFACTS, `${runId}-visual.html`);
  writeFileSync(report.visualReportPath, renderVisualReport(report, failures), 'utf8');
  console.log(`[verify-controls] visual report: ${report.visualReportPath}`);
}

const reportPath = join(ARTIFACTS, `${runId}-report.json`);
writeFileSync(reportPath, JSON.stringify({ ...report, failures }, null, 2) + '\n');
console.log(`[verify-controls] report: ${reportPath}`);

if (failures.length || report.pageErrors.length) {
  for (const failure of failures) console.log(`[verify-controls] FAIL ${failure}`);
  for (const error of report.pageErrors) console.log(`[verify-controls] PAGE ERROR ${error}`);
  process.exit(1);
}

  console.log(`[verify-controls] PASS ${profile} ${report.states.length} control states checked`);

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

async function captureMode(page, panel, drawer, id, label, requiredPatterns, forbiddenPatterns = []) {
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

  const state = {
    id,
    closeLabels,
    activeModes,
    textHead: text.slice(0, 360),
    screenshotPath: null,
  };

  if (writeScreenshot) {
    const path = join(ARTIFACTS, `${runId}-mode-${safeLabel(id)}.png`);
    await page.screenshot({ path, fullPage: false, timeout: 30000 });
    state.screenshotPath = path;
    report.visualArtifacts.push({
      kind: 'control-mode',
      label,
      path,
      activeModes,
      textHead: state.textHead,
    });
  }

  report.states.push(state);

  assertEqual(closeLabels.length, 1, `${label} close affordance count`);
  if (!activeModes.includes(label)) failures.push(`${label} tab is not marked active`);
  for (const pattern of requiredPatterns) {
    if (!pattern.test(text)) failures.push(`${label} drawer missing ${pattern}`);
  }
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) failures.push(`${label} drawer contains duplicate/conflicting ${pattern}`);
  }
}

async function captureViewerProbe(page, label) {
  const firstPath = join(ARTIFACTS, `${runId}-${safeLabel(label)}.png`);
  const laterPath = join(ARTIFACTS, `${runId}-${safeLabel(label)}-later.png`);
  const clip = await viewerClip(page);
  await page.screenshot({ path: firstPath, clip, timeout: 30000 });
  await dragViewerCamera(page, clip);
  await page.waitForTimeout(450);
  await page.screenshot({ path: laterPath, clip, timeout: 30000 });

  const firstStats = await imageStats(firstPath);
  const laterStats = await imageStats(laterPath);
  const motion = await imageDiffStats(firstPath, laterPath);
  const probe = {
    clip,
    first: { path: firstPath, stats: firstStats },
    later: { path: laterPath, stats: laterStats },
    motion,
  };

  report.visualArtifacts.push({
    kind: 'viewer-canvas',
    label,
    path: firstPath,
    stats: firstStats,
  }, {
    kind: 'viewer-canvas',
    label: `${label} later`,
    path: laterPath,
    stats: laterStats,
    motion,
  });

  return probe;
}

async function dragViewerCamera(page, clip) {
  const start = {
    x: Math.round(clip.x + clip.width * 0.48),
    y: Math.round(clip.y + clip.height * 0.5),
  };
  const end = {
    x: Math.round(start.x + Math.min(220, clip.width * 0.18)),
    y: Math.round(start.y - Math.min(90, clip.height * 0.1)),
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}

async function viewerClip(page) {
  const rect = await page.evaluate(() => {
    const canvas = document.querySelector('.lupi-main-viewport canvas') ?? document.querySelector('canvas');
    if (!canvas) throw new Error('viewer canvas missing');
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const c = canvas.getBoundingClientRect();
    const panel = document.querySelector('[aria-label="Controls tool panel"]');
    const p = panel?.getBoundingClientRect();
    const right = p && p.left > c.left + 180 ? Math.min(p.left - 12, c.right) : c.right;
    return {
      x: Math.max(0, c.left),
      y: Math.max(0, c.top),
      width: Math.max(64, right - c.left),
      height: Math.max(64, c.bottom - c.top),
      viewport,
    };
  });
  const x = Math.floor(Math.max(0, rect.x));
  const y = Math.floor(Math.max(0, rect.y));
  const width = Math.floor(Math.min(rect.width, rect.viewport.width - x));
  const height = Math.floor(Math.min(rect.height, rect.viewport.height - y));
  return { x, y, width, height };
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

async function copyLookLink(page) {
  await page.getByRole('button', { name: /Copy look link/i }).click();
  await page.waitForFunction(() => Boolean(window.__lupiCopiedText), null, { timeout: 5000 });
  const url = await page.evaluate(() => window.__lupiCopiedText);
  return {
    hasState: /\bs=/.test(url),
    head: url.slice(0, 420),
  };
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

function safeLabel(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'artifact';
}

async function imageStats(path) {
  const image = await loadImage(path);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);
  const step = Math.max(1, Math.floor(Math.sqrt((image.width * image.height) / 12000)));
  let samples = 0;
  let nonBlankSamples = 0;
  let lumaSum = 0;
  const buckets = new Set();
  for (let y = 0; y < image.height; y += step) {
    for (let x = 0; x < image.width; x += step) {
      const index = (y * image.width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      const luma = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
      samples += 1;
      lumaSum += luma;
      if (a > 12 && luma > 4) nonBlankSamples += 1;
      buckets.add(`${r >> 5}:${g >> 5}:${b >> 5}`);
    }
  }
  const nonBlankRatio = samples ? nonBlankSamples / samples : 0;
  const meanLuma = samples ? lumaSum / samples : 0;
  return {
    width: image.width,
    height: image.height,
    samples,
    nonBlankRatio: Number(nonBlankRatio.toFixed(4)),
    meanLuma: Number(meanLuma.toFixed(2)),
    colorBuckets: buckets.size,
    nonBlank: nonBlankRatio > 0.01 && buckets.size > 3,
  };
}

async function imageDiffStats(firstPath, laterPath) {
  const first = await loadImage(firstPath);
  const later = await loadImage(laterPath);
  const width = Math.min(first.width, later.width);
  const height = Math.min(first.height, later.height);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(first, 0, 0, width, height);
  const a = ctx.getImageData(0, 0, width, height).data;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(later, 0, 0, width, height);
  const b = ctx.getImageData(0, 0, width, height).data;
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 12000)));
  let samples = 0;
  let changed = 0;
  let deltaSum = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const delta = (
        Math.abs(a[index] - b[index]) +
        Math.abs(a[index + 1] - b[index + 1]) +
        Math.abs(a[index + 2] - b[index + 2])
      ) / 3;
      samples += 1;
      deltaSum += delta;
      if (delta > 8) changed += 1;
    }
  }
  const changedRatio = samples ? changed / samples : 0;
  const meanDelta = samples ? deltaSum / samples : 0;
  return {
    changedRatio: Number(changedRatio.toFixed(4)),
    meanDelta: Number(meanDelta.toFixed(2)),
    motionLikely: changedRatio > 0.001 || meanDelta > 0.35,
  };
}

function renderVisualReport(currentReport, currentFailures) {
  const rows = currentReport.visualArtifacts.map((artifact) => {
    const image = escapeHtml(toArtifactHref(artifact.path));
    const stats = artifact.stats
      ? `<div class="meta">nonblank ${artifact.stats.nonBlankRatio} | luma ${artifact.stats.meanLuma} | buckets ${artifact.stats.colorBuckets}</div>`
      : '';
    const motion = artifact.motion
      ? `<div class="meta">motion delta ${artifact.motion.meanDelta} | changed ${artifact.motion.changedRatio} | ${artifact.motion.motionLikely ? 'motion likely' : 'static'}</div>`
      : '';
    const text = artifact.textHead
      ? `<pre>${escapeHtml(artifact.textHead)}</pre>`
      : '';
    return `
      <figure>
        <a href="${image}"><img src="${image}" alt="${escapeHtml(artifact.label)}"></a>
        <figcaption>
          <strong>${escapeHtml(artifact.label)}</strong>
          <span>${escapeHtml(artifact.kind)}</span>
          ${stats}
          ${motion}
          ${text}
        </figcaption>
      </figure>
    `;
  }).join('\n');

  const failuresHtml = currentFailures.length
    ? `<section class="fail"><h2>Failures</h2><ul>${currentFailures.map(failure => `<li>${escapeHtml(failure)}</li>`).join('')}</ul></section>`
    : '<section class="pass"><h2>No verifier failures</h2></section>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lupi Controls Visual Report ${escapeHtml(runId)}</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #080b10; color: #e5edf5; }
    body { margin: 0; padding: 24px; }
    header { display: grid; gap: 8px; margin-bottom: 20px; }
    h1 { margin: 0; font-size: 22px; letter-spacing: 0; }
    h2 { margin: 0; font-size: 15px; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .meta { color: #9fb0c2; font-size: 12px; line-height: 1.45; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; }
    figure { margin: 0; border: 1px solid rgba(148, 163, 184, 0.28); border-radius: 8px; overflow: hidden; background: #111722; }
    img { display: block; width: 100%; height: auto; background: #05070b; }
    figcaption { display: grid; gap: 4px; padding: 10px 12px 12px; }
    figcaption span { color: #7de9ff; font-size: 12px; }
    pre { max-height: 140px; overflow: auto; white-space: pre-wrap; margin: 6px 0 0; color: #cbd5e1; font-size: 11px; }
    section { margin-bottom: 18px; padding: 12px; border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.24); }
    .pass { border-color: rgba(52, 211, 153, 0.45); color: #a7f3d0; }
    .fail { border-color: rgba(251, 113, 133, 0.55); color: #fecdd3; }
  </style>
</head>
<body>
  <header>
    <h1>Lupi Controls Visual Report</h1>
    <div class="meta">Run ${escapeHtml(runId)} | ${escapeHtml(currentReport.profile)} ${currentReport.viewport.width}x${currentReport.viewport.height} | ${escapeHtml(currentReport.generatedAt)} | ${escapeHtml(currentReport.url)}</div>
    <div class="meta">Share link state: ${currentReport.shareLink?.hasState ? 'present' : 'missing'}</div>
  </header>
  ${failuresHtml}
  <main class="grid">
    ${rows}
  </main>
</body>
</html>
`;
}

function toArtifactHref(path) {
  return relative(ARTIFACTS, path).replace(/\\/g, '/') || basename(path);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function withTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function controlsSmokeUrl(baseUrl, external) {
  const viewerUrl = new URL(baseUrl);
  if (viewerUrl.searchParams.has('load') || viewerUrl.searchParams.has('sim')) return viewerUrl;

  if (external) {
    viewerUrl.searchParams.set('sim', 'c60_buckyball');
  } else {
    viewerUrl.searchParams.set('load', '/gallery/curated/c60_buckyball.xyz');
  }
  return viewerUrl;
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

function parseViewport(value, fallback) {
  const raw = String(value ?? fallback);
  const match = raw.match(/^(\d{3,5})x(\d{3,5})$/i);
  if (!match) throw new Error(`Invalid viewport "${raw}". Use WIDTHxHEIGHT, for example 1440x900.`);
  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}
