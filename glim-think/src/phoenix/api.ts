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

export interface PhoenixDatasetRef {
  id: string;
  name: string;
  version_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PhoenixDatasetExampleRef {
  id: string;
  input: unknown;
  output: unknown;
  metadata: Record<string, unknown>;
}

export interface PhoenixDatasetUploadExample {
  example_id: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  metadata: Record<string, unknown>;
  split?: string | string[] | null;
  span_id?: string | null;
}

export interface PhoenixExperimentRef {
  id: string;
  dataset_id: string;
  dataset_version_id?: string | null;
  name?: string | null;
  project_name?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PhoenixExperimentRunRef {
  id: string;
}

export class PhoenixApi {
  private baseUrl: string;
  private globalBaseUrl: string;

  constructor(
    endpoint: string,
    private apiKey: string,
    private projectName: string,
  ) {
    // Strip /v1/traces suffix if present to get REST base URL.
    const stripped = endpoint.replace(/\/$/, "");
    this.baseUrl = stripped.endsWith("/v1/traces")
      ? stripped.replace(/\/v1\/traces$/, "")
      : stripped;
    this.globalBaseUrl = this.baseUrl.replace(/\/s\/[^/]+$/, "");
  }

  get project(): string {
    return this.projectName;
  }

  get restBaseUrl(): string {
    return this.baseUrl;
  }

  get globalRestBaseUrl(): string {
    return this.globalBaseUrl;
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
        `/v1/projects/${encodeURIComponent(this.projectName)}/spans?limit=1`,
      ) as { data: unknown[]; next_cursor: string | null };
      return { ok: true, projectName: this.projectName, traceCount: data.data?.length };
    } catch (e) {
      return { ok: false, projectName: this.projectName, error: String(e) };
    }
  }

  private async requestRaw(
    method: string,
    path: string,
    body?: unknown,
    opts: { global?: boolean } = {},
  ): Promise<Response> {
    const url = `${opts.global ? this.globalBaseUrl : this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    return fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async request(method: string, path: string, body?: unknown, opts: { global?: boolean } = {}) {
    const res = await this.requestRaw(method, path, body, opts);
    const text = await responseText(res);
    const parsed = parseJsonOrNull(text);
    if (res.status === 400 && parsed && Object.hasOwn(parsed, "data")) {
      return parsed;
    }
    if (!res.ok) {
      throw new Error(`Phoenix API ${method} ${path}: ${res.status} ${text}`);
    }
    if (res.status === 204) return undefined;
    return parsed ?? (text ? JSON.parse(text) : undefined);
  }

  private async requestJson<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: { global?: boolean } = {},
  ): Promise<T> {
    return this.request(method, path, body, opts) as Promise<T>;
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
      `/v1/projects/${encodeURIComponent(this.projectName)}/trace_annotations?${params.toString()}`,
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
      `/v1/projects/${encodeURIComponent(this.projectName)}/spans?${params.toString()}`,
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
      `/v1/projects/${encodeURIComponent(this.projectName)}/span_annotations?${params.toString()}`,
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

  /** List Phoenix datasets in the current Phoenix space. */
  async listDatasets(opts: { name?: string; limit?: number } = {}): Promise<{
    data: PhoenixDatasetRef[];
    next_cursor: string | null;
  }> {
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(Math.max(opts.limit ?? 100, 1), 200)));
    const data = await this.requestJson<{
      data?: Array<Record<string, unknown>>;
      next_cursor?: string | null;
    }>("GET", `/v1/datasets?${params.toString()}`);
    const expectedName = opts.name?.trim();
    return {
      data: (data.data ?? []).map((dataset) => ({
        id: String(dataset.id ?? ""),
        name: String(dataset.name ?? ""),
        version_id: typeof dataset.version_id === "string" ? dataset.version_id : null,
        metadata: recordOrEmpty(dataset.metadata),
      })).filter((dataset) => dataset.id && dataset.name)
        .filter((dataset) => !expectedName || dataset.name === expectedName),
      next_cursor: data.next_cursor ?? null,
    };
  }

  /** Upload a dataset version using Phoenix's parallel-array REST contract. */
  async uploadDataset(input: {
    name: string;
    description: string;
    examples: PhoenixDatasetUploadExample[];
    action?: "create" | "append" | "update";
  }): Promise<{
    dataset_id: string;
    version_id: string;
    num_created_examples?: number;
    num_updated_examples?: number;
    num_deleted_examples?: number;
    action: "create" | "append" | "update";
  }> {
    const action = input.action ?? "create";
    let res = await this.requestRaw(
      "POST",
      "/v1/datasets/upload?sync=true",
      datasetUploadBody(input.name, input.description, input.examples, action),
    );
    let effectiveAction = action;
    let text = await responseText(res);
    if (
      action === "create" &&
      (res.status === 409 || (res.status === 400 && /already exists/i.test(text)))
    ) {
      effectiveAction = "update";
      res = await this.requestRaw(
        "POST",
        "/v1/datasets/upload?sync=true",
        datasetUploadBody(input.name, input.description, input.examples, effectiveAction),
      );
      text = await responseText(res);
    }
    const parsed = parseJsonOrNull(text);
    const parsedRecord = recordOrEmpty(parsed);
    const data = recordOrEmpty(parsedRecord.data);
    if (!res.ok && !data.dataset_id) {
      throw new Error(`Phoenix API POST /v1/datasets/upload: ${res.status} ${text}`);
    }
    return {
      dataset_id: String(data.dataset_id ?? ""),
      version_id: String(data.version_id ?? ""),
      num_created_examples: numberOrUndefined(data.num_created_examples),
      num_updated_examples: numberOrUndefined(data.num_updated_examples),
      num_deleted_examples: numberOrUndefined(data.num_deleted_examples),
      action: effectiveAction,
    };
  }

  /** Fetch dataset examples so experiment runs can target Phoenix example IDs. */
  async getDatasetExamples(datasetId: string, limit = 1000): Promise<PhoenixDatasetExampleRef[]> {
    const out: PhoenixDatasetExampleRef[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 100 && out.length < limit; page++) {
      const params = new URLSearchParams();
      params.set("limit", String(Math.min(100, limit - out.length)));
      if (cursor) params.set("cursor", cursor);
      const data = await this.requestJson<{
        data?: unknown;
        next_cursor?: string | null;
      }>(
        "GET",
        `/v1/datasets/${encodeURIComponent(datasetId)}/examples?${params.toString()}`,
      );
      const envelope = recordOrEmpty(data.data);
      const batch = Array.isArray(data.data)
        ? data.data
        : Array.isArray(envelope.examples)
          ? envelope.examples
          : [];
      for (const raw of batch) {
        const example = recordOrEmpty(raw);
        out.push({
          id: String(example.id ?? ""),
          input: example.input ?? example.inputs ?? {},
          output: example.output ?? example.outputs ?? {},
          metadata: recordOrEmpty(example.metadata),
        });
        if (out.length >= limit) break;
      }
      cursor = data.next_cursor ?? null;
      if (!cursor || batch.length === 0) break;
    }
    return out.filter((example) => example.id);
  }

  async listExperiments(datasetId: string, limit = 100): Promise<PhoenixExperimentRef[]> {
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(Math.max(limit, 1), 200)));
    const data = await this.requestJson<{
      data?: Array<Record<string, unknown>>;
    }>(
      "GET",
      `/v1/datasets/${encodeURIComponent(datasetId)}/experiments?${params.toString()}`,
    );
    return (data.data ?? []).map((experiment) => ({
      id: String(experiment.id ?? ""),
      dataset_id: String(experiment.dataset_id ?? datasetId),
      dataset_version_id: typeof experiment.dataset_version_id === "string" ? experiment.dataset_version_id : null,
      name: typeof experiment.name === "string" ? experiment.name : null,
      project_name: typeof experiment.project_name === "string" ? experiment.project_name : null,
      metadata: recordOrEmpty(experiment.metadata),
    })).filter((experiment) => experiment.id);
  }

  async createExperiment(input: {
    datasetId: string;
    name: string;
    description?: string;
    metadata?: Record<string, unknown>;
    versionId?: string | null;
    reuseIfExists?: boolean;
  }): Promise<PhoenixExperimentRef & { reused: boolean }> {
    if (input.reuseIfExists) {
      const existing = (await this.listExperiments(input.datasetId))
        .find((experiment) =>
          experiment.name === input.name &&
          (
            !experiment.project_name ||
            experiment.project_name === this.projectName ||
            experiment.metadata?.phoenix_project_name === this.projectName
          )
        );
      if (existing) return { ...existing, reused: true };
    }
    const data = await this.requestJson<{ data?: Record<string, unknown> }>(
      "POST",
      `/v1/datasets/${encodeURIComponent(input.datasetId)}/experiments`,
      {
        name: input.name,
        description: input.description ?? null,
        project_name: this.projectName,
        metadata: input.metadata ?? {},
        version_id: input.versionId ?? null,
        repetitions: 1,
      },
    );
    const experiment = recordOrEmpty(data.data);
    return {
      id: String(experiment.id ?? ""),
      dataset_id: String(experiment.dataset_id ?? input.datasetId),
      dataset_version_id: typeof experiment.dataset_version_id === "string" ? experiment.dataset_version_id : null,
      name: typeof experiment.name === "string" ? experiment.name : input.name,
      project_name: typeof experiment.project_name === "string" ? experiment.project_name : null,
      metadata: recordOrEmpty(experiment.metadata),
      reused: false,
    };
  }

  async createExperimentRun(
    experimentId: string,
    input: {
      dataset_example_id: string;
      output: Record<string, unknown>;
      start_time: string;
      end_time: string;
      trace_id?: string | null;
      error?: string | null;
    },
  ): Promise<PhoenixExperimentRunRef> {
    const data = await this.requestJson<{ data?: Record<string, unknown> }>(
      "POST",
      `/v1/experiments/${encodeURIComponent(experimentId)}/runs`,
      {
        dataset_example_id: input.dataset_example_id,
        output: input.output,
        repetition_number: 1,
        start_time: input.start_time,
        end_time: input.end_time,
        trace_id: input.trace_id ?? null,
        error: input.error ?? null,
      },
    );
    const run = recordOrEmpty(data.data);
    return { id: String(run.id ?? "") };
  }

  async upsertExperimentEvaluation(input: {
    experiment_run_id: string;
    name: string;
    result: {
      score?: number | null;
      label?: string | null;
      explanation?: string | null;
    };
    metadata?: Record<string, unknown>;
    trace_id?: string | null;
    start_time: string;
    end_time: string;
  }): Promise<{ id: string }> {
    const data = await this.requestJson<{ data?: Record<string, unknown> }>(
      "POST",
      "/v1/experiment_evaluations",
      {
        experiment_run_id: input.experiment_run_id,
        name: input.name,
        annotator_kind: "CODE",
        start_time: input.start_time,
        end_time: input.end_time,
        result: input.result,
        error: null,
        metadata: input.metadata ?? {},
        trace_id: input.trace_id ?? null,
      },
    );
    const evaluation = recordOrEmpty(data.data);
    return { id: String(evaluation.id ?? "") };
  }
}

function recordOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function datasetUploadBody(
  name: string,
  description: string,
  examples: PhoenixDatasetUploadExample[],
  action: "create" | "append" | "update",
) {
  return {
    action,
    name,
    description,
    inputs: examples.map((example) => example.input),
    outputs: examples.map((example) => example.output),
    metadata: examples.map((example) => ({
      ...example.metadata,
      example_id: example.example_id,
    })),
  };
}

async function responseText(response: Response): Promise<string> {
  const bytes = await response.arrayBuffer().catch(() => null);
  if (!bytes) return "";
  const view = new Uint8Array(bytes);
  const contentType = response.headers.get("content-type") ?? "";
  const gzip = contentType.includes("gzip") || (view[0] === 0x1f && view[1] === 0x8b);
  try {
    if (gzip && typeof DecompressionStream !== "undefined") {
      const stream = new Response(bytes).body?.pipeThrough(new DecompressionStream("gzip"));
      return stream ? await new Response(stream).text() : "";
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function parseJsonOrNull(text: string): unknown | null {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
