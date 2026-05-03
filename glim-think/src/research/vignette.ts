/**
 * Daily research vignette — orchestrates the Hailuo video generation
 * lifecycle. Submit happens once a day from the cron handler; polling
 * happens on the 5-min (asterisk-slash-5) smoketest cron so we don't need a separate cron
 * just for video status checks.
 *
 * State machine:
 *   submitted → processing → complete
 *                          ↘ failed (max poll attempts exceeded)
 */
import type { Env } from "../types";
import {
  submitHailuoVideo,
  queryHailuoTask,
  retrieveAndStoreHailuoFile,
  dailyVignettePrompt,
} from "../agents/hailuo";

const TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS daily_vignettes (
    vignette_id TEXT PRIMARY KEY,
    date_key TEXT NOT NULL,
    task_id TEXT,
    file_id TEXT,
    r2_key TEXT,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted',
    claim_ids TEXT,
    error TEXT,
    poll_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    completed_at TEXT
  )
`;

const DATE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_daily_vignettes_date
    ON daily_vignettes(date_key DESC)
`;

const STATUS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_daily_vignettes_status
    ON daily_vignettes(status, created_at DESC)
`;

const MAX_POLL_ATTEMPTS = 30; // ~30 polls × 5min cron = 2.5h max

let schemaReady = false;
async function ensureSchema(env: Env): Promise<void> {
  if (schemaReady) return;
  await env.LEDGER.prepare(TABLE_DDL).run();
  await env.LEDGER.prepare(DATE_INDEX).run();
  await env.LEDGER.prepare(STATUS_INDEX).run();
  schemaReady = true;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface DailyClaim {
  claim_id: string;
  description: string;
  confidence: number | null;
  claim_data: string;
}

/**
 * Aggregate yesterday's top claims and build a vignette prompt from
 * their verdicts.
 */
async function buildVignetteContext(env: Env): Promise<{
  date: string;
  prompt: string;
  claim_ids: string[];
  total_claims: number;
}> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const rows = await env.LEDGER
    .prepare(
      `SELECT claim_id, description, confidence, claim_data
         FROM claims
        WHERE created_at >= ?1 AND claim_type = 'AutoHypothesisEvaluation'
        ORDER BY confidence DESC, created_at DESC
        LIMIT 3`,
    )
    .bind(since)
    .all<DailyClaim>()
    .catch(() => ({ results: [] as DailyClaim[] }));

  const top = rows.results ?? [];
  const verdicts = top
    .map((c) => {
      try {
        const data = JSON.parse(c.claim_data) as { verdict?: string };
        return data.verdict ?? "weak";
      } catch {
        return "weak";
      }
    })
    .filter(Boolean);

  const totalCountRow = await env.LEDGER
    .prepare(
      `SELECT COUNT(*) AS n FROM claims
        WHERE created_at >= ?1 AND claim_type = 'AutoHypothesisEvaluation'`,
    )
    .bind(since)
    .first<{ n: number }>()
    .catch(() => null);

  const date = dateKey(yesterday);
  const prompt = dailyVignettePrompt({
    date,
    topVerdicts: verdicts,
    totalClaims: totalCountRow?.n ?? top.length,
  });

  return {
    date,
    prompt,
    claim_ids: top.map((c) => c.claim_id),
    total_claims: totalCountRow?.n ?? top.length,
  };
}

/**
 * Submit a daily vignette. Idempotent: if a row already exists for the
 * target date, returns the existing one.
 */
export async function submitDailyVignette(
  env: Env,
): Promise<{
  ok: boolean;
  vignette_id?: string;
  task_id?: string;
  date?: string;
  status?: string;
  error?: string;
}> {
  await ensureSchema(env);
  const ctx = await buildVignetteContext(env);

  const existing = await env.LEDGER
    .prepare(
      `SELECT vignette_id, task_id, status FROM daily_vignettes
        WHERE date_key = ?1
        ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(ctx.date)
    .first<{ vignette_id: string; task_id: string | null; status: string }>();
  if (existing && existing.status !== "failed") {
    return {
      ok: true,
      vignette_id: existing.vignette_id,
      task_id: existing.task_id ?? undefined,
      date: ctx.date,
      status: `already-${existing.status}`,
    };
  }

  const submission = await submitHailuoVideo(env, { prompt: ctx.prompt });
  if (!submission.ok || !submission.task_id) {
    return { ok: false, error: submission.error ?? "submit failed", date: ctx.date };
  }

  const vignetteId = `vignette-${ctx.date}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  await env.LEDGER
    .prepare(
      `INSERT INTO daily_vignettes
         (vignette_id, date_key, task_id, prompt, status, claim_ids, created_at)
       VALUES (?1, ?2, ?3, ?4, 'submitted', ?5, ?6)`,
    )
    .bind(
      vignetteId,
      ctx.date,
      submission.task_id,
      ctx.prompt,
      JSON.stringify(ctx.claim_ids),
      now,
    )
    .run();

  return { ok: true, vignette_id: vignetteId, task_id: submission.task_id, date: ctx.date, status: "submitted" };
}

interface PendingVignette {
  vignette_id: string;
  task_id: string | null;
  date_key: string;
  poll_attempts: number;
}

/**
 * Poll all pending vignettes. Called from the smoketest cron every
 * 5 minutes. Each pending row gets one query. When a row reaches
 * Success, we retrieve + mirror to R2 and mark complete.
 */
export async function pollPendingVignettes(env: Env): Promise<{
  checked: number;
  completed: number;
  still_processing: number;
  failed: number;
}> {
  await ensureSchema(env);
  const rows = await env.LEDGER
    .prepare(
      `SELECT vignette_id, task_id, date_key, poll_attempts
         FROM daily_vignettes
        WHERE status IN ('submitted', 'processing')
        ORDER BY created_at ASC
        LIMIT 5`,
    )
    .all<PendingVignette>()
    .catch(() => ({ results: [] as PendingVignette[] }));

  const pending = rows.results ?? [];
  let completed = 0;
  let stillProcessing = 0;
  let failed = 0;

  for (const v of pending) {
    if (!v.task_id) {
      await env.LEDGER
        .prepare(`UPDATE daily_vignettes SET status = 'failed', error = ?1 WHERE vignette_id = ?2`)
        .bind("missing task_id", v.vignette_id)
        .run();
      failed += 1;
      continue;
    }

    const newAttempts = v.poll_attempts + 1;
    const query = await queryHailuoTask(env, v.task_id);
    if (!query.ok) {
      if (newAttempts >= MAX_POLL_ATTEMPTS) {
        await env.LEDGER
          .prepare(`UPDATE daily_vignettes SET status = 'failed', error = ?1, poll_attempts = ?2 WHERE vignette_id = ?3`)
          .bind(query.error ?? "query error", newAttempts, v.vignette_id)
          .run();
        failed += 1;
      } else {
        await env.LEDGER
          .prepare(`UPDATE daily_vignettes SET poll_attempts = ?1 WHERE vignette_id = ?2`)
          .bind(newAttempts, v.vignette_id)
          .run();
        stillProcessing += 1;
      }
      continue;
    }

    if (query.status === "Success" && query.file_id) {
      const storageKey = `vignettes/${v.date_key}.mp4`;
      const retrieved = await retrieveAndStoreHailuoFile(env, {
        file_id: query.file_id,
        storageKey,
      });
      if (retrieved.ok) {
        await env.LEDGER
          .prepare(
            `UPDATE daily_vignettes
                SET status = 'complete', file_id = ?1, r2_key = ?2,
                    completed_at = ?3, poll_attempts = ?4
              WHERE vignette_id = ?5`,
          )
          .bind(query.file_id, storageKey, new Date().toISOString(), newAttempts, v.vignette_id)
          .run();
        completed += 1;
      } else {
        if (newAttempts >= MAX_POLL_ATTEMPTS) {
          await env.LEDGER
            .prepare(`UPDATE daily_vignettes SET status = 'failed', error = ?1, poll_attempts = ?2 WHERE vignette_id = ?3`)
            .bind(retrieved.error ?? "retrieve failed", newAttempts, v.vignette_id)
            .run();
          failed += 1;
        } else {
          await env.LEDGER
            .prepare(`UPDATE daily_vignettes SET poll_attempts = ?1 WHERE vignette_id = ?2`)
            .bind(newAttempts, v.vignette_id)
            .run();
          stillProcessing += 1;
        }
      }
    } else if (query.status === "Fail") {
      await env.LEDGER
        .prepare(`UPDATE daily_vignettes SET status = 'failed', error = 'Hailuo returned Fail', poll_attempts = ?1 WHERE vignette_id = ?2`)
        .bind(newAttempts, v.vignette_id)
        .run();
      failed += 1;
    } else {
      // Still Queueing/Preparing/Processing
      await env.LEDGER
        .prepare(`UPDATE daily_vignettes SET status = 'processing', poll_attempts = ?1 WHERE vignette_id = ?2`)
        .bind(newAttempts, v.vignette_id)
        .run();
      stillProcessing += 1;
    }
  }

  return { checked: pending.length, completed, still_processing: stillProcessing, failed };
}

export interface VignetteSummary {
  vignette_id: string;
  date_key: string;
  status: string;
  r2_url: string | null;
  claim_ids: string[];
  created_at: string;
  completed_at: string | null;
}

export async function latestVignette(env: Env): Promise<VignetteSummary | null> {
  await ensureSchema(env);
  const row = await env.LEDGER
    .prepare(
      `SELECT vignette_id, date_key, status, r2_key, claim_ids,
              created_at, completed_at
         FROM daily_vignettes
        ORDER BY created_at DESC LIMIT 1`,
    )
    .first<{
      vignette_id: string;
      date_key: string;
      status: string;
      r2_key: string | null;
      claim_ids: string;
      created_at: string;
      completed_at: string | null;
    }>()
    .catch(() => null);
  if (!row) return null;
  return {
    vignette_id: row.vignette_id,
    date_key: row.date_key,
    status: row.status,
    r2_url: row.r2_key
      ? `https://glim-think-v1.aw-ab5.workers.dev/artifacts/${row.r2_key}`
      : null,
    claim_ids: (() => {
      try { return JSON.parse(row.claim_ids) as string[]; } catch { return []; }
    })(),
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}
