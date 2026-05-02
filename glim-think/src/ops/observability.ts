/**
 * Phase A — observability primitives.
 *
 * Three D1 tables track operational health so the next silent-failure
 * class (broadcast bug) is caught immediately:
 *
 *   cron_runs       — heartbeat per cron invocation (started/finished/
 *                     outcome/duration/error). Read by /health.
 *   ops_errors      — append-only error log for silent catch sites
 *                     (the `safe()` and `try { } catch {}` patterns).
 *                     Source-tagged so we can grep by component.
 *   smoketest_runs  — output of the 5-minute cron (asterisk-slash-5) that pings
 *                     /health, /broadcasts/trigger, /feed and writes
 *                     pass/fail per probe.
 *
 * Schema is created lazily on first write so the tables show up
 * without requiring a migration. (Phase E will move these into a
 * proper migration.)
 */
import type { Env } from "../types";
import { createLabBroadcast } from "../scheduled";

const CRON_RUNS_DDL = `
  CREATE TABLE IF NOT EXISTS cron_runs (
    run_id TEXT PRIMARY KEY,
    cron_name TEXT NOT NULL,
    cron_expression TEXT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    outcome TEXT NOT NULL DEFAULT 'running',
    duration_ms INTEGER,
    error TEXT,
    notes TEXT
  )
`;

const CRON_RUNS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_cron_runs_name_started
    ON cron_runs(cron_name, started_at DESC)
`;

const OPS_ERRORS_DDL = `
  CREATE TABLE IF NOT EXISTS ops_errors (
    error_id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    stack TEXT,
    context_json TEXT,
    occurred_at TEXT NOT NULL
  )
`;

const OPS_ERRORS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_ops_errors_source_time
    ON ops_errors(source, occurred_at DESC)
`;

const SMOKETEST_RUNS_DDL = `
  CREATE TABLE IF NOT EXISTS smoketest_runs (
    run_id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    overall_outcome TEXT NOT NULL DEFAULT 'running',
    probes_json TEXT,
    duration_ms INTEGER
  )
`;

const SMOKETEST_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_smoketest_runs_started
    ON smoketest_runs(started_at DESC)
`;

let schemaReady = false;
async function ensureSchema(env: Env): Promise<void> {
  if (schemaReady) return;
  await env.LEDGER.prepare(CRON_RUNS_DDL).run();
  await env.LEDGER.prepare(CRON_RUNS_INDEX).run();
  await env.LEDGER.prepare(OPS_ERRORS_DDL).run();
  await env.LEDGER.prepare(OPS_ERRORS_INDEX).run();
  await env.LEDGER.prepare(SMOKETEST_RUNS_DDL).run();
  await env.LEDGER.prepare(SMOKETEST_INDEX).run();
  schemaReady = true;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Append an error row. Best-effort: never throws, so a failure here
 * cannot mask the original error the caller is reporting.
 */
export async function logOpsError(
  env: Env,
  source: string,
  err: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    await ensureSchema(env);
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? (err.stack ?? null) : null;
    await env.LEDGER.prepare(
      `INSERT INTO ops_errors (error_id, source, message, stack, context_json, occurred_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
      .bind(
        newId("err"),
        source,
        message.slice(0, 2000),
        stack ? stack.slice(0, 4000) : null,
        context ? JSON.stringify(context).slice(0, 4000) : null,
        new Date().toISOString(),
      )
      .run();
  } catch (e) {
    console.error(`logOpsError: failed to persist error for ${source}:`, e);
  }
}

/**
 * Wrap a cron handler with heartbeat tracking. Records the started_at
 * row before the work, updates with finished_at + outcome after.
 *
 * The wrapper itself never throws — failures inside `fn` are recorded
 * as `outcome=failed` and re-thrown so the cron runtime sees them.
 */
export async function recordCronRun<T>(
  env: Env,
  cronName: string,
  cronExpression: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  await ensureSchema(env);
  const runId = newId(`cron-${cronName}`);
  const startedAt = Date.now();
  const startedIso = new Date(startedAt).toISOString();

  try {
    await env.LEDGER.prepare(
      `INSERT INTO cron_runs
         (run_id, cron_name, cron_expression, started_at, outcome)
       VALUES (?1, ?2, ?3, ?4, 'running')`,
    )
      .bind(runId, cronName, cronExpression ?? null, startedIso)
      .run();
  } catch (e) {
    // Heartbeat insert failed — log but continue with the work.
    console.error(`recordCronRun: insert failed for ${cronName}:`, e);
  }

  try {
    const result = await fn();
    const finishedAt = Date.now();
    await env.LEDGER.prepare(
      `UPDATE cron_runs
         SET finished_at = ?1, outcome = 'success', duration_ms = ?2
       WHERE run_id = ?3`,
    )
      .bind(new Date(finishedAt).toISOString(), finishedAt - startedAt, runId)
      .run()
      .catch((e: unknown) => console.error(`recordCronRun: success update failed:`, e));
    return result;
  } catch (e) {
    const finishedAt = Date.now();
    const message = e instanceof Error ? e.message : String(e);
    await env.LEDGER.prepare(
      `UPDATE cron_runs
         SET finished_at = ?1, outcome = 'failed', duration_ms = ?2, error = ?3
       WHERE run_id = ?4`,
    )
      .bind(
        new Date(finishedAt).toISOString(),
        finishedAt - startedAt,
        message.slice(0, 2000),
        runId,
      )
      .run()
      .catch((updateErr) => console.error(`recordCronRun: failure update failed:`, updateErr));
    await logOpsError(env, `cron:${cronName}`, e);
    throw e;
  }
}

export interface ProbeResult {
  name: string;
  outcome: "pass" | "fail";
  latency_ms?: number;
  error?: string;
  notes?: string;
}

/**
 * Probes call internal functions directly rather than fetching the
 * worker's own URL. Cloudflare returns 404 for same-origin self-fetches
 * (loop protection), so HTTP probes from within the worker can't
 * exercise the public routes. The point of the smoketest is to catch
 * silent failures in shared code paths (env binding, DB schema, table
 * presence) — internal calls do that without the HTTP roundtrip.
 */
async function timed<T>(
  name: string,
  fn: () => Promise<T>,
  validate?: (result: T) => string | null,
): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const result = await fn();
    const latency = Date.now() - start;
    const validationError = validate ? validate(result) : null;
    if (validationError) {
      return { name, outcome: "fail", latency_ms: latency, error: validationError };
    }
    return { name, outcome: "pass", latency_ms: latency };
  } catch (e) {
    return {
      name,
      outcome: "fail",
      latency_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function probeRecordsCount(env: Env): Promise<ProbeResult> {
  return timed(
    "records-count",
    async () => {
      const row = await env.LEDGER.prepare(
        "SELECT COUNT(*) AS n FROM records",
      ).first<{ n: number }>();
      return row?.n ?? 0;
    },
    (n) => (n === 0 ? "records table is empty (expected at least one row)" : null),
  );
}

async function probeHypothesesCount(env: Env): Promise<ProbeResult> {
  return timed(
    "hypotheses-count",
    async () => {
      const row = await env.LEDGER.prepare(
        "SELECT COUNT(*) AS n FROM hypotheses",
      ).first<{ n: number }>();
      return row?.n ?? 0;
    },
    (n) => (n === 0 ? "hypotheses table is empty" : null),
  );
}

async function probeR2Diary(env: Env): Promise<ProbeResult> {
  return timed("r2-diary", async () => {
    const obj = await env.ARTIFACTS.get("diary/latest.json");
    return obj !== null;
  });
}

async function probeBroadcastEndToEnd(env: Env): Promise<ProbeResult> {
  return timed(
    "broadcast-trigger",
    async () => {
      const broadcast = await createLabBroadcast(env, "smoketest");
      return broadcast.summary.records;
    },
    (records) =>
      records === 0
        ? "broadcast.summary.records is 0 — env.LEDGER may be unbound (regression of the original broadcast bug)"
        : null,
  );
}

/**
 * Run the full smoketest suite. Returns the run row for inspection
 * and inserts it into smoketest_runs.
 */
export async function runSmoketest(env: Env): Promise<{
  run_id: string;
  overall_outcome: "pass" | "fail";
  probes: ProbeResult[];
}> {
  await ensureSchema(env);
  const runId = newId("smoke");
  const startedAt = Date.now();
  const startedIso = new Date(startedAt).toISOString();

  await env.LEDGER.prepare(
    `INSERT INTO smoketest_runs (run_id, started_at, overall_outcome) VALUES (?1, ?2, 'running')`,
  )
    .bind(runId, startedIso)
    .run()
    .catch(() => {});

  const probes: ProbeResult[] = await Promise.all([
    probeRecordsCount(env),
    probeHypothesesCount(env),
    probeR2Diary(env),
    probeBroadcastEndToEnd(env),
  ]);

  const overall: "pass" | "fail" = probes.every((p) => p.outcome === "pass") ? "pass" : "fail";
  const finishedAt = Date.now();

  await env.LEDGER.prepare(
    `UPDATE smoketest_runs
       SET finished_at = ?1, overall_outcome = ?2, probes_json = ?3, duration_ms = ?4
     WHERE run_id = ?5`,
  )
    .bind(
      new Date(finishedAt).toISOString(),
      overall,
      JSON.stringify(probes),
      finishedAt - startedAt,
      runId,
    )
    .run()
    .catch((e) => console.error("smoketest: update failed:", e));

  if (overall === "fail") {
    await logOpsError(env, "smoketest", new Error("smoketest failed"), {
      run_id: runId,
      failed: probes.filter((p) => p.outcome === "fail").map((p) => p.name),
    });
  }

  return { run_id: runId, overall_outcome: overall, probes };
}

/**
 * Snapshot of operational health for /health endpoint enhancement.
 *
 * Returns counts + last cron heartbeats + last smoketest result.
 * Each section is best-effort — missing tables (early in deploy
 * lifecycle) just return null instead of throwing.
 */
export interface HealthSnapshot {
  records: number | null;
  hypotheses: number | null;
  claims: number | null;
  pending_experiments: number | null;
  pending_critiques: number | null;
  cron_runs: Array<{
    cron_name: string;
    last_started_at: string;
    last_outcome: string;
    last_duration_ms: number | null;
  }>;
  last_smoketest: {
    run_id: string;
    started_at: string;
    overall_outcome: string;
    duration_ms: number | null;
  } | null;
  recent_errors: Array<{ source: string; message: string; occurred_at: string }>;
}

export async function getHealthSnapshot(env: Env): Promise<HealthSnapshot> {
  await ensureSchema(env);
  const safeCount = async (sql: string): Promise<number | null> => {
    try {
      const row = await env.LEDGER.prepare(sql).first<{ n: number }>();
      return row?.n ?? null;
    } catch {
      return null;
    }
  };

  const [records, hypotheses, claims, pendingExperiments, pendingCritiques] =
    await Promise.all([
      safeCount("SELECT COUNT(*) AS n FROM records"),
      safeCount("SELECT COUNT(*) AS n FROM hypotheses"),
      safeCount("SELECT COUNT(*) AS n FROM claims"),
      safeCount("SELECT COUNT(*) AS n FROM pending_experiments WHERE status = 'pending'"),
      safeCount("SELECT COUNT(*) AS n FROM critiques WHERE status = 'pending'"),
    ]);

  const cronLatest = await env.LEDGER.prepare(
    `SELECT cron_name,
            MAX(started_at) AS last_started_at,
            outcome AS last_outcome,
            duration_ms AS last_duration_ms
       FROM cron_runs
      GROUP BY cron_name
      ORDER BY last_started_at DESC
      LIMIT 10`,
  )
    .all<{
      cron_name: string;
      last_started_at: string;
      last_outcome: string;
      last_duration_ms: number | null;
    }>()
    .catch(() => ({ results: [] as never[] }));

  const lastSmoke = await env.LEDGER.prepare(
    `SELECT run_id, started_at, overall_outcome, duration_ms
       FROM smoketest_runs
      ORDER BY started_at DESC
      LIMIT 1`,
  )
    .first<{
      run_id: string;
      started_at: string;
      overall_outcome: string;
      duration_ms: number | null;
    }>()
    .catch(() => null);

  const recentErrors = await env.LEDGER.prepare(
    `SELECT source, message, occurred_at FROM ops_errors
      ORDER BY occurred_at DESC LIMIT 10`,
  )
    .all<{ source: string; message: string; occurred_at: string }>()
    .catch(() => ({ results: [] as never[] }));

  return {
    records,
    hypotheses,
    claims,
    pending_experiments: pendingExperiments,
    pending_critiques: pendingCritiques,
    cron_runs: cronLatest.results ?? [],
    last_smoketest: lastSmoke ?? null,
    recent_errors: recentErrors.results ?? [],
  };
}
