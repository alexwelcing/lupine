/**
 * Architecture-layer graph: hand-curated topology of the Cloudflare deployment.
 * Nodes are CF resources (worker, D1 tables, R2 prefixes, queue binding, KV,
 * DO classes, cron schedules, AI binding) plus the external APIs the worker
 * calls and the public endpoint groups that touch them.
 *
 * Live row counts are pulled from D1 at request time so the architecture view
 * reflects reality, not a stale README. R2 object counts are skipped (LIST is
 * paginated and rate-limited; the FE shows "—" for those).
 *
 * Single source of truth — re-edit when:
 *   - new D1 tables are added (TABLES)
 *   - new cron schedules wired (CRONS)
 *   - new outbound APIs (EXTERNAL_APIS)
 *   - new DO classes (DO_CLASSES)
 *   - new endpoint groups (ENDPOINT_GROUPS) and their reads/writes
 */
import type { Env } from "../types";
import type { GraphEdge, GraphNode, GraphSnapshot, ArchEdgeKind } from "./snapshot";
import { emptyNodeStats, emptyEdgeStats } from "./snapshot";

const WORKER_ID = "worker:glim-think-v1";

const TABLES = [
  "hypotheses", "claims", "literature_insights", "literature_papers",
  "research_hits", "daily_vignettes", "critiques", "theories",
  "deployments", "experiment_runs", "pending_experiments", "records",
  "cron_runs", "ops_errors", "smoketest_runs", "lab_broadcasts",
  "research_jobs", "literaturist_searches", "causal_screens", "manifold_runs",
  "extensions", "orchestrator_state", "fleets",
] as const;

const R2_PREFIXES = [
  { id: "r2:claim-images", label: "claim-images/" },
  { id: "r2:vignettes", label: "vignettes/" },
  { id: "r2:critiques", label: "critiques/" },
  { id: "r2:raw-papers", label: "raw-papers/" },
  { id: "r2:artifacts", label: "artifacts/" },
];

const DO_CLASSES = [
  { id: "do:Orchestrator", label: "Orchestrator" },
  { id: "do:Manifold", label: "Manifold" },
  { id: "do:Causal", label: "Causal" },
  { id: "do:Theorist", label: "Theorist" },
  { id: "do:Experiment", label: "Experiment" },
  { id: "do:FleetOrchestrator", label: "FleetOrchestrator" },
  { id: "do:DashboardAgent", label: "DashboardAgent" },
  { id: "do:ExtensionManager", label: "ExtensionManager" },
  { id: "do:Literaturist", label: "Literaturist" },
];

const CRONS = [
  { id: "cron:5min", label: "*/5 * * * *  (smoketest + vignette poll)" },
  { id: "cron:hourly", label: "0 * * * *  (lab broadcast)" },
  { id: "cron:daily-6am", label: "0 6 * * *  (deploy status sync)" },
  { id: "cron:daily-7am", label: "0 7 * * *  (daily Hailuo vignette)" },
  { id: "cron:weekly-mon-9am", label: "0 9 * * MON  (weekly autoresearch)" },
];

const EXTERNAL_APIS = [
  { id: "api:minimax", label: "MiniMax" },
  { id: "api:arxiv", label: "arXiv" },
  { id: "api:semanticscholar", label: "Semantic Scholar" },
  { id: "api:openalex", label: "OpenAlex" },
  { id: "api:openkim", label: "OpenKIM" },
  { id: "api:github-actions", label: "GitHub Actions API" },
];

const ENDPOINT_GROUPS = [
  { id: "ep:hypotheses", label: "/hypotheses" },
  { id: "ep:claims", label: "/claims/*" },
  { id: "ep:literature", label: "/literature/*" },
  { id: "ep:research", label: "/research/*" },
  { id: "ep:admin", label: "/admin/*" },
  { id: "ep:feed", label: "/feed/*" },
  { id: "ep:ops", label: "/ops/*" },
  { id: "ep:experiments", label: "/experiments/*" },
  { id: "ep:graph", label: "/graph + /graph.json" },
  { id: "ep:dashboard", label: "/dashboard*" },
  { id: "ep:agents", label: "/agents/*" },
];

// Static edge list. Edge ids are generated at build time; only kind matters here.
const STATIC_EDGES: Array<{ source: string; target: string; kind: ArchEdgeKind }> = [
  // worker mounts every binding
  { source: WORKER_ID, target: "binding:d1", kind: "mounts" },
  { source: WORKER_ID, target: "binding:r2", kind: "mounts" },
  { source: WORKER_ID, target: "binding:kv", kind: "mounts" },
  { source: WORKER_ID, target: "binding:queue", kind: "mounts" },
  { source: WORKER_ID, target: "binding:ai", kind: "mounts" },
  ...DO_CLASSES.map(d => ({ source: WORKER_ID, target: d.id, kind: "mounts" as const })),
  ...CRONS.map(c => ({ source: WORKER_ID, target: c.id, kind: "schedules" as const })),

  // cron writes
  { source: "cron:5min", target: "t:smoketest_runs", kind: "writes" },
  { source: "cron:5min", target: "t:cron_runs", kind: "writes" },
  { source: "cron:5min", target: "t:daily_vignettes", kind: "writes" },
  { source: "cron:hourly", target: "t:lab_broadcasts", kind: "writes" },
  { source: "cron:hourly", target: "t:cron_runs", kind: "writes" },
  { source: "cron:daily-6am", target: "t:deployments", kind: "writes" },
  { source: "cron:daily-6am", target: "api:github-actions", kind: "calls" },
  { source: "cron:daily-7am", target: "t:daily_vignettes", kind: "writes" },
  { source: "cron:daily-7am", target: "api:minimax", kind: "calls" },
  { source: "cron:weekly-mon-9am", target: "t:records", kind: "writes" },
  { source: "cron:weekly-mon-9am", target: "t:claims", kind: "writes" },

  // endpoint groups: reads + writes
  { source: "ep:hypotheses", target: "t:hypotheses", kind: "reads" },
  { source: "ep:hypotheses", target: "t:hypotheses", kind: "writes" },
  { source: "ep:claims", target: "t:claims", kind: "reads" },
  { source: "ep:claims", target: "t:claims", kind: "writes" },
  { source: "ep:literature", target: "t:literature_papers", kind: "reads" },
  { source: "ep:literature", target: "t:literature_papers", kind: "writes" },
  { source: "ep:literature", target: "api:arxiv", kind: "calls" },
  { source: "ep:literature", target: "api:semanticscholar", kind: "calls" },
  { source: "ep:literature", target: "api:openalex", kind: "calls" },
  { source: "ep:research", target: "t:research_hits", kind: "reads" },
  { source: "ep:research", target: "t:daily_vignettes", kind: "writes" },
  { source: "ep:research", target: "api:minimax", kind: "calls" },
  { source: "ep:admin", target: "t:literature_insights", kind: "writes" },
  { source: "ep:admin", target: "t:literature_papers", kind: "reads" },
  { source: "ep:admin", target: "t:research_hits", kind: "writes" },
  { source: "ep:admin", target: "t:claims", kind: "writes" },
  { source: "ep:admin", target: "api:minimax", kind: "calls" },
  { source: "ep:admin", target: "binding:ai", kind: "calls" },
  { source: "ep:feed", target: "t:claims", kind: "reads" },
  { source: "ep:feed", target: "t:hypotheses", kind: "reads" },
  { source: "ep:feed", target: "t:research_hits", kind: "reads" },
  { source: "ep:feed", target: "t:daily_vignettes", kind: "reads" },
  { source: "ep:ops", target: "t:deployments", kind: "reads" },
  { source: "ep:ops", target: "t:cron_runs", kind: "reads" },
  { source: "ep:ops", target: "t:ops_errors", kind: "reads" },
  { source: "ep:ops", target: "t:smoketest_runs", kind: "reads" },
  { source: "ep:experiments", target: "t:pending_experiments", kind: "reads" },
  { source: "ep:experiments", target: "t:experiment_runs", kind: "reads" },
  { source: "ep:graph", target: "t:hypotheses", kind: "reads" },
  { source: "ep:graph", target: "t:claims", kind: "reads" },
  { source: "ep:graph", target: "t:literature_insights", kind: "reads" },
  { source: "ep:graph", target: "t:literature_papers", kind: "reads" },
  { source: "ep:graph", target: "t:research_hits", kind: "reads" },
  { source: "ep:graph", target: "t:daily_vignettes", kind: "reads" },
  { source: "ep:graph", target: "t:critiques", kind: "reads" },
  { source: "ep:graph", target: "t:theories", kind: "reads" },
  { source: "ep:graph", target: "t:deployments", kind: "reads" },
  { source: "ep:dashboard", target: "do:DashboardAgent", kind: "delegates" },
  { source: "ep:agents", target: "do:Orchestrator", kind: "delegates" },
  { source: "ep:agents", target: "do:Manifold", kind: "delegates" },
  { source: "ep:agents", target: "do:Causal", kind: "delegates" },
  { source: "ep:agents", target: "do:Theorist", kind: "delegates" },
  { source: "ep:agents", target: "do:Experiment", kind: "delegates" },
  { source: "ep:agents", target: "do:FleetOrchestrator", kind: "delegates" },
  { source: "ep:agents", target: "do:Literaturist", kind: "delegates" },

  // DO classes write their own state tables
  { source: "do:Orchestrator", target: "t:orchestrator_state", kind: "writes" },
  { source: "do:Theorist", target: "t:theories", kind: "writes" },
  { source: "do:Manifold", target: "t:manifold_runs", kind: "writes" },
  { source: "do:Causal", target: "t:causal_screens", kind: "writes" },
  { source: "do:Experiment", target: "t:experiment_runs", kind: "writes" },
  { source: "do:Experiment", target: "t:pending_experiments", kind: "writes" },
  { source: "do:FleetOrchestrator", target: "t:fleets", kind: "writes" },
  { source: "do:Literaturist", target: "t:literaturist_searches", kind: "writes" },
  { source: "do:Literaturist", target: "t:literature_papers", kind: "writes" },
  { source: "do:DashboardAgent", target: "t:records", kind: "reads" },

  // R2 binding contains its prefixes
  { source: "binding:r2", target: "r2:claim-images", kind: "contains" },
  { source: "binding:r2", target: "r2:vignettes", kind: "contains" },
  { source: "binding:r2", target: "r2:critiques", kind: "contains" },
  { source: "binding:r2", target: "r2:raw-papers", kind: "contains" },
  { source: "binding:r2", target: "r2:artifacts", kind: "contains" },
  { source: "ep:admin", target: "r2:claim-images", kind: "writes" },
  { source: "ep:research", target: "r2:vignettes", kind: "writes" },
  { source: "ep:admin", target: "r2:critiques", kind: "writes" },
  { source: "ep:literature", target: "r2:raw-papers", kind: "writes" },

  // queue produced + consumed by the same worker
  { source: "ep:research", target: "binding:queue", kind: "produces" },
  { source: "binding:queue", target: WORKER_ID, kind: "consumed_by" },
];

async function safeCount(env: Env, table: string): Promise<number> {
  try {
    const row = await env.LEDGER
      .prepare(`SELECT COUNT(*) AS n FROM ${table}`)
      .first<{ n: number }>();
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

export async function buildArchSnapshot(env: Env): Promise<GraphSnapshot> {
  const counts = await Promise.all(
    TABLES.map(t => safeCount(env, t).then(n => [t, n] as const)),
  );
  const countMap: Record<string, number> = Object.fromEntries(counts);

  const nodes: GraphNode[] = [];

  // Worker root
  nodes.push({ id: WORKER_ID, type: "cf_worker", label: "glim-think-v1" });

  // Bindings — anchor nodes the worker mounts
  nodes.push({ id: "binding:d1", type: "d1_table", label: "D1: glim-ledger", kind: "binding" });
  nodes.push({ id: "binding:r2", type: "r2_prefix", label: "R2: glim-artifacts", kind: "binding" });
  nodes.push({ id: "binding:kv", type: "kv_namespace", label: "KV: CONFIG" });
  nodes.push({ id: "binding:queue", type: "queue_binding", label: "Queue: glim-research-queue" });
  nodes.push({ id: "binding:ai", type: "ai_binding", label: "Workers AI" });

  // D1 tables — labels include current row counts
  for (const t of TABLES) {
    const n = countMap[t] ?? 0;
    nodes.push({
      id: `t:${t}`,
      type: "d1_table",
      label: `${t} · ${n.toLocaleString()}`,
      kind: "table",
    });
  }

  // R2 prefixes
  for (const p of R2_PREFIXES) {
    nodes.push({ id: p.id, type: "r2_prefix", label: p.label, kind: "prefix" });
  }

  // DO classes
  for (const d of DO_CLASSES) {
    nodes.push({ id: d.id, type: "do_class", label: d.label });
  }

  // Cron schedules
  for (const c of CRONS) {
    nodes.push({ id: c.id, type: "cron", label: c.label });
  }

  // External APIs
  for (const a of EXTERNAL_APIS) {
    nodes.push({ id: a.id, type: "external_api", label: a.label });
  }

  // Endpoint groups
  for (const e of ENDPOINT_GROUPS) {
    nodes.push({ id: e.id, type: "endpoint_group", label: e.label });
  }

  // Filter edges to those with both endpoints present
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges: GraphEdge[] = [];
  let i = 0;
  for (const e of STATIC_EDGES) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    edges.push({ id: `ae${++i}`, source: e.source, target: e.target, kind: e.kind });
  }

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
