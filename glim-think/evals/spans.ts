/**
 * Phoenix span fetcher.
 *
 * Uses @arizeai/phoenix-client/spans to query spans.
 * Annotation pushing is handled via logSpanAnnotations in run-evals.ts.
 */

import { createClient } from "@arizeai/phoenix-client";
import { getSpans } from "@arizeai/phoenix-client/spans";

export interface LLMSpan {
  id: string;
  name: string;
  traceId: string;
  projectName: string;
  startTime: string;
  endTime: string;
  attributes: Record<string, unknown>;
}

const USER_AGENT = "glim-think-eval/1.0.0 (Node.js; eval-runner)";

function getClient() {
  const apiKey = process.env.PHOENIX_API_KEY?.trim();
  if (!apiKey) throw new Error("PHOENIX_API_KEY not set");
  return createClient({
    options: {
      baseUrl: getPhoenixHost(),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": USER_AGENT,
      },
    },
  });
}

function getPhoenixHost(): string {
  const endpoint = process.env.PHOENIX_COLLECTOR_ENDPOINT;
  if (endpoint) {
    return endpoint.replace(/\/v1\/traces\/?$/, "");
  }
  throw new Error("PHOENIX_COLLECTOR_ENDPOINT must be set");
}

/**
 * Fetch candidate spans from Phoenix.
 * Filters for generateText, streamText, agent.*, and gateway.* spans
 * plus domain-specific spans (Causal, Manifold, DBand).
 */
export async function fetchSpans(limit = 500): Promise<LLMSpan[]> {
  const client = getClient();

  const { spans } = await getSpans({
    client,
    project: { projectName: process.env.PHOENIX_PROJECT_NAME || "glim-think" },
    limit,
  });

  const items: LLMSpan[] = [];
  for (const s of spans as unknown[]) {
    const span = s as {
      name?: string;
      span_name?: string;
      context?: { span_id?: string; trace_id?: string };
      span_id?: string;
      trace_id?: string;
      id?: string;
      start_time?: string;
      end_time?: string;
      attributes?: Record<string, unknown>;
    };
    const name = span.name ?? span.span_name ?? "";
    const attrs = span.attributes ?? {};

    // Only keep evaluable spans
    const hasOutput = attrs["output.value"] || attrs["ai.text"];
    const isLLM = name.includes("generateText") || name.includes("streamText") || name.startsWith("gateway.");
    const isDomain =
      name.includes("Causal.runScreen") ||
      name.includes("Causal.runDBandAnalysis") ||
      name.includes("Manifold.runAnalysis") ||
      name.includes("Experiment") ||
      name.startsWith("queue.task") ||
      name.includes("gateway.complete");
    const hasMetrics =
      attrs["eval.code.experiment.valid"] != null ||
      attrs["queue.task.latency_ms"] != null ||
      attrs["gateway.provider"] != null;

    if (!hasOutput && !isDomain && !hasMetrics) continue;

    items.push({
      id: span.context?.span_id ?? span.span_id ?? span.id ?? "",
      name,
      traceId: span.context?.trace_id ?? span.trace_id ?? "",
      projectName: process.env.PHOENIX_PROJECT_NAME || "glim-think",
      startTime: span.start_time ?? "",
      endTime: span.end_time ?? "",
      attributes: attrs,
    });
  }

  return items;
}
