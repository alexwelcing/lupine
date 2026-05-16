/**
 * OpenInference semantic-convention projection for the Cloudflare Workers
 * OTel pipeline.
 *
 * The Vercel AI SDK's `experimental_telemetry` emits spans using Vercel's own
 * OTel attributes (`ai.prompt`, `ai.response.text`, `ai.usage.*`, …). Phoenix
 * Cloud's UI and eval libraries classify and extract input/output using
 * **OpenInference** semantic conventions instead (`openinference.span.kind`,
 * `input.value` / `output.value`, `llm.model_name`, `llm.token_count.*`).
 *
 * The documented Arize integration (`OpenInferenceSimpleSpanProcessor` via a
 * `NodeTracerProvider` / `@vercel/otel`) cannot be used here: this Worker uses
 * `@microlabs/otel-cf-workers`, whose Workers-aware span processor + isolate
 * flush model is not a `NodeTracerProvider`. That SDK instead exposes a
 * `postProcessor` hook ("called just before exporting the spans, allows you to
 * make any changes"). `@arizeai/openinference-vercel/utils` exports the same
 * projection logic the SpanProcessor runs as a reusable function, so we apply
 * it in `postProcessor`. This is the Workers-native equivalent of the
 * documented setup — see OBSERVABILITY.md.
 */

import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  addOpenInferenceAttributesToSpan,
  isOpenInferenceSpan,
} from "@arizeai/openinference-vercel/utils";

/**
 * Projects Vercel AI SDK spans into OpenInference semantic conventions in
 * place, just before export. Non-AI-SDK spans (gateway.*, storage, rpc,
 * domain spans) are left untouched — `addOpenInferenceAttributesToSpan` only
 * acts on spans it recognizes as AI SDK spans.
 *
 * Also injects the `openinference.project.name` resource attribute. Phoenix
 * Cloud routes OTLP spans to a project by THAT attribute, not by OTel
 * `service.name` — without it every span lands in the `default` project
 * (proven 2026-05-16). otel-cf-workers' ServiceConfig exposes only
 * name/namespace/version, so the resource attribute is set here.
 *
 * Defensive by design: a malformed span must never drop the whole export
 * batch, so each projection is isolated. The original span is always
 * preserved even if projection throws.
 */
const OI_PROJECT_NAME = "openinference.project.name";

export function makeOpenInferencePostProcessor(projectName: string) {
  return function openInferencePostProcessor(
    spans: ReadableSpan[],
  ): ReadableSpan[] {
    for (const span of spans) {
      try {
        // Route to the right Phoenix project. Resource attributes are
        // readonly/frozen, so in-place mutation silently fails — the resource
        // must be REPLACED with a merged copy. Idempotent: skip if already set.
        if (span.resource?.attributes?.[OI_PROJECT_NAME] !== projectName) {
          const merged = span.resource.merge(
            resourceFromAttributes({ [OI_PROJECT_NAME]: projectName }),
          );
          (span as unknown as { resource: typeof span.resource }).resource =
            merged;
        }
        // Idempotent: skip spans already carrying OpenInference attributes
        // (defensive against double application across batch retries).
        if (!isOpenInferenceSpan(span)) {
          addOpenInferenceAttributesToSpan(span);
        }
      } catch (err) {
        // Keep the un-projected span rather than losing the trace entirely.
        console.error(
          `OpenInference projection failed for span "${span.name}": ${String(err)}`,
        );
      }
    }
    return spans;
  };
}
