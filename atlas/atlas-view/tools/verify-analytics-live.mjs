#!/usr/bin/env node
/**
 * Verify the deployed Lupi measurement path.
 *
 * Loads the public app with a synthetic UTM campaign, confirms the browser sends
 * a first-party collectAnalytics event, confirms Firebase/GA stays dark by
 * default, then polls Cloud Logging for the matching structured event.
 */

import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const DEFAULT_URL = 'https://lupi.live/';
const DEFAULT_PROJECT_ID = 'shed-489901';
const DEFAULT_COLLECTOR = 'https://us-central1-shed-489901.cloudfunctions.net/collectAnalytics';

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, ...rest] = arg.slice(2).split('=');
    out[key] = rest.length ? rest.join('=') : 'true';
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const PROJECT_ID = args.project ?? process.env.LUPI_FIREBASE_PROJECT_ID ?? DEFAULT_PROJECT_ID;
const BASE_URL = args.url ?? process.env.VERIFY_URL ?? DEFAULT_URL;
const COLLECTOR_URL = args.collector ?? process.env.VITE_LUPI_ANALYTICS_URL ?? DEFAULT_COLLECTOR;
const HEADLESS = args.headless !== 'false' && process.env.VERIFY_HEADLESS !== 'false';
const TIMEOUT_MS = Number(args.timeout ?? process.env.VERIFY_TIMEOUT ?? 60_000);
const LOG_TIMEOUT_MS = Number(args['log-timeout'] ?? process.env.VERIFY_LOG_TIMEOUT ?? 90_000);
const SKIP_LOGS = args['skip-logs'] === 'true';
const ALLOW_FIREBASE_GA = args['allow-firebase-ga'] === 'true';
const CAMPAIGN = args.campaign ?? `analytics_probe_${Date.now().toString(36)}`;

function log(message) {
  console.log(`[verify-analytics-live] ${message}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildProbeUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', 'codex_verify');
  url.searchParams.set('utm_medium', 'qa');
  url.searchParams.set('utm_campaign', CAMPAIGN);
  return url.toString();
}

function resolveGcloudBin() {
  if (process.env.GCLOUD_BIN) return process.env.GCLOUD_BIN;
  if (process.platform === 'win32') {
    try {
      const found = execSync('where.exe gcloud.cmd', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (found) return found;
    } catch {
      // Fall through to PATH lookup.
    }
  }
  return 'gcloud';
}

function shellQuote(value) {
  const text = String(value);
  if (process.platform === 'win32') return `"${text.replace(/"/g, '\\"')}"`;
  return `'${text.replace(/'/g, "'\\''")}'`;
}

function runGcloud(argsForGcloud) {
  const command = [shellQuote(resolveGcloudBin()), ...argsForGcloud.map(shellQuote)].join(' ');
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function logFilter() {
  return [
    'jsonPayload.component="lupi_analytics"',
    'jsonPayload.event="app_landed"',
    'jsonPayload.utm.utm_source="codex_verify"',
    `jsonPayload.utm.utm_campaign="${CAMPAIGN}"`,
  ].join(' AND ');
}

async function findLogEntry() {
  const deadline = Date.now() + LOG_TIMEOUT_MS;
  const filter = logFilter();
  while (Date.now() < deadline) {
    const raw = runGcloud([
      'logging',
      'read',
      filter,
      '--project',
      PROJECT_ID,
      '--freshness',
      '10m',
      '--limit',
      '5',
      '--format',
      'json',
    ]);
    const entries = JSON.parse(raw || '[]');
    if (entries.length > 0) return entries[0];
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  return null;
}

async function main() {
  const probeUrl = buildProbeUrl(BASE_URL);
  log(`loading ${probeUrl}`);

  const firstPartyAnalytics = [];
  const firebaseGaRequests = [];
  const browser = await chromium.launch({ headless: HEADLESS });
  const page = await browser.newPage();

  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith(COLLECTOR_URL)) {
      firstPartyAnalytics.push({ method: request.method(), url });
    }
    if (/google-analytics\.com|googletagmanager\.com\/gtag|app-measurement\.com|\/g\/collect/.test(url)) {
      firebaseGaRequests.push(url);
    }
  });

  await page.goto(probeUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  const deadline = Date.now() + TIMEOUT_MS;
  while (firstPartyAnalytics.length === 0 && Date.now() < deadline) {
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(2_000);
  await browser.close();

  assert(firstPartyAnalytics.length > 0, `no first-party analytics request reached ${COLLECTOR_URL}`);
  log(`first_party_requests=${firstPartyAnalytics.length}`);

  if (!ALLOW_FIREBASE_GA) {
    assert(firebaseGaRequests.length === 0, `Firebase/GA requests were observed: ${firebaseGaRequests.join(', ')}`);
  }
  log(`firebase_ga_requests=${firebaseGaRequests.length}`);

  if (!SKIP_LOGS) {
    const entry = await findLogEntry();
    assert(entry, `no matching Cloud Logging event found for campaign=${CAMPAIGN}`);
    const payload = entry.jsonPayload ?? {};
    assert(payload.event === 'app_landed', 'Cloud Logging entry was not app_landed');
    assert(payload.utm?.utm_source === 'codex_verify', 'Cloud Logging entry did not preserve UTM source');
    assert(payload.utm?.utm_campaign === CAMPAIGN, 'Cloud Logging entry did not preserve UTM campaign');
    log(`first_party_event=app_landed sid=${payload.sid ?? 'unknown'} campaign=${CAMPAIGN}`);
    log(`cloud_logging_event=${entry.insertId ?? 'found'}`);
  }

  log('all checks passed');
}

main().catch((error) => {
  console.error(`[verify-analytics-live] FAIL: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
});
