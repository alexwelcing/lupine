#!/usr/bin/env node
/**
 * Portless Study Lens verification for Lupi.
 *
 * Starts the Vite app on an OS-assigned localhost port unless VERIFY_URL or
 * --url is provided, loads aspirin, opens the in-view education panel, and
 * verifies that the export drawer can generate a printable study sheet.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const WEB_ROOT = resolve(REPO_ROOT, 'apps/web');
const ARTIFACTS = resolve(REPO_ROOT, '.verify-artifacts', 'study-lens');
const requireFromWeb = createRequire(resolve(WEB_ROOT, 'package.json'));
const { createServer } = await import(pathToFileURL(requireFromWeb.resolve('vite')).href);

const args = parseArgs(process.argv.slice(2));
const timeout = Number(args.timeout ?? process.env.VERIFY_TIMEOUT ?? 45000);
const externalUrl = process.env.VERIFY_URL || args.url;
const profile = args.profile === 'mobile' ? 'mobile' : 'desktop';
const mobileProfile = profile === 'mobile';
const viewport = parseViewport(args.viewport, mobileProfile ? '390x844' : '1440x900');
const skipShots = Boolean(args['no-screenshot']);
const headless = args.headful ? false : true;
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
  molecule: null,
  lensTextHead: '',
  sheetTextHead: '',
  sheetHasSnapshot: false,
  overflow: null,
  screenshots: [],
  consoleWarnings: [],
  networkErrors: [],
  pageErrors: [],
  popupErrors: [],
  visualReportPath: null,
};

try {
  const baseUrl = externalUrl || await startPortlessVite();
  report.url = studyLensUrl(baseUrl).toString();
  console.log(`[verify-study-lens] -> ${report.url}`);

  browser = await chromium.launch({
    headless,
    args: ['--disable-webgpu'],
  });

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: mobileProfile,
    hasTouch: mobileProfile,
  });

  await context.addInitScript(() => {
    window.__lupiPrintCalled = false;
    window.__lupiStudySheetPopupOpened = false;
    window.__lupiStudySheetHtml = '';

    const originalOpen = window.open?.bind(window);
    if (originalOpen) {
      window.open = (...openArgs) => {
        const opened = originalOpen(...openArgs);
        if (!opened) return opened;
        window.__lupiStudySheetPopupOpened = true;

        try {
          const originalWrite = opened.document.write.bind(opened.document);
          opened.document.write = (html) => {
            window.__lupiStudySheetHtml = String(html ?? '');
            return originalWrite(html);
          };
          opened.print = () => {
            window.__lupiPrintCalled = true;
          };
        } catch {
          // Keep the export path real; the verifier will fail later if it
          // cannot observe the generated sheet.
        }
        return opened;
      };
    }
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
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const entry = { status: response.status(), url: response.url() };
    report.networkErrors.push(entry);
    console.log(`[HTTP ${entry.status}] ${entry.url}`);
  });

  await page.goto(report.url, { waitUntil: 'domcontentloaded', timeout });
  const storeAvailable = await page.waitForFunction(
    () => typeof window?.__atlas?.getState === 'function',
    null,
    { timeout: 5000 },
  ).then(() => true).catch(() => false);
  if (storeAvailable) {
    await page.waitForFunction(
      () => Boolean(window.__atlas.getState().file),
      null,
      { timeout },
    );
  }
  await page.getByTestId('study-lens-toggle').waitFor({ state: 'visible', timeout });

  if (storeAvailable) {
    report.molecule = await page.evaluate(() => {
      const state = window.__atlas.getState();
      const file = state.file;
      const frame = file?.trajectory?.frames?.[state.frame ?? 0];
      return {
        name: file?.name ?? '',
        sourceUrl: file?.sourceUrl ?? '',
        atoms: frame?.natoms ?? 0,
        frameCount: file?.trajectory?.totalFrames ?? 0,
      };
    });
  } else {
    report.molecule = {
      name: await page.locator('header').first().innerText().then(text => text.slice(0, 160)).catch(() => 'public build'),
      sourceUrl: 'public build',
      atoms: 0,
      frameCount: 0,
    };
  }
  if (storeAvailable && !/aspirin/i.test(report.molecule?.name ?? report.molecule?.sourceUrl ?? '')) {
    failures.push(`expected aspirin to load, got ${JSON.stringify(report.molecule)}`);
  }
  if (storeAvailable && (report.molecule?.atoms ?? 0) < 10) failures.push('loaded molecule has too few atoms for aspirin');

  await page.getByTestId('study-lens-toggle').click();
  const lens = page.getByTestId('study-lens-panel');
  await lens.waitFor({ state: 'visible', timeout });
  report.lensTextHead = (await lens.innerText()).slice(0, 12000);
  assertContains(report.lensTextHead, /Aspirin/i, 'study lens title');
  assertContains(report.lensTextHead, /C9H8O4/i, 'study lens formula');
  assertContains(report.lensTextHead, /Visual guide only|No source bonds/i, 'study lens honest bond provenance');
  assertNotContains(report.lensTextHead, /\binferred\b/i, 'study lens avoids unqualified inferred bonds');
  assertNotContains(report.lensTextHead, /calculating/i, 'study lens transient bond count');
  assertContains(report.lensTextHead, /Data truth/i, 'study lens data provenance');
  assertContains(report.lensTextHead, /source vs visual/i, 'study lens source-vs-visual labeling');
  assertContains(report.lensTextHead, /not source bonds|does not invent a bond count/i, 'study lens bond guardrail');
  assertContains(report.lensTextHead, /Materials lens/i, 'study lens materials curriculum');
  assertContains(report.lensTextHead, /Structure|Processing|Properties|Performance/i, 'study lens materials axes');
  assertContains(report.lensTextHead, /Materials checks/i, 'study lens materials checks');
  assertContains(report.lensTextHead, /Carboxylic Acids/i, 'study lens carboxylic-acid teaching');
  assertContains(report.lensTextHead, /Esters/i, 'study lens ester teaching');
  assertContains(report.lensTextHead, /Course frame/i, 'study lens course frame');
  assertContains(report.lensTextHead, /Acid-base first/i, 'study lens acid-base priority');
  assertContains(report.lensTextHead, /Nucleophilic acyl substitution/i, 'study lens acyl substitution priority');
  assertContains(report.lensTextHead, /Learning loop/i, 'study lens learning loop');
  assertContains(report.lensTextHead, /Practice check/i, 'study lens practice check');
  assertContains(report.lensTextHead, /Common traps/i, 'study lens common traps');
  assertContains(report.lensTextHead, /Spectroscopy checks/i, 'study lens spectroscopy checks');
  assertContains(report.lensTextHead, /Self-check/i, 'study lens self-check prompt');
  await lens.getByRole('button', { name: /Reveal check/i }).click();
  report.lensTextHead = (await lens.innerText()).slice(0, 12000);
  assertContains(report.lensTextHead, /Start with the carboxylic acid/i, 'study lens revealed practice answer');
  await shot(page, 'lens-open');

  report.overflow = await measureOverflow(page);
  if (report.overflow.hasHorizontalOverflow) {
    failures.push(`horizontal overflow ${report.overflow.scrollWidth}px > ${report.overflow.innerWidth}px`);
  }

  await page.getByRole('button', { name: /^Controls$/ }).click();
  const drawer = page.getByTestId('viewer-controls-drawer');
  await drawer.waitFor({ state: 'visible', timeout: 10000 });
  await drawer.getByRole('button', { name: /^Export$/ }).click();
  const studySheetButton = page.getByTestId('export-study-sheet');
  await studySheetButton.waitFor({ state: 'visible', timeout });
  const exportText = await drawer.innerText();
  assertContains(exportText, /C9H8O4/i, 'export drawer formula');
  assertContains(exportText, /Study sheet/i, 'export drawer study sheet action');
  assertContains(exportText, /print \/ PDF/i, 'export drawer print/PDF meta');
  await shot(page, 'export-drawer');

  const popupPromise = context.waitForEvent('page', { timeout }).catch(() => null);
  await studySheetButton.click();
  const popup = await popupPromise;
  const popupOpened = await page.waitForFunction(
    () => window.__lupiStudySheetPopupOpened === true || Boolean(window.__lupiStudySheetHtml),
    null,
    { timeout: 8000 },
  ).then(() => true).catch(() => false);
  if (!popupOpened) {
    failures.push('study sheet export did not open a printable window');
  }

  await page.waitForFunction(
    () => typeof window.__lupiStudySheetHtml === 'string' && window.__lupiStudySheetHtml.includes('Lupi study sheet'),
    null,
    { timeout },
  );
  report.sheetTextHead = await page.evaluate(() => {
    const doc = new DOMParser().parseFromString(window.__lupiStudySheetHtml, 'text/html');
    return (doc.body?.innerText ?? '').slice(0, 12000);
  });
  report.sheetHasSnapshot = await page.evaluate(() => window.__lupiStudySheetHtml.includes('data:image/png'));
  if (!report.sheetHasSnapshot) failures.push('study sheet did not embed a rendered view image');
  assertContains(report.sheetTextHead, /Aspirin/i, 'study sheet title');
  assertContains(report.sheetTextHead, /Visual guide only|No source bonds/i, 'study sheet honest bond provenance');
  assertNotContains(report.sheetTextHead, /\binferred\b/i, 'study sheet avoids unqualified inferred bonds');
  assertNotContains(report.sheetTextHead, /calculating/i, 'study sheet transient bond count');
  assertContains(report.sheetTextHead, /Current View/i, 'study sheet current view section');
  assertContains(report.sheetTextHead, /Data Provenance/i, 'study sheet data provenance');
  assertContains(report.sheetTextHead, /Materials Science Frame/i, 'study sheet materials frame');
  assertContains(report.sheetTextHead, /Materials Characterization Checks/i, 'study sheet materials checks');
  assertContains(report.sheetTextHead, /Materials Practice Checks/i, 'study sheet materials practice checks');
  assertContains(report.sheetTextHead, /not source bonds|does not invent a bond count/i, 'study sheet bond guardrail');
  assertContains(report.sheetTextHead, /University Ochem Frame/i, 'study sheet university ochem frame');
  assertContains(report.sheetTextHead, /Mechanism Priorities/i, 'study sheet mechanism priorities');
  assertContains(report.sheetTextHead, /Learning Loop/i, 'study sheet learning loop');
  assertContains(report.sheetTextHead, /Practice Checks/i, 'study sheet practice checks');
  assertContains(report.sheetTextHead, /Common Traps/i, 'study sheet common traps');
  assertContains(report.sheetTextHead, /Acid-base first/i, 'study sheet acid-base priority');
  assertContains(report.sheetTextHead, /Nucleophilic acyl substitution/i, 'study sheet acyl substitution priority');
  assertContains(report.sheetTextHead, /Carboxylic Acids/i, 'study sheet carboxylic-acid teaching');
  assertContains(report.sheetTextHead, /Esters/i, 'study sheet ester teaching');
  assertContains(report.sheetTextHead, /Self-check/i, 'study sheet self-check prompt');
  assertContains(report.sheetTextHead, /Composition/i, 'study sheet composition table');
  await page.waitForFunction(() => window.__lupiPrintCalled === true, null, { timeout: 5000 })
    .catch(() => failures.push('study sheet did not call print()'));

  if (popup) {
    popup.on('pageerror', (err) => {
      report.popupErrors.push(err.message);
      console.log(`[POPUP ERROR] ${err.message}`);
    });
    await popup.waitForTimeout(100);
    await shot(popup, 'study-sheet');
    await popup.close().catch(() => {});
  }
} catch (err) {
  failures.push(err?.message ?? String(err));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) await server.close().catch(() => {});
}

if (!skipShots && report.screenshots.length) {
  report.visualReportPath = join(ARTIFACTS, `${runId}-visual.html`);
  writeFileSync(report.visualReportPath, renderVisualReport(report, failures), 'utf8');
  console.log(`[verify-study-lens] visual report: ${report.visualReportPath}`);
}

const reportPath = join(ARTIFACTS, `${runId}-report.json`);
writeFileSync(reportPath, JSON.stringify({ ...report, failures }, null, 2) + '\n');
console.log(`[verify-study-lens] report: ${reportPath}`);

if (failures.length || report.pageErrors.length || report.popupErrors.length) {
  for (const failure of failures) console.log(`[verify-study-lens] FAIL ${failure}`);
  for (const error of report.pageErrors) console.log(`[verify-study-lens] PAGE ERROR ${error}`);
  for (const error of report.popupErrors) console.log(`[verify-study-lens] POPUP ERROR ${error}`);
  process.exit(1);
}

console.log(`[verify-study-lens] PASS ${profile}`);

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

async function shot(page, label) {
  if (skipShots) return;
  const path = join(ARTIFACTS, `${runId}-${safeLabel(label)}.png`);
  await page.screenshot({ path, fullPage: false, timeout: 30000 });
  report.screenshots.push({ label, path });
  console.log(`[verify-study-lens] screenshot: ${path}`);
}

async function measureOverflow(page) {
  return await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const innerWidth = window.innerWidth;
    const scrollWidth = Math.max(doc.scrollWidth, body?.scrollWidth ?? 0);
    const offenders = Array.from(document.querySelectorAll('body *'))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          tag: node.tagName.toLowerCase(),
          testId: node.getAttribute('data-testid') || '',
          aria: node.getAttribute('aria-label') || '',
          width: Math.round(rect.width),
          right: Math.round(rect.right),
        };
      })
      .filter(item => item.width > 0 && item.right > innerWidth + 2)
      .slice(0, 8);
    return {
      innerWidth,
      scrollWidth,
      hasHorizontalOverflow: scrollWidth > innerWidth + 2,
      offenders,
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

function assertContains(text, pattern, label) {
  if (!pattern.test(text)) failures.push(`${label} missing ${pattern}`);
}

function assertNotContains(text, pattern, label) {
  if (pattern.test(text)) failures.push(`${label} unexpectedly matched ${pattern}`);
}

function studyLensUrl(baseUrl) {
  const url = new URL(baseUrl);
  if (!url.searchParams.has('load') && !url.searchParams.has('sim')) {
    url.searchParams.set('load', '/gallery/curated/popular/aspirin.xyz');
  }
  return url;
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

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function safeLabel(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'artifact';
}

function renderVisualReport(currentReport, currentFailures) {
  const rows = currentReport.screenshots.map((artifact) => {
    const image = escapeHtml(toArtifactHref(artifact.path));
    return `
      <figure>
        <a href="${image}"><img src="${image}" alt="${escapeHtml(artifact.label)}"></a>
        <figcaption>${escapeHtml(artifact.label)}</figcaption>
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
  <title>Lupi Study Lens Visual Report ${escapeHtml(runId)}</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #080b10; color: #e5edf5; }
    body { margin: 0; padding: 24px; }
    header { display: grid; gap: 8px; margin-bottom: 20px; }
    h1 { margin: 0; font-size: 22px; letter-spacing: 0; }
    h2 { margin: 0; font-size: 15px; }
    .meta { color: #9fb0c2; font-size: 12px; line-height: 1.45; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; }
    figure { margin: 0; border: 1px solid rgba(148, 163, 184, 0.28); border-radius: 8px; overflow: hidden; background: #111722; }
    img { display: block; width: 100%; height: auto; background: #05070b; }
    figcaption { padding: 10px 12px 12px; color: #7de9ff; font-size: 12px; }
    section { margin-bottom: 18px; padding: 12px; border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.24); }
    .pass { border-color: rgba(52, 211, 153, 0.45); color: #a7f3d0; }
    .fail { border-color: rgba(251, 113, 133, 0.55); color: #fecdd3; }
  </style>
</head>
<body>
  <header>
    <h1>Lupi Study Lens Visual Report</h1>
    <div class="meta">Run ${escapeHtml(runId)} | ${escapeHtml(currentReport.profile)} ${currentReport.viewport.width}x${currentReport.viewport.height} | ${escapeHtml(currentReport.generatedAt)} | ${escapeHtml(currentReport.url)}</div>
    <div class="meta">Molecule: ${escapeHtml(currentReport.molecule?.name ?? '')} | atoms ${escapeHtml(currentReport.molecule?.atoms ?? '')}</div>
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
