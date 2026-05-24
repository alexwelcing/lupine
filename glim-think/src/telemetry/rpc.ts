/**
 * OpenTelemetry tracing wrappers for Durable Object RPC calls.
 *
 * Wraps `stub.fetch()`, `child.chat()`, and `subAgent()` dispatches
 * so the agent graph is visible in traces.
 */

import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";

const RPC_TRACER_NAME = "glim-think.rpc";

interface DOStub {
  fetch(request: Request): Promise<Response>;
}

/** Cap span input/output payloads so a long reasoning chain can't bloat the
 *  OTLP batch (Phoenix/relay reject oversized spans). */
function clip(value: string, max = 8192): string {
  return value.length > max ? `${value.slice(0, max)}…[${value.length} chars]` : value;
}

/**
 * Trace a Durable Object `stub.fetch()` call.
 *
 * Example:
 *   const stub = env.FLEET.get(id);
 *   const res = await traceDOFetch(stub, new Request("http://internal/run", { method: "POST", body: "..." }), "FleetOrchestrator");
 */
export async function traceDOFetch<T extends DOStub>(
  stub: T,
  request: Request,
  agentClass: string,
): Promise<Response> {
  const tracer = trace.getTracer(RPC_TRACER_NAME);
  return tracer.startActiveSpan("agent.rpc", async (span: Span) => {
    span.setAttribute("rpc.system", "durable_object");
    span.setAttribute("rpc.method", request.method);
    span.setAttribute("rpc.target", agentClass);
    span.setAttribute("rpc.url_path", new URL(request.url).pathname);
    const start = performance.now();
    try {
      const response = await stub.fetch(request);
      span.setAttribute("rpc.status_code", response.status);
      span.setStatus({ code: SpanStatusCode.OK });
      return response;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      span.setAttribute("rpc.duration_ms", Math.round(performance.now() - start));
      span.end();
    }
  });
}

/**
 * Trace a sub-agent reasoning cycle as a first-class OpenInference AGENT span.
 *
 * This is the seam that makes hypothesis-generation visible in Phoenix: it
 * wraps the dispatch of a specialist agent (Manifold/Causal/Theorist/Experiment)
 * with `openinference.span.kind=AGENT` plus `input.value` (the task prompt) and
 * `output.value` (the agent's reply), so Phoenix classifies and scores the
 * cycle — not just the individual LLM calls the Vercel SDK already traces.
 *
 * Takes a runner thunk rather than a `chat` signature because glim-think's
 * agents stream over a relay callback (`chat(prompt, {onEvent,onDone,onError})`),
 * not a request/response `chat(prompt, opts)`.
 *
 * Example:
 *   const reply = await traceAgentCycle("theorist", prompt, async () => runIt());
 */
export async function traceAgentCycle<T>(
  agentClass: string,
  prompt: string,
  run: () => Promise<T>,
  toOutput: (result: T) => string = (r) => (typeof r === "string" ? r : JSON.stringify(r)),
): Promise<T> {
  const tracer = trace.getTracer(RPC_TRACER_NAME);
  return tracer.startActiveSpan(`agent.cycle.${agentClass}`, async (span: Span) => {
    // OpenInference conventions — make Phoenix treat this as an AGENT span.
    span.setAttribute("openinference.span.kind", "AGENT");
    span.setAttribute("input.value", clip(prompt));
    span.setAttribute("input.mime_type", "text/plain");
    span.setAttribute("rpc.system", "durable_object");
    span.setAttribute("rpc.method", "chat");
    span.setAttribute("rpc.target", agentClass);
    const start = performance.now();
    try {
      const result = await run();
      span.setAttribute("output.value", clip(toOutput(result)));
      span.setAttribute("output.mime_type", "text/plain");
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      span.setAttribute("rpc.duration_ms", Math.round(performance.now() - start));
      span.end();
    }
  });
}

/**
 * Trace an external `fetch()` call (non-LLM, non-gateway).
 *
 * Example:
 *   const res = await traceExternalFetch("https://api.semanticscholar.org/graph/v1/paper/search", { method: "POST", body: "..." }, "semantic_scholar");
 */
export async function traceExternalFetch(
  url: string | Request,
  init: RequestInit | undefined,
  serviceName: string,
): Promise<Response> {
  const tracer = trace.getTracer(RPC_TRACER_NAME);
  const urlString = typeof url === "string" ? url : url.url;
  const parsed = new URL(urlString);
  return tracer.startActiveSpan("http.client", async (span: Span) => {
    span.setAttribute("http.request.method", init?.method ?? "GET");
    span.setAttribute("server.address", parsed.hostname);
    span.setAttribute("server.port", parsed.port || (parsed.protocol === "https:" ? "443" : "80"));
    span.setAttribute("url.path", parsed.pathname);
    span.setAttribute("http.target_service", serviceName);
    const start = performance.now();
    try {
      const response = await fetch(url, init);
      span.setAttribute("http.response.status_code", response.status);
      span.setStatus({ code: SpanStatusCode.OK });
      return response;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      span.setAttribute("http.request.duration_ms", Math.round(performance.now() - start));
      span.end();
    }
  });
}
