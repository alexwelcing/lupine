/**
 * Research hits — actionable findings extracted from M2.7 reasoning narratives.
 *
 * A "hit" is one of:
 *   - missing_experiment: the literature gap that, if filled, would resolve a
 *     hypothesis. Most valuable kind — these are the experiments WE could run.
 *   - contradiction: two cited insights that disagree on a measurable claim
 *   - reinforcement: independent corroboration of a foundation claim (F1..F4)
 *   - surprise: high-relevance insight whose verdict differs from naive expectation
 *
 * Lifecycle: M2.7 emits a HITLIST: block during reasonOnHypothesis, we parse +
 * dedupe + persist, humans triage via /admin/hitlist (status transitions).
 *
 * Dedup strategy: sha-1-ish fingerprint of (hypothesis_id, kind, normalized
 * first-50-words-of-summary). Same hit re-discovered within 14d → skip.
 */
import type { Env } from "../types";

const TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS research_hits (
    id TEXT PRIMARY KEY,
    hypothesis_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('missing_experiment','contradiction','reinforcement','surprise')),
    summary TEXT NOT NULL,
    proposed_action TEXT,
    source_insight_ids TEXT,
    source_claim_id TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','pursuing','resolved','dismissed')),
    dedup_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    notes TEXT
  )
`;
const STATUS_KIND_INDEX = `CREATE INDEX IF NOT EXISTS idx_hits_status_kind ON research_hits(status, kind)`;
const HYP_INDEX = `CREATE INDEX IF NOT EXISTS idx_hits_hypothesis ON research_hits(hypothesis_id)`;
const DEDUP_INDEX = `CREATE INDEX IF NOT EXISTS idx_hits_dedup ON research_hits(dedup_key)`;
const CREATED_INDEX = `CREATE INDEX IF NOT EXISTS idx_hits_created_at ON research_hits(created_at DESC)`;

let schemaReady = false;
async function ensureSchema(env: Env): Promise<void> {
  if (schemaReady) return;
  await env.LEDGER.prepare(TABLE_DDL).run();
  await env.LEDGER.prepare(STATUS_KIND_INDEX).run();
  await env.LEDGER.prepare(HYP_INDEX).run();
  await env.LEDGER.prepare(DEDUP_INDEX).run();
  await env.LEDGER.prepare(CREATED_INDEX).run();
  schemaReady = true;
}

export type HitKind = "missing_experiment" | "contradiction" | "reinforcement" | "surprise";
export type HitStatus = "open" | "pursuing" | "resolved" | "dismissed";

const VALID_KINDS = new Set<HitKind>(["missing_experiment", "contradiction", "reinforcement", "surprise"]);
const VALID_STATUSES = new Set<HitStatus>(["open", "pursuing", "resolved", "dismissed"]);

export interface ResearchHit {
  id: string;
  hypothesis_id: string;
  kind: HitKind;
  summary: string;
  proposed_action: string | null;
  source_insight_ids: string | null;
  source_claim_id: string | null;
  status: HitStatus;
  dedup_key: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

export interface ParsedHit {
  kind: HitKind;
  summary: string;
  proposed_action: string | null;
}

/**
 * Parse the HITLIST: block from a M2.7 reason narrative. Expected format
 * (one hit per line):
 *
 *   HITLIST:
 *   - [missing_experiment] short summary :: proposed action
 *   - [contradiction] paper A says X but paper B says Y :: design tie-breaker test
 *
 * The :: separator is optional. Kind tag is required. Summary must be > 15 chars.
 * Returns at most 6 hits per call (cap to keep table tidy).
 */
export function parseHitlistBlock(raw: string): ParsedHit[] {
  const m = raw.match(/HITLIST:\s*([\s\S]*?)(?=\nFOLLOW_UP_QUERIES:|$)/i);
  if (!m) return [];
  const hits: ParsedHit[] = [];
  for (const line of m[1].split("\n")) {
    const lm = line.match(/^\s*[-*•]\s*\[(missing_experiment|contradiction|reinforcement|surprise)\]\s*(.+?)\s*$/i);
    if (!lm) continue;
    const kind = lm[1].toLowerCase() as HitKind;
    const body = lm[2].trim();
    let summary = body;
    let action: string | null = null;
    const sepIdx = body.indexOf("::");
    if (sepIdx > 0) {
      summary = body.slice(0, sepIdx).trim();
      action = body.slice(sepIdx + 2).trim() || null;
    }
    if (summary.length < 15) continue;
    hits.push({ kind, summary, proposed_action: action });
    if (hits.length >= 6) break;
  }
  return hits;
}

function normalizeForDedup(summary: string): string {
  return summary
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 50)
    .join(" ");
}

function dedupKey(hypothesisId: string, kind: HitKind, summary: string): string {
  return `${hypothesisId}|${kind}|${normalizeForDedup(summary)}`;
}

const DEDUP_WINDOW_DAYS = 14;

/**
 * Persist parsed hits, deduping against any open/pursuing hit with the same
 * dedup_key created in the last 14 days. Returns the IDs of newly inserted
 * rows (skipped duplicates aren't returned).
 */
export async function persistHits(
  env: Env,
  opts: {
    hypothesis_id: string;
    source_claim_id: string | null;
    source_insight_ids: string[];
    parsed: ParsedHit[];
  },
): Promise<{ inserted: string[]; skipped_duplicate: number }> {
  await ensureSchema(env);
  const inserted: string[] = [];
  let skipped = 0;
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_DAYS * 86400_000).toISOString();
  const insightIdsCsv = opts.source_insight_ids.join(",") || null;

  for (const hit of opts.parsed) {
    const key = dedupKey(opts.hypothesis_id, hit.kind, hit.summary);
    const existing = await env.LEDGER
      .prepare(
        `SELECT id FROM research_hits
          WHERE dedup_key = ?1 AND created_at >= ?2
            AND status IN ('open','pursuing')
          LIMIT 1`,
      )
      .bind(key, cutoff)
      .first<{ id: string }>()
      .catch(() => null);
    if (existing) {
      skipped += 1;
      continue;
    }
    const id = `hit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await env.LEDGER
        .prepare(
          `INSERT INTO research_hits
             (id, hypothesis_id, kind, summary, proposed_action,
              source_insight_ids, source_claim_id, status, dedup_key,
              created_at, updated_at, notes)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'open', ?8, ?9, ?9, NULL)`,
        )
        .bind(
          id,
          opts.hypothesis_id,
          hit.kind,
          hit.summary,
          hit.proposed_action,
          insightIdsCsv,
          opts.source_claim_id,
          key,
          now,
        )
        .run();
      inserted.push(id);
    } catch (e) {
      console.error(`persistHits: insert failed for ${id}:`, e);
    }
  }

  return { inserted, skipped_duplicate: skipped };
}

export interface HitListEntry extends ResearchHit {
  hypothesis_title: string | null;
  age_hours: number;
}

/**
 * List hits with optional filters. Default sort: open first, then by
 * created_at DESC. Capped at 100 rows.
 */
export async function listHits(
  env: Env,
  opts: { kind?: HitKind; status?: HitStatus; hypothesis_id?: string; limit?: number },
): Promise<{ hits: HitListEntry[]; totals_by_kind: Record<HitKind, number> }> {
  await ensureSchema(env);
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
  const where: string[] = [];
  const binds: unknown[] = [];
  if (opts.kind) {
    where.push(`h.kind = ?${binds.length + 1}`);
    binds.push(opts.kind);
  }
  if (opts.status) {
    where.push(`h.status = ?${binds.length + 1}`);
    binds.push(opts.status);
  }
  if (opts.hypothesis_id) {
    where.push(`h.hypothesis_id = ?${binds.length + 1}`);
    binds.push(opts.hypothesis_id);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  binds.push(limit);

  const rows = await env.LEDGER
    .prepare(
      `SELECT h.id, h.hypothesis_id, h.kind, h.summary, h.proposed_action,
              h.source_insight_ids, h.source_claim_id, h.status, h.dedup_key,
              h.created_at, h.updated_at, h.notes,
              hyp.title AS hypothesis_title
         FROM research_hits h
         LEFT JOIN hypotheses hyp ON hyp.id = h.hypothesis_id
         ${whereSql}
         ORDER BY
           CASE h.status
             WHEN 'open' THEN 0
             WHEN 'pursuing' THEN 1
             WHEN 'resolved' THEN 2
             WHEN 'dismissed' THEN 3
           END,
           h.created_at DESC
         LIMIT ?${binds.length}`,
    )
    .bind(...binds)
    .all<ResearchHit & { hypothesis_title: string | null }>()
    .catch(() => ({ results: [] as Array<ResearchHit & { hypothesis_title: string | null }> }));

  const now = Date.now();
  const enriched: HitListEntry[] = (rows.results ?? []).map((r) => ({
    ...r,
    age_hours: Math.round((now - new Date(r.created_at).getTime()) / 3600_000),
  }));

  const totals = await env.LEDGER
    .prepare(
      `SELECT kind, COUNT(*) AS n FROM research_hits
        WHERE status IN ('open','pursuing')
        GROUP BY kind`,
    )
    .all<{ kind: HitKind; n: number }>()
    .catch(() => ({ results: [] as Array<{ kind: HitKind; n: number }> }));

  const totalsByKind: Record<HitKind, number> = {
    missing_experiment: 0,
    contradiction: 0,
    reinforcement: 0,
    surprise: 0,
  };
  for (const row of totals.results ?? []) {
    if (VALID_KINDS.has(row.kind)) totalsByKind[row.kind] = row.n;
  }

  return { hits: enriched, totals_by_kind: totalsByKind };
}

export async function updateHitStatus(
  env: Env,
  opts: { id: string; status: HitStatus; note?: string },
): Promise<{ ok: boolean; updated?: ResearchHit; error?: string }> {
  await ensureSchema(env);
  if (!VALID_STATUSES.has(opts.status)) {
    return { ok: false, error: `invalid status: ${opts.status}` };
  }
  const existing = await env.LEDGER
    .prepare(`SELECT * FROM research_hits WHERE id = ?1`)
    .bind(opts.id)
    .first<ResearchHit>()
    .catch(() => null);
  if (!existing) return { ok: false, error: `hit not found: ${opts.id}` };

  const now = new Date().toISOString();
  const noteSuffix = opts.note
    ? `${existing.notes ? existing.notes + "\n" : ""}[${now}] ${existing.status} -> ${opts.status}: ${opts.note}`
    : existing.notes;

  await env.LEDGER
    .prepare(
      `UPDATE research_hits
          SET status = ?1, updated_at = ?2, notes = ?3
        WHERE id = ?4`,
    )
    .bind(opts.status, now, noteSuffix, opts.id)
    .run();

  return {
    ok: true,
    updated: { ...existing, status: opts.status, updated_at: now, notes: noteSuffix },
  };
}
