#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const MOTION_MANIFEST = JSON.parse(readFileSync(new URL('./lupi-motion-loops.json', import.meta.url), 'utf8'));

function motionLoopFile(loop, tier) {
  return `${loop.output_base}${tier.file_suffix ?? ''}.${tier.format ?? 'mp4'}`;
}

function manifestPresets(tierId = MOTION_MANIFEST.runtime_tier ?? 'quality') {
  const tier = MOTION_MANIFEST.tiers.find(candidate => candidate.id === tierId) ?? MOTION_MANIFEST.tiers[0];
  return MOTION_MANIFEST.loops.map(loop => ({
    id: loop.viewer_preset_id,
    file: motionLoopFile(loop, tier),
    tier: tier.id,
  }));
}

const DEFAULT_PRESETS = manifestPresets();

function parseArgs(argv) {
  const args = {
    url: 'http://127.0.0.1:3000',
    outDir: path.resolve('.verify-artifacts', 'lupi-video-qa'),
    presets: DEFAULT_PRESETS.map(preset => preset.id),
    viewportWidth: 1280,
    viewportHeight: 800,
    settleMs: 1200,
    laterMs: 3200,
    tier: MOTION_MANIFEST.runtime_tier ?? 'quality',
    viewportExplicit: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--url') {
      args.url = next;
      i += 1;
    } else if (arg === '--out-dir') {
      args.outDir = path.resolve(next);
      i += 1;
    } else if (arg === '--preset') {
      args.presets = next.split(',').map(item => item.trim()).filter(Boolean);
      i += 1;
    } else if (arg === '--tier') {
      args.tier = next;
      i += 1;
    } else if (arg === '--viewport') {
      const [width, height] = next.split('x').map(value => Number.parseInt(value, 10));
      args.viewportWidth = width;
      args.viewportHeight = height;
      args.viewportExplicit = true;
      i += 1;
    } else if (arg === '--settle-ms') {
      args.settleMs = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === '--later-ms') {
      args.laterMs = Number.parseInt(next, 10);
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.viewportExplicit && args.tier !== (MOTION_MANIFEST.runtime_tier ?? 'quality')) {
    const tier = MOTION_MANIFEST.tiers.find(candidate => candidate.id === args.tier);
    if (tier) {
      args.viewportWidth = Math.min(args.viewportWidth, tier.width);
    }
  }

  return args;
}

function encodeState(state) {
  return Buffer.from(JSON.stringify(state), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function presetUrl(baseUrl, presetId) {
  const url = new URL(baseUrl);
  url.searchParams.set('sim', 'c60_buckyball');
  url.searchParams.set('s', encodeState({ bg: presetId }));
  return url.toString();
}

async function installVideoProbe(page) {
  await page.addInitScript(() => {
    window.__lupiVideos = [];
    window.__lupiVideoPlayCalls = [];

    const originalCreateElement = Document.prototype.createElement;
    Document.prototype.createElement = function createElement(tagName, options) {
      const element = originalCreateElement.call(this, tagName, options);
      if (String(tagName).toLowerCase() === 'video') {
        window.__lupiVideos.push(element);
      }
      return element;
    };

    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function play(...playArgs) {
      window.__lupiVideoPlayCalls.push({
        src: this.currentSrc || this.src,
        muted: this.muted,
        loop: this.loop,
        preload: this.preload,
        time: Date.now(),
      });
      return originalPlay.apply(this, playArgs);
    };
  });
}

async function inspectPage(page, expectedFile) {
  return page.evaluate((fileName) => {
    const canvas = document.querySelector('canvas');
    const rect = canvas?.getBoundingClientRect();
    const videos = (window.__lupiVideos ?? [])
      .filter(video => video.currentSrc || video.src)
      .map(video => ({
        src: video.currentSrc || video.src,
        currentTime: Number(video.currentTime.toFixed(3)),
        duration: Number.isFinite(video.duration) ? Number(video.duration.toFixed(3)) : null,
        paused: video.paused,
        muted: video.muted,
        loop: video.loop,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      }));
    const resources = performance.getEntriesByType('resource')
      .filter(entry => entry.name.includes(fileName) || entry.name.includes('/backgrounds/'))
      .map(entry => ({
        name: entry.name,
        duration: Math.round(entry.duration),
        transferSize: entry.transferSize ?? 0,
      }));
    return {
      canvas: rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null,
      playCalls: window.__lupiVideoPlayCalls ?? [],
      videos,
      resources,
    };
  }, expectedFile);
}

async function qaPreset(browser, args, preset) {
  const page = await browser.newPage({
    viewport: { width: args.viewportWidth, height: args.viewportHeight },
    deviceScaleFactor: 1,
  });
  const consoleMessages = [];
  const failedRequests = [];
  const badResponses = [];
  page.on('console', message => consoleMessages.push(`${message.type()}: ${message.text()}`));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText ?? 'unknown' }));
  page.on('response', response => {
    if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });
  await installVideoProbe(page);

  const url = presetUrl(args.url, preset.id);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.body.innerText.includes('Buckminster'), null, { timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('canvas'), null, { timeout: 60000 });
  await page.waitForFunction(
    fileName => (window.__lupiVideoPlayCalls ?? []).some(call => call.src.includes(fileName)),
    preset.file,
    { timeout: 60000 },
  );

  await page.waitForTimeout(args.settleMs);
  const firstInspection = await inspectPage(page, preset.file);
  const firstScreenshot = path.join(args.outDir, `${preset.id}-settled.png`);
  await page.screenshot({ path: firstScreenshot, fullPage: false });

  await page.waitForTimeout(args.laterMs);
  const laterInspection = await inspectPage(page, preset.file);
  const laterScreenshot = path.join(args.outDir, `${preset.id}-later.png`);
  await page.screenshot({ path: laterScreenshot, fullPage: false });

  await page.close();
  return {
    id: preset.id,
    file: preset.file,
    url,
    firstScreenshot,
    laterScreenshot,
    firstInspection,
    laterInspection,
    failedRequests,
    badResponses,
    consoleMessages: consoleMessages.slice(-20),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const defaultPresets = manifestPresets(args.tier);
  await mkdir(args.outDir, { recursive: true });
  const selected = defaultPresets.filter(preset => args.presets.includes(preset.id));
  const missing = args.presets.filter(presetId => !defaultPresets.some(preset => preset.id === presetId));
  if (missing.length) throw new Error(`Unknown preset(s): ${missing.join(', ')}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const results = [];
    for (const preset of selected) {
      results.push(await qaPreset(browser, args, preset));
    }
    const reportPath = path.join(args.outDir, 'report.json');
    await writeFile(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2) + '\n');
    console.log(JSON.stringify({ reportPath, results }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
