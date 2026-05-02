/**
 * Phase E — auto research orchestrator.
 *
 * Runs once per hour (after the broadcast cron) to keep the research
 * loop moving without human input. Each tick:
 *
 *   1. Picks the next element from a rotating window stored in KV.
 *   2. Enqueues a research round (manifold + causal analysis on that
 *      element's records).
 *   3. Enqueues a literature investigation for the leading hypothesis
 *      title (rotates through proposed hypotheses).
 *   4. Picks the oldest 'proposed' hypothesis without a recent evaluation
 *      and enqueues an `evaluate` task — the evaluate handler computes
 *      pearson-r within element and updates the hypothesis confidence.
 *
 * State stored in KV under `research:rotation`:
 *   {
 *     element_idx: number,           // index into ROTATION_ELEMENTS
 *     hypothesis_idx: number,        // index into proposed list
 *     last_tick: ISO timestamp
 *   }
 *
 * Idempotency comes from the queue's dedup_key — running this twice in
 * the same hour just coalesces.
 */
import type { Env } from "../types";
import { enqueueTask } from "./queue";

const ROTATION_ELEMENTS = [
  "Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb",
  "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta",
];

const ROTATION_KEY = "research:rotation";

interface RotationState {
  element_idx: number;
  hypothesis_idx: number;
  last_tick: string | null;
}

async function loadRotation(env: Env): Promise<RotationState> {
  try {
    const raw = await env.CONFIG.get(ROTATION_KEY);
    if (!raw) return { element_idx: 0, hypothesis_idx: 0, last_tick: null };
    return JSON.parse(raw) as RotationState;
  } catch {
    return { element_idx: 0, hypothesis_idx: 0, last_tick: null };
  }
}

async function saveRotation(env: Env, state: RotationState): Promise<void> {
  await env.CONFIG.put(ROTATION_KEY, JSON.stringify(state));
}

interface ProposedHypothesisRow {
  id: string;
  title: string;
  updated_at: string;
}

async function listStaleProposed(env: Env): Promise<ProposedHypothesisRow[]> {
  // 'proposed' hypotheses ordered oldest-updated first — those most
  // overdue for a fresh evaluation.
  const rows = await env.LEDGER
    .prepare(
      `SELECT id, title, updated_at
         FROM hypotheses
        WHERE status = 'proposed'
        ORDER BY updated_at ASC
        LIMIT 20`,
    )
    .all<ProposedHypothesisRow>();
  return rows.results ?? [];
}

export interface OrchestratorTickResult {
  enqueued: Array<{ kind: string; dedup_key: string; status: string }>;
  rotation: RotationState;
  notes: string[];
}

export async function runOrchestratorTick(
  env: Env,
): Promise<OrchestratorTickResult> {
  const state = await loadRotation(env);
  const enqueued: OrchestratorTickResult["enqueued"] = [];
  const notes: string[] = [];

  const element =
    ROTATION_ELEMENTS[state.element_idx % ROTATION_ELEMENTS.length];

  // 1. Research round on the current element
  const roundDedup = `auto-round:${element}:${new Date().toISOString().slice(0, 13)}`;
  const round = await enqueueTask(env, {
    kind: "round",
    dedup_key: roundDedup,
    enqueued_at: new Date().toISOString(),
    element,
    analysis_types: ["manifold", "causal"],
  });
  enqueued.push({ kind: "round", dedup_key: roundDedup, status: round.status });

  // 2. Pick a stale proposed hypothesis to evaluate
  const proposed = await listStaleProposed(env);
  if (proposed.length > 0) {
    const target = proposed[state.hypothesis_idx % proposed.length];
    const evalDedup = `auto-eval:${target.id}:${new Date().toISOString().slice(0, 10)}`;
    const evalResult = await enqueueTask(env, {
      kind: "evaluate",
      dedup_key: evalDedup,
      enqueued_at: new Date().toISOString(),
      hypothesis_id: target.id,
    });
    enqueued.push({ kind: "evaluate", dedup_key: evalDedup, status: evalResult.status });

    // 3. Literature investigation for that hypothesis title (snippet)
    const litQuery = target.title.slice(0, 120);
    const litDedup = `auto-lit:${target.id}:${new Date().toISOString().slice(0, 10)}`;
    const lit = await enqueueTask(env, {
      kind: "literature",
      dedup_key: litDedup,
      enqueued_at: new Date().toISOString(),
      query: litQuery,
      max: 5,
    });
    enqueued.push({ kind: "literature", dedup_key: litDedup, status: lit.status });
  } else {
    notes.push("no proposed hypotheses — skipped evaluate + literature");
  }

  const next: RotationState = {
    element_idx: (state.element_idx + 1) % ROTATION_ELEMENTS.length,
    hypothesis_idx:
      proposed.length > 0
        ? (state.hypothesis_idx + 1) % proposed.length
        : state.hypothesis_idx,
    last_tick: new Date().toISOString(),
  };
  await saveRotation(env, next);
  notes.push(`next element=${ROTATION_ELEMENTS[next.element_idx]}`);

  return { enqueued, rotation: next, notes };
}
