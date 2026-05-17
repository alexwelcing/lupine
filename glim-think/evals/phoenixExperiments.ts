/**
 * Phoenix Cloud REST client for dataset reads + Experiments.
 *
 * This is the read-side companion to `phoenixRest.ts` (which only WRITES:
 * span annotations + dataset uploads). It closes the self-improving eval
 * loop by letting the runner read back the datasets it uploaded and either
 * (a) run them as Phoenix Experiments or (b) — if the space-scoped REST
 * surface does not expose Experiments — fall back to recording evaluator
 * results as span annotations.
 *
 * Request conventions are copied EXACTLY from phoenixRest.ts:
 *   - base URL is `PHOENIX_COLLECTOR_ENDPOINT` with a trailing `/v1/traces`
 *     stripped, so it is space-scoped: `https://app.phoenix.arize.com/s/<space>`
 *   - `Authorization: Bearer ${PHOENIX_API_KEY}`
 *   - NO custom User-Agent. Phoenix Cloud's WAF redirects "glim-think/*"
 *     product UAs to /login (HTML); the default runtime UA is allowed.
 *
 * ── LIVE PATH (which of the two paths is active) ───────────────────────────
 * Dataset reads (`listDatasets`, `getDatasetExamples`) ARE live against the
 * space-scoped REST API:
 *     GET /v1/datasets
 *     GET /v1/datasets/{id}/examples
 *
 * Experiments (`createExperiment` / `getExperiment`) hit:
 *     POST /v1/experiments   (and GET /v1/experiments/{id})
 * Arize's space-scoped Cloud surface historically does NOT expose the
 * Experiments endpoints (they 404 / 301→HTML, same failure class that
 * forced phoenixRest.ts off `@arizeai/phoenix-client`). When that happens
 * these functions throw `PhoenixExperimentsUnavailableError` and the
 * caller MUST fall back to `recordExperimentAsAnnotations()`, which is the
 * SUPPORTED path on this deployment (it batches POST /v1/span_annotations
 * exactly like phoenixRest.ts `logAnnotations`). Run `--selftest` to see
 * which path the current deployment honours.
 *
 * Standalone module — imports nothing from sibling eval units.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ── Request plumbing (mirrors phoenixRest.ts exactly) ──────────────────────

function apiBase(): string {
  const e = process.env.PHOENIX_COLLECTOR_ENDPOINT;
  if (!e) throw new Error("PHOENIX_COLLECTOR_ENDPOINT must be set");
  return e.replace(/\/$/, "").replace(/\/v1\/traces$/, "");
}

function authHeaders(json = false): Record<string, string> {
  const key = process.env.PHOENIX_API_KEY?.trim();
  if (!key) throw new Error("PHOENIX_API_KEY not set");
  // Do NOT set a custom User-Agent. Phoenix Cloud's WAF redirects
  // "glim-think/*"-style product User-Agents to /login (HTML). The default
  // runtime UA is allowed. Identical to phoenixRest.ts authHeaders().
  return {
    Authorization: `Bearer ${key}`,
    accept: "application/json",
    ...(json ? { "content-type": "application/json" } : {}),
  };
}

/**
 * Thrown when the space-scoped REST surface does not expose the Experiments
 * endpoints (404, 301→HTML redirect, or an HTML body). Callers should catch
 * this and fall back to `recordExperimentAsAnnotations()`.
 */
export class PhoenixExperimentsUnavailableError extends Error {
  readonly status: number;
  constructor(status: number, detail: string) {
    super(
      `Phoenix Experiments endpoint unavailable (HTTP ${status}). ` +
        `Fall back to recordExperimentAsAnnotations(). Detail: ${detail}`,
    );
    this.name = "PhoenixExperimentsUnavailableError";
    this.status = status;
  }
}

function looksLikeHtml(body: string): boolean {
  const head = body.trimStart().slice(0, 200).toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html");
}

/** A fetch that treats 404 / redirect-to-HTML as "endpoint not exposed". */
async function fetchExperimentsApi(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let r: Response;
  try {
    r = await fetch(url, { ...init, redirect: "manual" });
  } catch (e) {
    throw new PhoenixExperimentsUnavailableError(
      0,
      `network error: ${(e as Error).message}`,
    );
  }
  if (r.status === 404 || (r.status >= 300 && r.status < 400)) {
    throw new PhoenixExperimentsUnavailableError(
      r.status,
      `redirected/not-found (location=${r.headers.get("location") ?? "n/a"})`,
    );
  }
  return r;
}

/**
 * Read + validate an Experiments-API response body. Throws
 * `PhoenixExperimentsUnavailableError` on an HTML/unparseable body (the
 * WAF/login-redirect signature) and a plain Error on a non-2xx JSON error.
 * Returns the unwrapped record (handles `{ data: {...} }` envelopes).
 */
async function parseExperimentResponse(
  r: Response,
  op: string,
): Promise<Record<string, unknown>> {
  const text = await r.text();
  if (looksLikeHtml(text)) {
    throw new PhoenixExperimentsUnavailableError(
      r.status,
      "HTML body (WAF/login redirect)",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new PhoenixExperimentsUnavailableError(
      r.status,
      `non-JSON body: ${text.slice(0, 120)}`,
    );
  }
  if (!r.ok) {
    throw new Error(`Phoenix ${op} REST ${r.status}: ${text.slice(0, 200)}`);
  }
  const env = asRecord(parsed);
  return asRecord(env.data ?? parsed);
}

// ── Datasets (LIVE) ────────────────────────────────────────────────────────

export interface DatasetRef {
  id: string;
  name: string;
}

export interface DatasetExampleRecord {
  id: string;
  input: unknown;
  output: unknown;
  metadata: unknown;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

/**
 * List datasets in the space. GET /v1/datasets (paginates if cursored).
 * Defensively normalizes — never trusts the external shape.
 */
export async function listDatasets(): Promise<DatasetRef[]> {
  const out: DatasetRef[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;

  // Hard page cap so a misbehaving cursor can't loop forever.
  for (let page = 0; page < 50; page++) {
    const u = new URL(`${apiBase()}/v1/datasets`);
    u.searchParams.set("limit", "100");
    if (cursor) u.searchParams.set("cursor", cursor);

    const r = await fetch(u, { headers: authHeaders() });
    if (!r.ok) {
      throw new Error(
        `Phoenix datasets REST ${r.status}: ${(await r.text()).slice(0, 200)}`,
      );
    }
    const j = (await r.json()) as {
      data?: unknown;
      next_cursor?: string | null;
    };
    const batch = Array.isArray(j.data) ? j.data : [];
    if (batch.length === 0) break;

    for (const d of batch) {
      const rec = asRecord(d);
      const id = String(rec.id ?? "");
      const name = String(rec.name ?? "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, name });
    }
    cursor = typeof j.next_cursor === "string" ? j.next_cursor : null;
    if (!cursor) break;
  }
  return out;
}

async function resolveDatasetId(datasetIdOrName: string): Promise<string> {
  const datasets = await listDatasets();
  const byId = datasets.find((d) => d.id === datasetIdOrName);
  if (byId) return byId.id;
  const byName = datasets.find((d) => d.name === datasetIdOrName);
  if (byName) return byName.id;
  throw new Error(
    `Dataset not found by id or name: ${JSON.stringify(datasetIdOrName)}. ` +
      `Known: ${datasets.map((d) => d.name).join(", ") || "(none)"}`,
  );
}

/**
 * Fetch examples for a dataset (by id OR name).
 * GET /v1/datasets/{id}/examples — paginates if the API cursors.
 * Defensively normalizes each record.
 */
export async function getDatasetExamples(
  datasetIdOrName: string,
  limit = 1000,
): Promise<DatasetExampleRecord[]> {
  const id = await resolveDatasetId(datasetIdOrName);
  const out: DatasetExampleRecord[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 100 && out.length < limit; page++) {
    const u = new URL(
      `${apiBase()}/v1/datasets/${encodeURIComponent(id)}/examples`,
    );
    u.searchParams.set("limit", String(Math.min(100, limit - out.length)));
    if (cursor) u.searchParams.set("cursor", cursor);

    const r = await fetch(u, { headers: authHeaders() });
    if (!r.ok) {
      throw new Error(
        `Phoenix dataset examples REST ${r.status}: ${(await r.text()).slice(0, 200)}`,
      );
    }
    const j = (await r.json()) as {
      data?: unknown;
      next_cursor?: string | null;
    };
    // Phoenix has historically nested examples under data.examples; accept
    // both `{ data: [...] }` and `{ data: { examples: [...] } }`.
    let batch: unknown[] = [];
    if (Array.isArray(j.data)) {
      batch = j.data;
    } else {
      const examples = asRecord(j.data).examples;
      if (Array.isArray(examples)) batch = examples;
    }
    if (batch.length === 0) break;

    for (const e of batch) {
      const rec = asRecord(e);
      out.push({
        id: String(rec.id ?? ""),
        input: rec.input ?? {},
        output: rec.output ?? {},
        metadata: rec.metadata ?? {},
      });
      if (out.length >= limit) break;
    }
    cursor = typeof j.next_cursor === "string" ? j.next_cursor : null;
    if (!cursor) break;
  }
  return out;
}

// ── Experiments (best-effort; falls back to annotations) ───────────────────

export interface ExperimentRef {
  id: string;
  name: string;
  dataset_id: string;
  metadata: Record<string, unknown>;
}

/**
 * Create a Phoenix Experiment. POST /v1/experiments.
 * Throws `PhoenixExperimentsUnavailableError` if the space-scoped surface
 * does not expose Experiments — caller MUST fall back to
 * `recordExperimentAsAnnotations()`.
 */
export async function createExperiment(
  datasetId: string,
  name: string,
  metadata: Record<string, unknown> = {},
): Promise<ExperimentRef> {
  const r = await fetchExperimentsApi(
    `${apiBase()}/v1/datasets/${encodeURIComponent(datasetId)}/experiments`,
    {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ name, metadata }),
    },
  );
  const rec = await parseExperimentResponse(r, "createExperiment");
  return {
    id: String(rec.id ?? ""),
    name: String(rec.name ?? name),
    dataset_id: String(rec.dataset_id ?? datasetId),
    metadata: asRecord(rec.metadata),
  };
}

/**
 * Fetch a Phoenix Experiment. GET /v1/experiments/{id}.
 * Throws `PhoenixExperimentsUnavailableError` on the unsupported surface.
 */
export async function getExperiment(
  experimentId: string,
): Promise<ExperimentRef> {
  const r = await fetchExperimentsApi(
    `${apiBase()}/v1/experiments/${encodeURIComponent(experimentId)}`,
    { headers: authHeaders() },
  );
  const rec = await parseExperimentResponse(r, "getExperiment");
  return {
    id: String(rec.id ?? experimentId),
    name: String(rec.name ?? ""),
    dataset_id: String(rec.dataset_id ?? ""),
    metadata: asRecord(rec.metadata),
  };
}

export interface EvaluatorResult {
  name: string;
  label?: string;
  score?: number;
  explanation?: string;
  metadata?: Record<string, unknown>;
}

/**
 * FALLBACK PATH (supported on the space-scoped deployment).
 *
 * When Experiments are unavailable, record evaluator results as span
 * annotations — one annotation per (span, evaluator) pair. Batches POST
 * /v1/span_annotations exactly like phoenixRest.ts `logAnnotations`.
 *
 * `spanIds` and `evaluatorResults` are zip-aligned by index: result[i] is
 * the evaluation of spanIds[i]. Returns the number of annotations written.
 */
export async function recordExperimentAsAnnotations(
  spanIds: string[],
  evaluatorResults: EvaluatorResult[][],
): Promise<number> {
  if (spanIds.length !== evaluatorResults.length) {
    throw new Error(
      `recordExperimentAsAnnotations: spanIds (${spanIds.length}) and ` +
        `evaluatorResults (${evaluatorResults.length}) must be index-aligned`,
    );
  }

  const flat: Array<Record<string, unknown>> = [];
  for (let i = 0; i < spanIds.length; i++) {
    const spanId = spanIds[i];
    if (!spanId) continue;
    for (const ev of evaluatorResults[i] ?? []) {
      flat.push({
        span_id: spanId,
        name: ev.name,
        annotator_kind: "CODE",
        result: {
          label: ev.label ?? null,
          score: ev.score ?? null,
          explanation: ev.explanation ?? null,
        },
        metadata: ev.metadata ?? {},
      });
    }
  }

  let written = 0;
  for (let i = 0; i < flat.length; i += 100) {
    const batch = flat.slice(i, i + 100);
    const r = await fetch(`${apiBase()}/v1/span_annotations`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ data: batch }),
    });
    if (!r.ok) {
      throw new Error(
        `Phoenix annotations REST ${r.status}: ${(await r.text()).slice(0, 200)}`,
      );
    }
    written += batch.length;
  }
  return written;
}

// ── --selftest CLI (LIVE read; e2e proof) ──────────────────────────────────

/**
 * Parse a Cloudflare-style `.dev.vars` (or `.env`) file: `KEY=VALUE` lines,
 * `#` comments, optional surrounding single/double quotes. Only sets keys
 * not already present in process.env (real env wins).
 */
function loadDotVars(text: string): void {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

async function loadDevVars(): Promise<void> {
  // Try common locations relative to evals/ and to glim-think/.
  const candidates = ["../.dev.vars", ".dev.vars", "../../.dev.vars"];
  for (const p of candidates) {
    try {
      const text = await readFile(new URL(p, import.meta.url), "utf8");
      loadDotVars(text);
      return;
    } catch {
      // try next candidate
    }
  }
  // Not fatal: real env vars may already be set.
}

async function selftest(): Promise<void> {
  await loadDevVars();
  console.log("[phx-exp] selftest: GET /v1/datasets …");
  const datasets = await listDatasets();
  if (datasets.length === 0) {
    console.error(
      "[phx-exp] FAIL: listDatasets() returned 0 datasets. " +
        "Check PHOENIX_COLLECTOR_ENDPOINT / PHOENIX_API_KEY.",
    );
    process.exit(1);
  }
  console.log(`[phx-exp] ${datasets.length} dataset(s):`);
  for (const d of datasets) {
    let count = -1;
    try {
      const ex = await getDatasetExamples(d.id, 1000);
      count = ex.length;
    } catch (e) {
      console.warn(
        `[phx-exp]   (examples fetch failed for ${d.name}: ${(e as Error).message})`,
      );
    }
    console.log(
      `[phx-exp]   - ${d.name}  (id=${d.id})  examples=${count >= 0 ? count : "?"}`,
    );
  }

  const known = ["glim-benchmark", "glim-research-qa", "glim-experiment-design"];
  const names = new Set(datasets.map((d) => d.name));
  const missing = known.filter((k) => !names.has(k));
  if (missing.length > 0) {
    console.warn(
      `[phx-exp] NOTE: expected datasets missing: ${missing.join(", ")} ` +
        `(present: ${[...names].join(", ")})`,
    );
  } else {
    console.log("[phx-exp] PASS: all known datasets present.");
  }
}

// Only run when invoked as the entry module (its path is process.argv[1])
// AND `--selftest` was passed. Importing this module never triggers it.
function isEntryModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fileURLToPath(import.meta.url) === resolve(entry);
  } catch {
    return false;
  }
}

if (
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv.includes("--selftest") &&
  isEntryModule()
) {
  selftest().catch((e) => {
    console.error("[phx-exp] selftest error:", e);
    process.exit(1);
  });
}
