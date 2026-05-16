/**
 * OpenInference-aware span classification + IO extraction for the eval runner.
 *
 * After the Worker's `postProcessor` projects Vercel AI SDK spans into
 * OpenInference conventions (see ../src/telemetry/openinference.ts), LLM spans
 * reliably carry `openinference.span.kind === "LLM"`, `input.value`,
 * `output.value`, `llm.model_name`, and `llm.token_count.*`.
 *
 * Previously the runner classified spans by fragile name string-matching
 * (`generateText`/`streamText`) and read `ai.prompt`/`ai.text`. That only
 * worked by accident and broke whenever span names changed. This module keys
 * off the canonical conventions, with legacy fallbacks so historical spans
 * (recorded before projection landed) are still evaluable.
 */

import {
  SemanticConventions,
  OpenInferenceSpanKind,
} from "@arizeai/openinference-semantic-conventions";

type Attrs = Record<string, unknown>;

/** Manual (non-AI-SDK) domain spans — emitted with their own `output.value`,
 *  never projected by OpenInference. Classified by name. */
const DOMAIN_NAME_PATTERNS = [
  "Causal.runScreen",
  "Causal.runDBandAnalysis",
  "Manifold.runAnalysis",
  "Experiment",
] as const;

const DOMAIN_NAME_PREFIXES = ["queue.task"] as const;
const DOMAIN_NAME_CONTAINS = ["gateway.complete"] as const;

/** Legacy LLM span name fragments, for spans recorded before projection. */
const LEGACY_LLM_NAME_FRAGMENTS = ["generateText", "streamText"] as const;

export type SpanClass = "llm" | "domain" | "skip";

/**
 * Classify a span. LLM detection prefers the OpenInference span kind; falls
 * back to legacy name/attribute heuristics so older traces still evaluate.
 */
export function classifySpan(name: string, attrs: Attrs): SpanClass {
  const kind = attrs[SemanticConventions.OPENINFERENCE_SPAN_KIND];
  if (kind === OpenInferenceSpanKind.LLM) return "llm";

  if (
    DOMAIN_NAME_PATTERNS.some((p) => name.includes(p)) ||
    DOMAIN_NAME_PREFIXES.some((p) => name.startsWith(p)) ||
    DOMAIN_NAME_CONTAINS.some((p) => name.includes(p))
  ) {
    return "domain";
  }

  // Legacy LLM fallback: name fragment or AI-SDK / gateway IO attributes.
  const legacyLLM =
    LEGACY_LLM_NAME_FRAGMENTS.some((f) => name.includes(f)) ||
    name.startsWith("gateway.") ||
    attrs["ai.prompt"] != null ||
    attrs["ai.response.text"] != null ||
    attrs["ai.text"] != null;
  if (legacyLLM) return "llm";

  return "skip";
}

function coerceString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

/** Robust input/output extraction: OpenInference values first, legacy last. */
export function extractIO(attrs: Attrs): { input: string | null; output: string | null } {
  const input =
    coerceString(attrs[SemanticConventions.INPUT_VALUE]) ??
    coerceString(attrs["ai.prompt"]) ??
    coerceString(attrs["input"]);
  const output =
    coerceString(attrs[SemanticConventions.OUTPUT_VALUE]) ??
    coerceString(attrs["ai.response.text"]) ??
    coerceString(attrs["ai.text"]) ??
    coerceString(attrs["output"]);
  return { input, output };
}

/** Model + token usage, when present (OpenInference conventions). */
export function extractLLMMeta(attrs: Attrs): {
  model: string | null;
  tokensPrompt: number | null;
  tokensCompletion: number | null;
  tokensTotal: number | null;
} {
  const num = (v: unknown) => (typeof v === "number" ? v : v != null ? Number(v) || null : null);
  return {
    model: coerceString(attrs[SemanticConventions.LLM_MODEL_NAME]),
    tokensPrompt: num(attrs[SemanticConventions.LLM_TOKEN_COUNT_PROMPT]),
    tokensCompletion: num(attrs[SemanticConventions.LLM_TOKEN_COUNT_COMPLETION]),
    tokensTotal: num(attrs[SemanticConventions.LLM_TOKEN_COUNT_TOTAL]),
  };
}
