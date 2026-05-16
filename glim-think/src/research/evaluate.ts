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
import { getAgentByName } from "agents";
import type { Env } from "../types";
import { promptForEvaluationClaim } from "../agents/image";
import { narrationTextForClaim } from "../agents/tts";
import { enqueueTask } from "./queue";

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

/**
 * Build a synthesis prompt asking the Theorist to interpret the
 * statistical evaluation. Kept narrow on purpose — M2.7 is expensive
 * and reasoning-heavy, so we want a tight 3-5 sentence interpretation.
 */
function buildTheoristPrompt(
  hypothesisTitle: string,
  summary: EvaluationSummary,
): string {
  const styleLines = summary.within_style.slice(0, 8).map((s) =>
    `  - ${s.pair_style.padEnd(14)} n=${String(s.n).padEnd(4)} r=${s.r.toFixed(3)}`,
  ).join("\n");
  return [
    `Hypothesis under test: "${hypothesisTitle}"`,
    `Target element (inferred from title): ${summary.target_element ?? "pooled (all elements)"}`,
    `Evaluation result:`,
    `  - n_records: ${summary.n_records}`,
    `  - pooled pearson r: ${summary.pooled_r?.toFixed(4) ?? "insufficient data"}`,
    `  - within pair_style:`,
    styleLines,
    `  - within-style r range: [${summary.within_style_min_r?.toFixed(3) ?? "?"}, ${summary.within_style_max_r?.toFixed(3) ?? "?"}]`,
    `  - statistical verdict: ${summary.verdict}`,
    `  - attenuation detected: ${summary.attenuation_detected}`,
    ``,
    `Write a tight 3-5 sentence interpretation: what does this say about the hypothesis?`,
    `Cite the specific numbers. If verdict is "supports_dichotomy" call out the Simpson-like attenuation;`,
    `if "supports_universal" note that pooled and within-style agree;`,
    `if "weak" or "insufficient_data" say so plainly. Do NOT invent data.`,
  ].join("\n");
}

interface SynthesisResult {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    reasoningTokens?: number;
    totalTokens?: number;
  };
  latency_ms: number;
  error?: string;
}

/**
 * Invoke the Theorist DO for a one-shot M2.7 interpretation. RPC-call
 * across DO boundary; the agent's getModel() returns the wrapped
 * MiniMax model so spendMiddleware fires and /budget ticks.
 *
 * Best-effort: if the DO call fails, we still write the statistical
 * Claim, just without the narrative. The hypothesis update doesn't
 * depend on this.
 */
async function invokeTheorist(
  env: Env,
  hypothesisId: string,
  prompt: string,
): Promise<SynthesisResult> {
  const start = Date.now();
  try {
    // One DO instance per hypothesis so each one carries its own
    // Think session memory across evaluations. Cheap — DOs are lazy.
    // getAgentByName sets the stub name; raw idFromName/get throws
    // "Attempting to read .name on Theorist before it was set" when
    // synthesize() (GlimThinkAgent base) runs from the queue path
    // (cloudflare/workerd#2240).
    const stub = await getAgentByName(env.THEORIST_AGENT, `auto-eval:${hypothesisId}`);
    // RPC method exposed on GlimThinkAgent base class.
    const result = (await (stub as unknown as {
      synthesize: (opts: {
        prompt: string;
        maxOutputTokens?: number;
      }) => Promise<SynthesisResult>;
    }).synthesize({ prompt, maxOutputTokens: 768 }));
    return result;
  } catch (e) {
    return {
      text: "",
      latency_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function evaluateHypothesis(
  env: Env,
  hypothesisId: string,
): Promise<EvaluationSummary & { narrative?: string; narrative_error?: string }> {
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

  // 1. Theorist synthesis — only when we have enough data to say
  //    something meaningful. Skip the LLM call (and its M2.7 cost) for
  //    insufficient_data hypotheses.
  let narrative: string | undefined;
  let narrativeError: string | undefined;
  if (summary.verdict !== "insufficient_data") {
    const synth = await invokeTheorist(
      env,
      hypothesisId,
      buildTheoristPrompt(hyp.title, summary),
    );
    if (synth.error) {
      narrativeError = synth.error;
    } else if (synth.text) {
      narrative = synth.text;
    }
  }

  // 2. Update hypothesis confidence + status
  await env.LEDGER
    .prepare(
      `UPDATE hypotheses
         SET status = ?1, confidence = ?2, updated_at = ?3
       WHERE id = ?4`,
    )
    .bind(status, confidence, now, hypothesisId)
    .run();

  // 3. Insert a Claim row capturing the evaluation snapshot + narrative
  const claimId = `auto_eval_${hypothesisId.slice(0, 24)}_${Date.now()}`;
  const claimData = JSON.stringify({ ...summary, narrative, narrative_error: narrativeError });
  const description = narrative
    ? `Auto-eval ${hypothesisId.slice(0, 32)}: ${narrative.slice(0, 500)}`
    : `Auto-eval ${hypothesisId.slice(0, 32)}: pooled r=${summary.pooled_r?.toFixed(3) ?? "n/a"}, within-style r∈[${summary.within_style_min_r?.toFixed(2) ?? "?"}, ${summary.within_style_max_r?.toFixed(2) ?? "?"}], n=${summary.n_records}, verdict=${summary.verdict}`;
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
        narrative ? "theorist+minimax-m2.7" : "glim-think:auto-evaluator",
        "AutoHypothesisEvaluation",
        claimData,
        JSON.stringify([]),
        confidence,
        "proposed",
        description,
        now,
      )
      .run();
  } catch (e) {
    console.error("evaluateHypothesis: claim insert failed:", e);
  }

  // Fire-and-forget: enqueue a claim-image task so MiniMax image-01
  // generates a supporting visual asynchronously. Image landing later
  // is fine — the dashboard renders the placeholder until image_key
  // shows up on the claim row. Skip when the verdict is too thin to
  // bother spending image budget on.
  if (
    summary.verdict === "supports_dichotomy" ||
    summary.verdict === "supports_universal"
  ) {
    try {
      const imagePrompt = promptForEvaluationClaim({
        hypothesisTitle: hyp.title,
        verdict: summary.verdict,
        pooled_r: summary.pooled_r,
        within_min_r: summary.within_style_min_r,
        within_max_r: summary.within_style_max_r,
        target_element: summary.target_element,
        n_records: summary.n_records,
      });
      await enqueueTask(env, {
        kind: "claim-image",
        dedup_key: `claim-image:${claimId}`,
        enqueued_at: now,
        claim_id: claimId,
        prompt: imagePrompt,
      });
    } catch (e) {
      console.error("evaluateHypothesis: image enqueue failed:", e);
    }

    // Audio narration in parallel — TTS HD ~5-15s, runs as separate
    // queue task so the evaluate consumer doesn't block.
    try {
      const narrationText = narrationTextForClaim({
        hypothesisTitle: hyp.title,
        verdict: summary.verdict,
        pooled_r: summary.pooled_r,
        within_min_r: summary.within_style_min_r,
        within_max_r: summary.within_style_max_r,
        n_records: summary.n_records,
        narrative,
      });
      await enqueueTask(env, {
        kind: "claim-audio",
        dedup_key: `claim-audio:${claimId}`,
        enqueued_at: now,
        claim_id: claimId,
        text: narrationText,
      });
    } catch (e) {
      console.error("evaluateHypothesis: audio enqueue failed:", e);
    }
  }

  return { ...summary, narrative, narrative_error: narrativeError };
}
