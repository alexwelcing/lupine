/**
 * D1-backed storage for Omnigents coordination traces.
 *
 * One structured event per coordination call (RFC §7.5): per-model latency,
 * tokens, outcome, plus the strategy, the single-best-model baseline, and the
 * coordination-hit flag. This is the data the coordination-effectiveness KPIs
 * (RFC §7.6) are computed over, and the source the cocoindex evidence pipeline
 * reads to build a searchable index of "which coordination worked and why".
 *
 * Mirrors the lazy-schema + ensureSchema pattern from evals/store.ts so it
 * co-exists with the same D1 LEDGER binding without a hard migration order.
 */
import type { Env } from "../types";
import type { CoordinationStrategy, IntentClass, Priority, ProviderId } from "./coordinator";

const TABLE_DDL = `
CREATE TABLE IF NOT EXISTS coordination_traces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  agent_class TEXT,
  intent TEXT,
  strategy TEXT NOT NULL,
  priority TEXT,
  requested_providers TEXT NOT NULL DEFAULT '[]',
  participating TEXT NOT NULL DEFAULT '[]',
  winner_provider TEXT,
  winner_text TEXT,
  coordination_outcome TEXT NOT NULL,
  baseline_provider TEXT,
  coordination_hit INTEGER NOT NULL DEFAULT 0,
  cost_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL
);
`;

const STRATEGY_INDEX = `CREATE INDEX IF NOT EXISTS idx_coord_strategy ON coordination_traces(strategy, created_at);`;
const AGENT_INDEX = `CREATE INDEX IF NOT EXISTS idx_coord_agent ON coordination_traces(agent_class, created_at);`;
const OUTCOME_INDEX = `CREATE INDEX IF NOT EXISTS idx_coord_outcome ON coordination_traces(coordination_outcome, created_at);`;

let schemaReady = false;

async function ensureSchema(env: Env): Promise<void> {
  if (schemaReady) return;
  await env.LEDGER.prepare(TABLE_DDL).run();
  await env.LEDGER.prepare(STRATEGY_INDEX).run();
  await env.LEDGER.prepare(AGENT_INDEX).run();
  await env.LEDGER.prepare(OUTCOME_INDEX).run();
  schemaReady = true;
}

export interface ProviderAttemptTrace {
  provider: ProviderId;
  model: string;
  text?: string;
  confidence?: number;
  tokens?: number;
  latencyMs?: number;
  outcome: string;
  error?: string;
}

export interface CoordinationTraceInput {
  agent_class: string;
  intent: IntentClass;
  strategy: CoordinationStrategy;
  priority: Priority;
  requested_providers: ProviderId[];
  participating: ProviderAttemptTrace[];
  winner_provider: ProviderId | null;
  winner_text: string;
  coordination_outcome: "success" | "partial" | "failed";
  baseline_provider: ProviderId;
  coordination_hit: 0 | 1;
  cost_tokens: number;
  latency_ms: number;
  error?: string;
}

export interface CoordinationTraceRow extends CoordinationTraceInput {
  id: number;
  trace_id: string;
  created_at: string;
}

function newTraceId(): string {
  // W3C trace-context-shaped correlation id (not tied to OTel; cheap + unique).
  const hex = () =>
    Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
  return `${hex()}-${hex()}`;
}

/** Insert a coordination trace. Never throws — observability must not break a run. */
export async function recordCoordinationTrace(env: Env, input: CoordinationTraceInput): Promise<void> {
  await ensureSchema(env);
  const traceId = newTraceId();
  await env.LEDGER.prepare(
    `INSERT INTO coordination_traces
     (trace_id, agent_class, intent, strategy, priority, requested_providers, participating,
      winner_provider, winner_text, coordination_outcome, baseline_provider, coordination_hit,
      cost_tokens, latency_ms, error, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      traceId,
      input.agent_class ?? null,
      input.intent ?? null,
      input.strategy,
      input.priority ?? null,
      JSON.stringify(input.requested_providers ?? []),
      JSON.stringify(input.participating ?? []),
      input.winner_provider ?? null,
      input.winner_text ?? null,
      input.coordination_outcome,
      input.baseline_provider ?? null,
      input.coordination_hit,
      input.cost_tokens ?? 0,
      input.latency_ms ?? 0,
      input.error ?? null,
      new Date().toISOString(),
    )
    .run();
}

export interface CoordinationKpis {
  /** Fraction of calls where coordination beat the single-best-model baseline. */
  hit_rate: number;
  /** success | partial | failed distribution. */
  outcome_counts: Record<string, number>;
  /** Per-strategy call counts. */
  strategy_counts: Record<string, number>;
  /** Mean tokens per call (cost proxy). */
  mean_tokens: number;
  /** Mean coordination latency. */
  mean_latency_ms: number;
  /** Total calls in the window. */
  n: number;
}

/**
 * Coordination-effectiveness KPIs (RFC §7.6) over the last `days` days.
 * hit_rate is the headline number — target ≥ 0.70.
 */
export async function getCoordinationKpis(env: Env, days = 7): Promise<CoordinationKpis> {
  await ensureSchema(env);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const row = await env.LEDGER.prepare(
    `SELECT
       COUNT(*) as n,
       AVG(CASE WHEN coordination_hit = 1 THEN 1.0 ELSE 0.0 END) as hit_rate,
       AVG(cost_tokens) as mean_tokens,
       AVG(latency_ms) as mean_latency_ms
     FROM coordination_traces
     WHERE created_at > ?`,
  )
    .bind(since)
    .first<{ n: number; hit_rate: number; mean_tokens: number; mean_latency_ms: number }>();

  const outcomeRows = await env.LEDGER.prepare(
    `SELECT coordination_outcome, COUNT(*) as count
     FROM coordination_traces WHERE created_at > ?
     GROUP BY coordination_outcome`,
  )
    .bind(since)
    .all<{ coordination_outcome: string; count: number }>();

  const strategyRows = await env.LEDGER.prepare(
    `SELECT strategy, COUNT(*) as count
     FROM coordination_traces WHERE created_at > ?
     GROUP BY strategy`,
  )
    .bind(since)
    .all<{ strategy: string; count: number }>();

  const outcome_counts: Record<string, number> = {};
  for (const r of outcomeRows.results ?? []) outcome_counts[r.coordination_outcome] = r.count;
  const strategy_counts: Record<string, number> = {};
  for (const r of strategyRows.results ?? []) strategy_counts[r.strategy] = r.count;

  return {
    n: row?.n ?? 0,
    hit_rate: row?.hit_rate ?? 0,
    mean_tokens: row?.mean_tokens ?? 0,
    mean_latency_ms: row?.mean_latency_ms ?? 0,
    outcome_counts,
    strategy_counts,
  };
}

/** Recent traces for the admin dashboard / cocoindex back-fill. */
export async function getRecentCoordinationTraces(
  env: Env,
  opts?: { limit?: number; strategy?: CoordinationStrategy },
): Promise<CoordinationTraceRow[]> {
  await ensureSchema(env);
  const limit = opts?.limit ?? 50;
  let sql = `SELECT * FROM coordination_traces WHERE 1=1`;
  const binds: (string | number)[] = [];
  if (opts?.strategy) {
    sql += ` AND strategy = ?`;
    binds.push(opts.strategy);
  }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  binds.push(limit);
  const { results } = await env.LEDGER.prepare(sql).bind(...binds).all<CoordinationTraceRow>();
  return (results ?? []).map((r) => ({
    ...r,
    requested_providers: safeParse(r.requested_providers, []),
    participating: safeParse(r.participating, []),
  })) as CoordinationTraceRow[];
}

function safeParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
