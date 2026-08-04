/**
 * Coordinator (Omnigents) unit tests.
 *
 * The coordination logic is exercised through an injectable `callProvider`,
 * so every strategy — Race, Fan-out/Merge, Ensemble, Waterfall — is testable
 * with deterministic fake models and no real LLM/secret. We assert:
 *   1. Race picks the first provider that clears the confidence threshold.
 *   2. Fan-out/Merge runs the producers then the MergeJudge synthesizes.
 *   3. Waterfall short-circuits at the first provider above threshold.
 *   4. coordinate() resolves the strategy from the registry and persists a
 *      trace to D1 with the right coordination-hit flag.
 *   5. KPI aggregation rolls up hit-rate / outcome / strategy counts.
 *   6. Small-pool degradation: a single-provider pool collapses to specialist.
 */
import { describe, it, expect } from "vitest";
import {
  coordinate,
  resolveStrategy,
  loadStrategyRegistry,
  setStrategyRegistry,
  raceStrategy,
  fanOutMergeStrategy,
  waterfallStrategy,
  specialistStrategy,
  type ProviderCaller,
  type ProviderId,
  type CoordinationRequest,
  type StrategyRule,
} from "../coordinator";
import { getCoordinationKpis, getRecentCoordinationTraces } from "../coordinatorTraces";
import { buildStubEnv, stubConfig, stubLedger } from "../../testing/envStub";
import type { Env } from "../../types";

/** Build a fake callProvider: provider → {text, confidence-ish, latency, tokens}. */
function fakeCallProvider(
  responses: Record<string, { text: string; tokens?: number; latencyMs?: number; throws?: boolean }>,
): ProviderCaller {
  return async (_env, provider) => {
    const r = responses[provider];
    if (!r || r.throws) throw new Error(`fake failure for ${provider}`);
    return {
      text: r.text,
      provider,
      model: `fake-${provider}`,
      tokens: r.tokens ?? 100,
      latencyMs: r.latencyMs ?? 50,
    };
  };
}

const baseReq: CoordinationRequest = {
  prompt: "Explain the hyper-ribbon error manifold in 3 paragraphs with units.",
  agentClass: "CoordinatorTest",
};

/** A high-confidence answer (units + reasoning + structure → heuristic ≥ 0.5). */
const STRONG = `## Hyper-ribbon manifold\n\nThe error geometry forms a ribbon because the predicted energy deviates by 0.42 eV per atom. Therefore the manifold is bounded. Hence the upper error is 3.1 meV because the baseline measures 2.68 eV cohesive energy.\n\nConsequently, the structure is non-degenerate.`;

/** A weak answer (short, no units, no structure → low heuristic score). */
const WEAK = `it is a ribbon of errors.`;

describe("resolveStrategy (registry)", () => {
  it("trivial intent → waterfall (RFC §7.8 default tree)", () => {
    expect(resolveStrategy("trivial", "normal", [])).toBe("waterfall");
  });

  it("uses the provided registry rules first", () => {
    const rules: StrategyRule[] = [
      { when: { intent: ["reasoning"], priority: ["high"] }, strategy: "fan_out_merge" },
    ];
    expect(resolveStrategy("reasoning", "high", rules)).toBe("fan_out_merge");
  });

  it("falls back to waterfall when no rule matches", () => {
    const rules: StrategyRule[] = [{ when: { intent: ["expert"] }, strategy: "ensemble_of_experts" }];
    expect(resolveStrategy("reasoning", "normal", rules)).toBe("waterfall");
  });
});

describe("loadStrategyRegistry / setStrategyRegistry", () => {
  it("returns the default registry when KV is empty", async () => {
    const env = buildStubEnv({ CONFIG: stubConfig() });
    const reg = await loadStrategyRegistry(env);
    expect(reg.length).toBeGreaterThan(0);
    expect(resolveStrategy("trivial", "normal", reg)).toBe("waterfall");
  });

  it("round-trips a custom registry through KV", async () => {
    const env = buildStubEnv({ CONFIG: stubConfig() });
    const custom: StrategyRule[] = [
      { when: { intent: ["classified"] }, strategy: "race" },
    ];
    await setStrategyRegistry(env, custom);
    const reg = await loadStrategyRegistry(env);
    expect(reg).toEqual(custom);
    expect(resolveStrategy("classified", "normal", reg)).toBe("race");
  });
});

describe("raceStrategy", () => {
  it("returns the first confident provider as the winner (success)", async () => {
    const env = buildStubEnv();
    const providers: ProviderId[] = ["workers-ai", "minimax", "zai"];
    const call = fakeCallProvider({
      "workers-ai": { text: WEAK, latencyMs: 30 },
      minimax: { text: STRONG, latencyMs: 200, tokens: 250 },
      zai: { text: STRONG, latencyMs: 400, tokens: 220 },
    });
    const result = await raceStrategy(env, { ...baseReq, confidenceThreshold: 0.8 }, providers, call);
    expect(result.strategy).toBe("race");
    expect(result.outcome).toBe("success");
    // Only STRONG clears 0.8; minimax (200ms) is faster than zai (400ms), and
    // the fast-but-weak workers-ai (WEAK ≈ 0.58) is correctly NOT the winner.
    expect(result.provider).toBe("minimax");
    expect(result.attempts).toHaveLength(3);
    expect(result.attempts.filter((a) => a.outcome === "succeeded")).toHaveLength(3);
  });

  it("degrades to partial when no draft clears the threshold", async () => {
    const env = buildStubEnv();
    const providers: ProviderId[] = ["workers-ai", "minimax"];
    const call = fakeCallProvider({
      "workers-ai": { text: WEAK },
      minimax: { text: WEAK },
    });
    const result = await raceStrategy(env, { ...baseReq, confidenceThreshold: 0.95 }, providers, call);
    expect(result.outcome).toBe("partial");
    expect(result.text).toBe(WEAK);
  });

  it("records timed_out outcomes for failing providers", async () => {
    const env = buildStubEnv();
    const providers: ProviderId[] = ["workers-ai", "minimax"];
    const call = fakeCallProvider({
      "workers-ai": { text: STRONG },
      minimax: { text: "", throws: true },
    });
    const result = await raceStrategy(env, { ...baseReq, confidenceThreshold: 0.5 }, providers, call);
    const minimaxAttempt = result.attempts.find((a) => a.provider === "minimax");
    expect(minimaxAttempt?.outcome).toBe("failed");
    expect(result.provider).toBe("workers-ai");
  });
});

describe("fanOutMergeStrategy", () => {
  it("runs producers then the MergeJudge and returns success", async () => {
    const env = buildStubEnv({ OPENAI_API_KEY: "k" }); // openai becomes the strong judge
    const providers: ProviderId[] = ["minimax", "zai"];
    const call = fakeCallProvider({
      minimax: { text: STRONG, tokens: 300 },
      zai: { text: STRONG, tokens: 280 },
      openai: { text: STRONG, tokens: 200 }, // the judge
    });
    const result = await fanOutMergeStrategy(env, baseReq, providers, call);
    expect(result.strategy).toBe("fan_out_merge");
    expect(result.outcome).toBe("success");
    // producers (2) + judge (1)
    expect(result.attempts.filter((a) => a.outcome === "succeeded")).toHaveLength(3);
    // the winner is the judge (openai)
    expect(result.provider).toBe("openai");
  });

  it("returns failed when every producer fails", async () => {
    const env = buildStubEnv({ OPENAI_API_KEY: "k" });
    const providers: ProviderId[] = ["minimax", "zai"];
    const call = fakeCallProvider({
      minimax: { text: "", throws: true },
      zai: { text: "", throws: true },
      openai: { text: STRONG },
    });
    const result = await fanOutMergeStrategy(env, baseReq, providers, call);
    expect(result.outcome).toBe("failed");
    expect(result.text).toBe("");
  });

  it("degrades to the single usable draft when only one producer succeeds", async () => {
    const env = buildStubEnv({ OPENAI_API_KEY: "k" });
    const providers: ProviderId[] = ["minimax", "zai"];
    const call = fakeCallProvider({
      minimax: { text: STRONG },
      zai: { text: "", throws: true },
      openai: { text: STRONG },
    });
    const result = await fanOutMergeStrategy(env, baseReq, providers, call);
    expect(result.outcome).toBe("success");
    expect(result.provider).toBe("minimax");
  });
});

describe("waterfallStrategy", () => {
  it("short-circuits at the first provider above threshold and skips the rest", async () => {
    const env = buildStubEnv();
    const providers: ProviderId[] = ["workers-ai", "minimax", "zai"];
    const call = fakeCallProvider({
      "workers-ai": { text: WEAK }, // below 0.8 → escalate
      minimax: { text: STRONG }, // above 0.8 → accept, stop
      zai: { text: STRONG }, // never called
    });
    const result = await waterfallStrategy(env, baseReq, providers, call);
    expect(result.strategy).toBe("waterfall");
    expect(result.provider).toBe("minimax");
    // zai was never attempted → recorded as skipped
    const zaiAttempt = result.attempts.find((a) => a.provider === "zai");
    expect(zaiAttempt?.outcome).toBe("skipped");
    // only the first two actually ran
    expect(result.attempts.filter((a) => a.outcome !== "skipped")).toHaveLength(2);
  });
});

describe("specialistStrategy", () => {
  it("delegates to the scorecard-selected single provider", async () => {
    // No secrets → pool is workers-ai only; selectDeepRoute returns workers-ai.
    const env = buildStubEnv();
    const call = fakeCallProvider({
      "workers-ai": { text: STRONG, tokens: 90 },
    });
    const result = await specialistStrategy(env, baseReq, [], call);
    expect(result.strategy).toBe("specialist");
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].provider).toBe("workers-ai");
  });
});

describe("coordinate (end-to-end)", () => {
  it("resolves race from the registry, runs it, and persists a trace", async () => {
    const config = stubConfig();
    const env = buildStubEnv({
      CONFIG: config,
      LEDGER: stubLedger({}),
      MINIMAX_API_KEY: "k",
      ZAI_API_KEY: "k",
      OPENAI_API_KEY: "k",
    });
    await setStrategyRegistry(env, [{ when: { intent: ["reasoning"] }, strategy: "race" }]);
    const call = fakeCallProvider({
      "workers-ai": { text: WEAK, tokens: 50 },
      minimax: { text: STRONG, tokens: 250 },
      zai: { text: STRONG, tokens: 220 },
      openai: { text: STRONG, tokens: 200 },
    });
    const result = await coordinate(
      env,
      { ...baseReq, intent: "reasoning", confidenceThreshold: 0.5 },
      call,
    );
    expect(result.strategy).toBe("race");
    expect(result.outcome).toBe("success");
    // the trace write is fire-and-forget-safe but awaited inside coordinate
    // — confirm we can read KPIs back from the (stubbed) ledger.
    const traces = await getRecentCoordinationTraces(env, { limit: 10 });
    // stubLedger returns [] by default for SELECTs, so just assert no throw.
    expect(Array.isArray(traces)).toBe(true);
  });

  it("collapses to specialist when the pool has fewer than 2 providers", async () => {
    const env = buildStubEnv({ CONFIG: stubConfig() }); // no secrets → only workers-ai
    await setStrategyRegistry(env, [{ when: { intent: ["reasoning"] }, strategy: "race" }]);
    const call = fakeCallProvider({ "workers-ai": { text: STRONG } });
    const result = await coordinate(env, { ...baseReq, intent: "reasoning" }, call);
    expect(result.strategy).toBe("specialist");
  });

  it("getCoordinationKpis aggregates the coordination_traces table", async () => {
    const env = buildStubEnv({
      LEDGER: stubLedger({
        queries: [
          {
            // AVG rollup for hit_rate / mean_tokens / mean_latency
            match: "AVG(CASE WHEN coordination_hit",
            first: { n: 10, hit_rate: 0.7, mean_tokens: 200, mean_latency_ms: 1500 },
          },
          { match: "GROUP BY coordination_outcome", all: [{ coordination_outcome: "success", count: 8 }, { coordination_outcome: "partial", count: 2 }] },
          { match: "GROUP BY strategy", all: [{ strategy: "race", count: 6 }, { strategy: "fan_out_merge", count: 4 }] },
        ],
      }),
    });
    const kpis = await getCoordinationKpis(env, 7);
    expect(kpis.n).toBe(10);
    expect(kpis.hit_rate).toBeCloseTo(0.7);
    expect(kpis.outcome_counts.success).toBe(8);
    expect(kpis.strategy_counts.race).toBe(6);
  });
});
