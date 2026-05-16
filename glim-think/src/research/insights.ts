/**
 * Literature insights — bridge between harvested papers and our active
 * hypotheses. Each insight row is one M2.7-extracted finding from one
 * paper, scored for relevance to one hypothesis.
 *
 * The point of this layer: turn a flat "we have papers" table into a
 * directed graph (paper → hypothesis with structured judgment), so when
 * we ask M2.7 to reason about a hypothesis, we can pull only the papers
 * with high relevance + cited findings instead of dumping every abstract.
 *
 * Manual flow:
 *   POST /admin/harvest    → fans out arXiv/SS/OpenAlex, persists papers
 *   POST /admin/comprehend → for one (paper_doi, hypothesis_id) pair,
 *                            run M2.7 read pass + persist insight
 *   POST /admin/reason     → for one hypothesis, gather top insights +
 *                            run M2.7 narrative + persist claim
 *   GET  /admin/insights   → list recent insights for human review
 */
import type { Env } from "../types";
import { selectModel, extractMiniMaxTokens } from "../agents/models";
import { generateText } from "ai";
import { searchLiterature } from "../literature";
import { parseHitlistBlock, persistHits } from "./hits";

const TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS literature_insights (
    insight_id TEXT PRIMARY KEY,
    paper_doi TEXT NOT NULL,
    hypothesis_id TEXT NOT NULL,
    key_finding TEXT NOT NULL,
    relevance_score REAL,
    agrees_or_refutes TEXT,
    extracted_at TEXT NOT NULL,
    model TEXT NOT NULL,
    raw_response TEXT
  )
`;

const PAPER_INDEX = `CREATE INDEX IF NOT EXISTS idx_insights_paper ON literature_insights(paper_doi)`;
const HYP_INDEX = `CREATE INDEX IF NOT EXISTS idx_insights_hypothesis ON literature_insights(hypothesis_id, relevance_score DESC)`;

let schemaReady = false;
async function ensureSchema(env: Env): Promise<void> {
  if (schemaReady) return;
  await env.LEDGER.prepare(TABLE_DDL).run();
  await env.LEDGER.prepare(PAPER_INDEX).run();
  await env.LEDGER.prepare(HYP_INDEX).run();
  schemaReady = true;
}

interface PaperRow {
  doi: string;
  arxiv_id: string | null;
  title: string;
  abstract: string;
  authors_json: string;
  year: number | null;
  venue: string | null;
  source: string;
}

interface HypothesisRow {
  id: string;
  title: string;
  status: string;
  confidence: number | null;
}

/**
 * Pull the IMMI paper's core claims as a foundation anchor. Hardcoded
 * here (matches the /research page) so every reasoning prompt stays
 * connected to the published paper's central narrative.
 */
const FOUNDATION_CLAIMS = [
  "Interatomic potential prediction errors live on a low-dimensional manifold (PR < 2.0 confirms hyper-ribbon structure).",
  "Pooled benchmark scores hide Simpson's-paradox-style attenuation: within-group correlations differ in magnitude (and sometimes sign) from pooled correlations.",
  "PC1 alignment splits elements into intrinsic vs form-intrinsic groups — Au/Ta/Nb/Ag/Cr/Pb/Pt align ≥0.85 across pair_styles, while Al/W/Fe/Ni align <0.7.",
  "Random-effects meta-analysis on relative errors gives a defensible single number when reporting potential quality across heterogeneous test sets.",
];

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * For one (paper, hypothesis) pair, ask M2.7 to extract the key finding
 * + relevance + agrees-or-refutes verdict. Persists one row in
 * literature_insights.
 */
export async function comprehendPaper(
  env: Env,
  opts: { paper_doi: string; hypothesis_id: string },
): Promise<{
  ok: boolean;
  insight_id?: string;
  paper_title?: string;
  hypothesis_title?: string;
  extracted?: { key_finding: string; relevance_score: number; agrees_or_refutes: string };
  raw?: string;
  error?: string;
  latency_ms: number;
  tokens_spent: number;
}> {
  await ensureSchema(env);
  const start = Date.now();

  const paper = await env.LEDGER
    .prepare(
      `SELECT doi, arxiv_id, title, abstract, authors_json, year, venue, source
         FROM literature_papers WHERE doi = ?1`,
    )
    .bind(opts.paper_doi)
    .first<PaperRow>()
    .catch(() => null);
  if (!paper) {
    return { ok: false, error: `paper not found: ${opts.paper_doi}`, latency_ms: Date.now() - start, tokens_spent: 0 };
  }

  const hyp = await env.LEDGER
    .prepare(`SELECT id, title, status, confidence FROM hypotheses WHERE id = ?1`)
    .bind(opts.hypothesis_id)
    .first<HypothesisRow>()
    .catch(() => null);
  if (!hyp) {
    return { ok: false, error: `hypothesis not found: ${opts.hypothesis_id}`, latency_ms: Date.now() - start, tokens_spent: 0 };
  }

  const prompt = [
    "You are a materials-science research assistant comprehending a paper.",
    "",
    `Paper: "${paper.title}"`,
    `Source: ${paper.source} · Year: ${paper.year ?? "?"} · Venue: ${paper.venue ?? "?"}`,
    `Abstract: ${paper.abstract.slice(0, 2500)}`,
    "",
    `Active hypothesis under test: "${hyp.title}"`,
    `Current status: ${hyp.status}, confidence: ${hyp.confidence ?? "n/a"}`,
    "",
    "Your task — output EXACTLY these three lines, RELEVANCE first, in this order:",
    "RELEVANCE: <single number 0.0 to 1.0, no extra text>",
    "VERDICT: <one word: supports | refutes | tangential | neutral | context>",
    "KEY_FINDING: <one sentence summarizing the paper's most relevant numerical or conceptual finding for this hypothesis>",
    "",
    "RELEVANCE anchors:",
    "  0.0 = different field entirely",
    "  0.2 = same broad domain but no specific bearing",
    "  0.4 = provides methodology, framework, or scale evidence that informs the hypothesis",
    "  0.6 = empirical evidence about a related system, family, or comparable claim",
    "  0.8 = empirical evidence about the SAME system / family the hypothesis names",
    "  1.0 = directly tests this exact hypothesis with quantitative results",
    "",
    "VERDICT 'context' = paper enriches the framing without supporting or refuting.",
    "",
    "Specific-name boost: if the abstract mentions a SPECIFIC element symbol",
    "(Au/Cu/Fe/Ni/Mo/W/etc.), method (MEAM/EAM/Tersoff/CHGNet/MACE/SNAP/etc.), or",
    "measurable quantity (PR, eigenvalue, elastic constant, PCA component) that ALSO",
    "appears in the hypothesis text, the relevance MUST be at least 0.5. Verbatim",
    "term overlap is meaningful signal — don't underrate it.",
    "",
    "Be honest but not overly strict — papers providing methodology, scale evidence,",
    "or related-system data are valuable context (≥ 0.4). Reserve 0.0-0.2 for papers",
    "in different fields. Do not invent findings. Quote numbers verbatim when relevant.",
    "",
    "CRITICAL: Do NOT name specific models, tools, or methods unless they are EXPLICITLY",
    "in the abstract above. Even if the hypothesis names CHGNet, MACE-MP, MEAM, etc.,",
    "do not write that the paper uses those unless the abstract says so. Write 'a deep",
    "learning potential' or 'a neural-network interatomic potential' instead. The reasoning",
    "step relies on you for ground truth — never substitute the hypothesis's vocabulary",
    "for the paper's actual claims.",
  ].join("\n");

  const model = selectModel(env, "deep");
  let raw = "";
  let tokens_spent = 0;
  try {
    const result = await generateText({
      model,
      prompt,
      maxOutputTokens: 2048,
      experimental_telemetry: { isEnabled: true, functionId: "research.comprehend-paper" },
    });
    tokens_spent = extractMiniMaxTokens(result.usage);
    raw = (result.text ?? "")
      .replace(/<think>[\s\S]*?<\/think>\s*/g, "")
      .trim();
  } catch (e) {
    return {
      ok: false,
      error: `M2.7 generateText failed: ${e instanceof Error ? e.message : String(e)}`,
      latency_ms: Date.now() - start,
      tokens_spent: 0,
    };
  }

  const keyFindingMatch = raw.match(/KEY_FINDING:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
  const relevanceMatch = raw.match(/RELEVANCE:\s*([0-9.]+)/);
  const verdictMatch = raw.match(/VERDICT:\s*(supports|refutes|tangential|neutral|context)/i);

  const extracted = {
    key_finding: keyFindingMatch?.[1].trim().slice(0, 1500) ?? "(parse failed)",
    relevance_score: Math.max(0, Math.min(1, parseFloat(relevanceMatch?.[1] ?? "0"))),
    agrees_or_refutes: (verdictMatch?.[1] ?? "neutral").toLowerCase(),
  };

  const insightId = newId("ins");
  await env.LEDGER
    .prepare(
      `INSERT INTO literature_insights
         (insight_id, paper_doi, hypothesis_id, key_finding, relevance_score,
          agrees_or_refutes, extracted_at, model, raw_response)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
    .bind(
      insightId,
      paper.doi,
      hyp.id,
      extracted.key_finding,
      extracted.relevance_score,
      extracted.agrees_or_refutes,
      new Date().toISOString(),
      "MiniMax-M2.7",
      raw.slice(0, 4000),
    )
    .run()
    .catch((e) => console.error("literature_insights insert failed:", e));

  return {
    ok: true,
    insight_id: insightId,
    paper_title: paper.title,
    hypothesis_title: hyp.title,
    extracted,
    raw,
    latency_ms: Date.now() - start,
    tokens_spent,
  };
}

interface InsightRow {
  insight_id: string;
  paper_doi: string;
  hypothesis_id: string;
  key_finding: string;
  relevance_score: number;
  agrees_or_refutes: string;
  extracted_at: string;
  paper_title?: string;
  paper_year?: number | null;
  paper_source?: string;
}

/**
 * Top insights for a hypothesis, joined to paper metadata so callers
 * (e.g. the reasoning prompt builder) can cite them.
 */
export async function topInsightsForHypothesis(
  env: Env,
  hypothesisId: string,
  limit = 5,
): Promise<InsightRow[]> {
  await ensureSchema(env);
  // Filter out relevance=0 noise. Pre-PR-#52 extracts hit 0.0 due to
  // truncation; we want only insights M2.7 actually judged as having
  // some bearing on the hypothesis. Threshold 0.15 (just above the
  // noise floor of "different field entirely").
  const rows = await env.LEDGER
    .prepare(
      `SELECT i.insight_id, i.paper_doi, i.hypothesis_id, i.key_finding,
              i.relevance_score, i.agrees_or_refutes, i.extracted_at,
              p.title AS paper_title, p.year AS paper_year, p.source AS paper_source
         FROM literature_insights i
         LEFT JOIN literature_papers p ON p.doi = i.paper_doi
        WHERE i.hypothesis_id = ?1 AND i.relevance_score >= 0.15
        ORDER BY i.relevance_score DESC, i.extracted_at DESC
        LIMIT ?2`,
    )
    .bind(hypothesisId, limit)
    .all<InsightRow>()
    .catch(() => ({ results: [] as InsightRow[] }));
  return rows.results ?? [];
}

/**
 * Run M2.7 reasoning on one hypothesis with literature insights + the
 * IMMI foundation as context. Persists a Claim row tagged
 * "theorist+minimax-m2.7+literature-grounded".
 *
 * Returns the narrative + the insights it cited, so the human reviewer
 * can judge quality.
 */
function parseReasonOutput(raw: string): {
  verdict: "supports" | "refutes" | "open" | "unknown";
  confidence: number | null;
  narrative: string;
  follow_up_queries: string[];
} {
  const verdictMatch = raw.match(/VERDICT:\s*(supports|refutes|open)/i);
  const confidenceMatch = raw.match(/CONFIDENCE:\s*([0-9.]+)/);
  // Narrative ends at the first of HITLIST:, FOLLOW_UP_QUERIES:, or EOF.
  const narrativeMatch = raw.match(/NARRATIVE:\s*([\s\S]*?)(?=\n(?:HITLIST|FOLLOW_UP_QUERIES):|$)/i);
  const followUpMatch = raw.match(/FOLLOW_UP_QUERIES:\s*([\s\S]*)$/i);
  const queries: string[] = [];
  if (followUpMatch) {
    for (const line of followUpMatch[1].split("\n")) {
      const m = line.match(/^\s*[-*•]\s*(.+?)$/);
      if (m && m[1].trim().length > 5) queries.push(m[1].trim());
    }
  }
  return {
    verdict: (verdictMatch?.[1].toLowerCase() ?? "unknown") as "supports" | "refutes" | "open" | "unknown",
    confidence: confidenceMatch ? Math.max(0, Math.min(1, parseFloat(confidenceMatch[1]))) : null,
    narrative: narrativeMatch?.[1].trim() ?? raw,
    follow_up_queries: queries.slice(0, 5),
  };
}

export async function reasonOnHypothesis(
  env: Env,
  opts: { hypothesis_id: string; insight_limit?: number; max_tokens?: number },
): Promise<{
  ok: boolean;
  hypothesis_title?: string;
  insights_used: InsightRow[];
  narrative?: string;
  verdict?: "supports" | "refutes" | "open" | "unknown";
  confidence?: number | null;
  follow_up_queries?: string[];
  raw?: string;
  claim_id?: string;
  hits_inserted?: string[];
  hits_skipped_duplicate?: number;
  latency_ms: number;
  tokens_spent: number;
  error?: string;
}> {
  await ensureSchema(env);
  const start = Date.now();

  const hyp = await env.LEDGER
    .prepare(`SELECT id, title, status, confidence FROM hypotheses WHERE id = ?1`)
    .bind(opts.hypothesis_id)
    .first<HypothesisRow>()
    .catch(() => null);
  if (!hyp) {
    return { ok: false, insights_used: [], error: `hypothesis not found`, latency_ms: Date.now() - start, tokens_spent: 0 };
  }

  const insights = await topInsightsForHypothesis(env, hyp.id, opts.insight_limit ?? 5);

  const insightLines = insights.length === 0
    ? "(no literature insights yet — reasoning from foundation only)"
    : insights
        .map(
          (i, idx) =>
            `[${idx + 1}] ${i.paper_title ?? i.paper_doi} (${i.paper_year ?? "?"}, ${i.paper_source ?? "?"}, relevance ${i.relevance_score.toFixed(2)}, ${i.agrees_or_refutes}): ${i.key_finding}`,
        )
        .join("\n");

  const prompt = [
    "You are the Theorist agent. Reason carefully about one hypothesis using",
    "the IMMI paper foundation and the cited literature insights below.",
    "",
    "## Foundation (from the IMMI paper, fixed):",
    ...FOUNDATION_CLAIMS.map((c, i) => `F${i + 1}. ${c}`),
    "",
    "## Hypothesis under reasoning:",
    `H: "${hyp.title}"`,
    `Current status: ${hyp.status}, confidence: ${hyp.confidence ?? "n/a"}`,
    "",
    "## Literature insights (ranked by relevance):",
    insightLines,
    "",
    "## Output exactly these sections in order:",
    "",
    "VERDICT: <one word: supports | refutes | open>",
    "CONFIDENCE: <single number 0.0-1.0>",
    "",
    "NARRATIVE:",
    "Write 4-7 sentences that:",
    "  - Cite at least 2 of the foundation claims (F1..F4) by number",
    "  - Cite at least 2 of the literature insights ([1], [2], ...) by number",
    "  - State the verdict and the reasoning behind the confidence number",
    "  - Quote specific numerical values when the literature provides them",
    "",
    "HITLIST:",
    "List 0-4 ACTIONABLE findings surfaced by this round, one per line.",
    "Format: - [KIND] short summary :: proposed action",
    "KIND must be exactly one of: missing_experiment, contradiction, reinforcement, surprise.",
    "  - missing_experiment: a test the literature has NOT done that would resolve H",
    "  - contradiction: two cited insights that disagree on a measurable claim",
    "  - reinforcement: independent corroboration of a foundation claim (F1..F4)",
    "  - surprise: a high-relevance insight whose verdict differs from naive expectation",
    "Examples:",
    "  - [missing_experiment] No paper has measured PR for E(3)-equivariant MLIPs on the IMMI benchmark suite :: rerun the IMMI participation-ratio analysis on a NequIP/MACE/Allegro ensemble",
    "  - [reinforcement] Insight [3] independently observes the same anharmonic split that drives F3 PC1 alignment :: cite alongside F3 in the next round",
    "Skip the section ENTIRELY (output 'HITLIST:' followed by no list items) if no hit clearly fits.",
    "Do NOT pad with weak observations. A hit must be specific and actionable.",
    "",
    "FOLLOW_UP_QUERIES:",
    "List 2-3 NEW literature search queries (one per line, prefixed with '- ').",
    "Each query MUST be a TIGHT keyword string of 4-10 words — like a",
    "search engine query, NOT a sentence. Example good queries:",
    "  - d-band center transition metals EAM potential",
    "  - MEAM angular term iron elastic constants benchmark",
    "  - cross-style PC1 alignment classical interatomic potentials",
    "Bad: 'Search for papers on d-band fullness and...' — drop 'search for',",
    "drop 'papers on', drop 'how does', drop articles ('the', 'a'). Just",
    "concrete nouns + element names + technique names.",
    "",
    "## Constraints:",
    "  - Do NOT invent findings beyond what is in the foundation or the insights",
    "  - Do NOT name specific tools/methods unless they are in an insight's KEY_FINDING",
    "  - Be precise about epistemic state — uncertainty is fine if warranted",
  ].join("\n");

  const model = selectModel(env, "deep");
  let raw = "";
  let tokens_spent = 0;
  try {
    // M2.7 spends ~half the token budget on <think> before producing the
    // visible narrative. Default 3000 → effectively ~1500 visible tokens.
    const result = await generateText({
      model,
      prompt,
      maxOutputTokens: opts.max_tokens ?? 3000,
      experimental_telemetry: { isEnabled: true, functionId: "research.reason-on-hypothesis" },
    });
    tokens_spent = extractMiniMaxTokens(result.usage);
    raw = (result.text ?? "")
      .replace(/<think>[\s\S]*?<\/think>\s*/g, "")
      .trim();
  } catch (e) {
    return {
      ok: false,
      hypothesis_title: hyp.title,
      insights_used: insights,
      error: `M2.7 generateText failed: ${e instanceof Error ? e.message : String(e)}`,
      latency_ms: Date.now() - start,
      tokens_spent: 0,
    };
  }

  // Persist as a Claim row so it shows up in /feed/recent-claims
  const claimId = `lit_grounded_${hyp.id.slice(0, 24)}_${Date.now()}`;
  const claimData = {
    hypothesis_id: hyp.id,
    insight_ids: insights.map((i) => i.insight_id),
    paper_dois: insights.map((i) => i.paper_doi),
    foundation_anchored: true,
  };
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
        "theorist+minimax-m2.7+literature-grounded",
        "LiteratureGroundedReasoning",
        JSON.stringify(claimData),
        JSON.stringify(insights.map((i) => i.insight_id)),
        hyp.confidence ?? 0.5,
        "proposed",
        raw.slice(0, 600),
        new Date().toISOString(),
      )
      .run();
  } catch (e) {
    console.error("reasonOnHypothesis: claim insert failed:", e);
  }

  const parsed = parseReasonOutput(raw);

  // Extract structured hits from the HITLIST: block (if M2.7 emitted one)
  // and persist them with dedup. Hits surface actionable findings — missing
  // experiments, contradictions, reinforcements, surprises — that humans can
  // triage via /admin/hitlist.
  let hitsInserted: string[] = [];
  let hitsSkipped = 0;
  try {
    const parsedHits = parseHitlistBlock(raw);
    if (parsedHits.length > 0) {
      const persisted = await persistHits(env, {
        hypothesis_id: hyp.id,
        source_claim_id: claimId,
        source_insight_ids: insights.map((i) => i.insight_id),
        parsed: parsedHits,
      });
      hitsInserted = persisted.inserted;
      hitsSkipped = persisted.skipped_duplicate;
    }
  } catch (e) {
    console.error("reasonOnHypothesis: hit persistence failed:", e);
  }

  return {
    ok: true,
    hypothesis_title: hyp.title,
    insights_used: insights,
    narrative: parsed.narrative,
    verdict: parsed.verdict,
    confidence: parsed.confidence,
    follow_up_queries: parsed.follow_up_queries,
    raw,
    claim_id: claimId,
    hits_inserted: hitsInserted,
    hits_skipped_duplicate: hitsSkipped,
    latency_ms: Date.now() - start,
    tokens_spent,
  };
}

export interface IterateRoundResult {
  round: number;
  verdict: "supports" | "refutes" | "open" | "unknown";
  confidence: number | null;
  insights_count: number;
  high_relevance_count: number;
  follow_up_queries: string[];
  papers_harvested_this_round: number;
  papers_comprehended_this_round: number;
  hits_inserted_this_round: number;
  tokens_spent_this_round: number;
  narrative: string;
  claim_id?: string;
}

export interface IterateResult {
  hypothesis_id: string;
  hypothesis_title: string;
  rounds: IterateRoundResult[];
  converged: boolean;
  convergence_reason: string;
  total_papers_added: number;
  total_insights_added: number;
  total_tokens_spent: number;
  duration_ms: number;
  lean_readiness: LeanReadiness;
}

export interface LeanReadiness {
  ready: boolean;
  reasons: string[];
  checklist: {
    confidence_gte_0_85: boolean;
    verdict_stable_3_rounds: boolean;
    high_relevance_insights_gte_5: boolean;
    no_recent_refutations: boolean;
    numeric_anchors_gte_3: boolean;
  };
}

// Threshold for what counts as "high-relevance" in the Lean gate.
// Empirically M2.7 lands most on-topic papers at 0.4-0.5; raised to 0.5
// was too strict (zero papers cleared it after 3 iterations on a
// well-targeted hypothesis). 0.4 = "provides methodology / scale
// evidence", which is the floor below which a paper isn't really
// load-bearing for a Lean attempt.
const HIGH_RELEVANCE_THRESHOLD = 0.4;

function assessLeanReadiness(rounds: IterateRoundResult[], highRelCount: number): LeanReadiness {
  const last = rounds[rounds.length - 1];
  const confidenceOk = (last?.confidence ?? 0) >= 0.85;
  const recent = rounds.slice(-3);
  const stableVerdict =
    recent.length >= 3 &&
    recent.every((r) => r.verdict === last.verdict) &&
    last.verdict !== "unknown";
  const insightsOk = highRelCount >= 5;
  const noRecentRefutations =
    recent.length === 0 || !recent.some((r) => r.verdict === "refutes");
  // Require ≥3 distinct numeric anchors (e.g. "0.85", "346.7", "0.019")
  // in the narrative before formalization is allowed. Round 3 narrowly
  // passed the old single-number check on one quote — that bar was too soft.
  const MIN_NUMERIC_ANCHORS = 3;
  const numericAnchors = new Set(
    (last?.narrative ?? "").match(/\b\d+\.\d+\b/g) ?? [],
  );
  const formalizable =
    (last?.verdict === "supports" || last?.verdict === "refutes") &&
    numericAnchors.size >= MIN_NUMERIC_ANCHORS;

  const checklist = {
    confidence_gte_0_85: confidenceOk,
    verdict_stable_3_rounds: stableVerdict,
    high_relevance_insights_gte_5: insightsOk,
    no_recent_refutations: noRecentRefutations,
    numeric_anchors_gte_3: formalizable,
  };

  const ready = Object.values(checklist).every(Boolean);
  const reasons: string[] = [];
  if (!confidenceOk) reasons.push(`confidence ${last?.confidence ?? 0} < 0.85`);
  if (!stableVerdict) reasons.push(`verdict not stable across 3 rounds`);
  if (!insightsOk) reasons.push(`only ${highRelCount} high-relevance insights (need >= 5)`);
  if (!noRecentRefutations) reasons.push(`recent round produced refutation`);
  if (!formalizable) reasons.push(`verdict open OR only ${numericAnchors.size} numeric anchors (need >= ${MIN_NUMERIC_ANCHORS})`);
  if (ready) reasons.push("all gates passed — Lean formalization can begin");

  return { ready, reasons, checklist };
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
  "by", "from", "as", "is", "are", "was", "were", "be", "been", "this",
  "that", "these", "those", "what", "which", "how", "why", "when", "where",
]);

function queryFingerprint(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
    .sort()
    .join(" ");
}

/**
 * Strip M2.7's framing prefixes so the search engines receive a tight
 * keyword query rather than a research-request sentence.
 */
function cleanQuery(q: string): string {
  return q
    .replace(/^(?:search\s+for|query|look\s+for|find|search|investigate)\s*[":]*/i, "")
    .replace(/^["'`]+|["'`.,;:]+$/g, "")
    .replace(/\s*[—–-]\s+(?:targets?|tests?|seeks?|determines?|examines?|asks?)\s+.*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 250);
}

/**
 * Manually override an insight's relevance + verdict. Use when M2.7
 * underrated a paper that a human reader judges directly relevant.
 * The original `raw_response` is preserved in a note for audit.
 */
export async function promoteInsight(
  env: Env,
  opts: {
    insight_id: string;
    new_relevance?: number;
    new_verdict?: string;
    note?: string;
  },
): Promise<{ ok: boolean; updated?: InsightRow; error?: string }> {
  await ensureSchema(env);
  const existing = await env.LEDGER
    .prepare(
      `SELECT insight_id, paper_doi, hypothesis_id, key_finding,
              relevance_score, agrees_or_refutes, extracted_at
         FROM literature_insights WHERE insight_id = ?1`,
    )
    .bind(opts.insight_id)
    .first<InsightRow>()
    .catch(() => null);
  if (!existing) {
    return { ok: false, error: `insight not found: ${opts.insight_id}` };
  }

  const newRel =
    typeof opts.new_relevance === "number"
      ? Math.max(0, Math.min(1, opts.new_relevance))
      : existing.relevance_score;
  const newVerdict = opts.new_verdict ?? existing.agrees_or_refutes;
  const noteSuffix = opts.note ? ` // human note: ${opts.note}` : "";

  await env.LEDGER
    .prepare(
      `UPDATE literature_insights
          SET relevance_score = ?1,
              agrees_or_refutes = ?2,
              raw_response = COALESCE(raw_response, '') || ?3
        WHERE insight_id = ?4`,
    )
    .bind(
      newRel,
      newVerdict,
      `\n[promoted at ${new Date().toISOString()}: relevance ${existing.relevance_score} -> ${newRel}, verdict ${existing.agrees_or_refutes} -> ${newVerdict}${noteSuffix}]`,
      opts.insight_id,
    )
    .run();

  return {
    ok: true,
    updated: {
      ...existing,
      relevance_score: newRel,
      agrees_or_refutes: newVerdict,
    },
  };
}

interface LeanStatusEntry {
  hypothesis_id: string;
  hypothesis_title: string;
  status: string;
  confidence: number | null;
  insight_count: number;
  high_relevance_count: number;
  recent_claim_id: string | null;
}

/**
 * Cross-hypothesis snapshot for the lean-readiness gate. Doesn't run
 * iterate (cheap read-only DB query). Useful for spotting which
 * hypotheses are closest to the gate without paying the M2.7 cost.
 */
export async function leanStatusOverview(env: Env): Promise<LeanStatusEntry[]> {
  await ensureSchema(env);
  const hypotheses = await env.LEDGER
    .prepare(
      `SELECT id, title, status, confidence FROM hypotheses
        WHERE status IN ('proposed', 'testing')
        ORDER BY updated_at DESC`,
    )
    .all<HypothesisRow>()
    .catch(() => ({ results: [] as HypothesisRow[] }));

  const out: LeanStatusEntry[] = [];
  for (const h of hypotheses.results ?? []) {
    const counts = await env.LEDGER
      .prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN relevance_score >= ?2 THEN 1 ELSE 0 END) AS high_rel
           FROM literature_insights
          WHERE hypothesis_id = ?1 AND relevance_score >= 0.15`,
      )
      .bind(h.id, HIGH_RELEVANCE_THRESHOLD)
      .first<{ total: number; high_rel: number }>()
      .catch(() => ({ total: 0, high_rel: 0 }));

    const recentClaim = await env.LEDGER
      .prepare(
        `SELECT claim_id FROM claims
          WHERE claim_type = 'LiteratureGroundedReasoning'
            AND json_extract(claim_data, '$.hypothesis_id') = ?1
          ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(h.id)
      .first<{ claim_id: string }>()
      .catch(() => null);

    out.push({
      hypothesis_id: h.id,
      hypothesis_title: h.title,
      status: h.status,
      confidence: h.confidence,
      insight_count: counts?.total ?? 0,
      high_relevance_count: counts?.high_rel ?? 0,
      recent_claim_id: recentClaim?.claim_id ?? null,
    });
  }
  return out;
}

/**
 * Iterative deepening loop: reason → harvest follow-ups → comprehend →
 * reason again. Stops when verdict + confidence stabilize OR when the
 * round budget is exhausted OR when no new follow-up queries surface.
 *
 * NOT a Lean-proof generator — this is the gate that decides whether a
 * Lean attempt is justified. Use the returned lean_readiness checklist.
 */
export async function iterateOnHypothesis(
  env: Env,
  opts: {
    hypothesis_id: string;
    max_rounds?: number;
    papers_per_query?: number;
    sources?: string[];
  },
): Promise<IterateResult> {
  await ensureSchema(env);
  const start = Date.now();
  const maxRounds = Math.min(opts.max_rounds ?? 3, 6);
  const papersPerQuery = Math.min(opts.papers_per_query ?? 3, 6);
  const sources = (opts.sources ?? ["arxiv", "openalex"]) as Array<
    "arxiv" | "openalex" | "semantic_scholar"
  >;

  const hyp = await env.LEDGER
    .prepare(`SELECT id, title, status, confidence FROM hypotheses WHERE id = ?1`)
    .bind(opts.hypothesis_id)
    .first<HypothesisRow>()
    .catch(() => null);
  if (!hyp) {
    return {
      hypothesis_id: opts.hypothesis_id,
      hypothesis_title: "(not found)",
      rounds: [],
      converged: false,
      convergence_reason: "hypothesis not found",
      total_papers_added: 0,
      total_insights_added: 0,
      total_tokens_spent: 0,
      duration_ms: Date.now() - start,
      lean_readiness: assessLeanReadiness([], 0),
    };
  }

  const rounds: IterateRoundResult[] = [];
  const seenQueries = new Set<string>();
  let totalPapersAdded = 0;
  let totalInsightsAdded = 0;
  let totalTokensSpent = 0;
  let convergenceReason = "max rounds reached";

  for (let round = 1; round <= maxRounds; round++) {
    let roundTokens = 0;
    const reasoned = await reasonOnHypothesis(env, {
      hypothesis_id: hyp.id,
      insight_limit: 7,
      max_tokens: 3000,
    });
    if (!reasoned.ok) {
      convergenceReason = `reason failed in round ${round}: ${reasoned.error}`;
      break;
    }
    roundTokens += reasoned.tokens_spent ?? 0;

    const insightsCount = reasoned.insights_used.length;
    const highRelCount = reasoned.insights_used.filter((i) => i.relevance_score >= HIGH_RELEVANCE_THRESHOLD).length;
    let papersHarvestedThisRound = 0;
    let papersComprehendedThisRound = 0;

    const followUps = (reasoned.follow_up_queries ?? []).filter((q) => {
      const fp = queryFingerprint(q);
      if (seenQueries.has(fp)) return false;
      seenQueries.add(fp);
      return true;
    });

    if (followUps.length > 0 && round < maxRounds) {
      for (const rawQuery of followUps.slice(0, 3)) {
        const query = cleanQuery(rawQuery);
        if (query.length < 5) continue;
        try {
          const harvest = await searchLiterature(env, query, {
            max: papersPerQuery,
            sources,
          });
          for (const [, papers] of Object.entries(harvest.results) as Array<[string, Array<{ doi: string }>]>) {
            for (const paper of papers) {
              papersHarvestedThisRound += 1;
              const comp = await comprehendPaper(env, {
                paper_doi: paper.doi,
                hypothesis_id: hyp.id,
              });
              if (comp.ok) papersComprehendedThisRound += 1;
              roundTokens += comp.tokens_spent ?? 0;
            }
          }
        } catch (e) {
          console.error(`iterate round ${round}: harvest failed for "${query}":`, e);
        }
      }
      totalPapersAdded += papersHarvestedThisRound;
      totalInsightsAdded += papersComprehendedThisRound;
    }

    rounds.push({
      round,
      verdict: reasoned.verdict ?? "unknown",
      confidence: reasoned.confidence ?? null,
      insights_count: insightsCount,
      high_relevance_count: highRelCount,
      follow_up_queries: followUps,
      papers_harvested_this_round: papersHarvestedThisRound,
      papers_comprehended_this_round: papersComprehendedThisRound,
      hits_inserted_this_round: reasoned.hits_inserted?.length ?? 0,
      tokens_spent_this_round: roundTokens,
      narrative: reasoned.narrative ?? "",
      claim_id: reasoned.claim_id,
    });
    
    totalTokensSpent += roundTokens;

    if (round >= 2) {
      const prev = rounds[rounds.length - 2];
      const curr = rounds[rounds.length - 1];
      if (
        curr.verdict === prev.verdict &&
        curr.verdict !== "unknown" &&
        Math.abs((curr.confidence ?? 0) - (prev.confidence ?? 0)) < 0.05 &&
        followUps.length === 0
      ) {
        convergenceReason = `verdict + confidence stable at round ${round}, no new queries`;
        break;
      }
    }
    if (followUps.length === 0 && round >= 2) {
      convergenceReason = `no new follow-up queries after round ${round}`;
      break;
    }
  }

  const finalHighRel =
    rounds.length === 0 ? 0 : rounds[rounds.length - 1].high_relevance_count;

  return {
    hypothesis_id: hyp.id,
    hypothesis_title: hyp.title,
    rounds,
    converged: rounds.length < maxRounds,
    convergence_reason: convergenceReason,
    total_papers_added: totalPapersAdded,
    total_insights_added: totalInsightsAdded,
    total_tokens_spent: totalTokensSpent,
    duration_ms: Date.now() - start,
    lean_readiness: assessLeanReadiness(rounds, finalHighRel),
  };
}
