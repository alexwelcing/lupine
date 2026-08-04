#!/usr/bin/env node
/**
 * Summarize Lupi first-party analytics from Cloud Logging.
 *
 * The collector writes structured entries with
 * jsonPayload.component="lupi_analytics". This script turns recent log entries
 * into a small funnel report without requiring BigQuery or Firebase/GA.
 */

import { execSync } from 'node:child_process';

const DEFAULT_PROJECT_ID = 'shed-489901';
const FUNNEL = [
  'app_landed',
  'molecule_loaded',
  'molecule_interacted',
  'signup_start',
  'signup_complete',
  'view_saved',
  'view_shared',
  'return_active',
  'render_failed',
];

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
const HOURS = Number(args.hours ?? process.env.LUPI_ANALYTICS_HOURS ?? 24);
const LIMIT = Number(args.limit ?? process.env.LUPI_ANALYTICS_LIMIT ?? 1000);
const INCLUDE_PROBES = args['include-probes'] === 'true';
const JSON_OUTPUT = args.json === 'true';

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

function freshness() {
  if (!Number.isFinite(HOURS) || HOURS <= 0) return '24h';
  return `${Math.ceil(HOURS * 60)}m`;
}

function readEntries() {
  const filter = 'jsonPayload.component="lupi_analytics"';
  const raw = runGcloud([
    'logging',
    'read',
    filter,
    '--project',
    PROJECT_ID,
    '--freshness',
    freshness(),
    '--limit',
    String(LIMIT),
    '--format',
    'json',
  ]);
  return JSON.parse(raw || '[]');
}

function payloadOf(entry) {
  const payload = entry?.jsonPayload;
  return payload && typeof payload === 'object' ? payload : null;
}

function isProbe(payload) {
  if (payload?.utm?.utm_source === 'codex_verify') return true;
  if (payload?.props?.probe === true) return true;
  return false;
}

function eventRows(entries) {
  return entries
    .map((entry) => ({ entry, payload: payloadOf(entry) }))
    .filter(({ payload }) => payload?.event)
    .filter(({ payload }) => INCLUDE_PROBES || !isProbe(payload))
    .map(({ entry, payload }) => ({
      event: String(payload.event),
      sid: typeof payload.sid === 'string' ? payload.sid : '',
      ts: typeof payload.ts === 'number' ? payload.ts : Date.parse(entry.timestamp ?? '') || 0,
      isReturning: payload.isReturning === true,
      utm: payload.utm && typeof payload.utm === 'object' ? payload.utm : {},
      props: payload.props && typeof payload.props === 'object' ? payload.props : {},
      insertId: entry.insertId ?? '',
    }))
    .sort((a, b) => a.ts - b.ts);
}

function pct(numerator, denominator) {
  if (!denominator) return '0.0%';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function summarize(rows) {
  const allSessions = new Set(rows.map((row) => row.sid).filter(Boolean));
  const eventCounts = new Map();
  const eventSessions = new Map();
  const utmGroups = new Map();

  for (const row of rows) {
    eventCounts.set(row.event, (eventCounts.get(row.event) ?? 0) + 1);
    if (!eventSessions.has(row.event)) eventSessions.set(row.event, new Set());
    if (row.sid) eventSessions.get(row.event).add(row.sid);

    const source = row.utm.utm_source ?? '(direct)';
    const medium = row.utm.utm_medium ?? '(none)';
    const campaign = row.utm.utm_campaign ?? '(none)';
    const key = `${source} | ${medium} | ${campaign}`;
    if (!utmGroups.has(key)) {
      utmGroups.set(key, { source, medium, campaign, sessions: new Set(), events: 0, saves: 0, signups: 0 });
    }
    const group = utmGroups.get(key);
    if (row.sid) group.sessions.add(row.sid);
    group.events += 1;
    if (row.event === 'view_saved') group.saves += 1;
    if (row.event === 'signup_complete') group.signups += 1;
  }

  return {
    project: PROJECT_ID,
    hours: HOURS,
    limit: LIMIT,
    rows: rows.length,
    sessions: allSessions.size,
    funnel: FUNNEL.map((event, index) => {
      const sessions = eventSessions.get(event)?.size ?? 0;
      const count = eventCounts.get(event) ?? 0;
      const previousEvent = FUNNEL[index - 1];
      const previousSessions = previousEvent ? eventSessions.get(previousEvent)?.size ?? 0 : sessions;
      const landedSessions = eventSessions.get('app_landed')?.size ?? 0;
      return {
        event,
        count,
        sessions,
        fromPrevious: index === 0 ? '100.0%' : pct(sessions, previousSessions),
        fromLanded: index === 0 ? '100.0%' : pct(sessions, landedSessions),
      };
    }),
    utm: [...utmGroups.values()]
      .map((group) => ({
        source: group.source,
        medium: group.medium,
        campaign: group.campaign,
        sessions: group.sessions.size,
        events: group.events,
        signups: group.signups,
        saves: group.saves,
      }))
      .sort((a, b) => b.sessions - a.sessions || b.events - a.events)
      .slice(0, 12),
    recent: rows.slice(-12).reverse(),
  };
}

function pad(value, width) {
  return String(value).padEnd(width, ' ');
}

function printReport(summary) {
  console.log(`[analytics-report] project=${summary.project} window=${summary.hours}h rows=${summary.rows} sessions=${summary.sessions}`);
  console.log('');
  console.log('Funnel');
  console.log(`${pad('event', 24)} ${pad('events', 8)} ${pad('sessions', 9)} ${pad('prev', 8)} landed`);
  for (const row of summary.funnel) {
    console.log(`${pad(row.event, 24)} ${pad(row.count, 8)} ${pad(row.sessions, 9)} ${pad(row.fromPrevious, 8)} ${row.fromLanded}`);
  }
  console.log('');
  console.log('Top UTM Cohorts');
  console.log(`${pad('sessions', 9)} ${pad('events', 7)} ${pad('signups', 8)} ${pad('saves', 6)} source | medium | campaign`);
  for (const row of summary.utm) {
    console.log(`${pad(row.sessions, 9)} ${pad(row.events, 7)} ${pad(row.signups, 8)} ${pad(row.saves, 6)} ${row.source} | ${row.medium} | ${row.campaign}`);
  }
  console.log('');
  console.log('Recent Events');
  for (const row of summary.recent) {
    const when = row.ts ? new Date(row.ts).toISOString() : 'unknown-time';
    const campaign = row.utm.utm_campaign ?? '';
    console.log(`${when} ${pad(row.event, 22)} sid=${row.sid.slice(0, 8) || 'unknown'} campaign=${campaign}`);
  }
}

function main() {
  const entries = readEntries();
  const rows = eventRows(entries);
  const summary = summarize(rows);
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  printReport(summary);
}

try {
  main();
} catch (error) {
  console.error(`[analytics-report] FAIL: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
}
