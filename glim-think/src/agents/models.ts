/**
 * Tiered model selection for GLIM agents.
 *
 * - `fast` tier  → Cloudflare Workers AI (Llama 4 Scout / Kimi K2.5).
 *                  Free, zero egress, ~hundred-ms latency.
 *                  Use for ingestion, summarization, light reasoning.
 *
 * - `deep` tier  → MiniMax (M2) via OpenAI-compatible endpoint.
 *                  Strong reasoning, paid. Used for Theorist hypothesis
 *                  generation, Causal paradox detection, Orchestrator
 *                  strategic dispatch.
 *
 * Falls back to fast tier when:
 *   - MINIMAX_API_KEY is unset
 *   - The monthly budget is exceeded (recordSpend / hasBudget)
 *   - Caller explicitly requests fast tier
 *
 * Spend tracking: KV-backed monthly counter under
 *   `budget:YYYY-MM:minimax` → { tokens, calls, last_at }
 */
import { createWorkersAI } from "workers-ai-provider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { wrapLanguageModel, type LanguageModelV2Middleware } from "ai";
import type { Env } from "../types";

export type ReasoningTier = "fast" | "deep";

const MINIMAX_BASE_URL = "https://api.minimax.chat/v1";
const MINIMAX_MODEL = "MiniMax-M2";
const MINIMAX_MONTHLY_TOKEN_BUDGET = 80_000_000;

const FAST_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function hasMiniMaxBudget(env: Env): Promise<boolean> {
  if (!env.MINIMAX_API_KEY) return false;
  try {
    const raw = await env.CONFIG.get(`budget:${monthKey()}:minimax`);
    if (!raw) return true;
    const stats = JSON.parse(raw) as { tokens?: number };
    return (stats.tokens ?? 0) < MINIMAX_MONTHLY_TOKEN_BUDGET;
  } catch {
    return true;
  }
}

export async function recordMiniMaxSpend(
  env: Env,
  tokens: number,
): Promise<void> {
  try {
    const key = `budget:${monthKey()}:minimax`;
    const raw = await env.CONFIG.get(key);
    const stats = raw
      ? (JSON.parse(raw) as { tokens: number; calls: number })
      : { tokens: 0, calls: 0 };
    stats.tokens += tokens;
    stats.calls += 1;
    await env.CONFIG.put(
      key,
      JSON.stringify({ ...stats, last_at: new Date().toISOString() }),
    );
  } catch (e) {
    console.warn("recordMiniMaxSpend failed:", e);
  }
}

function fastModel(env: Env) {
  return createWorkersAI({ binding: env.AI })(FAST_MODEL);
}

function spendMiddleware(env: Env): LanguageModelV2Middleware {
  return {
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate();
      const usage = result.usage;
      const tokens =
        (usage?.inputTokens ?? 0) +
        (usage?.outputTokens ?? 0) +
        (usage?.reasoningTokens ?? 0);
      if (tokens > 0) {
        await recordMiniMaxSpend(env, tokens);
      }
      return result;
    },
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();
      let inputTokens = 0;
      let outputTokens = 0;
      let reasoningTokens = 0;
      const wrappedStream = stream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            if (chunk.type === "finish") {
              inputTokens = chunk.usage?.inputTokens ?? inputTokens;
              outputTokens = chunk.usage?.outputTokens ?? outputTokens;
              reasoningTokens = chunk.usage?.reasoningTokens ?? reasoningTokens;
            }
            controller.enqueue(chunk);
          },
          async flush() {
            const tokens = inputTokens + outputTokens + reasoningTokens;
            if (tokens > 0) {
              await recordMiniMaxSpend(env, tokens);
            }
          },
        }),
      );
      return { stream: wrappedStream, ...rest };
    },
  };
}

function miniMaxModel(env: Env) {
  const base = createOpenAICompatible({
    baseURL: MINIMAX_BASE_URL,
    apiKey: env.MINIMAX_API_KEY!,
    name: "minimax",
  }).chatModel(MINIMAX_MODEL);
  return wrapLanguageModel({
    model: base,
    middleware: spendMiddleware(env),
  });
}

/**
 * Synchronous selector. Use when the caller can't await
 * (e.g. inside @cloudflare/think `getModel()`).
 *
 * Caller is responsible for budget guarding via `hasMiniMaxBudget`
 * if it cares. Default: pick deep when key is present.
 */
export function selectModel(env: Env, tier: ReasoningTier) {
  if (tier === "deep" && env.MINIMAX_API_KEY) {
    return miniMaxModel(env);
  }
  return fastModel(env);
}

/**
 * Async selector with full budget check. Prefer this when the caller
 * is in async code (cron handlers, queue consumers) — it falls back
 * to fast tier when the monthly MiniMax budget is exhausted.
 */
export async function selectModelChecked(
  env: Env,
  tier: ReasoningTier,
): Promise<ReturnType<typeof selectModel>> {
  if (tier === "deep" && (await hasMiniMaxBudget(env))) {
    return miniMaxModel(env);
  }
  return fastModel(env);
}
