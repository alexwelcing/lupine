/**
 * Agents-layer snapshot: surfaces DO-local SQL row counts that env.LEDGER
 * cannot see. Each Durable Object exposes a `getStorageStats()` RPC that
 * returns its private table counts; this builder iterates the known DO
 * instance names and aggregates.
 *
 * Naming conventions:
 *   - Manifold:    `manifold-{ELEMENT}` (15 instances, one per benchmark element)
 *   - Causal:      `causal-main` (1 instance)
 *   - Theorist:    `auto-eval:{hypothesis_id}` (one per hypothesis ever evaluated)
 *   - Experiment:  `experiment-main` (1 instance)
 *   - Orchestrator: `orchestrator-{ELEMENT}` (15 instances, one per element)
 *                   + `critique-drain-{critique_id}` (one per drained critique)
 *   - FleetOrchestrator: `fleet-main-v2` (1 instance)
 *   - Literaturist: `literaturist-main` (1 instance)
 *
 * The endpoint is a snapshot, not a live tail — each call hits ~30 DO
 * instances. Cache control on the route limits churn.
 */
import type { Env } from "../types";

const ELEMENTS = ["Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb", "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"];

interface AgentInstanceStats {
  do_class: string;
  instance_name: string;
  tables: Record<string, number>;
  total_rows: number;
  error?: string;
}

interface DoBindingShape {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

async function probe(
  binding: DoBindingShape,
  doClass: string,
  instanceName: string,
): Promise<AgentInstanceStats> {
  try {
    const id = binding.idFromName(instanceName);
    const stub = binding.get(id);
    const stats = (await (stub as unknown as {
      getStorageStats: () => Promise<Record<string, number>>;
    }).getStorageStats()) as Record<string, number>;
    const total = Object.values(stats).reduce((s, n) => s + (Number(n) || 0), 0);
    return {
      do_class: doClass,
      instance_name: instanceName,
      tables: stats,
      total_rows: total,
    };
  } catch (e) {
    return {
      do_class: doClass,
      instance_name: instanceName,
      tables: {},
      total_rows: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export interface AgentsSnapshot {
  instances: AgentInstanceStats[];
  by_class: Record<string, { instances: number; total_rows: number; tables: Record<string, number> }>;
  total_rows: number;
  generated_at: string;
}

export async function buildAgentsSnapshot(env: Env): Promise<AgentsSnapshot> {
  // Theorist instance names come from hypotheses that have been auto-evaluated.
  // Look them up from claims of type AutoHypothesisEvaluation — those are the
  // hypotheses the auto-eval flow has actually touched.
  const evaluatedHyps = await env.LEDGER
    .prepare(
      `SELECT DISTINCT json_extract(claim_data, '$.hypothesis_id') AS hyp_id
         FROM claims
        WHERE claim_type = 'AutoHypothesisEvaluation'`,
    )
    .all<{ hyp_id: string | null }>()
    .catch(() => ({ results: [] as Array<{ hyp_id: string | null }> }));
  const theoristNames = (evaluatedHyps.results ?? [])
    .map(r => r.hyp_id)
    .filter((h): h is string => typeof h === "string" && h.length > 0)
    .map(h => `auto-eval:${h}`);

  const probes: Array<Promise<AgentInstanceStats>> = [];

  // Manifold — one per element
  for (const el of ELEMENTS) {
    probes.push(probe(env.MANIFOLD_AGENT, "Manifold", `manifold-${el}`));
  }

  // Causal — single canonical instance
  probes.push(probe(env.CAUSAL_AGENT, "Causal", "causal-main"));

  // Theorist — one per evaluated hypothesis
  for (const name of theoristNames) {
    probes.push(probe(env.THEORIST_AGENT, "Theorist", name));
  }

  // Experiment — single canonical instance
  probes.push(probe(env.EXPERIMENT_AGENT, "Experiment", "experiment-main"));

  // Orchestrator — one per element
  for (const el of ELEMENTS) {
    probes.push(probe(env.ORCHESTRATOR, "Orchestrator", `orchestrator-${el}`));
  }

  // FleetOrchestrator — single canonical instance
  probes.push(probe(env.FLEET_ORCHESTRATOR, "FleetOrchestrator", "fleet-main-v2"));

  // Literaturist — single canonical instance
  probes.push(probe(env.LITERATURIST_AGENT, "Literaturist", "literaturist-main"));

  const instances = await Promise.all(probes);

  // Aggregate by class.
  const byClass: Record<string, { instances: number; total_rows: number; tables: Record<string, number> }> = {};
  for (const inst of instances) {
    if (!byClass[inst.do_class]) {
      byClass[inst.do_class] = { instances: 0, total_rows: 0, tables: {} };
    }
    const acc = byClass[inst.do_class];
    acc.instances += 1;
    acc.total_rows += inst.total_rows;
    for (const [tbl, n] of Object.entries(inst.tables)) {
      acc.tables[tbl] = (acc.tables[tbl] ?? 0) + (Number(n) || 0);
    }
  }

  return {
    instances,
    by_class: byClass,
    total_rows: instances.reduce((s, i) => s + i.total_rows, 0),
    generated_at: new Date().toISOString(),
  };
}
