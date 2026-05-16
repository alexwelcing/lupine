/**
 * Phoenix span fetcher (REST).
 *
 * Uses the REST client in ./phoenixRest — `@arizeai/phoenix-client` 301s→HTML
 * against space-scoped Phoenix Cloud URLs. Keeps only evaluable spans:
 * OpenInference-classified LLM spans + the manual domain spans the combo
 * evaluators score; plumbing (storage/rpc/http) is skipped.
 */

import { classifySpan } from "./openinference.js";
import { fetchProjectSpans } from "./phoenixRest.js";

export interface LLMSpan {
  id: string;
  name: string;
  traceId: string;
  projectName: string;
  startTime: string;
  endTime: string;
  spanKind: string;
  attributes: Record<string, unknown>;
}

export async function fetchSpans(limit = 500, since?: string): Promise<LLMSpan[]> {
  const projectName = process.env.PHOENIX_PROJECT_NAME || "glim-think";
  const spans = await fetchProjectSpans({ max: limit, since });

  const items: LLMSpan[] = [];
  for (const s of spans) {
    // Phoenix normalizes openinference.span.kind into the top-level
    // span_kind; surface it to attributes so classifySpan keys off it.
    const attrs: Record<string, unknown> = { ...s.attributes };
    if (s.span_kind && s.span_kind !== "UNKNOWN") {
      attrs["openinference.span.kind"] = s.span_kind;
    }
    if (classifySpan(s.name, attrs) === "skip") continue;

    items.push({
      id: s.span_id || s.id,
      name: s.name,
      traceId: s.trace_id,
      projectName,
      startTime: s.start_time,
      endTime: s.end_time,
      spanKind: s.span_kind,
      attributes: attrs,
    });
  }
  return items;
}
