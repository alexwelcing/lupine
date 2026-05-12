/**
 * Critical-path test: feed serve.
 *
 * Exercises `handleFeedRoute` end-to-end against stubbed D1 + R2.
 * The dashboard hits these endpoints every few seconds — a regression
 * here breaks the whole front page. We assert:
 *
 *   1. Each per-section endpoint returns the shape declared in
 *      `openapi.ts` (swarm has agent objects with status/task/last_seen,
 *      experiments has the 3 categorised arrays, etc.).
 *   2. The back-compat `/feed` union endpoint contains all sections.
 *   3. Unknown `/feed/*` paths return null (router falls through).
 *
 * Stubs operate at the binding boundary — we do not call the real
 * D1 or R2 service. The cache global is replaced with a noop cache
 * so the section's cache-API write doesn't blow up under node.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { handleFeedRoute } from "../split";
import { buildStubEnv, stubLedger, stubArtifacts } from "../../testing/envStub";

// `caches.default` is a workerd-only global. The split.ts handler uses
// it for SWR caching. In node we replace it with a no-op cache that
// always misses so the build path runs unconditionally.
beforeAll(() => {
  const noopCache = {
    match: async () => undefined,
    put: async () => undefined,
    delete: async () => false,
  };
  // The `caches` global in workerd is a CacheStorage with a `.default`.
  (globalThis as unknown as { caches: { default: typeof noopCache } }).caches = {
    default: noopCache,
  };
});

const FIXED_NOW = "2026-05-11T12:00:00.000Z";

function makeEnv() {
  return buildStubEnv({
    LEDGER: stubLedger({
      queries: [
        {
          match: "FROM cron_runs",
          first: { started_at: FIXED_NOW, outcome: "ok" },
        },
        {
          match: "FROM claims\n        WHERE agent_id",
          first: { created_at: FIXED_NOW, claim_data: "{}" },
        },
        {
          match: "FROM records ORDER BY timestamp DESC LIMIT 1",
          first: { timestamp: FIXED_NOW, element: "Cu" },
        },
        {
          match: "FROM pending_experiments WHERE status = 'pending'",
          first: { n: 3 },
        },
        {
          match: "FROM pending_experiments",
          all: [
            {
              experiment_id: "exp-1",
              element: "Cu",
              potential_label: "EAM",
              status: "pending",
              discriminative_property: "lattice_constant",
              hypothesis_id: "h-1",
              created_at: FIXED_NOW,
            },
            {
              experiment_id: "exp-2",
              element: "Au",
              potential_label: "MEAM",
              status: "completed",
              discriminative_property: "bulk_modulus",
              hypothesis_id: "h-2",
              created_at: FIXED_NOW,
            },
          ],
        },
        {
          match: "FROM records ORDER BY timestamp DESC LIMIT 10",
          all: [{ agent_id: "manifold-a", element: "Cu", property: "a0", timestamp: FIXED_NOW }],
        },
      ],
    }),
    ARTIFACTS: stubArtifacts({
      objects: {
        "diary/latest.json": { entries: [{ note: "ok" }] },
        "metrics/latest.json": { fps: 60 },
        "broadcasts/latest.json": { title: "hourly tick" },
      },
    }),
  });
}

describe("handleFeedRoute", () => {
  it("returns swarm status with all 5 agents shaped per the dashboard contract", async () => {
    const env = makeEnv();
    const res = await handleFeedRoute(
      new Request("https://worker.dev/feed/swarm"),
      env,
    );
    expect(res).not.toBeNull();
    const body = (await res!.json()) as Record<string, { status: string; task: string; last_seen: string }>;
    for (const key of ["orchestrator", "manifold", "causal", "theorist", "experiment"]) {
      expect(body[key]).toBeDefined();
      expect(body[key].status).toMatch(/^(active|idle)$/);
      expect(typeof body[key].task).toBe("string");
      expect(typeof body[key].last_seen).toBe("string");
    }
  });

  it("returns experiments split into hypotheticals / provens / disproven", async () => {
    const env = makeEnv();
    const res = await handleFeedRoute(
      new Request("https://worker.dev/feed/experiments"),
      env,
    );
    const body = (await res!.json()) as {
      hypotheticals: unknown[];
      provens: unknown[];
      disproven: unknown[];
    };
    expect(Array.isArray(body.hypotheticals)).toBe(true);
    expect(Array.isArray(body.provens)).toBe(true);
    expect(Array.isArray(body.disproven)).toBe(true);
    expect(body.hypotheticals).toHaveLength(1);
    expect(body.provens).toHaveLength(1);
  });

  it("serves the back-compat /feed union endpoint with all sections present", async () => {
    const env = makeEnv();
    const res = await handleFeedRoute(new Request("https://worker.dev/feed"), env);
    expect(res).not.toBeNull();
    const body = (await res!.json()) as Record<string, unknown>;
    for (const key of [
      "status",
      "swarm_status",
      "hypotheticals",
      "provens",
      "disproven",
      "diary",
      "metrics",
      "broadcast",
      "recent_activity",
    ]) {
      expect(body[key]).toBeDefined();
    }
    expect(body.status).toBe("live");
  });

  it("returns null for non-/feed paths so the caller can fall through", async () => {
    const env = makeEnv();
    const res = await handleFeedRoute(new Request("https://worker.dev/health"), env);
    expect(res).toBeNull();
  });
});
