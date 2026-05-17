/**
 * Layer-1 substrate of the locked hypothesis-loop architecture.
 *
 * The *hypothesis lifecycle* — formation → experiment design → compute
 * dispatch → evidence → verdict — is the unit of optimization for this
 * system. `hypothesis.id` is the stable through-line Phoenix groups on:
 * every stage span carries the same id, so an entire scientific thread
 * collapses into one logical trace and Layer-2 throughput evaluators can
 * score resolution latency, refutation rate, info-gain (confidence delta),
 * and discriminative power off these attributes.
 *
 * This module is pure instrumentation: no side effects on import, no new
 * dependencies (only `@opentelemetry/api` + the OpenInference semantic
 * conventions already used by `telemetry/openinference.ts`). It mirrors the
 * in-repo `tracer.startActiveSpan(name, async (span) => { … })` +
 * try/catch/finally(span.end()) pattern (see `agents/causal.ts`,
 * `telemetry/storage.ts`).
 */

import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";
import {
  SemanticConventions as SC,
  OpenInferenceSpanKind,
} from "@arizeai/openinference-semantic-conventions";
import type { HypothesisStatus } from "../types";

const HYPOTHESIS_TRACER_NAME = "glim-think.hypothesis";

/**
 * Lifecycle stages. Span name is `hypothesis.<stage>`; every span in a
 * hypothesis thread shares the same `hypothesis.id`.
 */
export type HypothesisStage =
  | "formation"
  | "experiment_design"
  | "compute_dispatch"
  | "evidence"
  | "verdict";

export interface TraceHypothesisStageArgs {
  /** Stable through-line id Phoenix groups the whole lifecycle on. */
  hypothesisId: string;
  stage: HypothesisStage;
  /** Lifecycle status, when known at this stage. */
  status?: HypothesisStatus;
  /** Current confidence in [0,1], or null when unscored. */
  confidence?: number | null;
  /**
   * Extra attributes. Keys are auto-prefixed with `hypothesis.` unless
   * they already start with it, so callers can pass either form.
   */
  attributes?: Record<string, string | number | boolean>;
}

function applyAttributes(
  span: Span,
  attributes: Record<string, string | number | boolean>,
): void {
  for (const [rawKey, value] of Object.entries(attributes)) {
    const key = rawKey.startsWith("hypothesis.")
      ? rawKey
      : `hypothesis.${rawKey}`;
    span.setAttribute(key, value);
  }
}

/**
 * Open a CHAIN span for one hypothesis lifecycle stage, run `fn` inside it,
 * record exceptions, and always end the span.
 *
 * Stamps `hypothesis.id` + `hypothesis.stage` (the grouping keys), and the
 * OpenInference span kind so Phoenix classifies it as a chain link. Status
 * and confidence are stamped only when provided.
 */
export function traceHypothesisStage<T>(
  args: TraceHypothesisStageArgs,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer(HYPOTHESIS_TRACER_NAME);
  return tracer.startActiveSpan(
    `hypothesis.${args.stage}`,
    async (span: Span) => {
      span.setAttribute(
        SC.OPENINFERENCE_SPAN_KIND,
        OpenInferenceSpanKind.CHAIN,
      );
      span.setAttribute("hypothesis.id", args.hypothesisId);
      span.setAttribute("hypothesis.stage", args.stage);
      if (args.status !== undefined) {
        span.setAttribute("hypothesis.status", args.status);
      }
      if (args.confidence !== undefined && args.confidence !== null) {
        span.setAttribute("hypothesis.confidence", args.confidence);
      }
      if (args.attributes) {
        applyAttributes(span, args.attributes);
      }
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: String(err),
        });
        throw err;
      } finally {
        span.end();
      }
    },
  );
}

export interface HypothesisVerdictArgs {
  hypothesisId: string;
  /** Whether the lifecycle reached a terminal state. */
  resolved: boolean;
  outcome: "confirmed" | "refuted" | "inconclusive";
  /** Signed confidence change across the lifecycle (info-gain proxy). */
  confidenceDelta?: number;
  /** Wall-clock latency from formation to verdict, milliseconds. */
  resolutionLatencyMs?: number;
  /** The discriminative property the experiment actually tested, if any. */
  discriminativePropertyTested?: string | null;
}

/**
 * Stamp the terminal verdict attributes onto an existing (typically
 * `verdict`-stage) span. These are exactly the fields the Layer-2
 * throughput evaluators read:
 *   - `hypothesis.resolved` / `hypothesis.outcome` — refutation rate
 *   - `hypothesis.resolution_latency_ms`           — resolution latency
 *   - `hypothesis.confidence_delta`                — info-gain proxy
 *   - `hypothesis.discriminative_property`         — discriminative power
 */
export function annotateHypothesisVerdict(
  span: Span,
  args: HypothesisVerdictArgs,
): void {
  span.setAttribute("hypothesis.id", args.hypothesisId);
  span.setAttribute("hypothesis.resolved", args.resolved);
  span.setAttribute("hypothesis.outcome", args.outcome);
  if (args.confidenceDelta !== undefined) {
    span.setAttribute("hypothesis.confidence_delta", args.confidenceDelta);
  }
  if (args.resolutionLatencyMs !== undefined) {
    span.setAttribute(
      "hypothesis.resolution_latency_ms",
      args.resolutionLatencyMs,
    );
  }
  if (
    args.discriminativePropertyTested !== undefined &&
    args.discriminativePropertyTested !== null
  ) {
    span.setAttribute(
      "hypothesis.discriminative_property",
      args.discriminativePropertyTested,
    );
  }
}

/**
 * Resolution latency helper: `now - created_at`, clamped to >= 0 (an
 * unparseable or future timestamp yields 0 rather than a negative or NaN).
 */
export function hypothesisLatencyMs(createdAtIso: string): number {
  const created = Date.parse(createdAtIso);
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Date.now() - created);
}
