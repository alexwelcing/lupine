/**
 * Cloudflare AI Gateway provider.
 *
 * A thin, OpenAI-compatible wrapper that routes a logical provider
 * (Workers AI / ZAI / MiniMax) through the unified AI Gateway endpoint:
 *
 *   https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/{path}
 *
 * It implements the same `Provider` interface as the direct providers, so
 * `ModelRouter` can keep its fallback chains keyed by logical provider name
 * — only the constructor wiring changes. Span emission, `ModelResponse`
 * shape, and `gen_ai.*` conventions are preserved exactly.
 *
 * ── Routed vs. direct (verified live against the `glimgate` gateway) ───
 *   Logical name   Routing                Notes
 *   workers-ai      Gateway `compat`       model `workers-ai/@cf/...`
 *                                          (compat needs the provider
 *                                          prefix). Cache + analytics +
 *                                          telemetry bridge here.
 *   zai             DIRECT (not here)      Gateway `compat` returns
 *   minimax         DIRECT (not here)      `code 2008 "Invalid provider"`
 *                                          for Zhipu/MiniMax — they are
 *                                          NOT Gateway-reachable. Kept as
 *                                          direct provider fetches.
 *   huggingface     DIRECT (not here)      `inputs` (non-chat) format
 *                                          isn't OpenAI-compatible (§8.3).
 *
 *   This class stays generic (any `pathSegment`/`model`) so adding a
 *   Gateway-supported provider later — or BYOK Zhipu/MiniMax once
 *   Cloudflare supports them — is a one-line router change.
 *
 * ── Error mapping (work order §3.5) ────────────────────────────────────
 *   429  → wait (Retry-After or 1s), retry once, then throw → router
 *          advances the fallback chain.
 *   503  → throw immediately → router advances the chain.
 *   400  → throw, no retry (likely our bug).
 *   5xx  → retry once, then throw.
 *   cache HIT (`cf-aig-cache-status: HIT`) → a 200; returned directly, so
 *          retry/fallback is structurally skipped.
 */

import { trace, SpanStatusCode } from "@opentelemetry/api";
import { accumulateCost } from "../telemetry/pipeline";
import type { ModelResponse, ModelOpts, Provider } from "./providers";

export interface AIGatewayConfig {
  /** `cf-aig` bearer token. */
  token: string;
  /** Cloudflare account id (URL path segment). */
  accountId: string;
  /** AI Gateway name (URL path segment). */
  gatewayName: string;
  /** Gateway provider path segment, e.g. "workers-ai", "openai", "compat". */
  pathSegment: string;
  /** Model id sent in the request body. */
  model: string;
  /** Logical provider name — used for chains, `gen_ai.system`, KV usage. */
  name: string;
}

interface OpenAIChatCompletion {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  /** MiniMax leaks this through some compat paths (gotcha §8.2). */
  base_resp?: { status_code?: number; status_msg?: string };
}

const GATEWAY_ROOT = "https://gateway.ai.cloudflare.com/v1";
const RETRY_BACKOFF_MS = 1000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class AIGatewayProvider implements Provider {
  readonly name: string;

  constructor(private readonly cfg: AIGatewayConfig) {
    this.name = cfg.name;
  }

  private url(): string {
    const { accountId, gatewayName, pathSegment } = this.cfg;
    // Workers AI exposes the OpenAI-compatible API one level deeper.
    const tail =
      pathSegment === "workers-ai"
        ? "workers-ai/v1/chat/completions"
        : `${pathSegment}/chat/completions`;
    return `${GATEWAY_ROOT}/${accountId}/${gatewayName}/${tail}`;
  }

  async complete(prompt: string, opts?: ModelOpts): Promise<ModelResponse> {
    const tracer = trace.getTracer("glim-think.gateway");
    // Span name is the contract the upstream telemetry team keys off
    // (`model.gateway`). Do NOT rename without coordinating (§8.5).
    return tracer.startActiveSpan("gateway.ai-gateway", async (span) => {
      const cacheTtl = opts?.cacheTtl ?? 0;
      span.setAttribute("gen_ai.system", this.name);
      span.setAttribute("gen_ai.request.model", this.cfg.model);
      span.setAttribute("model.gateway", "ai-gateway");
      span.setAttribute("gateway.provider_actual", this.cfg.pathSegment);
      span.setAttribute("gateway.cache.ttl", cacheTtl);

      const start = Date.now();
      const body = JSON.stringify({
        model: this.cfg.model,
        messages: [
          ...(opts?.systemPrompt
            ? [{ role: "system", content: opts.systemPrompt }]
            : []),
          { role: "user", content: prompt },
        ],
        max_tokens: opts?.maxTokens ?? 2048,
        temperature: opts?.temperature ?? 0.7,
      });

      try {
        const res = await this.fetchWithPolicy(body, cacheTtl);
        const cacheHit =
          res.headers.get("cf-aig-cache-status")?.toUpperCase() === "HIT";
        span.setAttribute("gateway.cache.hit", cacheHit);

        const rawText = await res.text();
        if (!res.ok) {
          throw new Error(`AI Gateway ${res.status}: ${rawText}`);
        }

        const data = JSON.parse(rawText) as OpenAIChatCompletion;
        // Sanitise MiniMax's `base_resp` wrapper if the compat path leaks it.
        if (
          data.base_resp?.status_code !== undefined &&
          data.base_resp.status_code !== 0
        ) {
          throw new Error(
            `AI Gateway provider error: ${JSON.stringify(data.base_resp)}`
          );
        }

        const response: ModelResponse = {
          text: data.choices?.[0]?.message?.content ?? "",
          provider: this.name,
          model: this.cfg.model,
          usage:
            data.usage?.prompt_tokens !== undefined ||
            data.usage?.completion_tokens !== undefined
              ? {
                  promptTokens: data.usage.prompt_tokens ?? 0,
                  completionTokens: data.usage.completion_tokens ?? 0,
                }
              : undefined,
          latencyMs: Date.now() - start,
          cacheHit,
        };
        if (response.usage) {
          span.setAttribute(
            "gen_ai.usage.input_tokens",
            response.usage.promptTokens
          );
          span.setAttribute(
            "gen_ai.usage.output_tokens",
            response.usage.completionTokens
          );
        }
        span.setStatus({ code: SpanStatusCode.OK });
        accumulateCost(this.name, response.usage);
        return response;
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Issue the request and apply the §3.5 retry policy. On a non-retryable
   * failure (400/503, or a 429/5xx that has exhausted its single retry)
   * the failing `Response` is returned to the caller, which turns it into
   * a thrown error so the router advances the fallback chain.
   */
  private async fetchWithPolicy(
    body: string,
    cacheTtl: number
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.cfg.token}`,
      "Content-Type": "application/json",
      "cf-aig-cache-ttl": String(cacheTtl),
    };

    let res = await fetch(this.url(), { method: "POST", headers, body });
    if (res.ok || !this.isRetryable(res.status)) return res;

    // One retry only. 429 honours Retry-After; everything else uses a
    // fixed backoff. 503 is intentionally NOT retryable (fast fallback).
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs =
      res.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : RETRY_BACKOFF_MS;
    await sleep(waitMs);

    res = await fetch(this.url(), { method: "POST", headers, body });
    return res;
  }

  /** 429 and 5xx (except 503) get one retry; 503/400 do not. */
  private isRetryable(status: number): boolean {
    if (status === 503) return false;
    return status === 429 || (status >= 500 && status < 600);
  }
}
