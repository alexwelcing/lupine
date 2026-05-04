/**
 * Knowledge-graph snapshot: JOIN across hypotheses, claims, literature_insights,
 * literature_papers, and research_hits → return a typed {nodes, edges} payload
 * the /graph HTML page renders with cytoscape.js.
 *
 * Goals:
 *   - Surface the implicit graph that already exists in D1 (hypothesis evidence_ids,
 *     claim.claim_data.tested_hypotheses, insight foreign keys, paper citations,
 *     hit.hypothesis_id) as a single queryable artifact.
 *   - Be cheap: each table queried once, joined in memory. No N+1.
 *   - Be honest: every node has a type and a stable id; every edge has a kind so
 *     the FE can filter and color.
 */
import type { Env } from "../types";

// Runtime data nodes — populated by buildGraphSnapshot from D1 rows.
export type RuntimeNodeKind =
  | "hypothesis"
  | "claim"
  | "insight"
  | "paper"
  | "hit"
  | "vignette"
  | "critique"
  | "theory"
  | "deployment"
  | "experiment_run"
  | "pending_experiment";

// Architecture nodes — populated by buildArchSnapshot from the static topology
// of the Cloudflare deployment. Distinct from runtime kinds so the FE can color
// + filter them independently.
export type ArchNodeKind =
  | "cf_worker"
  | "d1_table"
  | "r2_prefix"
  | "kv_namespace"
  | "queue_binding"
  | "do_class"
  | "cron"
  | "ai_binding"
  | "external_api"
  | "endpoint_group";

export type GraphNodeKind = RuntimeNodeKind | ArchNodeKind;

// Runtime edges — relationships between data rows.
export type RuntimeEdgeKind =
  | "has_insight"
  | "cites_paper"
  | "has_hit"
  | "evidenced_by"
  | "tested_by"
  | "vignette_of"
  | "critiques"
  | "theorizes_on";

// Architecture edges — how the worker's pieces wire together.
export type ArchEdgeKind =
  | "mounts"           // worker → binding / DO class
  | "schedules"        // worker → cron
  | "reads"            // endpoint/DO → table
  | "writes"           // endpoint/DO/cron → table or R2 prefix
  | "calls"            // endpoint/cron → external API
  | "delegates"        // endpoint group → DO class
  | "produces"         // endpoint → queue
  | "consumed_by"      // queue → worker
  | "contains";        // R2 binding → R2 prefix

export type GraphEdgeKind = RuntimeEdgeKind | ArchEdgeKind;

export interface GraphNode {
  id: string;
  type: GraphNodeKind;
  label: string;
  // type-specific scalars (optional — present only when meaningful for that type)
  status?: string | null;
  confidence?: number | null;
  relevance?: number | null;
  verdict?: string | null;
  kind?: string | null;
  claim_type?: string | null;
  year?: number | null;
  source?: string | null;
  created_at?: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    nodes_total: number;
    edges_total: number;
    by_type: Record<GraphNodeKind, number>;
    by_edge_kind: Record<GraphEdgeKind, number>;
    generated_at: string;
  };
}

interface HypothesisRow {
  id: string;
  title: string;
  status: string | null;
  confidence: number | null;
  evidence_ids: string | null;
  created_at: string | null;
}

interface ClaimRow {
  claim_id: string;
  claim_type: string;
  claim_data: string | null;
  confidence: number | null;
  status: string | null;
  description: string | null;
  created_at: string | null;
}

interface InsightRow {
  insight_id: string;
  paper_doi: string;
  hypothesis_id: string;
  key_finding: string;
  relevance_score: number | null;
  agrees_or_refutes: string | null;
  extracted_at: string | null;
}

interface PaperRow {
  doi: string;
  title: string;
  year: number | null;
  source: string | null;
}

interface HitRow {
  id: string;
  hypothesis_id: string;
  kind: string;
  summary: string;
  status: string | null;
  created_at: string | null;
}

interface VignetteRow {
  vignette_id: string;
  date_key: string;
  status: string | null;
  prompt: string | null;
  claim_ids: string | null;
  created_at: string | null;
}

interface CritiqueRow {
  id: string;
  source: string | null;
  question: string | null;
  target_hypothesis_id: string | null;
  status: string | null;
  created_at: string | null;
  completed_at: string | null;
}

interface TheoryRow {
  theory_id: string;
  observation_claim_id: string | null;
  explanation: string | null;
  prediction: string | null;
  timestamp: string | null;
}

interface DeploymentRow {
  id: string;
  service: string | null;
  status: string | null;
  branch: string | null;
  commit_sha: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface ExperimentRunRow {
  run_id: string;
  potential_label: string | null;
  element: string | null;
  status: string | null;
  records_count: number | null;
  timestamp: string | null;
}

interface PendingExperimentRow {
  experiment_id: string;
  element: string | null;
  potential_label: string | null;
  status: string | null;
  discriminative_property: string | null;
  created_at: string | null;
}

function safeArray<T>(p: Promise<{ results?: T[] }>): Promise<T[]> {
  return p.then(r => r.results ?? []).catch(() => [] as T[]);
}

// Stats records cover both runtime + architecture kinds. Runtime snapshot will
// have 0s for arch kinds and vice versa — caller filters as needed for display.
export function emptyNodeStats(): Record<GraphNodeKind, number> {
  return {
    // runtime
    hypothesis: 0, claim: 0, insight: 0, paper: 0, hit: 0,
    vignette: 0, critique: 0, theory: 0, deployment: 0,
    experiment_run: 0, pending_experiment: 0,
    // architecture
    cf_worker: 0, d1_table: 0, r2_prefix: 0, kv_namespace: 0, queue_binding: 0,
    do_class: 0, cron: 0, ai_binding: 0, external_api: 0, endpoint_group: 0,
  };
}

export function emptyEdgeStats(): Record<GraphEdgeKind, number> {
  return {
    // runtime
    has_insight: 0, cites_paper: 0, has_hit: 0, evidenced_by: 0, tested_by: 0,
    vignette_of: 0, critiques: 0, theorizes_on: 0,
    // architecture
    mounts: 0, schedules: 0, reads: 0, writes: 0, calls: 0,
    delegates: 0, produces: 0, consumed_by: 0, contains: 0,
  };
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export async function buildGraphSnapshot(env: Env): Promise<GraphSnapshot> {
  // Single round of queries, no N+1. Each table is independently best-effort:
  // a missing schema (e.g. a fresh deploy where one DDL hasn't run) returns []
  // instead of crashing the whole snapshot.
  const [
    hypotheses, claims, insights, hits,
    vignettes, critiques, theories, deployments, experimentRuns, pendingExperiments,
  ] = await Promise.all([
    safeArray<HypothesisRow>(
      env.LEDGER.prepare(
        `SELECT id, title, status, confidence, evidence_ids, created_at
           FROM hypotheses
          ORDER BY created_at DESC
          LIMIT 500`,
      ).all<HypothesisRow>(),
    ),
    safeArray<ClaimRow>(
      env.LEDGER.prepare(
        `SELECT claim_id, claim_type, claim_data, confidence, status, description, created_at
           FROM claims
          ORDER BY created_at DESC
          LIMIT 500`,
      ).all<ClaimRow>(),
    ),
    safeArray<InsightRow>(
      env.LEDGER.prepare(
        `SELECT insight_id, paper_doi, hypothesis_id, key_finding,
                relevance_score, agrees_or_refutes, extracted_at
           FROM literature_insights
          ORDER BY extracted_at DESC
          LIMIT 1000`,
      ).all<InsightRow>(),
    ),
    safeArray<HitRow>(
      env.LEDGER.prepare(
        `SELECT id, hypothesis_id, kind, summary, status, created_at
           FROM research_hits
          ORDER BY created_at DESC
          LIMIT 500`,
      ).all<HitRow>(),
    ),
    safeArray<VignetteRow>(
      env.LEDGER.prepare(
        `SELECT vignette_id, date_key, status, prompt, claim_ids, created_at
           FROM daily_vignettes
          ORDER BY created_at DESC
          LIMIT 100`,
      ).all<VignetteRow>(),
    ),
    safeArray<CritiqueRow>(
      env.LEDGER.prepare(
        `SELECT id, source, question, target_hypothesis_id, status, created_at, completed_at
           FROM critiques
          ORDER BY created_at DESC
          LIMIT 200`,
      ).all<CritiqueRow>(),
    ),
    safeArray<TheoryRow>(
      env.LEDGER.prepare(
        `SELECT theory_id, observation_claim_id, explanation, prediction, timestamp
           FROM theories
          ORDER BY timestamp DESC
          LIMIT 200`,
      ).all<TheoryRow>(),
    ),
    safeArray<DeploymentRow>(
      env.LEDGER.prepare(
        `SELECT id, service, status, branch, commit_sha, started_at, completed_at
           FROM deployments
          ORDER BY completed_at DESC
          LIMIT 50`,
      ).all<DeploymentRow>(),
    ),
    safeArray<ExperimentRunRow>(
      env.LEDGER.prepare(
        `SELECT run_id, potential_label, element, status, records_count, timestamp
           FROM experiment_runs
          ORDER BY timestamp DESC
          LIMIT 100`,
      ).all<ExperimentRunRow>(),
    ),
    safeArray<PendingExperimentRow>(
      env.LEDGER.prepare(
        `SELECT experiment_id, element, potential_label, status, discriminative_property, created_at
           FROM pending_experiments
          ORDER BY created_at DESC
          LIMIT 100`,
      ).all<PendingExperimentRow>(),
    ),
  ]);

  // Papers come second — only the ones referenced by an insight (no orphan papers).
  const paperDois = Array.from(new Set(insights.map(i => i.paper_doi).filter(Boolean)));
  const papers: PaperRow[] = [];
  if (paperDois.length > 0) {
    // D1 placeholder limits — chunk in batches of 50 to stay well under 100.
    for (let i = 0; i < paperDois.length; i += 50) {
      const batch = paperDois.slice(i, i + 50);
      const placeholders = batch.map((_, idx) => `?${idx + 1}`).join(",");
      const rows = await safeArray<PaperRow>(
        env.LEDGER.prepare(
          `SELECT doi, title, year, source
             FROM literature_papers
            WHERE doi IN (${placeholders})`,
        ).bind(...batch).all<PaperRow>(),
      );
      papers.push(...rows);
    }
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const claimIds = new Set(claims.map(c => c.claim_id));
  const hypothesisIds = new Set(hypotheses.map(h => h.id));

  // --- nodes ---
  for (const h of hypotheses) {
    nodes.push({
      id: h.id,
      type: "hypothesis",
      label: h.title.length > 80 ? h.title.slice(0, 77) + "…" : h.title,
      status: h.status,
      confidence: h.confidence,
      created_at: h.created_at,
    });
  }
  for (const c of claims) {
    nodes.push({
      id: c.claim_id,
      type: "claim",
      label: (c.description ?? c.claim_type ?? c.claim_id).slice(0, 80),
      claim_type: c.claim_type,
      confidence: c.confidence,
      status: c.status,
      created_at: c.created_at,
    });
  }
  for (const ins of insights) {
    nodes.push({
      id: ins.insight_id,
      type: "insight",
      label: (ins.key_finding ?? ins.insight_id).slice(0, 80),
      relevance: ins.relevance_score,
      verdict: ins.agrees_or_refutes,
      created_at: ins.extracted_at,
    });
  }
  for (const p of papers) {
    nodes.push({
      id: p.doi,
      type: "paper",
      label: (p.title ?? p.doi).slice(0, 80),
      year: p.year,
      source: p.source,
    });
  }
  for (const x of hits) {
    nodes.push({
      id: x.id,
      type: "hit",
      label: (x.summary ?? x.id).slice(0, 80),
      kind: x.kind,
      status: x.status,
      created_at: x.created_at,
    });
  }
  for (const v of vignettes) {
    nodes.push({
      id: v.vignette_id,
      type: "vignette",
      label: `vignette ${v.date_key}`,
      status: v.status,
      created_at: v.created_at,
    });
  }
  for (const c of critiques) {
    nodes.push({
      id: c.id,
      type: "critique",
      label: (c.question ?? c.id).slice(0, 80),
      status: c.status,
      source: c.source,
      created_at: c.created_at,
    });
  }
  for (const t of theories) {
    nodes.push({
      id: t.theory_id,
      type: "theory",
      label: (t.explanation ?? t.theory_id).slice(0, 80),
      created_at: t.timestamp,
    });
  }
  for (const d of deployments) {
    nodes.push({
      id: d.id,
      type: "deployment",
      label: `${d.service ?? "deploy"} ${d.commit_sha ? d.commit_sha.slice(0, 7) : ""}`.trim(),
      status: d.status,
      created_at: d.started_at,
    });
  }
  for (const r of experimentRuns) {
    nodes.push({
      id: r.run_id,
      type: "experiment_run",
      label: `${r.element ?? "?"} / ${r.potential_label ?? "?"}`,
      status: r.status,
      created_at: r.timestamp,
    });
  }
  for (const p of pendingExperiments) {
    nodes.push({
      id: p.experiment_id,
      type: "pending_experiment",
      label: `${p.element ?? "?"} / ${p.potential_label ?? "?"} (${p.discriminative_property ?? "?"})`,
      status: p.status,
      created_at: p.created_at,
    });
  }

  // --- edges ---
  let edgeCounter = 0;
  const nextEdgeId = () => `e${++edgeCounter}`;

  // hypothesis → insight (has_insight)
  for (const ins of insights) {
    if (!hypothesisIds.has(ins.hypothesis_id)) continue;
    edges.push({
      id: nextEdgeId(),
      source: ins.hypothesis_id,
      target: ins.insight_id,
      kind: "has_insight",
    });
  }

  // insight → paper (cites_paper)
  const paperIds = new Set(papers.map(p => p.doi));
  for (const ins of insights) {
    if (!paperIds.has(ins.paper_doi)) continue;
    edges.push({
      id: nextEdgeId(),
      source: ins.insight_id,
      target: ins.paper_doi,
      kind: "cites_paper",
    });
  }

  // hypothesis → hit (has_hit)
  for (const x of hits) {
    if (!hypothesisIds.has(x.hypothesis_id)) continue;
    edges.push({
      id: nextEdgeId(),
      source: x.hypothesis_id,
      target: x.id,
      kind: "has_hit",
    });
  }

  // hypothesis → claim (evidenced_by)
  for (const h of hypotheses) {
    const ids = parseJsonArray(h.evidence_ids);
    for (const cid of ids) {
      if (!claimIds.has(cid)) continue;
      edges.push({
        id: nextEdgeId(),
        source: h.id,
        target: cid,
        kind: "evidenced_by",
      });
    }
  }

  // claim → hypothesis (tested_by) — read claim_data.tested_hypotheses[] when present
  for (const c of claims) {
    if (!c.claim_data) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(c.claim_data);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== "object") continue;
    const tested = (parsed as { tested_hypotheses?: unknown }).tested_hypotheses;
    if (!Array.isArray(tested)) continue;
    for (const hid of tested) {
      if (typeof hid !== "string") continue;
      if (!hypothesisIds.has(hid)) continue;
      edges.push({
        id: nextEdgeId(),
        source: c.claim_id,
        target: hid,
        kind: "tested_by",
      });
    }
  }

  // vignette → claim (vignette_of) from claim_ids json array
  for (const v of vignettes) {
    const ids = parseJsonArray(v.claim_ids);
    for (const cid of ids) {
      if (!claimIds.has(cid)) continue;
      edges.push({
        id: nextEdgeId(),
        source: v.vignette_id,
        target: cid,
        kind: "vignette_of",
      });
    }
  }

  // critique → hypothesis (critiques)
  for (const c of critiques) {
    if (!c.target_hypothesis_id) continue;
    if (!hypothesisIds.has(c.target_hypothesis_id)) continue;
    edges.push({
      id: nextEdgeId(),
      source: c.id,
      target: c.target_hypothesis_id,
      kind: "critiques",
    });
  }

  // theory → claim (theorizes_on)
  for (const t of theories) {
    if (!t.observation_claim_id) continue;
    if (!claimIds.has(t.observation_claim_id)) continue;
    edges.push({
      id: nextEdgeId(),
      source: t.theory_id,
      target: t.observation_claim_id,
      kind: "theorizes_on",
    });
  }

  // --- stats ---
  const byType = emptyNodeStats();
  for (const n of nodes) byType[n.type]++;

  const byEdgeKind = emptyEdgeStats();
  for (const e of edges) byEdgeKind[e.kind]++;

  return {
    nodes,
    edges,
    stats: {
      nodes_total: nodes.length,
      edges_total: edges.length,
      by_type: byType,
      by_edge_kind: byEdgeKind,
      generated_at: new Date().toISOString(),
    },
  };
}
