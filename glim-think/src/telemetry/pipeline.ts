/**
 * Pipeline tracing helpers for multi-step research workflows.
 *
 * Provides `withPipelineSpan()` to create parent spans that wrap
 * harvest→comprehend→reason chains, and `accumulateCost()` to roll up
 * token usage from nested LLM calls.
 */

import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";

const PIPELINE_TRACER_NAME = "glim-think.pipeline";

/** Approximate cost per 1K tokens by provider (USD). */
const COST_PER_1K: Record<string, number> = {
  "openai": 0.0025,
  "anthropic": 0.003,
  "gemini": 0.0005,
  "workers-ai": 0.0,
  "zai": 0.001,
  "minimax": 0.001,
  "huggingface": 0.001,
};

/** WeakMap to track accumulated cost/token state per active span. */
const spanCosts = new WeakMap<Span, { total: number; input: number; output: number; cost: number }>();

/**
 * Run a block of code inside a pipeline parent span.
 *
 * All nested spans (LLM calls, DB queries, RPC) automatically become
 * children of this span in Phoenix.
 */
export async function withPipelineSpan<T>(
  name: string,
  attributes: Record<string, unknown>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer(PIPELINE_TRACER_NAME);
  return tracer.startActiveSpan(name, async (span: Span) => {
    for (const [k, v] of Object.entries(attributes)) {
      if (v !== undefined && v !== null) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          span.setAttribute(k, v);
        } else {
          span.setAttribute(k, JSON.stringify(v));
        }
      }
    }
    spanCosts.set(span, { total: 0, input: 0, output: 0, cost: 0 });
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
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
 * Accumulate LLM token usage into the current active pipeline span.
 *
 * Call this after every LLM completion inside a pipeline. It adds to
 * the parent span's cumulative cost and token attributes.
 */
export function accumulateCost(
  provider: string,
  usage: { promptTokens: number; completionTokens: number } | undefined,
): void {
  if (!usage) return;
  const span = trace.getActiveSpan();
  if (!span) return;

  const input = usage.promptTokens;
  const output = usage.completionTokens;
  const total = input + output;

  const state = spanCosts.get(span) ?? { total: 0, input: 0, output: 0, cost: 0 };
  const rate = COST_PER_1K[provider] ?? 0.001;
  const addedCost = (total / 1000) * rate;

  state.total += total;
  state.input += input;
  state.output += output;
  state.cost = Math.round((state.cost + addedCost) * 1e6) / 1e6;

  spanCosts.set(span, state);
  span.setAttribute("pipeline.tokens_total", state.total);
  span.setAttribute("pipeline.tokens_input", state.input);
  span.setAttribute("pipeline.tokens_output", state.output);
  span.setAttribute("pipeline.cost_usd", state.cost);
}

/**
 * Wrap the research queue consumer's `runTaskInner()` in a pipeline span.
 *
 * This creates a `research.pipeline` parent span for each queue task,
 * linking all nested operations (LLM, DB, RPC, external fetches) under
 * one trace.
 */
export async function withTaskPipeline<T>(
  taskKind: string,
  dedupKey: string,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return withPipelineSpan("research.pipeline", {
    "pipeline.task_kind": taskKind,
    "pipeline.dedup_key": dedupKey,
  }, fn);
}
