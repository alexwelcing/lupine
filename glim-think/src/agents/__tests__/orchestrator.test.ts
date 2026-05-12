/**
 * Critical-path test: orchestrator dispatch.
 *
 * Pivot note: the plan called for testing the `Orchestrator` Think
 * agent's LLM hypothesis-dispatch path. That agent is a
 * `@cloudflare/think` Durable Object whose tool-call surface only
 * exercises in a workerd runtime (subAgent + ai.tool() require the
 * Think framework + DO bindings). The hourly cron-driven dispatch
 * loop in `src/research/orchestrator.ts::runOrchestratorTick` is
 * the actual orchestrator surface that drives the swarm forward —
 * it has no LLM dependency, just D1 reads + queue writes — so it's
 * the right unit to pin behaviour around.
 *
 * We assert:
 *   1. With a fresh KV state and one stale proposed hypothesis, the
 *      tick enqueues exactly three tasks: round + evaluate + literature.
 *   2. Each enqueued task carries the expected dedup_key shape so the
 *      consumer's idempotency check fires correctly.
 *   3. Rotation state is persisted to KV after the tick.
 */
import { describe, it, expect } from "vitest";
import { runOrchestratorTick } from "../../research/orchestrator";
import { buildStubEnv, stubLedger, stubConfig, stubQueue } from "../../testing/envStub";

describe("runOrchestratorTick", () => {
  it("enqueues round + evaluate + literature when a stale proposed hypothesis exists", async () => {
    const queue = stubQueue();
    const config = stubConfig();
    const env = buildStubEnv({
      RESEARCH_QUEUE: queue,
      CONFIG: config,
      LEDGER: stubLedger({
        queries: [
          {
            // research_jobs dedup lookup — return null so each task enqueues fresh.
            match: "FROM research_jobs",
            first: null,
          },
          {
            match: "FROM hypotheses\n        WHERE status = 'proposed'",
            all: [
              {
                id: "h-aluminium-1",
                title: "Aluminium MEAM under-predicts E_coh by 4%",
                updated_at: "2025-12-01T00:00:00.000Z",
              },
            ],
          },
        ],
      }),
    });

    const result = await runOrchestratorTick(env);

    expect(result.enqueued).toHaveLength(3);
    const kinds = result.enqueued.map((e) => e.kind).sort();
    expect(kinds).toEqual(["evaluate", "literature", "round"]);

    // Each task should have produced a queue message (research_jobs dedup miss → send).
    expect(queue.sent).toHaveLength(3);
    const sentKinds = (queue.sent as Array<{ kind: string }>).map((m) => m.kind).sort();
    expect(sentKinds).toEqual(["evaluate", "literature", "round"]);

    // dedup_keys follow the auto-* naming convention.
    const dedupKeys = result.enqueued.map((e) => e.dedup_key);
    expect(dedupKeys.some((k) => k.startsWith("auto-round:"))).toBe(true);
    expect(dedupKeys.some((k) => k.startsWith("auto-eval:h-aluminium-1:"))).toBe(true);
    expect(dedupKeys.some((k) => k.startsWith("auto-lit:h-aluminium-1:"))).toBe(true);
  });

  it("skips evaluate + literature when no proposed hypothesis is available", async () => {
    const queue = stubQueue();
    const env = buildStubEnv({
      RESEARCH_QUEUE: queue,
      LEDGER: stubLedger({
        queries: [
          { match: "FROM research_jobs", first: null },
          { match: "FROM hypotheses\n        WHERE status = 'proposed'", all: [] },
        ],
      }),
    });

    const result = await runOrchestratorTick(env);

    expect(result.enqueued).toHaveLength(1);
    expect(result.enqueued[0].kind).toBe("round");
    expect(result.notes.some((n) => n.includes("no proposed hypotheses"))).toBe(true);
  });

  it("advances rotation state in KV so the next tick picks a different element", async () => {
    const config = stubConfig();
    const env = buildStubEnv({
      CONFIG: config,
      LEDGER: stubLedger({
        queries: [
          { match: "FROM research_jobs", first: null },
          { match: "FROM hypotheses\n        WHERE status = 'proposed'", all: [] },
        ],
      }),
    });

    await runOrchestratorTick(env);

    const stored = await config.get("research:rotation");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string) as {
      element_idx: number;
      last_tick: string;
    };
    expect(parsed.element_idx).toBe(1);
    expect(parsed.last_tick).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
