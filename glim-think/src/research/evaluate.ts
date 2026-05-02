/**
 * Phase E — hypothesis evaluator (worker-side).
 *
 * Computes pearson-r within each pair_style for the hypothesis's
 * target element (or pooled if not element-specific) and uses the
 * relationship between within-style r and pooled r as a confidence
 * signal:
 *
 *   - All within-style r >= 0.9 AND pooled r < 0.5  →  Simpson-like
 *     attenuation. Confirms ecological-fallacy / dichotomy claims.
 *   - All within-style r >= 0.9 AND pooled r >= 0.7 →  consistent
 *     correlation regardless of stratification.
 *   - within-style and pooled both low → weak signal, likely refuted.
 *
 * The full bootstrap + permutation-null analysis remains in
 * lupine-distill (Rust). This worker-side evaluator is a fast
 * approximation that runs every hour against the freshest D1 data
 * without needing the local engine. It updates the hypothesis row's
 * confidence + inserts a Claim row capturing the snapshot.
 *
 * Hypothesis title→target_element heuristic: extracts the first
 * 1-or-2-letter capitalized atomic symbol from the title; falls back
 * to pooled analysis across all elements.
 */
import type { Env } from "../types";

interface EvalRow {
  potential_id: string;
  pair_style: string;
  property: string;
  reference: number;
  predicted: number;
}

const ELEMENT_PATTERN = /\b(Al|Cu|Ni|Ag|Au|Pt|Pd|Pb|Fe|Cr|Mo|W|V|Nb|Ta)\b/;

function inferElement(title: string): string | null {
  const match = title.match(ELEMENT_PATTERN);
  return match ? match[1] : null;
}

function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return Number.NaN;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n;
  const my = sy / n;
  let cov = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  const denom = Math.sqrt(vx * vy);
  return denom === 0 ? Number.NaN : cov / denom;
}

interface StyleEvalResult {
  pair_style: string;
  n: number;
  r: number;
}

interface EvaluationSummary {
  hypothesis_id: string;
  target_element: string | null;
  n_records: number;
  pooled_r: number | null;
  within_style: StyleEvalResult[];
  within_style_min_r: number | null;
  within_style_max_r: number | null;
  attenuation_detected: boolean;
  verdict: "supports_dichotomy" | "supports_universal" | "weak" | "insufficient_data";
}

async function loadRecords(
  env: Env,
  element: string | null,
): Promise<EvalRow[]> {
  const sql = element
    ? `SELECT potential_id, pair_style, property, reference, predicted
         FROM records
        WHERE element = ?1 AND reference != 0
        ORDER BY pair_style, potential_id`
    : `SELECT potential_id, pair_style, property, reference, predicted
         FROM records
        WHERE reference != 0
        ORDER BY pair_style, potential_id`;
  const stmt = element
    ? env.LEDGER.prepare(sql).bind(element)
    : env.LEDGER.prepare(sql);
  const rows = await stmt.all<EvalRow>();
  return rows.results ?? [];
}

function summarize(
  hypothesisId: string,
  element: string | null,
  records: EvalRow[],
): EvaluationSummary {
  if (records.length < 3) {
    return {
      hypothesis_id: hypothesisId,
      target_element: element,
      n_records: records.length,
      pooled_r: null,
      within_style: [],
      within_style_min_r: null,
      within_style_max_r: null,
      attenuation_detected: false,
      verdict: "insufficient_data",
    };
  }

  // Pooled across all styles
  const refs = records.map((r) => r.reference);
  const preds = records.map((r) => r.predicted);
  const pooled = pearson(refs, preds);

  // Within each pair_style
  const byStyle = new Map<string, EvalRow[]>();
  for (const row of records) {
    const arr = byStyle.get(row.pair_style) ?? [];
    arr.push(row);
    byStyle.set(row.pair_style, arr);
  }

  const within: StyleEvalResult[] = [];
  for (const [style, rows] of byStyle.entries()) {
    if (rows.length < 3) continue;
    const r = pearson(
      rows.map((x) => x.reference),
      rows.map((x) => x.predicted),
    );
    if (Number.isFinite(r)) {
      within.push({ pair_style: style, n: rows.length, r });
    }
  }

  const minR =
    within.length > 0 ? Math.min(...within.map((w) => w.r)) : null;
  const maxR =
    within.length > 0 ? Math.max(...within.map((w) => w.r)) : null;

  // Attenuation: at least one style has |r| >= 0.9 but pooled |r| < 0.5
  const attenuation =
    Number.isFinite(pooled) &&
    within.length >= 2 &&
    Math.abs(pooled) < 0.5 &&
    within.filter((w) => Math.abs(w.r) >= 0.9).length >= 2;

  let verdict: EvaluationSummary["verdict"] = "weak";
  if (attenuation) verdict = "supports_dichotomy";
  else if (Number.isFinite(pooled) && Math.abs(pooled) >= 0.85) verdict = "supports_universal";

  return {
    hypothesis_id: hypothesisId,
    target_element: element,
    n_records: records.length,
    pooled_r: Number.isFinite(pooled) ? pooled : null,
    within_style: within,
    within_style_min_r: minR,
    within_style_max_r: maxR,
    attenuation_detected: attenuation,
    verdict,
  };
}

function confidenceFromVerdict(summary: EvaluationSummary): number {
  if (summary.verdict === "supports_dichotomy") return 0.85;
  if (summary.verdict === "supports_universal") return 0.8;
  if (summary.verdict === "weak") return 0.3;
  return 0.0;
}

function nextStatusFromVerdict(
  summary: EvaluationSummary,
): "proposed" | "testing" | "confirmed" | "refuted" {
  if (summary.verdict === "insufficient_data") return "proposed";
  if (summary.verdict === "weak") return "testing";
  // The structural verdicts both update confidence; status moves to
  // 'testing' so the deeper distill engine can confirm with a permutation
  // null. We don't auto-confirm without a real null-model run.
  return "testing";
}

export async function evaluateHypothesis(
  env: Env,
  hypothesisId: string,
): Promise<EvaluationSummary> {
  const hyp = await env.LEDGER
    .prepare(`SELECT id, title FROM hypotheses WHERE id = ?1`)
    .bind(hypothesisId)
    .first<{ id: string; title: string }>();

  if (!hyp) {
    throw new Error(`Hypothesis ${hypothesisId} not found`);
  }

  const element = inferElement(hyp.title);
  const records = await loadRecords(env, element);
  const summary = summarize(hypothesisId, element, records);
  const confidence = confidenceFromVerdict(summary);
  const status = nextStatusFromVerdict(summary);
  const now = new Date().toISOString();

  // 1. Update hypothesis confidence + status
  await env.LEDGER
    .prepare(
      `UPDATE hypotheses
         SET status = ?1, confidence = ?2, updated_at = ?3
       WHERE id = ?4`,
    )
    .bind(status, confidence, now, hypothesisId)
    .run();

  // 2. Insert a Claim row capturing the evaluation snapshot
  const claimId = `auto_eval_${hypothesisId.slice(0, 24)}_${Date.now()}`;
  try {
    await env.LEDGER
      .prepare(
        `INSERT INTO claims
           (claim_id, agent_id, claim_type, claim_data, evidence_ids,
            confidence, status, description, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      )
      .bind(
        claimId,
        "glim-think:auto-evaluator",
        "AutoHypothesisEvaluation",
        JSON.stringify(summary),
        JSON.stringify([]),
        confidence,
        summary.verdict === "supports_dichotomy" ? "proposed" : "proposed",
        `Auto-eval ${hypothesisId.slice(0, 32)}: pooled r=${summary.pooled_r?.toFixed(3) ?? "n/a"}, within-style r∈[${summary.within_style_min_r?.toFixed(2) ?? "?"}, ${summary.within_style_max_r?.toFixed(2) ?? "?"}], n=${summary.n_records}, verdict=${summary.verdict}`,
        now,
      )
      .run();
  } catch (e) {
    console.error("evaluateHypothesis: claim insert failed:", e);
  }

  return summary;
}
