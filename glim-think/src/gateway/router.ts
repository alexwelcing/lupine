/**
 * Cost-aware model router for glim-think.
 *
 * Routes tasks to the cheapest capable model, with fallback chains.
 * Tracks usage in KV for cost monitoring.
 *
 * Eval-aware escalation:
 *   - If an agentClass is passed and its recent 24h pass rate is below
 *     QUALITY_THRESHOLD, the router switches to a strength-first chain
 *     (best providers first) instead of the tier-optimized chain.
 *   - After a provider succeeds, an optional lightweight heuristic gate
 *     can trigger intra-request fallback when the output is clearly poor.
 */

import {
  Provider,
  TaskTier,
  ModelOpts,
  WorkersAIProvider,
  OpenAIProvider,
  ZAIProvider,
  MiniMaxProvider,
  HFProvider,
  GeminiProvider,
} from "./providers";
import { AIGatewayProvider } from "./ai-gateway";
import { getAgentQualityTrend, getModelQualityTrend } from "../evals/store";
import { runHeuristics } from "../evals/heuristics";
import type { Env } from "../types";
import { trace } from "@opentelemetry/api";

/** Pass-rate below which we escalate to the strength-first chain. */
const QUALITY_THRESHOLD = 0.6;

/** Heuristic score below which we attempt intra-request fallback. */
const QUALITY_GATE_THRESHOLD = 0.3;

/**
 * Per-tier Cloudflare AI Gateway exact-match cache TTL, in seconds
 * (work order §3.2). `0` disables the cache. An explicit `opts.cacheTtl`
 * overrides the tier default, including an explicit `0`.
 */
const TIER_CACHE_TTL: Record<TaskTier, number> = {
  ingestion: 300, // standard prompts, high repeat rate
  screening: 300, // structured checks, very repeatable
  hypothesis: 60, // moderate variability
  experiment_design: 0, // creative — never cache
  code_review: 60, // code patterns repeat within a session
};

/**
 * Workers AI model. Direct (`env.AI.run`) takes the bare id; the AI Gateway
 * `compat` endpoint takes a `{provider}/{model}` string (verified live
 * against the `glimgate` gateway — see WORKERS_AI_GATEWAY_MODEL).
 */
const WORKERS_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const WORKERS_AI_GATEWAY_MODEL = `workers-ai/${WORKERS_AI_MODEL}`;

export class ModelRouter {
  /** Process-wide round-robin index for balancing MiniMax ↔ GLM. Static so
   * it persists across per-request ModelRouter instances within an isolate. */
  private static rrCounter = 0;
  /** Cached per-model quality from the latest ModelScorecard claim. Static +
   * TTL so routing reads it from memory, not D1, on every request. */
  private static modelScores: Record<string, { score: number; n: number }> = {};
  private static modelScoresAt = 0;
  /** A model must have ≥ this many evals (min over evaluators) before its
   * measured score is allowed to steer ordering — else round-robin. Prevents
   * overfitting to tiny samples (e.g. the n=1 glm vs n=7 minimax case). */
  private static readonly MODEL_SCORE_MIN_N = 8;
  private static readonly MODEL_SCORE_TTL_MS = 300_000;
  private providers: Map<string, Provider> = new Map();
  private env: Env;

  constructor(env: Env) {
    this.env = env;

    // ── Hybrid routing (verified against the live `glimgate` gateway) ──
    // Cloudflare AI Gateway's `compat` endpoint returns `code 2008
    // "Invalid provider"` for Zhipu and MiniMax — they are NOT reachable
    // through the Gateway. So ONLY Workers AI is Gateway-routed; ZAI,
    // MiniMax and HuggingFace stay direct (unchanged from pre-refactor).
    //
    // One-flag rollback: Gateway is used only when token + account + name
    // are ALL present; unset any one secret to send Workers AI direct via
    // `env.AI.run` instead. Chains/escalation/quality-gate are untouched.
    const useGateway = !!(
      env.AI_GATEWAY_TOKEN &&
      env.AI_GATEWAY_ACCOUNT_ID &&
      env.AI_GATEWAY_NAME
    );

    // Always available: Workers AI (free tier, zero egress). Gateway adds
    // edge caching + analytics + the telemetry bridge; the `compat`
    // endpoint needs the `workers-ai/` model prefix.
    this.providers.set(
      "workers-ai",
      useGateway
        ? new AIGatewayProvider({
            token: env.AI_GATEWAY_TOKEN as string,
            accountId: env.AI_GATEWAY_ACCOUNT_ID as string,
            gatewayName: env.AI_GATEWAY_NAME as string,
            pathSegment: "compat",
            model: WORKERS_AI_GATEWAY_MODEL,
            name: "workers-ai",
            gatewayAuthToken: env.AI_GATEWAY_AUTH_TOKEN,
          })
        : new WorkersAIProvider(env.AI, WORKERS_AI_MODEL)
    );

    // OpenAI — strong, reliable general model. Direct API with the saved
    // OPENAI_API_KEY. Primary for the quality tiers (hypothesis /
    // experiment_design / code_review) so research synthesis runs on a
    // first-class model instead of falling back to workers-ai.
    if (env.OPENAI_API_KEY) {
      this.providers.set(
        "openai",
        new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL?.trim() || "gpt-5.5"),
      );
    }

    // Zhipu AI (ZAI) — strong reasoning, OpenAI-compatible. Direct: not
    // a Gateway-supported provider.
    if (env.ZAI_API_KEY) {
      this.providers.set(
        "zai",
        new ZAIProvider(
          env.ZAI_API_KEY,
          env.ZAI_MODEL?.trim() || "glm-5.1",
          env.ZAI_BASE_URL?.trim() || "https://api.z.ai/api/coding/paas/v4",
        )
      );
    }

    // MiniMax — large MoE model, cost-effective. Direct: not a
    // Gateway-supported provider.
    if (env.MINIMAX_API_KEY) {
      this.providers.set(
        "minimax",
        new MiniMaxProvider(
          env.MINIMAX_API_KEY,
          env.MINIMAX_MODEL?.trim() || "MiniMax-M2.7",
          env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1",
        )
      );
    }

    // Hugging Face Inference API — open models, pay-per-request. Direct:
    // its `inputs` (non-chat) format isn't OpenAI-compatible (gotcha §8.3).
    if (env.HF_API_KEY) {
      this.providers.set(
        "huggingface",
        new HFProvider(env.HF_API_KEY, env.HF_MODEL?.trim() || "meta-llama/Llama-3.1-8B-Instruct"),
      );
    }

    // Google Gemini — state of the art reasoning. Gateway-routed for trace context
    // and OpenAI-compatible translation via AI Gateway's Universal API.
    if (env.GOOGLE_API_KEY) {
      this.providers.set(
        "gemini",
        useGateway
          ? new AIGatewayProvider({
              token: env.GOOGLE_API_KEY,
              accountId: env.AI_GATEWAY_ACCOUNT_ID as string,
              gatewayName: env.AI_GATEWAY_NAME as string,
              pathSegment: "google-ai-studio",
              model: "gemini-3.1-pro",
              name: "gemini",
              gatewayAuthToken: env.AI_GATEWAY_AUTH_TOKEN,
            })
          : new GeminiProvider(env.GOOGLE_API_KEY, "gemini-3.1-pro")
      );
    }
  }

  /**
   * Resolve the AI Gateway cache TTL for a request: explicit
   * `opts.cacheTtl` wins (including an explicit `0`), else the tier
   * default, else `0` (no cache). Direct providers ignore this.
   */
  private cacheTtlForTier(tier: TaskTier, override?: number): number {
    if (override !== undefined) return override;
    return TIER_CACHE_TTL[tier] ?? 0;
  }

  /**
   * Route a task to the optimal provider by tier with recursive fallback.
   *
   * @param agentClass - Optional agent class name (e.g. "Orchestrator"). When
   *   provided, the router checks recent eval pass rate and may escalate to a
   *   stronger provider chain.
   * @param qualityGate - If true and agentClass is provided, runs a lightweight
   *   heuristic check on the first successful result. Scores below
   *   QUALITY_GATE_THRESHOLD trigger fallback to the next provider.
   */
  async complete(
    tier: TaskTier,
    prompt: string,
    opts?: ModelOpts & { agentClass?: string; qualityGate?: boolean }
  ) {
    const agentClass = opts?.agentClass;
    const qualityGate = opts?.qualityGate ?? false;
    const chain = await this.resolveChain(tier, agentClass);
    const span = trace.getActiveSpan();

    if (span) {
      span.setAttribute("gateway.tier", tier);
      span.setAttribute("gateway.chain_length", chain.length);
      span.setAttribute("gateway.agent_class", agentClass ?? "unknown");
    }

    // Derive the Gateway cache TTL once per request and pass it down via a
    // NEW opts object (never mutate the caller's). Direct providers ignore
    // `cacheTtl`; AIGatewayProvider maps it to the `cf-aig-cache-ttl` header.
    const callOpts: ModelOpts & { agentClass?: string; qualityGate?: boolean } = {
      ...opts,
      cacheTtl: this.cacheTtlForTier(tier, opts?.cacheTtl),
    };

    let gateTriggered = false;

    for (let i = 0; i < chain.length; i++) {
      const name = chain[i];
      const provider = this.providers.get(name);
      if (!provider) continue;
      try {
        const result = await provider.complete(prompt, callOpts);
        await this.logUsage(name, tier, result);

        // Lightweight quality gate — if the output is clearly poor, try next provider
        if (qualityGate && agentClass && i < chain.length - 1) {
          const heuristic = runHeuristics(result.text);
          if (heuristic.score < QUALITY_GATE_THRESHOLD) {
            gateTriggered = true;
            console.warn(
              `[gateway] ${name} output failed quality gate (score=${heuristic.score.toFixed(2)}) for ${agentClass}, falling back to ${chain[i + 1]}`
            );
            continue;
          }
        }

        if (span) {
          span.setAttribute("gateway.provider", name);
          span.setAttribute("gateway.fallback_index", i);
          span.setAttribute("gateway.cache_hit", result.cacheHit ?? false);
          span.setAttribute("gateway.latency_ms", result.latencyMs);
          span.setAttribute("gateway.quality_gate_triggered", gateTriggered);
          span.setAttribute("gateway.tokens_prompt", result.usage?.promptTokens ?? 0);
          span.setAttribute("gateway.tokens_completion", result.usage?.completionTokens ?? 0);
        }

        return result;
      } catch (e) {
        console.warn(`${name} failed:`, e);
        if (span) {
          span.setAttribute(`gateway.provider_${name}_failed`, true);
        }
        if (i === chain.length - 1) throw e;
      }
    }
    throw new Error(`No provider available for tier ${tier}`);
  }

  /**
   * Choose the fallback chain. If the agent's recent pass rate is below
   * threshold, use the strength-first chain (best models first).
   */
  /** Refresh the cached model scorecard (TTL-gated; one D1 row). */
  private async refreshModelScores(): Promise<void> {
    if (Date.now() - ModelRouter.modelScoresAt < ModelRouter.MODEL_SCORE_TTL_MS) return;
    try {
      ModelRouter.modelScores = await getModelQualityTrend(this.env);
      ModelRouter.modelScoresAt = Date.now();
    } catch (e) {
      console.warn("[gateway] model scorecard lookup failed:", e);
      ModelRouter.modelScoresAt = Date.now(); // back off on failure too
    }
  }

  private async resolveChain(tier: TaskTier, agentClass?: string): Promise<string[]> {
    await this.refreshModelScores();
    if (agentClass) {
      try {
        const trend = await getAgentQualityTrend(this.env, agentClass, 1);
        if (trend.count >= 3 && trend.pass_rate < QUALITY_THRESHOLD) {
          console.log(
            `[gateway] ${agentClass} pass rate ${(trend.pass_rate * 100).toFixed(1)}% over ${trend.count} evals — escalating to strength-first chain`
          );
          return this.strengthFirstChain();
        }
      } catch (e) {
        console.warn(`[gateway] quality trend lookup failed for ${agentClass}:`, e);
      }
    }
    return this.fallbackChain(tier);
  }

  /**
   * Round-robin the two research workhorses (MiniMax ↔ GLM/zai) so load is
   * balanced across requests. OpenAI (gpt-5.5) is intentionally NOT here —
   * it is the last-resort decider (appended after the pair) and the
   * escalation lead in strengthFirstChain.
   */
  private balancedScienceLead(): string[] {
    const pair: string[] = [];
    if (this.providers.has("minimax")) pair.push("minimax");
    if (this.providers.has("zai")) pair.push("zai");
    if (pair.length < 2) return pair;

    // Eval-aware: if BOTH workhorses are well-sampled in the latest
    // ModelScorecard, order best-measured-quality first (closing the
    // eval→routing loop). Map provider→scorecard model id. Otherwise fall
    // back to round-robin load balancing (no/insufficient data).
    const sc = ModelRouter.modelScores;
    const modelOf: Record<string, string> = { minimax: "MiniMax-M2.7", zai: "glm-5.1" };
    const scored = pair.every((p) => {
      const e = sc[modelOf[p]];
      return e && e.n >= ModelRouter.MODEL_SCORE_MIN_N;
    });
    if (scored) {
      const ordered = [...pair].sort(
        (a, b) => sc[modelOf[b]].score - sc[modelOf[a]].score,
      );
      // Tie (equal scores) → keep round-robin fairness.
      if (sc[modelOf[ordered[0]]].score !== sc[modelOf[ordered[1]]].score) {
        return ordered;
      }
    }
    if (ModelRouter.rrCounter++ % 2 === 1) pair.reverse();
    return pair;
  }

  /** Standard tier-optimized chain. */
  private fallbackChain(tier: TaskTier): string[] {
    switch (tier) {
      case "ingestion":
      case "screening":
        // High-volume / low-stakes — keep on the free model to preserve
        // the token-plan + gpt-5.5 budget for the science tiers.
        return ["workers-ai"];
      case "hypothesis":
      case "experiment_design":
      case "code_review":
        // MiniMax & GLM share the everyday science load (balanced);
        // OpenAI gpt-5.5 is the last decider before the free floor.
        return [
          ...this.balancedScienceLead(),
          ...(this.providers.has("openai") ? ["openai"] : []),
          "workers-ai",
        ];
      default:
        return ["workers-ai"];
    }
  }

  /**
   * Strength-first chain: always try the strongest available provider first,
   * regardless of task tier. Used when an agent's recent quality is poor.
   */
  private strengthFirstChain(): string[] {
    // Quality escalation: OpenAI gpt-5.5 is the top-ranked decider and
    // steps in FIRST when an agent's recent eval pass-rate is poor, then
    // the science workhorses, then the free floor.
    return [
      ...(this.providers.has("openai") ? ["openai"] : []),
      ...(this.providers.has("minimax") ? ["minimax"] : []),
      ...(this.providers.has("zai") ? ["zai"] : []),
      "workers-ai",
    ];
  }

  private async logUsage(
    provider: string,
    tier: string,
    result: {
      latencyMs: number;
      usage?: { promptTokens: number; completionTokens: number };
      cacheHit?: boolean;
    }
  ) {
    // Keyed by logical provider name (zai/minimax/workers-ai/huggingface),
    // preserving the existing per-provider daily cost dashboards. `cacheHits`
    // is the Gateway-specific metadatum (work order §3.5); it is additive —
    // pre-existing rows simply default it to 0 on first bump.
    const key = `usage:${new Date().toISOString().slice(0, 10)}:${provider}:${tier}`;
    const existing = await this.env.CONFIG.get(key);
    const stats = existing
      ? JSON.parse(existing)
      : { calls: 0, tokens: 0, latency: 0, cacheHits: 0 };
    stats.calls++;
    stats.tokens += (result.usage?.promptTokens ?? 0) + (result.usage?.completionTokens ?? 0);
    stats.latency += result.latencyMs;
    stats.cacheHits = (stats.cacheHits ?? 0) + (result.cacheHit ? 1 : 0);
    await this.env.CONFIG.put(key, JSON.stringify(stats));
  }
}
