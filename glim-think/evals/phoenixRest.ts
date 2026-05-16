/**
 * Phoenix Cloud REST client for the eval runner.
 *
 * `@arizeai/phoenix-client` (getSpans / logSpanAnnotations) issues requests
 * that 301→HTML against space-scoped Phoenix Cloud URLs (`…/s/<space>`), so
 * the runner silently found "0 spans" and never wrote annotations. The plain
 * REST API works with `Authorization: Bearer <key>`:
 *   GET  /v1/projects/{project}/spans?limit=&sort=-start_time
 *   POST /v1/span_annotations            { data: [ … ] }
 *
 * This module is the single source of truth for Phoenix I/O in evals/.
 */

const SORT_DESC = "-start_time";

function apiBase(): string {
  const e = process.env.PHOENIX_COLLECTOR_ENDPOINT;
  if (!e) throw new Error("PHOENIX_COLLECTOR_ENDPOINT must be set");
  return e.replace(/\/$/, "").replace(/\/v1\/traces$/, "");
}

function project(): string {
  return process.env.PHOENIX_PROJECT_NAME || "glim-think";
}

function authHeaders(json = false): Record<string, string> {
  const key = process.env.PHOENIX_API_KEY?.trim();
  if (!key) throw new Error("PHOENIX_API_KEY not set");
  // Do NOT set a custom User-Agent. Phoenix Cloud's WAF redirects
  // "glim-think/*"-style product User-Agents to /login (HTML), which is why
  // the eval runner historically saw HTML / "0 spans". The default runtime
  // UA is allowed.
  return {
    Authorization: `Bearer ${key}`,
    accept: "application/json",
    ...(json ? { "content-type": "application/json" } : {}),
  };
}

export interface PhoenixSpan {
  id: string;
  name: string;
  span_kind: string;
  span_id: string;
  trace_id: string;
  start_time: string;
  end_time: string;
  attributes: Record<string, unknown>;
}

/**
 * Fetch spans newest-first, optionally only those started after `since`
 * (ISO string). Paginates until the window is covered or `max` is reached.
 */
export async function fetchProjectSpans(
  opts: { max?: number; since?: string } = {},
): Promise<PhoenixSpan[]> {
  const max = opts.max ?? 500;
  const out: PhoenixSpan[] = [];
  let cursor: string | null = null;

  while (out.length < max) {
    const u = new URL(`${apiBase()}/v1/projects/${encodeURIComponent(project())}/spans`);
    u.searchParams.set("limit", String(Math.min(100, max - out.length)));
    u.searchParams.set("sort", SORT_DESC);
    if (cursor) u.searchParams.set("cursor", cursor);

    const r = await fetch(u, { headers: authHeaders() });
    if (!r.ok) {
      throw new Error(`Phoenix spans REST ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }
    const j = (await r.json()) as {
      data?: Array<Record<string, unknown>>;
      next_cursor?: string | null;
    };
    const batch = j.data ?? [];
    if (batch.length === 0) break;

    let reachedWindow = false;
    for (const s of batch) {
      const ctx = (s.context as { span_id?: string; trace_id?: string }) ?? {};
      const start = String(s.start_time ?? "");
      if (opts.since && start <= opts.since) {
        reachedWindow = true;
        continue;
      }
      out.push({
        id: String(s.id ?? ctx.span_id ?? ""),
        name: String(s.name ?? ""),
        span_kind: String(s.span_kind ?? "UNKNOWN"),
        span_id: String(ctx.span_id ?? s.span_id ?? ""),
        trace_id: String(ctx.trace_id ?? s.trace_id ?? ""),
        start_time: start,
        end_time: String(s.end_time ?? ""),
        attributes: (s.attributes as Record<string, unknown>) ?? {},
      });
    }
    // Spans are newest-first; once we cross `since` further pages are older.
    if (opts.since && reachedWindow) break;
    cursor = j.next_cursor ?? null;
    if (!cursor) break;
  }
  return out;
}

export interface SpanAnnotation {
  span_id: string;
  name: string;
  annotator_kind: "CODE" | "LLM" | "HUMAN";
  label?: string;
  score?: number;
  explanation?: string;
  metadata?: Record<string, unknown>;
}

/** Write annotations back to Phoenix in batches (POST /v1/span_annotations). */
export async function logAnnotations(annotations: SpanAnnotation[]): Promise<number> {
  let written = 0;
  for (let i = 0; i < annotations.length; i += 100) {
    const batch = annotations.slice(i, i + 100).map((a) => ({
      span_id: a.span_id,
      name: a.name,
      annotator_kind: a.annotator_kind,
      result: {
        label: a.label ?? null,
        score: a.score ?? null,
        explanation: a.explanation ?? null,
      },
      metadata: a.metadata ?? {},
    }));
    const r = await fetch(`${apiBase()}/v1/span_annotations`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ data: batch }),
    });
    if (!r.ok) {
      throw new Error(`Phoenix annotations REST ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }
    written += batch.length;
  }
  return written;
}
