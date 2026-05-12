/**
 * Cloud Tasks dispatcher → atlas-distill heavy compute.
 *
 * Mints an OAuth access token from `GCP_SA_KEY` (a JSON-encoded GCP service
 * account key stored as a wrangler secret), then enqueues a Cloud Tasks task
 * targeting the `tasks-consumer` Cloud Run Service. The consumer (Rust, see
 * `gcp/tasks-consumer/`) validates the OIDC header Cloud Tasks attaches and
 * invokes the `atlas-distill` Cloud Run Job.
 *
 * Architecture (Unit 8 of the handoff plan):
 *   server.ts  POST /research/dispatch
 *     ↓ dispatchAtlasJob
 *   Cloud Tasks queue `atlas-distill-jobs` (us-central1)
 *     ↓ HTTP target with OIDC
 *   tasks-consumer Cloud Run Service
 *     ↓ jobs.run
 *   atlas-distill Cloud Run Job
 *     ↓ beat emit (--beat-emit-url) when done
 *   glim-think /beats/ingest (Unit 1, separate)
 */

import type { Env } from "../types";

const TASKS_API_BASE = "https://cloudtasks.googleapis.com/v2";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKEN_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const DEFAULT_PROJECT = "shed-489901";
const DEFAULT_LOCATION = "us-central1";
const DEFAULT_QUEUE = "atlas-distill-jobs";

export interface TaskPayload {
  fixture_url: string;
  command: string;
  args?: string[];
  beat_emit_url: string;
}

export interface DispatchEnv {
  GCP_SA_KEY?: string;
  TASKS_CONSUMER_URL?: string;
  TASKS_CONSUMER_AUDIENCE?: string;
  TASKS_CONSUMER_INVOKER_SA?: string;
  GCP_PROJECT_ID?: string;
  GCP_TASKS_LOCATION?: string;
  GCP_TASKS_QUEUE?: string;
  DEV_MODE?: string;
}

export interface DispatchResult {
  task_name: string;
  dev_mode: boolean;
}

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
}

function isDevMode(env: DispatchEnv): boolean {
  const flag = env.DEV_MODE?.toLowerCase();
  return flag === "true" || flag === "1";
}

function parseServiceAccountKey(raw: string): ServiceAccountKey {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`GCP_SA_KEY is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("GCP_SA_KEY did not decode to an object");
  }
  const obj = parsed as Record<string, unknown>;
  const required = ["type", "project_id", "private_key_id", "private_key", "client_email"] as const;
  for (const k of required) {
    if (typeof obj[k] !== "string" || (obj[k] as string).length === 0) {
      throw new Error(`GCP_SA_KEY missing field: ${k}`);
    }
  }
  return obj as unknown as ServiceAccountKey;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/**
 * Mint an OAuth2 access token using the service-account JWT bearer flow.
 * Signs a self-signed JWT (assertion) and exchanges it for a Google access token.
 */
async function mintAccessToken(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: sa.private_key_id };
  const claims = {
    iss: sa.client_email,
    scope: TOKEN_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(signingInput));
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`token exchange ${resp.status}: ${text.slice(0, 400)}`);
  }
  const data = (await resp.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("token exchange returned no access_token");
  }
  return data.access_token;
}

function validatePayload(payload: TaskPayload): void {
  if (!payload || typeof payload !== "object") throw new Error("payload must be an object");
  if (typeof payload.fixture_url !== "string" || !payload.fixture_url)
    throw new Error("fixture_url required");
  if (typeof payload.command !== "string" || !payload.command)
    throw new Error("command required");
  if (typeof payload.beat_emit_url !== "string" || !payload.beat_emit_url)
    throw new Error("beat_emit_url required");
  if (payload.args !== undefined && !Array.isArray(payload.args))
    throw new Error("args must be an array of strings if provided");
}

/**
 * Publish a Cloud Tasks task that will invoke `tasks-consumer`. The consumer
 * forwards to the `atlas-distill` Cloud Run Job.
 */
export async function dispatchAtlasJob(
  env: DispatchEnv,
  payload: TaskPayload,
): Promise<DispatchResult> {
  validatePayload(payload);

  const consumerUrl = env.TASKS_CONSUMER_URL;
  if (!consumerUrl) {
    throw new Error("TASKS_CONSUMER_URL is not set");
  }
  const project = env.GCP_PROJECT_ID ?? DEFAULT_PROJECT;
  const location = env.GCP_TASKS_LOCATION ?? DEFAULT_LOCATION;
  const queue = env.GCP_TASKS_QUEUE ?? DEFAULT_QUEUE;
  const audience = env.TASKS_CONSUMER_AUDIENCE ?? consumerUrl;

  const bodyB64 = btoa(JSON.stringify(payload));
  const httpRequest: Record<string, unknown> = {
    httpMethod: "POST",
    url: `${consumerUrl.replace(/\/+$/, "")}/run`,
    headers: { "Content-Type": "application/json" },
    body: bodyB64,
  };
  if (env.TASKS_CONSUMER_INVOKER_SA) {
    httpRequest.oidcToken = {
      serviceAccountEmail: env.TASKS_CONSUMER_INVOKER_SA,
      audience,
    };
  }

  const taskBody = { task: { httpRequest } };
  const url =
    `${TASKS_API_BASE}/projects/${project}/locations/${location}/queues/${queue}/tasks`;

  if (isDevMode(env)) {
    console.log("[dispatchAtlasJob dev-mode]", { url, taskBody });
    const synthetic = `projects/${project}/locations/${location}/queues/${queue}/tasks/dev-${Date.now()}`;
    return { task_name: synthetic, dev_mode: true };
  }

  if (!env.GCP_SA_KEY) {
    throw new Error("GCP_SA_KEY is not set");
  }
  const sa = parseServiceAccountKey(env.GCP_SA_KEY);
  const token = await mintAccessToken(sa);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskBody),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cloud Tasks create ${resp.status}: ${text.slice(0, 400)}`);
  }
  const data = (await resp.json()) as { name?: string };
  if (!data.name) {
    throw new Error("Cloud Tasks response missing task name");
  }
  return { task_name: data.name, dev_mode: false };
}

/** Test seam — exported for unit tests so we don't have to mint real JWTs. */
export const __internal = {
  parseServiceAccountKey,
  validatePayload,
  isDevMode,
  base64UrlEncode,
};

/** Augment Env without forcing every consumer to add the new fields. */
declare module "../types" {
  interface Env extends DispatchEnv {}
}
