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
import { selectModel } from "../agents/models";
import { generateText } from "ai";

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
    return { ok: false, error: `paper not found: ${opts.paper_doi}`, latency_ms: Date.now() - start };
  }

  const hyp = await env.LEDGER
    .prepare(`SELECT id, title, status, confidence FROM hypotheses WHERE id = ?1`)
    .bind(opts.hypothesis_id)
    .first<HypothesisRow>()
    .catch(() => null);
  if (!hyp) {
    return { ok: false, error: `hypothesis not found: ${opts.hypothesis_id}`, latency_ms: Date.now() - start };
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
  try {
    const result = await generateText({ model, prompt, maxOutputTokens: 2048 });
    raw = (result.text ?? "")
      .replace(/<think>[\s\S]*?<\/think>\s*/g, "")
      .trim();
  } catch (e) {
    return {
      ok: false,
      error: `M2.7 generateText failed: ${e instanceof Error ? e.message : String(e)}`,
      latency_ms: Date.now() - start,
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
  const rows = await env.LEDGER
    .prepare(
      `SELECT i.insight_id, i.paper_doi, i.hypothesis_id, i.key_finding,
              i.relevance_score, i.agrees_or_refutes, i.extracted_at,
              p.title AS paper_title, p.year AS paper_year, p.source AS paper_source
         FROM literature_insights i
         LEFT JOIN literature_papers p ON p.doi = i.paper_doi
        WHERE i.hypothesis_id = ?1
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
export async function reasonOnHypothesis(
  env: Env,
  opts: { hypothesis_id: string; insight_limit?: number; max_tokens?: number },
): Promise<{
  ok: boolean;
  hypothesis_title?: string;
  insights_used: InsightRow[];
  narrative?: string;
  raw?: string;
  claim_id?: string;
  latency_ms: number;
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
    return { ok: false, insights_used: [], error: `hypothesis not found`, latency_ms: Date.now() - start };
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
    "## Your task:",
    "Write a 4-7 sentence interpretation that:",
    "  - Cites at least 2 of the foundation claims (F1..F4) by number",
    "  - Cites at least 2 of the literature insights ([1], [2], ...) by number",
    "  - States whether the literature SUPPORTS, REFUTES, or LEAVES OPEN the hypothesis",
    "  - Proposes one concrete next experiment if the verdict is unclear",
    "  - Quotes specific numerical values when the literature provides them",
    "",
    "Do NOT invent findings beyond what is in the foundation or the insights.",
    "Be precise about your epistemic state — uncertainty is fine if warranted.",
  ].join("\n");

  const model = selectModel(env, "deep");
  let raw = "";
  try {
    const result = await generateText({ model, prompt, maxOutputTokens: opts.max_tokens ?? 1024 });
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

  return {
    ok: true,
    hypothesis_title: hyp.title,
    insights_used: insights,
    narrative: raw,
    claim_id: claimId,
    latency_ms: Date.now() - start,
  };
}
