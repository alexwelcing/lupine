/**
 * Memory client — HTTP bridge from the Omnigents coordinator to the GCP
 * evidence-index service.
 *
 * Two operations:
 *   1. consultMemory — BEFORE coordination, search past coordination traces
 *      for prompts similar to this one and return a per-strategy hit-rate
 *      bias. The coordinator uses this to steer strategy selection (the
 *      "flywheel": past results inform future picks).
 *   2. emitTrace — AFTER coordination, POST the trace to the index so future
 *      consultMemory calls have it. Fire-and-forget.
 *
 * Both degrade gracefully: if EVIDENCE_INDEX_URL is unset or the service is
 * unreachable, they return empty/void without blocking coordination. Memory
 * is an uplift, never a dependency.
 */
import type { Env } from "../types";
import type { CoordinationStrategy } from "./coordinator";

const CONSULT_TIMEOUT_MS = 800; // strict: coordination is on the hot path
const EMIT_TIMEOUT_MS = 3000;   // fire-and-forget but bounded

export interface MemoryBias {
  /** Per-strategy hit-rate computed from similar past prompts (0–1). */
  [strategy: string]: number;
}

export interface SearchHit {
  id: string;
  kind: string;
  ref_id: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

interface SearchResponse {
  count: number;
  results: SearchHit[];
}

/**
 * Consult the evidence index for past coordination results on similar prompts.
 * Returns a per-strategy hit-rate bias that the coordinator can use to steer
 * selection. On any error/timeout → empty bias (registry-only fallback).
 */
export async function consultMemory(
  env: Env,
  prompt: string,
  intent?: string,
  limit = 5,
): Promise<{ bias: MemoryBias; hits: SearchHit[] }> {
  const url = env.EVIDENCE_INDEX_URL?.trim();
  if (!url) return { bias: {}, hits: [] };

  try {
    const params = new URLSearchParams({
      q: prompt.slice(0, 500),
      limit: String(limit),
      kind: "coordination_trace",
      mode: "semantic",
    });
    const res = await fetch(`${url}/search?${params}`, {
      signal: AbortSignal.timeout(CONSULT_TIMEOUT_MS),
      headers: _authHeaders(env),
    });
    if (!res.ok) return { bias: {}, hits: [] };
    const data = (await res.json()) as SearchResponse;
    return { bias: _computeBias(data.results ?? []), hits: data.results ?? [] };
  } catch {
    // Timeout, DNS, network — memory is never a dependency.
    return { bias: {}, hits: [] };
  }
}

/**
 * POST a coordination trace to the evidence index for future search.
 * Fire-and-forget: never throws, never blocks. Called after coordination
 * completes.
 */
export async function emitTrace(
  env: Env,
  trace: {
    id: string;
    text: string;
    kind?: string;
    ref_id?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const url = env.EVIDENCE_INDEX_URL?.trim();
  if (!url) return;
  try {
    await fetch(`${url}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ..._authHeaders(env) },
      body: JSON.stringify({
        id: trace.id,
        kind: trace.kind ?? "coordination_trace",
        ref_id: trace.ref_id ?? trace.id,
        text: trace.text,
        metadata: trace.metadata ?? {},
      }),
      signal: AbortSignal.timeout(EMIT_TIMEOUT_MS),
    });
  } catch {
    // Best-effort; the trace is already in D1 (coordinatorTraces.ts) so a
    // missed /ingest is recoverable via a bulk backfill.
  }
}

/**
 * Compute a per-strategy hit-rate bias from past coordination hits.
 * Each hit's metadata carries the strategy + coordination_hit (0|1).
 * Returns { fan_out_merge: 0.8, race: 0.3, ... } — higher = better for
 * prompts like this one.
 */
function _computeBias(hits: SearchHit[]): MemoryBias {
  if (!hits || hits.length === 0) return {};
  const buckets: Record<string, { hits: number; total: number }> = {};
  for (const h of hits) {
    const strategy = String(h.metadata?.strategy ?? "");
    const hit = Number(h.metadata?.coordination_hit ?? 0);
    if (!strategy) continue;
    if (!buckets[strategy]) buckets[strategy] = { hits: 0, total: 0 };
    buckets[strategy].total++;
    if (hit === 1) buckets[strategy].hits++;
  }
  const bias: MemoryBias = {};
  for (const [s, b] of Object.entries(buckets)) {
    bias[s] = b.hits / b.total;
  }
  return bias;
}

function _authHeaders(env: Env): Record<string, string> {
  const token = env.EVIDENCE_INGEST_TOKEN?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Merge the memory bias into the resolved strategy. If memory strongly favors
 * a different strategy than the registry picks (bias ≥ 0.7 and registry's
 * pick has lower bias), switch to the memory-favored one. This is the
 * flywheel's active steering — conservative: only overrides on strong signal.
 */
export function applyMemoryBias(
  registryPick: CoordinationStrategy,
  bias: MemoryBias,
): CoordinationStrategy {
  const memoryPick = Object.entries(bias).sort(([, a], [, b]) => b - a)[0];
  if (!memoryPick) return registryPick;
  const [strategy, score] = memoryPick;
  // Only override on strong, well-separated signal.
  if (score >= 0.7 && (bias[registryPick] ?? 0) < score - 0.2) {
    return strategy as CoordinationStrategy;
  }
  return registryPick;
}
