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
import { latestVignette } from "../research/vignette";

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
  model?: string;
}

const ACTIVE_WINDOW_MS = 90 * 60 * 1000;

function withinWindow(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < ACTIVE_WINDOW_MS;
}

/**
 * Real swarm status — reads cron_runs for orchestrator activity and
 * recent claims for theorist activity. Each agent's `last_seen` is the
 * actual most-recent timestamp from D1, not Date.now().
 */
async function buildSwarmStatus(env: Env): Promise<Record<string, SwarmAgentState>> {
  const fallback = new Date().toISOString();

  const lastOrchestrator = await env.LEDGER
    .prepare(
      `SELECT started_at, outcome FROM cron_runs
        WHERE cron_name = 'research-orchestrator'
        ORDER BY started_at DESC LIMIT 1`,
    )
    .first<{ started_at: string; outcome: string }>()
    .catch(() => null);

  const lastTheoristClaim = await env.LEDGER
    .prepare(
      `SELECT created_at, claim_data FROM claims
        WHERE agent_id = 'theorist+minimax-m2.7'
        ORDER BY created_at DESC LIMIT 1`,
    )
    .first<{ created_at: string; claim_data: string }>()
    .catch(() => null);

  const lastRecord = await env.LEDGER
    .prepare(
      `SELECT timestamp, element FROM records ORDER BY timestamp DESC LIMIT 1`,
    )
    .first<{ timestamp: string; element: string }>()
    .catch(() => null);

  const pendingCountRow = await env.LEDGER
    .prepare("SELECT COUNT(*) AS n FROM pending_experiments WHERE status = 'pending'")
    .first<{ n: number }>()
    .catch(() => null);
  const pending = pendingCountRow?.n ?? 0;

  const orchestratorActive = withinWindow(lastOrchestrator?.started_at ?? null);
  const theoristActive = withinWindow(lastTheoristClaim?.created_at ?? null);
  const recordActive = withinWindow(lastRecord?.timestamp ?? null);

  return {
    orchestrator: {
      status: orchestratorActive ? "active" : "idle",
      task: orchestratorActive
        ? `Hourly tick · last ${lastOrchestrator?.outcome ?? "ok"}`
        : "Awaiting next hour",
      last_seen: lastOrchestrator?.started_at ?? fallback,
    },
    manifold: {
      status: recordActive ? "active" : "idle",
      task: recordActive
        ? `PCA on ${lastRecord?.element ?? "—"}`
        : "Awaiting fresh records",
      last_seen: lastRecord?.timestamp ?? fallback,
    },
    causal: {
      status: recordActive ? "active" : "idle",
      task: recordActive ? "Stratifying for Simpson's paradox" : "Awaiting fresh records",
      last_seen: lastRecord?.timestamp ?? fallback,
    },
    theorist: {
      status: theoristActive ? "active" : "idle",
      task: theoristActive
        ? "Synthesizing eval narrative"
        : "Awaiting evaluation enqueue",
      last_seen: lastTheoristClaim?.created_at ?? fallback,
      model: theoristActive ? "MiniMax-M2.7" : undefined,
    },
    experiment: {
      status: pending > 0 ? "active" : "idle",
      task: pending > 0 ? `${pending} experiments queued` : "Awaiting hypotheses",
      last_seen: fallback,
    },
  };
}

interface RecentClaim {
  claim_id: string;
  agent_id: string;
  claim_type: string;
  description: string;
  confidence: number | null;
  created_at: string;
  is_minimax: boolean;
  image_url: string | null;
  audio_url: string | null;
}

async function buildRecentClaims(env: Env): Promise<RecentClaim[]> {
  const rows = await env.LEDGER
    .prepare(
      `SELECT claim_id, agent_id, claim_type, claim_data, description, confidence, created_at
         FROM claims
         ORDER BY created_at DESC
         LIMIT 6`,
    )
    .all<{
      claim_id: string;
      agent_id: string;
      claim_type: string;
      claim_data: string;
      description: string;
      confidence: number | null;
      created_at: string;
    }>()
    .catch(() => ({ results: [] as never[] }));

  return (rows.results ?? []).map((c) => {
    let imageUrl: string | null = null;
    let audioUrl: string | null = null;
    try {
      const data = JSON.parse(c.claim_data) as { image_key?: string; audio_key?: string };
      if (data.image_key) {
        imageUrl = `https://glim-think-v1.aw-ab5.workers.dev/artifacts/${data.image_key}`;
      }
      if (data.audio_key) {
        audioUrl = `https://glim-think-v1.aw-ab5.workers.dev/artifacts/${data.audio_key}`;
      }
    } catch {
      // claim_data not JSON — leave urls null
    }
    return {
      claim_id: c.claim_id,
      agent_id: c.agent_id,
      claim_type: c.claim_type,
      description: c.description,
      confidence: c.confidence,
      created_at: c.created_at,
      is_minimax: typeof c.agent_id === "string" && c.agent_id.includes("minimax"),
      image_url: imageUrl,
      audio_url: audioUrl,
    };
  });
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
  // Include refuted so the dashboard can show the full lifecycle
  // (testing → confirmed/refuted). Display logic separates them.
  const rows = await env.LEDGER
    .prepare(
      `SELECT id, title, status, confidence, evidence_ids, agent_id,
              created_at, updated_at
         FROM hypotheses
         WHERE status IN ('proposed', 'testing', 'confirmed', 'refuted')
         ORDER BY updated_at DESC
         LIMIT 30`,
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

  if (path === "/feed/recent-claims") {
    return cachedSection(request, { ttlSeconds: 30 }, () => buildRecentClaims(env));
  }

  if (path === "/feed/vignette") {
    return cachedSection(request, { ttlSeconds: 60 }, () => latestVignette(env));
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
