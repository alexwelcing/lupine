/**
 * Provider configurations for multi-model AI Gateway.
 *
 * Supports: Workers AI (default), OpenAI, Anthropic, Google Gemini.
 * Each provider exposes a unified `complete(prompt, opts)` interface.
 */

import { trace, SpanStatusCode } from "@opentelemetry/api";
import { accumulateCost } from "../telemetry/pipeline";
import { annotateGatewayLLMSpan } from "./openinference-span";

export interface ModelResponse {
  text: string;
  provider: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
  latencyMs: number;
  /** Set only by `AIGatewayProvider`: true when Cloudflare AI Gateway
   * served this response from its exact-match cache. Undefined for direct
   * providers. Used by the router's KV usage logger to count cache hits. */
  cacheHit?: boolean;
}

export interface ModelOpts {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  /** Cloudflare AI Gateway exact-match cache TTL in seconds; `0` disables
   * the cache. Ignored by direct (non-Gateway) providers. The router
   * derives a tier default (see `ModelRouter.cacheTtlForTier`); an explicit
   * value here overrides that default — including an explicit `0`. */
  cacheTtl?: number;
}

export type TaskTier = "ingestion" | "screening" | "hypothesis" | "experiment_design" | "code_review";

export interface Provider {
  name: string;
  complete(prompt: string, opts?: ModelOpts): Promise<ModelResponse>;
}

// ─── Workers AI (Cloudflare native, zero egress cost) ───
export class WorkersAIProvider implements Provider {
  name = "workers-ai";
  constructor(private ai: Ai, private model: string = "@cf/moonshotai/kimi-k2.5") {}

  async complete(prompt: string, opts?: ModelOpts): Promise<ModelResponse> {
    const tracer = trace.getTracer("glim-think.gateway");
    return tracer.startActiveSpan(`gateway.${this.name}`, async (span) => {
      span.setAttribute("gen_ai.system", this.name);
      span.setAttribute("gen_ai.request.model", this.model);
      const start = Date.now();
      try {
        const messages: AiChatMessage[] = [];
        if (opts?.systemPrompt) {
          messages.push({ role: "system", content: opts.systemPrompt });
        }
        messages.push({ role: "user", content: prompt });

        const result = await this.ai.run(this.model, {
          messages,
          max_tokens: opts?.maxTokens ?? 2048,
          temperature: opts?.temperature ?? 0.7,
        } satisfies Record<string, unknown>);

        const response: ModelResponse = {
          text: (result as AiChatOutput).response ?? "",
          provider: this.name,
          model: this.model,
          latencyMs: Date.now() - start,
        };
        span.setStatus({ code: SpanStatusCode.OK });
        annotateGatewayLLMSpan(span, {
          provider: this.name,
          model: this.model,
          systemPrompt: opts?.systemPrompt,
          prompt,
          outputText: response.text,
          usage: response.usage,
        });
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
}

/**
 * @deprecated Superseded by `AIGatewayProvider` (src/gateway/ai-gateway.ts),
 * which reaches OpenAI through Cloudflare AI Gateway. Not instantiated by
 * `ModelRouter`. Retained for one release as a manual rollback path.
 */
// ─── OpenAI ───
export class OpenAIProvider implements Provider {
  name = "openai";
  constructor(private apiKey: string, private model: string = "gpt-4.1") {}

  async complete(prompt: string, opts?: ModelOpts): Promise<ModelResponse> {
    const tracer = trace.getTracer("glim-think.gateway");
    return tracer.startActiveSpan(`gateway.${this.name}`, async (span) => {
      span.setAttribute("gen_ai.system", this.name);
      span.setAttribute("gen_ai.request.model", this.model);
      const start = Date.now();
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              ...(opts?.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
              { role: "user", content: prompt },
            ],
            max_tokens: opts?.maxTokens ?? 2048,
            temperature: opts?.temperature ?? 0.7,
          }),
        });

        if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
        const data = (await res.json()) as OpenAIChatCompletion;

        const response: ModelResponse = {
          text: data.choices?.[0]?.message?.content ?? "",
          provider: this.name,
          model: this.model,
          usage: data.usage
            ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
            : undefined,
          latencyMs: Date.now() - start,
        };
        if (response.usage) {
          span.setAttribute("gen_ai.usage.input_tokens", response.usage.promptTokens);
          span.setAttribute("gen_ai.usage.output_tokens", response.usage.completionTokens);
        }
        span.setStatus({ code: SpanStatusCode.OK });
        annotateGatewayLLMSpan(span, {
          provider: this.name,
          model: this.model,
          systemPrompt: opts?.systemPrompt,
          prompt,
          outputText: response.text,
          usage: response.usage,
        });
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
}

/**
 * @deprecated Superseded by `AIGatewayProvider` (Anthropic via Cloudflare AI
 * Gateway's OpenAI-compatible translation). Not instantiated by `ModelRouter`.
 * Retained for one release as a manual rollback path.
 */
// ─── Anthropic ───
export class AnthropicProvider implements Provider {
  name = "anthropic";
  constructor(private apiKey: string, private model: string = "claude-3-7-sonnet-20250219") {}

  async complete(prompt: string, opts?: ModelOpts): Promise<ModelResponse> {
    const tracer = trace.getTracer("glim-think.gateway");
    return tracer.startActiveSpan(`gateway.${this.name}`, async (span) => {
      span.setAttribute("gen_ai.system", this.name);
      span.setAttribute("gen_ai.request.model", this.model);
      const start = Date.now();
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: opts?.maxTokens ?? 4096,
            temperature: opts?.temperature ?? 0.7,
            system: opts?.systemPrompt,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
        const data = (await res.json()) as AnthropicMessage;

        const response: ModelResponse = {
          text: data.content?.[0]?.text ?? "",
          provider: this.name,
          model: this.model,
          usage: data.usage
            ? { promptTokens: data.usage.input_tokens, completionTokens: data.usage.output_tokens }
            : undefined,
          latencyMs: Date.now() - start,
        };
        if (response.usage) {
          span.setAttribute("gen_ai.usage.input_tokens", response.usage.promptTokens);
          span.setAttribute("gen_ai.usage.output_tokens", response.usage.completionTokens);
        }
        span.setStatus({ code: SpanStatusCode.OK });
        annotateGatewayLLMSpan(span, {
          provider: this.name,
          model: this.model,
          systemPrompt: opts?.systemPrompt,
          prompt,
          outputText: response.text,
          usage: response.usage,
        });
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
}

/**
 * @deprecated Superseded by `AIGatewayProvider` (Gemini via Cloudflare AI
 * Gateway's OpenAI-compatible translation). Not instantiated by `ModelRouter`.
 * Retained for one release as a manual rollback path.
 */
// ─── Google Gemini ───
export class GeminiProvider implements Provider {
  name = "gemini";
  constructor(private apiKey: string, private model: string = "gemini-3.1-pro") {}

  async complete(prompt: string, opts?: ModelOpts): Promise<ModelResponse> {
    const tracer = trace.getTracer("glim-think.gateway");
    return tracer.startActiveSpan(`gateway.${this.name}`, async (span) => {
      span.setAttribute("gen_ai.system", this.name);
      span.setAttribute("gen_ai.request.model", this.model);
      const start = Date.now();
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: opts?.maxTokens ?? 2048,
              temperature: opts?.temperature ?? 0.7,
            },
            systemInstruction: opts?.systemPrompt ? { parts: [{ text: opts.systemPrompt }] } : undefined,
          }),
        });

        if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
        const data = (await res.json()) as GeminiResponse;

        const response: ModelResponse = {
          text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
          provider: this.name,
          model: this.model,
          latencyMs: Date.now() - start,
        };
        span.setStatus({ code: SpanStatusCode.OK });
        annotateGatewayLLMSpan(span, {
          provider: this.name,
          model: this.model,
          systemPrompt: opts?.systemPrompt,
          prompt,
          outputText: response.text,
          usage: response.usage,
        });
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
}

// ─── Type stubs for provider APIs ───
interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
interface AiChatInput {
  messages: AiChatMessage[];
  max_tokens?: number;
  temperature?: number;
}
interface AiChatOutput {
  response?: string;
}

interface OpenAIChatCompletion {
  choices: { message?: { content?: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

interface AnthropicMessage {
  content?: { text: string }[];
  usage?: { input_tokens: number; output_tokens: number };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text: string }[] } }[];
}

// ─── Zhipu AI (ZAI) ───
export class ZAIProvider implements Provider {
  name = "zai";
  // baseURL defaults to the GLM Coding Plan endpoint. The standard
  // open.bigmodel.cn / api.z.ai /api/paas/v4 endpoints return 429
  // "no resource package" for token/coding-plan accounts — their tokens
  // are only reachable via /api/coding/paas/v4 (verified with glm-5.1).
  constructor(
    private apiKey: string,
    private model: string = "glm-5.1",
    private baseURL: string = "https://api.z.ai/api/coding/paas/v4",
  ) {}

  async complete(prompt: string, opts?: ModelOpts): Promise<ModelResponse> {
    const tracer = trace.getTracer("glim-think.gateway");
    return tracer.startActiveSpan(`gateway.${this.name}`, async (span) => {
      span.setAttribute("gen_ai.system", this.name);
      span.setAttribute("gen_ai.request.model", this.model);
      const start = Date.now();
      try {
        const res = await fetch(`${this.baseURL.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              ...(opts?.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
              { role: "user", content: prompt },
            ],
            max_tokens: opts?.maxTokens ?? 2048,
            temperature: opts?.temperature ?? 0.7,
          }),
        });

        const raw = await res.text();
        if (!res.ok) throw new Error(`ZAI ${res.status}: ${raw}`);
        const data = JSON.parse(raw) as OpenAIChatCompletion & {
          choices?: { message?: { content?: string; reasoning_content?: string } }[];
        };
        const msg = data.choices?.[0]?.message;

        const response: ModelResponse = {
          // glm-5.1 is a reasoning model: on tight budgets the answer can
          // land in reasoning_content with content empty — fall back to it.
          text: msg?.content || msg?.reasoning_content || "",
          provider: this.name,
          model: this.model,
          latencyMs: Date.now() - start,
          usage: data.usage
            ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
            : undefined,
        };
        span.setStatus({ code: SpanStatusCode.OK });
        annotateGatewayLLMSpan(span, {
          provider: this.name,
          model: this.model,
          systemPrompt: opts?.systemPrompt,
          prompt,
          outputText: response.text,
          usage: response.usage,
        });
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
}

// ─── MiniMax ───
export class MiniMaxProvider implements Provider {
  name = "minimax";
  // baseURL defaults to the INTERNATIONAL OpenAI-compatible endpoint. The
  // old hardcoded api.minimax.chat/v1/text/chatcompletion_v2 (China, legacy
  // base_resp shape) returns 2049 "invalid api key" for sk-cp-* keys —
  // those are minimax.io keys. This matches the working models.ts path.
  constructor(
    private apiKey: string,
    private model: string = "MiniMax-M2.7",
    private baseURL: string = "https://api.minimax.io/v1",
  ) {}

  async complete(prompt: string, opts?: ModelOpts): Promise<ModelResponse> {
    const tracer = trace.getTracer("glim-think.gateway");
    return tracer.startActiveSpan(`gateway.${this.name}`, async (span) => {
      span.setAttribute("gen_ai.system", this.name);
      span.setAttribute("gen_ai.request.model", this.model);
      const start = Date.now();
      try {
        const res = await fetch(`${this.baseURL.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              ...(opts?.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
              { role: "user", content: prompt },
            ],
            max_tokens: opts?.maxTokens ?? 2048,
            temperature: opts?.temperature ?? 0.7,
          }),
        });

        const rawText = await res.text();
        if (!res.ok) throw new Error(`MiniMax ${res.status}: ${rawText}`);
        const data = JSON.parse(rawText) as OpenAIChatCompletion & {
          base_resp?: { status_code?: number; status_msg?: string };
        };
        // International API is OpenAI-compatible but still includes base_resp;
        // a non-zero status_code is a hard error even with HTTP 200.
        if (data.base_resp?.status_code !== undefined && data.base_resp.status_code !== 0) {
          throw new Error(`MiniMax API error: ${JSON.stringify(data.base_resp)}`);
        }

        const response: ModelResponse = {
          text: data.choices?.[0]?.message?.content ?? "",
          provider: this.name,
          model: this.model,
          latencyMs: Date.now() - start,
          usage: data.usage
            ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
            : undefined,
        };
        span.setStatus({ code: SpanStatusCode.OK });
        annotateGatewayLLMSpan(span, {
          provider: this.name,
          model: this.model,
          systemPrompt: opts?.systemPrompt,
          prompt,
          outputText: response.text,
          usage: response.usage,
        });
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
}

// ─── Hugging Face Inference API ───
export class HFProvider implements Provider {
  name = "huggingface";
  constructor(private apiKey: string, private model: string = "meta-llama/Llama-3.1-8B-Instruct") {}

  async complete(prompt: string, opts?: ModelOpts): Promise<ModelResponse> {
    const tracer = trace.getTracer("glim-think.gateway");
    return tracer.startActiveSpan(`gateway.${this.name}`, async (span) => {
      span.setAttribute("gen_ai.system", this.name);
      span.setAttribute("gen_ai.request.model", this.model);
      const start = Date.now();
      try {
        // HF Inference Providers OpenAI-compatible router. The legacy
        // api-inference.huggingface.co/models/<m> endpoint is deprecated
        // (404 "Cannot POST /models/…"); router.huggingface.co is the
        // supported path and returns OpenAI-shaped responses.
        const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              ...(opts?.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
              { role: "user", content: prompt },
            ],
            max_tokens: opts?.maxTokens ?? 2048,
            temperature: opts?.temperature ?? 0.7,
          }),
        });

        if (!res.ok) throw new Error(`HF ${res.status}: ${await res.text()}`);
        const data = (await res.json()) as OpenAIChatCompletion;

        const response: ModelResponse = {
          text: data.choices?.[0]?.message?.content ?? "",
          provider: this.name,
          model: this.model,
          latencyMs: Date.now() - start,
          usage: data.usage
            ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
            : undefined,
        };
        span.setStatus({ code: SpanStatusCode.OK });
        annotateGatewayLLMSpan(span, {
          provider: this.name,
          model: this.model,
          systemPrompt: opts?.systemPrompt,
          prompt,
          outputText: response.text,
          usage: response.usage,
        });
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
}

