/**
 * D1-backed storage for evaluation history.
 *
 * Tracks every self-evaluation so we can compute quality trends,
 * spot regressions, and decide when to retry or escalate models.
 */

import type { Env } from "../types";

const TABLE_DDL = `
CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  span_id TEXT,
  agent_class TEXT,
  task_kind TEXT,
  evaluator_name TEXT NOT NULL,
  score REAL,
  label TEXT,
  explanation TEXT,
  action_taken TEXT,      -- 'accepted', 'retried', 'escalated', 'failed'
  retry_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
`;

const TRACE_INDEX = `CREATE INDEX IF NOT EXISTS idx_eval_trace ON evaluations(trace_id);`;
const AGENT_INDEX = `CREATE INDEX IF NOT EXISTS idx_eval_agent ON evaluations(agent_class, created_at);`;
const SCORE_INDEX = `CREATE INDEX IF NOT EXISTS idx_eval_score ON evaluations(score, created_at);`;

let schemaReady = false;

async function ensureSchema(env: Env): Promise<void> {
  if (schemaReady) return;
  await env.LEDGER.prepare(TABLE_DDL).run();
  await env.LEDGER.prepare(TRACE_INDEX).run();
  await env.LEDGER.prepare(AGENT_INDEX).run();
  await env.LEDGER.prepare(SCORE_INDEX).run();
  schemaReady = true;
}

export interface EvalRecord {
  id?: number;
  trace_id: string;
  span_id?: string;
  agent_class?: string;
  task_kind?: string;
  evaluator_name: string;
  score: number;
  label: string;
  explanation: string;
  action_taken: string;
  retry_count: number;
  created_at: string;
}

/** Insert an evaluation record. */
export async function insertEval(env: Env, rec: Omit<EvalRecord, "id">): Promise<void> {
  await ensureSchema(env);
  await env.LEDGER.prepare(
    `INSERT INTO evaluations
     (trace_id, span_id, agent_class, task_kind, evaluator_name, score, label, explanation, action_taken, retry_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    rec.trace_id,
    rec.span_id ?? null,
    rec.agent_class ?? null,
    rec.task_kind ?? null,
    rec.evaluator_name,
    rec.score,
    rec.label,
    rec.explanation,
    rec.action_taken,
    rec.retry_count,
    rec.created_at
  ).run();
}

/** Get average score per agent over the last N days. */
export async function getAgentQualityTrend(
  env: Env,
  agentClass: string,
  days = 7
): Promise<{ avg_score: number; count: number; pass_rate: number }> {
  await ensureSchema(env);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const row = await env.LEDGER.prepare(
    `SELECT AVG(score) as avg_score, COUNT(*) as count,
            AVG(CASE WHEN label = 'pass' THEN 1.0 ELSE 0.0 END) as pass_rate
     FROM evaluations
     WHERE agent_class = ? AND created_at > ?`
  ).bind(agentClass, since).first<{ avg_score: number; count: number; pass_rate: number }>();
  return row ?? { avg_score: 0, count: 0, pass_rate: 0 };
}

type ScorecardData = {
  window?: "experiment" | "per_run";
  generated_at?: string;
  scorecard?: Record<string, Record<string, { n: number; pass_rate: number }>>;
};

export type ScorecardProvenance = "experiment" | "per_run" | "none";

const DEFAULT_EXPERIMENT_FRESH_HOURS = 168; // 7 days

/**
 * Pick the authoritative ModelScorecard from recent claims.
 *
 * A *controlled experiment* scorecard (window:"experiment", written by
 * evals/ab-oracle.ts over a frozen golden dataset) outranks production
 * sampling (window:"per_run") when it is fresh — this fixes the sampling
 * bias where a provider the router never picks never gets sampled, so it
 * never gets a score, so it never gets picked. Legacy rows without a
 * window are treated as per_run.
 */
async function selectScorecard(
  env: Env,
): Promise<{ data: ScorecardData; provenance: ScorecardProvenance } | null> {
  const { results } = await env.LEDGER.prepare(
    `SELECT claim_data FROM claims WHERE claim_type = 'ModelScorecard'
      ORDER BY created_at DESC LIMIT 10`,
  ).all<{ claim_data: string }>();
  const rows = (results ?? [])
    .map((r) => {
      try {
        return JSON.parse(r.claim_data) as ScorecardData;
      } catch {
        return null;
      }
    })
    .filter((d): d is ScorecardData => !!d && !!d.scorecard);
  if (rows.length === 0) return null;

  const freshH =
    Number(env.EXPERIMENT_FRESH_HOURS) || DEFAULT_EXPERIMENT_FRESH_HOURS;
  const cutoff = Date.now() - freshH * 3_600_000;
  const freshExperiment = rows.find(
    (d) =>
      d.window === "experiment" &&
      d.generated_at !== undefined &&
      new Date(d.generated_at).getTime() >= cutoff,
  );
  if (freshExperiment) return { data: freshExperiment, provenance: "experiment" };
  return { data: rows[0], provenance: "per_run" };
}

function aggregate(
  data: ScorecardData,
): Record<string, { score: number; n: number }> {
  const out: Record<string, { score: number; n: number }> = {};
  for (const [bucket, evs] of Object.entries(data.scorecard ?? {})) {
    if (bucket.includes("|") || bucket === "workers-ai" || bucket === "unknown") continue;
    const cells = Object.values(evs);
    if (cells.length === 0) continue;
    out[bucket] = {
      score: cells.reduce((s, c) => s + (c.pass_rate ?? 0), 0) / cells.length,
      n: Math.min(...cells.map((c) => c.n ?? 0)),
    };
  }
  return out;
}

/**
 * Per-model quality, provenance-ranked: a fresh controlled-experiment
 * scorecard outranks production sampling. Returns model → { score, n }
 * where score is the mean pass-rate across evaluators and n is the MIN
 * evaluator sample size (conservative). model|agent buckets and the
 * workers-ai floor are excluded. Return shape is unchanged (callers like
 * selectDeepRoute consume the flat map) — use getModelQualityProvenance
 * for the source.
 */
export async function getModelQualityTrend(
  env: Env,
): Promise<Record<string, { score: number; n: number }>> {
  try {
    const sel = await selectScorecard(env);
    return sel ? aggregate(sel.data) : {};
  } catch {
    return {};
  }
}

/** Which scorecard the routing trend is currently sourced from. */
export async function getModelQualityProvenance(
  env: Env,
): Promise<ScorecardProvenance> {
  try {
    const sel = await selectScorecard(env);
    return sel ? sel.provenance : "none";
  } catch {
    return "none";
  }
}

/** Get recent evaluations for admin dashboard. */
export async function getRecentEvals(
  env: Env,
  opts?: { limit?: number; agent?: string; minScore?: number }
): Promise<EvalRecord[]> {
  await ensureSchema(env);
  const limit = opts?.limit ?? 50;
  let sql = `SELECT * FROM evaluations WHERE 1=1`;
  const binds: (string | number)[] = [];
  if (opts?.agent) {
    sql += ` AND agent_class = ?`;
    binds.push(opts.agent);
  }
  if (opts?.minScore !== undefined) {
    sql += ` AND score >= ?`;
    binds.push(opts.minScore);
  }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  binds.push(limit);
  const { results } = await env.LEDGER.prepare(sql).bind(...binds).all<EvalRecord>();
  return results ?? [];
}

/** Count evaluations by label for a given time window. */
export async function getEvalSummary(
  env: Env,
  days = 1
): Promise<{ label: string; count: number; avg_score: number }[]> {
  await ensureSchema(env);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { results } = await env.LEDGER.prepare(
    `SELECT label, COUNT(*) as count, AVG(score) as avg_score
     FROM evaluations
     WHERE created_at > ?
     GROUP BY label`
  ).bind(since).all<{ label: string; count: number; avg_score: number }>();
  return results ?? [];
}
