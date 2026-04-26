/**
 * Cost-aware model router for glim-think.
 *
 * Routes tasks to the cheapest capable model, with fallback chains.
 * Tracks usage in KV for cost monitoring.
 */

import {
  Provider,
  TaskTier,
  ModelOpts,
  WorkersAIProvider,
  ZAIProvider,
  MiniMaxProvider,
  HFProvider,
} from "./providers";

export class ModelRouter {
  private providers: Map<string, Provider> = new Map();
  private env: Env;

  constructor(env: Env) {
    this.env = env;

    // Always available: Workers AI (free tier, zero egress)
    this.providers.set("workers-ai", new WorkersAIProvider(env.AI, "@cf/meta/llama-3.1-8b-instruct"));

    // Zhipu AI (ZAI) — strong Chinese-language reasoning, OpenAI-compatible
    if (env.ZAI_API_KEY) {
      this.providers.set("zai", new ZAIProvider(env.ZAI_API_KEY, "glm-5.1"));
    }

    // MiniMax — large MoE model, cost-effective
    if (env.MINIMAX_API_KEY) {
      this.providers.set("minimax", new MiniMaxProvider(env.MINIMAX_API_KEY, "MiniMax-Text-2.7"));
    }

    // Hugging Face Inference API — open models, pay-per-request
    if (env.HF_API_KEY) {
      this.providers.set("huggingface", new HFProvider(env.HF_API_KEY, "mistralai/Mistral-7B-Instruct-v0.3"));
    }
  }

  /**
   * Route a task to the optimal provider by tier with recursive fallback.
   */
  async complete(tier: TaskTier, prompt: string, opts?: ModelOpts) {
    const chain = this.fallbackChain(tier);
    for (let i = 0; i < chain.length; i++) {
      const name = chain[i];
      const provider = this.providers.get(name);
      if (!provider) continue;
      try {
        const result = await provider.complete(prompt, opts);
        await this.logUsage(name, tier, result);
        return result;
      } catch (e) {
        console.warn(`${name} failed:`, e);
        if (i === chain.length - 1) throw e;
      }
    }
    throw new Error(`No provider available for tier ${tier}`);
  }

  private fallbackChain(tier: TaskTier): string[] {
    switch (tier) {
      case "ingestion":
      case "screening":
        return ["workers-ai"];
      case "hypothesis":
        return [
          ...(this.providers.has("zai") ? ["zai"] : []),
          ...(this.providers.has("minimax") ? ["minimax"] : []),
          ...(this.providers.has("huggingface") ? ["huggingface"] : []),
          "workers-ai",
        ];
      case "experiment_design":
        return [
          ...(this.providers.has("minimax") ? ["minimax"] : []),
          ...(this.providers.has("zai") ? ["zai"] : []),
          "workers-ai",
        ];
      case "code_review":
        return [
          ...(this.providers.has("zai") ? ["zai"] : []),
          ...(this.providers.has("minimax") ? ["minimax"] : []),
          "workers-ai",
        ];
      default:
        return ["workers-ai"];
    }
  }

  private async logUsage(provider: string, tier: string, result: { latencyMs: number; usage?: { promptTokens: number; completionTokens: number } }) {
    const key = `usage:${new Date().toISOString().slice(0, 10)}:${provider}:${tier}`;
    const existing = await this.env.CONFIG.get(key);
    const stats = existing ? JSON.parse(existing) : { calls: 0, tokens: 0, latency: 0 };
    stats.calls++;
    stats.tokens += (result.usage?.promptTokens ?? 0) + (result.usage?.completionTokens ?? 0);
    stats.latency += result.latencyMs;
    await this.env.CONFIG.put(key, JSON.stringify(stats));
  }
}
