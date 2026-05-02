/**
 * Phase D — split /feed into edge-cached, single-purpose endpoints.
 *
 * The original /feed bundles 7 different data sources into one response:
 * swarm_status, hypotheticals/provens/disproven, diary, metrics,
 * broadcast, recent_activity. That couples cache keys, refresh rates,
 * and failure modes. Splitting them lets the dashboard:
 *
 *   - Render incrementally (each section paints as soon as it loads)
 *   - Refresh at appropriate cadences (swarm 5s, diary 60s, etc.)
 *   - Survive partial failure (diary R2 miss doesn't kill swarm card)
 *   - Hit the edge cache (Cloudflare auto-caches GET with public Cache-Control)
 *
 * Shape: per-section endpoints under /feed/* , plus a back-compat
 * /feed handler that fans out internally and returns the union (so the
 * deployed lupine.science build keeps working until the dashboard PR
 * lands).
 */
import type { Env } from "../types";

const FEED_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

interface CacheOptions {
  /** seconds for `Cache-Control: public, s-maxage=...` */
  ttlSeconds: number;
  /** seconds for `stale-while-revalidate=...` (defaults to 2x ttl) */
  swrSeconds?: number;
}

function cacheHeaders({ ttlSeconds, swrSeconds }: CacheOptions): HeadersInit {
  const swr = swrSeconds ?? ttlSeconds * 2;
  return {
    ...FEED_CORS,
    "Cache-Control": `public, s-maxage=${ttlSeconds}, max-age=${Math.min(ttlSeconds, 10)}, stale-while-revalidate=${swr}`,
    "Content-Type": "application/json",
  };
}

/**
 * Wraps a section builder with the Cache API for predictable
 * cache-hit behavior across SSR + client polling.
 */
async function cachedSection<T>(
  request: Request,
  options: CacheOptions,
  build: () => Promise<T>,
): Promise<Response> {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const data = await build();
  const response = new Response(JSON.stringify(data), {
    headers: cacheHeaders(options),
  });
  await cache.put(request, response.clone());
  return response;
}

interface SwarmAgentState {
  status: "active" | "idle";
  task: string;
  last_seen: string;
}

async function buildSwarmStatus(env: Env): Promise<Record<string, SwarmAgentState>> {
  const now = new Date().toISOString();
  const pendingCountRow = await env.LEDGER
    .prepare("SELECT COUNT(*) AS n FROM pending_experiments WHERE status = 'pending'")
    .first<{ n: number }>()
    .catch(() => null);
  const pending = pendingCountRow?.n ?? 0;

  return {
    orchestrator: { status: "active", task: "Coordinating manifold analysis", last_seen: now },
    manifold: { status: "active", task: "Computing eigenvalue spectra", last_seen: now },
    causal: { status: "active", task: "Screening for Simpson's Paradox", last_seen: now },
    theorist: { status: "idle", task: "Awaiting causal inputs", last_seen: now },
    experiment: {
      status: pending > 0 ? "active" : "idle",
      task: pending > 0 ? `Queueing ${pending} experiments` : "Awaiting hypotheses",
      last_seen: now,
    },
  };
}

interface ExperimentRow {
  experiment_id: string;
  element: string;
  potential_label: string;
  status: string;
  discriminative_property: string;
  hypothesis_id: string | null;
  created_at: string;
}

interface FeedExperiments {
  hypotheticals: ExperimentRow[];
  provens: ExperimentRow[];
  disproven: ExperimentRow[];
}

async function buildExperiments(env: Env): Promise<FeedExperiments> {
  const rows = await env.LEDGER
    .prepare(
      `SELECT experiment_id, element, potential_label, status,
              discriminative_property, hypothesis_id, created_at
         FROM pending_experiments
         ORDER BY created_at DESC
         LIMIT 100`,
    )
    .all<ExperimentRow>();
  const exps = rows.results ?? [];

  const hypotheticals = exps.filter(e => e.status === "pending").slice(0, 10);
  const provens = exps
    .filter(e => e.status === "completed" && (!e.hypothesis_id || !e.hypothesis_id.includes("fail")))
    .slice(0, 10);
  const disproven = exps
    .filter(e => e.status === "completed" && e.hypothesis_id?.includes("fail"))
    .slice(0, 10);

  return { hypotheticals, provens, disproven };
}

async function buildR2Section(env: Env, key: string): Promise<unknown | null> {
  const obj = await env.ARTIFACTS.get(key);
  return obj ? await obj.json() : null;
}

async function buildRecentActivity(env: Env): Promise<unknown[]> {
  const rows = await env.LEDGER
    .prepare(
      "SELECT agent_id, element, property, timestamp FROM records ORDER BY timestamp DESC LIMIT 10",
    )
    .all();
  return rows.results ?? [];
}

interface HypothesisRow {
  id: string;
  title: string;
  status: string;
  confidence: number | null;
  evidence_ids: string | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
}

async function buildHypotheses(env: Env): Promise<HypothesisRow[]> {
  const rows = await env.LEDGER
    .prepare(
      `SELECT id, title, status, confidence, evidence_ids, agent_id,
              created_at, updated_at
         FROM hypotheses
         WHERE status IN ('proposed', 'testing', 'confirmed')
         ORDER BY updated_at DESC
         LIMIT 25`,
    )
    .all<HypothesisRow>();
  return rows.results ?? [];
}

/**
 * Public router: dispatches by url.pathname. Returns null if the
 * pathname is not a /feed/* route (caller falls through to other handlers).
 */
export async function handleFeedRoute(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (!path.startsWith("/feed")) return null;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...FEED_CORS, "Access-Control-Max-Age": "86400" },
    });
  }

  if (path === "/feed/swarm") {
    return cachedSection(request, { ttlSeconds: 5 }, () => buildSwarmStatus(env));
  }

  if (path === "/feed/experiments") {
    return cachedSection(request, { ttlSeconds: 30 }, () => buildExperiments(env));
  }

  if (path === "/feed/diary") {
    return cachedSection(request, { ttlSeconds: 60 }, () =>
      buildR2Section(env, "diary/latest.json"),
    );
  }

  if (path === "/feed/metrics") {
    return cachedSection(request, { ttlSeconds: 60 }, () =>
      buildR2Section(env, "metrics/latest.json"),
    );
  }

  if (path === "/feed/broadcast") {
    return cachedSection(request, { ttlSeconds: 30 }, () =>
      buildR2Section(env, "broadcasts/latest.json"),
    );
  }

  if (path === "/feed/recent_activity") {
    return cachedSection(request, { ttlSeconds: 30 }, () =>
      buildRecentActivity(env),
    );
  }

  if (path === "/feed/hypotheses") {
    return cachedSection(request, { ttlSeconds: 30 }, () => buildHypotheses(env));
  }

  if (path === "/feed") {
    // Back-compat: union of all sections in one response. NOT cached
    // because the dashboard polls this every 10s — let each section's
    // own cache do the work.
    const [swarm, experiments, diary, metrics, broadcast, recent] = await Promise.all([
      buildSwarmStatus(env).catch(() => ({})),
      buildExperiments(env).catch(() => ({ hypotheticals: [], provens: [], disproven: [] })),
      buildR2Section(env, "diary/latest.json").catch(() => null),
      buildR2Section(env, "metrics/latest.json").catch(() => null),
      buildR2Section(env, "broadcasts/latest.json").catch(() => null),
      buildRecentActivity(env).catch(() => []),
    ]);
    return Response.json(
      {
        status: "live",
        swarm_status: swarm,
        hypotheticals: experiments.hypotheticals,
        provens: experiments.provens,
        disproven: experiments.disproven,
        diary,
        metrics,
        broadcast,
        recent_activity: recent,
      },
      { headers: FEED_CORS },
    );
  }

  return null;
}
