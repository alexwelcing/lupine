/**
 * Lightweight Phoenix Cloud REST client for Cloudflare Workers.
 *
 * Uses raw fetch() instead of openapi-fetch so it works in the Workers
 * runtime without Node.js dependencies.
 */

export interface TraceAnnotation {
  trace_id: string;
  name: string;
  annotator_kind: "LLM" | "CODE" | "HUMAN";
  result?: {
    score?: number | null;
    label?: string | null;
    explanation?: string | null;
  } | null;
  identifier?: string;
  metadata?: Record<string, unknown> | null;
}

export interface PhoenixTraceAnnotation {
  trace_id: string;
  name: string;
  annotator_kind: string;
  result: {
    score: number | null;
    label: string | null;
    explanation: string | null;
  };
  identifier: string | null;
}

export class PhoenixApi {
  private baseUrl: string;

  constructor(
    endpoint: string,
    private apiKey: string,
    private projectName: string
  ) {
    // Strip /v1/traces suffix if present to get REST base URL
    const stripped = endpoint.replace(/\/$/, "");
    this.baseUrl = stripped.endsWith("/v1/traces")
      ? stripped.replace(/\/v1\/traces$/, "")
      : stripped;
  }

  /** Quick connectivity + project probe. */
  async probe(): Promise<{
    ok: boolean;
    projectName: string;
    traceCount?: number;
    error?: string;
  }> {
    try {
      const data = await this.request(
        "GET",
        `/v1/projects/${encodeURIComponent(this.projectName)}/spans?limit=1`
      ) as { data: unknown[]; next_cursor: string | null };
      return { ok: true, projectName: this.projectName, traceCount: data.data?.length };
    } catch (e) {
      return { ok: false, projectName: this.projectName, error: String(e) };
    }
  }

  private async request(method: string, path: string, body?: unknown) {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Phoenix API ${method} ${path}: ${res.status} ${text}`);
    }
    // 204 No Content
    if (res.status === 204) return undefined;
    return res.json();
  }

  /** Upsert trace annotations. */
  async annotateTraces(annotations: TraceAnnotation[]) {
    return this.request("POST", "/v1/trace_annotations?sync=true", {
      data: annotations,
    });
  }

  /** Fetch trace annotations for specific trace IDs. */
  async getTraceAnnotations(traceIds: string[], name?: string): Promise<{
    data: PhoenixTraceAnnotation[];
    next_cursor: string | null;
  }> {
    const params = new URLSearchParams();
    traceIds.forEach((id) => params.append("trace_ids", id));
    if (name) params.append("name", name);
    return this.request(
      "GET",
      `/v1/projects/${encodeURIComponent(this.projectName)}/trace_annotations?${params.toString()}`
    ) as Promise<{ data: PhoenixTraceAnnotation[]; next_cursor: string | null }>;
  }

  /** Fetch recent spans for a project. */
  async getSpans(opts?: { limit?: number; cursor?: string }): Promise<{
    data: Array<{
      span_id: string;
      trace_id: string;
      name: string;
      start_time: string;
      end_time: string;
      attributes: Record<string, unknown>;
    }>;
    next_cursor: string | null;
  }> {
    const params = new URLSearchParams();
    if (opts?.limit) params.append("limit", String(opts.limit));
    if (opts?.cursor) params.append("cursor", opts.cursor);
    return this.request(
      "GET",
      `/v1/projects/${encodeURIComponent(this.projectName)}/spans?${params.toString()}`
    ) as Promise<{
      data: Array<{
        span_id: string;
        trace_id: string;
        name: string;
        start_time: string;
        end_time: string;
        attributes: Record<string, unknown>;
      }>;
      next_cursor: string | null;
    }>;
  }

  /** Fetch span annotations for specific span IDs. */
  async getSpanAnnotations(spanIds: string[], name?: string): Promise<{
    data: Array<{
      span_id: string;
      name: string;
      annotator_kind: string;
      result: {
        score: number | null;
        label: string | null;
        explanation: string | null;
      };
      identifier: string | null;
    }>;
    next_cursor: string | null;
  }> {
    const params = new URLSearchParams();
    spanIds.forEach((id) => params.append("span_ids", id));
    if (name) params.append("name", name);
    return this.request(
      "GET",
      `/v1/projects/${encodeURIComponent(this.projectName)}/span_annotations?${params.toString()}`
    ) as Promise<{
      data: Array<{
        span_id: string;
        name: string;
        annotator_kind: string;
        result: {
          score: number | null;
          label: string | null;
          explanation: string | null;
        };
        identifier: string | null;
      }>;
      next_cursor: string | null;
    }>;
  }
}
