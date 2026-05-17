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
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, wrapLanguageModel, type LanguageModel, type LanguageModelV2Middleware } from "ai";
import type { Env } from "../types";
import { getModelQualityTrend } from "../evals/store";

export type ReasoningTier = "fast" | "deep";

// Verified on 2026-05-02: api.minimax.io/v1 exposes the full MiniMax
// model line for our Max-plan key (api.minimax.chat/v1 and api.minimaxi.com/v1
// returned authentication-success but empty model lists).
//
// Models available on this route (verified via GET /v1/models):
//   MiniMax-M2.7, MiniMax-M2.7-highspeed       (latest, top-tier)
//   MiniMax-M2.5, MiniMax-M2.5-highspeed       (previous gen)
//   MiniMax-M2.1, MiniMax-M2.1-highspeed
//   MiniMax-M2                                  (legacy)
//
// `-highspeed` variants trade ~10% quality for ~3× throughput. Use them
// for the Orchestrator (many short dispatch calls); use the base variant
// for Theorist + Causal (one-shot deep reasoning per turn).
const MINIMAX_DEFAULT_BASE_URL = "https://api.minimax.io/v1";
const MINIMAX_DEFAULT_MODEL = "MiniMax-M2.7";
// 500M tokens/month for the Max plan. Budget guard kicks in once monthly
// usage exceeds it and falls back to Workers AI.
const MINIMAX_MONTHLY_TOKEN_BUDGET = 500_000_000;

const FAST_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

function miniMaxConfig(env: Env): { baseURL: string; model: string } {
  return {
    baseURL: env.MINIMAX_BASE_URL?.trim() || MINIMAX_DEFAULT_BASE_URL,
    model: env.MINIMAX_MODEL?.trim() || MINIMAX_DEFAULT_MODEL,
  };
}

// Note: -highspeed model variants are NOT exposed on this account's
// Max plan (every "*-highspeed" returns 2061 "current token plan not
// support model"). The earlier "fast-deep" tier has been removed.
// If MiniMax later exposes -highspeed, re-add by setting MINIMAX_MODEL
// secret to e.g. "MiniMax-M2.7-highspeed".

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

/**
 * Extract a usable token count from any of the usage shapes the
 * OpenAI-compatible adapter returns. Empirically (verified via
 * /admin/diag-do):
 *
 *   - generateText returns `{inputTokens, outputTokens, reasoningTokens,
 *     totalTokens, raw, ...}` — v6 shape with numeric fields
 *   - streamText's `finish` chunk often returns `{inputTokens: {},
 *     outputTokens: {}}` — empty objects (a bug in the adapter or in
 *     how MiniMax M2.7 reports streaming usage)
 *   - The raw passthrough (`usage.raw`) consistently has the OpenAI
 *     shape `{prompt_tokens, completion_tokens, total_tokens,
 *     completion_tokens_details: {reasoning_tokens}, ...}`
 *
 * We try the v6 shape first; if that yields zero AND raw has numbers,
 * we use raw. This makes spend tracking work whether the model is
 * called via generate or stream.
 */
export function extractMiniMaxTokens(usage: unknown): number {
  if (!usage || typeof usage !== "object") return 0;
  const u = usage as Record<string, unknown>;

  const numericOrZero = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const v6 =
    numericOrZero(u.inputTokens) +
    numericOrZero(u.outputTokens) +
    numericOrZero(u.reasoningTokens);
  if (v6 > 0) return v6;

  const raw = u.raw as Record<string, unknown> | undefined;
  if (raw) {
    const rawTotal =
      numericOrZero(raw.prompt_tokens) + numericOrZero(raw.completion_tokens);
    if (rawTotal > 0) return rawTotal;
    const rawTotalDirect = numericOrZero(raw.total_tokens);
    if (rawTotalDirect > 0) return rawTotalDirect;
  }

  return numericOrZero(u.totalTokens);
}

function spendMiddleware(env: Env): LanguageModelV2Middleware {
  return {
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate();
      const tokens = extractMiniMaxTokens(result.usage);
      if (tokens > 0) {
        await recordMiniMaxSpend(env, tokens);
      }
      return result;
    },
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();
      let lastFinishUsage: unknown = null;
      const wrappedStream = stream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            if (chunk.type === "finish") {
              lastFinishUsage = chunk.usage;
            }
            controller.enqueue(chunk);
          },
          async flush() {
            const tokens = extractMiniMaxTokens(lastFinishUsage);
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

export function miniMaxModel(env: Env, modelOverride?: string) {
  const { baseURL, model: defaultModel } = miniMaxConfig(env);
  const model = modelOverride ?? defaultModel;
  const base = createOpenAICompatible({
    baseURL,
    apiKey: env.MINIMAX_API_KEY!,
    name: "minimax",
  }).chatModel(model);
  return wrapLanguageModel({
    model: base,
    middleware: spendMiddleware(env),
  });
}

/**
 * Fire a minimal "say OK" call to verify that the configured (or
 * ad-hoc) MiniMax model + base URL + key work. Caller can override
 * baseURL and model per-call via the optional `overrides` arg —
 * useful for probing different endpoints from /admin/test-minimax
 * without changing secrets.
 */
export async function testMiniMaxCall(
  env: Env,
  overrides?: { baseURL?: string; model?: string },
): Promise<{
  ok: boolean;
  model: string;
  base_url: string;
  latency_ms: number;
  status?: number;
  response_text?: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  error?: string;
}> {
  const cfg = miniMaxConfig(env);
  const baseURL = overrides?.baseURL?.trim() || cfg.baseURL;
  const model = overrides?.model?.trim() || cfg.model;
  if (!env.MINIMAX_API_KEY) {
    return { ok: false, model, base_url: baseURL, latency_ms: 0, error: "MINIMAX_API_KEY is unset" };
  }
  const start = Date.now();
  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Reply with the single word OK." },
          { role: "user", content: "ping" },
        ],
        max_tokens: 8,
        temperature: 0,
      }),
    });
    const latency = Date.now() - start;
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        model,
        base_url: baseURL,
        latency_ms: latency,
        status: res.status,
        error: `HTTP ${res.status}: ${text.slice(0, 500)}`,
      };
    }
    const json = JSON.parse(text) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    return {
      ok: true,
      model,
      base_url: baseURL,
      latency_ms: latency,
      status: res.status,
      response_text: json.choices?.[0]?.message?.content?.trim(),
      usage: {
        promptTokens: json.usage?.prompt_tokens,
        completionTokens: json.usage?.completion_tokens,
        totalTokens: json.usage?.total_tokens,
      },
    };
  } catch (e) {
    return {
      ok: false,
      model,
      base_url: baseURL,
      latency_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * GET /v1/models against a candidate base URL. Returns the parsed
 * list (OpenAI-compat shape: { data: [{id, ...}, ...] }) or an error.
 */
export async function listMiniMaxModels(
  env: Env,
  overrides?: { baseURL?: string },
): Promise<{
  ok: boolean;
  base_url: string;
  status?: number;
  models?: Array<{ id: string; object?: string; owned_by?: string }>;
  count?: number;
  error?: string;
}> {
  const baseURL = overrides?.baseURL?.trim() || miniMaxConfig(env).baseURL;
  if (!env.MINIMAX_API_KEY) {
    return { ok: false, base_url: baseURL, error: "MINIMAX_API_KEY is unset" };
  }
  try {
    const res = await fetch(`${baseURL}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}` },
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        base_url: baseURL,
        status: res.status,
        error: `HTTP ${res.status}: ${text.slice(0, 500)}`,
      };
    }
    const json = JSON.parse(text) as {
      data?: Array<{ id: string; object?: string; owned_by?: string }>;
    };
    return {
      ok: true,
      base_url: baseURL,
      status: res.status,
      models: json.data ?? [],
      count: (json.data ?? []).length,
    };
  } catch (e) {
    return {
      ok: false,
      base_url: baseURL,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Sweep a list of candidate base URLs and report which accept the
 * current MINIMAX_API_KEY. Used to discover the correct endpoint
 * for an unfamiliar key prefix (e.g. sk-cp-..., sk-or-..., sk-ant-...).
 */
const CANDIDATE_BASE_URLS = [
  "https://api.minimax.chat/v1",
  "https://api.minimaxi.com/v1",
  "https://api.minimax.io/v1",
  "https://openrouter.ai/api/v1",
  "https://api.cometapi.com/v1",
  "https://api.openai-compatible.com/v1",
  "https://api.deepseek.com/v1",
  "https://aihubmix.com/v1",
  "https://api.zhizengzeng.com/v1",
  "https://api.gptsapi.net/v1",
];

/**
 * Exercise the FULL deep-tier pipeline: selectModel → wrapLanguageModel
 * (with spendMiddleware) → AI SDK generateText. Verifies that
 * MiniMax-via-AI-SDK works and that the spend middleware records tokens
 * to KV (you can re-check /budget afterwards to see the increment).
 */
export async function exerciseDeepTier(env: Env): Promise<{
  ok: boolean;
  model_route: { base_url: string; model: string };
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  latency_ms?: number;
  text?: string;
  error?: string;
}> {
  const cfg = miniMaxConfig(env);
  if (!env.MINIMAX_API_KEY) {
    return { ok: false, model_route: { base_url: cfg.baseURL, model: cfg.model }, error: "MINIMAX_API_KEY is unset" };
  }
  const start = Date.now();
  try {
    const model = selectModel(env, "deep");
    const result = await generateText({
      model,
      maxOutputTokens: 64,
      prompt: "In one sentence, what is a hyper-ribbon error manifold?",
      experimental_telemetry: { isEnabled: true, functionId: "models.health-check" },
    });
    const totalTokens =
      (result.usage?.inputTokens ?? 0) +
      (result.usage?.outputTokens ?? 0) +
      (result.usage?.reasoningTokens ?? 0);
    // Direct spend record so the test endpoint always increments /budget
    // even if the wrapLanguageModel middleware didn't fire (which would
    // be a separate bug we'd need to track down — but the /admin probe
    // should never silently lose spend).
    if (totalTokens > 0) {
      await recordMiniMaxSpend(env, totalTokens);
    }
    return {
      ok: true,
      model_route: cfg,
      prompt_tokens: result.usage?.inputTokens,
      completion_tokens: result.usage?.outputTokens,
      total_tokens: totalTokens,
      latency_ms: Date.now() - start,
      text: result.text,
    };
  } catch (e) {
    return {
      ok: false,
      model_route: cfg,
      latency_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function sweepMiniMaxEndpoints(
  env: Env,
  extraUrls?: string[],
): Promise<Array<{
  base_url: string;
  models_ok: boolean;
  models_status?: number;
  models_count?: number;
  models_error?: string;
}>> {
  const urls = [...CANDIDATE_BASE_URLS, ...(extraUrls ?? [])];
  return Promise.all(
    urls.map(async (baseURL) => {
      const result = await listMiniMaxModels(env, { baseURL });
      return {
        base_url: baseURL,
        models_ok: result.ok,
        models_status: result.status,
        models_count: result.count,
        models_error: result.error,
      };
    }),
  );
}

/**
 * Synchronous selector. Use when the caller can't await
 * (e.g. inside @cloudflare/think `getModel()`).
 *
 *   tier "deep" → MiniMax-M2.7 (or env override via MINIMAX_MODEL)
 *   tier "fast" → Workers AI (free, llama-4-scout)
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

// ---------------------------------------------------------------------------
// Canonical deep-tier model layer (replaces the deleted src/gateway/ stack).
//
// One path for every research LLM call: AI-SDK-native, so each call emits an
// `ai.generateText` span the OpenInference projector + eval scorecard can see
// and steer. The legacy hand-rolled gateway (ModelRouter/providers) was 0/300
// spans in Phoenix — unobservable and unsteerable. This is its replacement.
//
//   minimax (MiniMax-M2.7)  — proven default + budget-metered fallback
//   zai     (glm-5.1)       — eval-aware alternate (GLM Coding Plan endpoint)
//   openai  (gpt-5.5)       — strength-first "last decider", official provider
//                             (handles gpt-5 max_completion_tokens / no-temp)
//
// Endpoints/models below are the values verified working in the old gateway
// before deletion; salvaged here so nothing regresses.
// ---------------------------------------------------------------------------

export type DeepProvider = "minimax" | "zai" | "openai";

/** A resolved deep route: the AI-SDK model plus its identity for spans/scorecard. */
export interface DeepRoute {
  model: LanguageModel;
  provider: DeepProvider | "workers-ai";
  modelId: string;
}

// Minimum scorecard sample size before a measured pass-rate is allowed to
// steer routing (mirrors the conservative gate in evals/store.ts).
const MODEL_SCORE_MIN_N = 8;

// Round-robin counter for the un-scored MiniMax/GLM balance (the "get better
// at the science" intent: spread deep load until the scorecard has signal).
let rrCounter = 0;

function zaiModel(env: Env) {
  return createOpenAICompatible({
    baseURL: env.ZAI_BASE_URL?.trim() || "https://api.z.ai/api/coding/paas/v4",
    apiKey: env.ZAI_API_KEY!,
    name: "zai",
  }).chatModel(env.ZAI_MODEL?.trim() || "glm-5.1");
}

function openaiModel(env: Env) {
  return createOpenAI({ apiKey: env.OPENAI_API_KEY! })(
    env.OPENAI_MODEL?.trim() || "gpt-5.5",
  );
}

/** Deep providers whose credentials are present, in safe-default order. */
function availableDeepProviders(env: Env): DeepProvider[] {
  const out: DeepProvider[] = [];
  if (env.MINIMAX_API_KEY) out.push("minimax");
  if (env.ZAI_API_KEY) out.push("zai");
  if (env.OPENAI_API_KEY) out.push("openai");
  return out;
}

function buildDeepRoute(env: Env, p: DeepProvider): DeepRoute {
  switch (p) {
    case "zai":
      return { model: zaiModel(env), provider: "zai", modelId: env.ZAI_MODEL?.trim() || "glm-5.1" };
    case "openai":
      return { model: openaiModel(env), provider: "openai", modelId: env.OPENAI_MODEL?.trim() || "gpt-5.5" };
    default:
      return { model: miniMaxModel(env), provider: "minimax", modelId: miniMaxConfig(env).model };
  }
}

/**
 * Eval-aware deep-tier selection. Consults the latest ModelScorecard
 * (written hourly by the eval harness) and routes to the highest-scoring
 * well-sampled provider. Until the scorecard has signal, balances
 * MiniMax/GLM round-robin and reserves OpenAI gpt-5.5 as the strength-first
 * last decider (used when it is the only credentialed provider or when it
 * measurably wins). Always budget-guards MiniMax → Workers AI.
 */
export async function selectDeepRoute(env: Env): Promise<DeepRoute> {
  const candidates = availableDeepProviders(env);
  if (candidates.length === 0) {
    return { model: fastModel(env), provider: "workers-ai", modelId: FAST_MODEL };
  }

  // MiniMax budget guard: drop it from candidates when exhausted.
  let pool = candidates;
  if (pool.includes("minimax") && !(await hasMiniMaxBudget(env))) {
    pool = pool.filter((p) => p !== "minimax");
    if (pool.length === 0) {
      return { model: fastModel(env), provider: "workers-ai", modelId: FAST_MODEL };
    }
  }

  // Scorecard-steered: pick the best well-sampled provider in the pool.
  const trend = await getModelQualityTrend(env);
  const scored = pool
    .map((p) => ({ p, s: trend[p] }))
    .filter((x): x is { p: DeepProvider; s: { score: number; n: number } } =>
      !!x.s && x.s.n >= MODEL_SCORE_MIN_N)
    .sort((a, b) => b.s.score - a.s.score);
  if (scored.length > 0) {
    return buildDeepRoute(env, scored[0].p);
  }

  // No signal yet: round-robin MiniMax/GLM; OpenAI only if it's all we have.
  const balance = pool.filter((p) => p !== "openai");
  const ring = balance.length > 0 ? balance : pool;
  const pick = ring[rrCounter++ % ring.length];
  return buildDeepRoute(env, pick);
}

export interface ResearchTextOpts {
  prompt: string;
  system?: string;
  /** OpenInference functionId — the model×agent scorecard buckets on this. */
  agentClass: string;
  tier?: ReasoningTier;
  maxOutputTokens?: number;
  temperature?: number;
}

/**
 * The single entry point for research narrative / hypothesis text. Replaces
 * `new ModelRouter(env).complete(...)`. Returns `{ text, provider, model }`
 * so existing call sites swap with no shape change, and every call lands as
 * an `ai.generateText` span attributed to `agentClass` (functionId) — which
 * is exactly what the OpenInference projector and eval scorecard consume.
 */
export async function generateResearchText(
  env: Env,
  opts: ResearchTextOpts,
): Promise<{ text: string; provider: string; model: string }> {
  const tier = opts.tier ?? "deep";
  const route: DeepRoute =
    tier === "deep"
      ? await selectDeepRoute(env)
      : { model: fastModel(env), provider: "workers-ai", modelId: FAST_MODEL };

  try {
    const result = await generateText({
      model: route.model,
      system: opts.system,
      prompt: opts.prompt,
      maxOutputTokens: opts.maxOutputTokens ?? 2048,
      // gpt-5.x rejects non-default temperature; omit it for OpenAI.
      ...(route.provider === "openai" || opts.temperature === undefined
        ? {}
        : { temperature: opts.temperature }),
      experimental_telemetry: { isEnabled: true, functionId: opts.agentClass },
    });
    return {
      text: (result.text ?? "").trim(),
      provider: route.provider,
      model: route.modelId,
    };
  } catch (e) {
    // Merciless-but-safe: if a non-MiniMax route fails, fall back to the
    // proven MiniMax path once before surfacing the error.
    if (route.provider !== "minimax" && env.MINIMAX_API_KEY) {
      const fb = await generateText({
        model: miniMaxModel(env),
        system: opts.system,
        prompt: opts.prompt,
        maxOutputTokens: opts.maxOutputTokens ?? 2048,
        ...(opts.temperature === undefined ? {} : { temperature: opts.temperature }),
        experimental_telemetry: { isEnabled: true, functionId: opts.agentClass },
      });
      return {
        text: (fb.text ?? "").trim(),
        provider: "minimax",
        model: miniMaxConfig(env).model,
      };
    }
    throw e;
  }
}
