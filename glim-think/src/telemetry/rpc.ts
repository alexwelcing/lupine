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

interface ChatAgent {
  chat(prompt: string, opts?: Record<string, unknown>): Promise<unknown>;
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
 * Trace a `child.chat()` sub-agent call.
 *
 * Example:
 *   const child = await this.subAgent(Manifold, `manifold-${element}`);
 *   const reply = await traceAgentChat(child, prompt, { systemPrompt: "..." }, "Manifold");
 */
export async function traceAgentChat<T extends ChatAgent>(
  child: T,
  prompt: string,
  opts: Record<string, unknown> | undefined,
  agentClass: string,
): Promise<unknown> {
  const tracer = trace.getTracer(RPC_TRACER_NAME);
  return tracer.startActiveSpan("agent.rpc", async (span: Span) => {
    span.setAttribute("rpc.system", "durable_object");
    span.setAttribute("rpc.method", "chat");
    span.setAttribute("rpc.target", agentClass);
    span.setAttribute("rpc.chat.prompt_length", prompt.length);
    const start = performance.now();
    try {
      const response = await child.chat(prompt, opts);
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
