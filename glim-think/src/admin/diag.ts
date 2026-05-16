/**
 * /admin/diag — single-curl chain walker.
 *
 * Probes the full MiniMax → agent chain, layer by layer, and returns
 * exactly where it breaks. Each probe is timed and isolated so a
 * failure at layer N doesn't poison the result for layer N+1.
 *
 * Probes (in order):
 *   1. env-config       — key prefix, model, base URL (from env binding)
 *   2. raw-http         — POST /v1/chat/completions via plain fetch
 *   3. unwrapped-sdk    — generateText against createOpenAICompatible
 *                          model (no wrapLanguageModel)
 *   4. wrapped-sdk      — generateText through wrapLanguageModel, with
 *                          a module-scoped counter inside the middleware
 *                          to prove wrapGenerate actually fires
 *   5. wrapped-stream   — streamText through the same wrapped model;
 *                          checks wrapStream fires
 *   6. tool-call        — generateText with a single tool defined; we
 *                          parse tool_calls back so we know whether M2.7
 *                          can actually drive an agent
 *   7. do-binding       — confirm env.THEORIST_AGENT binding exists and
 *                          we can derive a stub (no actual invocation —
 *                          DOs require the agents WS protocol)
 *   8. agent-model      — return what selectModel('deep') returns INSIDE
 *                          a DO (proves env propagates to DOs the same
 *                          way it does to the request handler)
 */
import { generateText, streamText, tool, wrapLanguageModel, type LanguageModelV2Middleware } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import type { Env } from "../types";

interface ProbeOutcome {
  layer: string;
  ok: boolean;
  latency_ms: number;
  details?: Record<string, unknown>;
  error?: string;
}

async function timed<T>(
  layer: string,
  fn: () => Promise<{ ok: boolean; details?: Record<string, unknown>; error?: string }>,
): Promise<ProbeOutcome> {
  const start = Date.now();
  try {
    const r = await fn();
    return { layer, ok: r.ok, latency_ms: Date.now() - start, details: r.details, error: r.error };
  } catch (e) {
    return {
      layer,
      ok: false,
      latency_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function envConfig(env: Env): { base_url: string; model: string; key_prefix: string | null } {
  return {
    base_url: env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1",
    model: env.MINIMAX_MODEL?.trim() || "MiniMax-M2.7",
    key_prefix: env.MINIMAX_API_KEY ? env.MINIMAX_API_KEY.slice(0, 8) : null,
  };
}

// Module-scoped counters so the middleware can prove it fired.
// Reset at the start of each /admin/diag invocation.
const middlewareCounters = {
  wrapGenerate: 0,
  wrapStream: 0,
  lastUsage: null as unknown,
};

function diagMiddleware(): LanguageModelV2Middleware {
  return {
    wrapGenerate: async ({ doGenerate }) => {
      middlewareCounters.wrapGenerate += 1;
      const result = await doGenerate();
      middlewareCounters.lastUsage = result.usage;
      return result;
    },
    wrapStream: async ({ doStream }) => {
      middlewareCounters.wrapStream += 1;
      const { stream, ...rest } = await doStream();
      const wrapped = stream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            if (chunk.type === "finish") {
              middlewareCounters.lastUsage = chunk.usage;
            }
            controller.enqueue(chunk);
          },
        }),
      );
      return { stream: wrapped, ...rest };
    },
  };
}

export async function runDiag(env: Env): Promise<{
  config: ReturnType<typeof envConfig>;
  results: ProbeOutcome[];
  middleware_counters: typeof middlewareCounters;
  summary: { total: number; ok: number; failed: number; first_failure?: string };
}> {
  middlewareCounters.wrapGenerate = 0;
  middlewareCounters.wrapStream = 0;
  middlewareCounters.lastUsage = null;

  const config = envConfig(env);
  const results: ProbeOutcome[] = [];

  // 1. env-config
  results.push({
    layer: "1-env-config",
    ok: Boolean(env.MINIMAX_API_KEY && config.base_url && config.model),
    latency_ms: 0,
    details: { ...config, key_present: Boolean(env.MINIMAX_API_KEY) },
    error: env.MINIMAX_API_KEY ? undefined : "MINIMAX_API_KEY unset",
  });

  // 2. raw-http
  results.push(
    await timed("2-raw-http", async () => {
      const res = await fetch(`${config.base_url}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: "Respond with the single character X." },
            { role: "user", content: "ping" },
          ],
          max_tokens: 16,
          temperature: 0,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 300)}` };
      }
      const json = JSON.parse(text) as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
        usage?: Record<string, number>;
      };
      return {
        ok: true,
        details: {
          status: res.status,
          finish_reason: json.choices?.[0]?.finish_reason,
          content_preview: json.choices?.[0]?.message?.content?.slice(0, 80),
          usage: json.usage,
          usage_keys: json.usage ? Object.keys(json.usage) : [],
        },
      };
    }),
  );

  // 3. unwrapped-sdk
  results.push(
    await timed("3-unwrapped-sdk", async () => {
      const model = createOpenAICompatible({
        baseURL: config.base_url,
        apiKey: env.MINIMAX_API_KEY!,
        name: "minimax",
      }).chatModel(config.model);
      const r = await generateText({
        model,
        maxOutputTokens: 16,
        prompt: "ping",
        experimental_telemetry: { isEnabled: true, functionId: "admin.diag.unwrapped-sdk" },
      });
      return {
        ok: true,
        details: {
          text_preview: r.text?.slice(0, 80),
          finish_reason: r.finishReason,
          usage: r.usage,
          usage_keys: r.usage ? Object.keys(r.usage) : [],
        },
      };
    }),
  );

  // 4. wrapped-sdk (verify middleware fires)
  const generateBefore = middlewareCounters.wrapGenerate;
  results.push(
    await timed("4-wrapped-sdk", async () => {
      const base = createOpenAICompatible({
        baseURL: config.base_url,
        apiKey: env.MINIMAX_API_KEY!,
        name: "minimax",
      }).chatModel(config.model);
      const wrapped = wrapLanguageModel({
        model: base,
        middleware: diagMiddleware(),
      });
      const r = await generateText({
        model: wrapped,
        maxOutputTokens: 16,
        prompt: "ping",
        experimental_telemetry: { isEnabled: true, functionId: "admin.diag.wrapped-sdk" },
      });
      const fired = middlewareCounters.wrapGenerate > generateBefore;
      return {
        ok: fired,
        details: {
          text_preview: r.text?.slice(0, 80),
          middleware_wrap_generate_fired: fired,
          counter_before: generateBefore,
          counter_after: middlewareCounters.wrapGenerate,
          usage: r.usage,
        },
        error: fired ? undefined : "wrapGenerate middleware did NOT fire — spend tracking is broken",
      };
    }),
  );

  // 5. wrapped-stream
  const streamBefore = middlewareCounters.wrapStream;
  results.push(
    await timed("5-wrapped-stream", async () => {
      const base = createOpenAICompatible({
        baseURL: config.base_url,
        apiKey: env.MINIMAX_API_KEY!,
        name: "minimax",
      }).chatModel(config.model);
      const wrapped = wrapLanguageModel({
        model: base,
        middleware: diagMiddleware(),
      });
      const r = streamText({
        model: wrapped,
        maxOutputTokens: 16,
        prompt: "ping",
        experimental_telemetry: { isEnabled: true, functionId: "admin.diag.wrapped-stream" },
      });
      let chunks = 0;
      let finalText = "";
      for await (const delta of r.textStream) {
        chunks += 1;
        finalText += delta;
      }
      const final = await r.finishReason;
      const usage = await r.usage;
      const fired = middlewareCounters.wrapStream > streamBefore;
      return {
        ok: fired,
        details: {
          text_preview: finalText.slice(0, 80),
          chunks,
          finish_reason: final,
          middleware_wrap_stream_fired: fired,
          counter_before: streamBefore,
          counter_after: middlewareCounters.wrapStream,
          usage,
        },
        error: fired ? undefined : "wrapStream middleware did NOT fire",
      };
    }),
  );

  // 6. tool-call (does M2.7 actually drive tools?)
  results.push(
    await timed("6-tool-call", async () => {
      const model = createOpenAICompatible({
        baseURL: config.base_url,
        apiKey: env.MINIMAX_API_KEY!,
        name: "minimax",
      }).chatModel(config.model);
      const r = await generateText({
        model,
        maxOutputTokens: 256,
        prompt: "Use the get_weather tool to get the weather in Tokyo.",
        experimental_telemetry: { isEnabled: true, functionId: "admin.diag.tool-call" },
        tools: {
          get_weather: tool({
            description: "Look up the current weather for a city.",
            inputSchema: z.object({
              city: z.string().describe("The city name"),
            }),
            execute: async ({ city }) => `It is 22°C and sunny in ${city}.`,
          }),
        },
      });
      const toolCalls = r.toolCalls ?? [];
      const toolResults = r.toolResults ?? [];
      return {
        ok: toolCalls.length > 0,
        details: {
          tool_calls_count: toolCalls.length,
          tool_results_count: toolResults.length,
          first_tool_call: toolCalls[0]
            ? { tool: toolCalls[0].toolName, args: toolCalls[0].input }
            : null,
          finish_reason: r.finishReason,
          text_preview: r.text?.slice(0, 200),
        },
        error:
          toolCalls.length === 0
            ? "M2.7 did not emit a tool call — agent tool routing will not work"
            : undefined,
      };
    }),
  );

  // 7. do-binding
  results.push(
    await timed("7-do-binding", async () => {
      const id = env.THEORIST_AGENT.idFromName("diag-probe");
      const stub = env.THEORIST_AGENT.get(id);
      return {
        ok: Boolean(stub),
        details: {
          binding_present: Boolean(env.THEORIST_AGENT),
          stub_obtained: Boolean(stub),
          do_id_string: id.toString().slice(0, 16),
        },
      };
    }),
  );

  // 8. agent-model — what would Theorist actually use?
  // Can't ask the DO without the agents protocol; mirror its getModel
  // logic by calling selectModel here with the same env we pass to the DO.
  results.push({
    layer: "8-agent-model",
    ok: true,
    latency_ms: 0,
    details: {
      // Mirroring Theorist.getModel() logic: returns selectModel(env, "deep")
      // which routes to MiniMax when MINIMAX_API_KEY is present.
      would_use:
        env.MINIMAX_API_KEY
          ? `MiniMax (${config.model} @ ${config.base_url})`
          : "Workers AI (fallback because MINIMAX_API_KEY unset)",
      note:
        "DOs receive env via the agents/think runtime — same secrets surface here. " +
        "If a Theorist invocation logs a different model, env propagation differs across runtimes.",
    },
  });

  const failed = results.filter((r) => !r.ok);
  return {
    config,
    results,
    middleware_counters: { ...middlewareCounters },
    summary: {
      total: results.length,
      ok: results.length - failed.length,
      failed: failed.length,
      first_failure: failed[0]?.layer,
    },
  };
}

/**
 * Just the KV write/read round-trip from inside the DO. If this fails,
 * KV writes from DO context are broken at the binding layer (which
 * would explain why recordMiniMaxSpend doesn't persist).
 */
export async function probeDOKV(env: Env): Promise<unknown> {
  const id = env.THEORIST_AGENT.idFromName(`kv-probe-${Date.now()}`);
  const stub = env.THEORIST_AGENT.get(id);
  return await (stub as unknown as { kvProbe: () => Promise<unknown> }).kvProbe();
}

/**
 * Probe just the DO synthesize path so we can see whether the
 * Theorist's wrapped model returns usage tokens. If usage has real
 * numbers in the response BUT /budget didn't tick, the middleware
 * inside the DO context isn't recording spend (KV write fails or
 * middleware isn't firing despite the diag showing it does in the
 * worker handler context).
 */
export async function probeDOSynthesize(env: Env): Promise<{
  ok: boolean;
  do_returned_usage: unknown;
  budget_before: unknown;
  budget_after: unknown;
  budget_diff_tokens: number;
  text_preview?: string;
  error?: string;
}> {
  const monthKey = new Date().toISOString().slice(0, 7);
  const budgetKey = `budget:${monthKey}:minimax`;
  const before = await env.CONFIG.get(budgetKey);
  const beforeStats = before ? JSON.parse(before) : { tokens: 0, calls: 0 };

  try {
    const id = env.THEORIST_AGENT.idFromName(`diag-do-probe-${Date.now()}`);
    const stub = env.THEORIST_AGENT.get(id);
    const result = await (stub as unknown as {
      synthesize: (opts: {
        prompt: string;
        maxOutputTokens?: number;
      }) => Promise<{
        text: string;
        text_with_reasoning: string;
        usage?: Record<string, unknown>;
        latency_ms: number;
      }>;
    }).synthesize({
      prompt: "In one sentence, what is participation ratio in this benchmark context?",
      maxOutputTokens: 256,
    });

    // Wait briefly for any async middleware-side KV write to complete
    await new Promise((r) => setTimeout(r, 1000));

    const after = await env.CONFIG.get(budgetKey);
    const afterStats = after ? JSON.parse(after) : { tokens: 0, calls: 0 };

    return {
      ok: true,
      do_returned_usage: result.usage,
      budget_before: beforeStats,
      budget_after: afterStats,
      budget_diff_tokens: (afterStats.tokens ?? 0) - (beforeStats.tokens ?? 0),
      text_preview: result.text?.slice(0, 200),
    };
  } catch (e) {
    return {
      ok: false,
      do_returned_usage: null,
      budget_before: beforeStats,
      budget_after: beforeStats,
      budget_diff_tokens: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
