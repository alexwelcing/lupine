#!/usr/bin/env node
/**
 * verify-save-view-ui.mjs — drive the real Lupi viewer UI with Playwright,
 * sign in via API key exchange, save a view, and verify the share link works.
 *
 * Usage:
 *   export LUPI_API_KEY="lupi_pk_..."
 *   export LUPI_FIREBASE_WEB_API_KEY="..."
 *   node tools/verify-save-view-ui.mjs
 *
 * Optional:
 *   VERIFY_URL=https://lupi.live/     # defaults to production
 *   VERIFY_HEADLESS=false             # show the browser
 *   VERIFY_SAMPLE="water_cluster"     # gallery sample to load
 *
 * Requires a Lupi API key (create one in the viewer: user menu → API keys).
 */

import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSaveViewVerifierCredentials } from './firebase-save-view-test-auth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const ARTIFACTS = resolve(REPO_ROOT, '.verify-artifacts');

let API_KEY = process.env.LUPI_API_KEY;
let WEB_API_KEY = process.env.LUPI_FIREBASE_WEB_API_KEY;
const PROJECT_ID = process.env.LUPI_FIREBASE_PROJECT_ID ?? 'shed-489901';
const EXCHANGE_URL = process.env.LUPI_EXCHANGE_URL
  ?? 'https://us-central1-shed-489901.cloudfunctions.net/exchangeApiKey';
const REFERRER = process.env.LUPI_SAVE_VIEW_REFERRER ?? 'https://lupi.live/';
const VERIFY_URL = (process.env.VERIFY_URL ?? 'https://lupi.live/').replace(/\/$/, '') + '/';
const SAMPLE = process.env.VERIFY_SAMPLE ?? 'water_cluster';
const HEADLESS = (process.env.VERIFY_HEADLESS ?? 'true') !== 'false';
const TIMEOUT = Number(process.env.VERIFY_TIMEOUT ?? 60_000);

if (!existsSync(ARTIFACTS)) mkdirSync(ARTIFACTS, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function request(url, options = {}) {
  const res = await fetch(url, options);
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, ok: res.ok, body };
}

async function authenticate() {
  console.log('[verify-save-view-ui] exchanging API key for custom token...');
  const exchange = await request(EXCHANGE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  assert(exchange.ok && exchange.body?.customToken, `exchange failed: ${JSON.stringify(exchange.body)}`);

  console.log('[verify-save-view-ui] exchanging custom token for ID token...');
  const signin = await request(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: REFERRER },
      body: JSON.stringify({ token: exchange.body.customToken, returnSecureToken: true }),
    },
  );
  assert(signin.ok && signin.body?.idToken, `signInWithCustomToken failed: ${JSON.stringify(signin.body)}`);
  const uid = signin.body.localId ?? uidFromIdToken(signin.body.idToken);
  console.log(`[verify-save-view-ui] authenticated as uid=${uid ?? 'unknown'}`);
  return { customToken: exchange.body.customToken, idToken: signin.body.idToken, uid };
}

function uidFromIdToken(idToken) {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString('utf8'));
    return payload.user_id ?? payload.sub ?? null;
  } catch {
    return null;
  }
}

async function signInPage(page, customToken) {
  console.log('[verify-save-view-ui] signing in through the viewer debug API...');
  await page.evaluate(async (token) => {
    if (!window.__lupiFirebaseAuth?.signInWithCustomToken) {
      throw new Error('window.__lupiFirebaseAuth.signInWithCustomToken is not available');
    }
    await window.__lupiFirebaseAuth.signInWithCustomToken(token);
  }, customToken);

  const stateHandle = await page.waitForFunction(
    () => {
      const s = window.__lupiFirebaseAuth?.getState?.();
      if (!s?.hasToken || !s?.uid) return null;
      return s;
    },
    null,
    { timeout: TIMEOUT },
  );
  const state = await stateHandle.jsonValue();
  console.log(`[verify-save-view-ui] viewer reports signed-in state uid=${state.uid}`);
  return state;
}

async function loadGallerySample(page) {
  const sampleUrl = `${VERIFY_URL}gallery/curated/${SAMPLE}.xyz`;
  console.log(`[verify-save-view-ui] loading gallery sample: ${sampleUrl}`);
  await page.goto(`${VERIFY_URL}?load=${encodeURIComponent(sampleUrl)}`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

  // Wait for the Save button to appear — it only renders once a file is loaded.
  await page.waitForSelector('[data-testid="lupi-save-view-button"]', { timeout: TIMEOUT });
  console.log('[verify-save-view-ui] sample loaded and Save button visible');
}

async function saveView(page, title) {
  console.log(`[verify-save-view-ui] saving view with title: ${title}`);
  await page.click('[data-testid="lupi-save-view-button"]');
  await page.waitForSelector('[data-testid="lupi-save-view-panel"]', { timeout: TIMEOUT });

  // Fill the title field; Playwright will find the labelled input.
  await page.getByLabel('Name').fill(title);

  // Click Save and wait for the success status.
  const saveButton = page.locator('[data-testid="lupi-save-view-panel"] button', { hasText: /^Save$/ }).first();
  await saveButton.click();

  await page.waitForSelector('text=Saved.', { timeout: TIMEOUT });

  // The app updates the URL to the shareable slug.
  const currentHash = await page.evaluate(() => window.location.hash);
  assert(currentHash.startsWith('#/view/'), `expected URL hash to be #/view/..., got ${currentHash}`);
  const slug = currentHash.replace('#/view/', '');
  console.log(`[verify-save-view-ui] saved to slug: ${slug}`);
  return slug;
}

async function reloadSavedView(page, slug) {
  const url = `${VERIFY_URL}#/view/${slug}`;
  console.log(`[verify-save-view-ui] reloading saved view: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  await page.waitForSelector('[data-testid="lupi-save-view-button"]', { timeout: TIMEOUT });
  console.log('[verify-save-view-ui] saved view reloaded successfully');
}

async function cleanupView(idToken, slug) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/lupiViews/${slug}`;
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${idToken}` } });
  if (res.ok) {
    console.log(`[verify-save-view-ui] cleaned up lupiViews/${slug}`);
  } else {
    console.log(`[verify-save-view-ui] cleanup failed for lupiViews/${slug}: ${res.status}`);
  }
}

async function screenshot(page, label) {
  const path = join(ARTIFACTS, `${stamp}-${label}.png`);
  await page.screenshot({ path, fullPage: false, timeout: 90000 });
  console.log(`[verify-save-view-ui] screenshot: ${path}`);
}

async function main() {
  const credentials = await resolveSaveViewVerifierCredentials({
    apiKey: API_KEY,
    webApiKey: WEB_API_KEY,
    projectId: PROJECT_ID,
  });
  API_KEY = credentials.apiKey;
  WEB_API_KEY = credentials.webApiKey;
  if (credentials.seededKeyId) {
    console.log(`[verify-save-view-ui] seeded temporary apiKeys/${credentials.seededKeyId}`);
  }

  const { customToken, idToken } = await authenticate();

  console.log(`[verify-save-view-ui] launching chromium (headless=${HEADLESS}) → ${VERIFY_URL}`);
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan', '--enable-features=WebGPU'],
  });

  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('GPU stall due to ReadPixels')) return;
    console.log(`[PAGE ${msg.type()}] ${text}`);
  });
  page.on('pageerror', (err) => console.log(`[PAGE ERROR] ${err.message}`));

  await loadGallerySample(page);
  await signInPage(page, customToken);
  await screenshot(page, 'before-save');

  const title = `Verify Save ${Date.now()}`;
  const slug1 = await saveView(page, title);
  await screenshot(page, 'after-save-1');

  await reloadSavedView(page, slug1);
  await screenshot(page, 'reloaded-view');

  await cleanupView(idToken, slug1);
  await credentials.cleanup();

  await browser.close();
  console.log('\n[verify-save-view-ui] all UI checks passed');
}

main().catch((err) => {
  console.error('[verify-save-view-ui] ERROR:', err);
  process.exit(1);
});
