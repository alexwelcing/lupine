/**
 * POST /feed/beats — the producer ingress for the secure live ticker.
 *
 * Trace: docs/handoff/05_secure_live_ticker_architecture.md (producer path).
 *
 * atlas-distill (in Cloud Run or locally with a SA key) mints an OIDC JWT
 * with audience = this Worker's URL and POSTs a single "beat" row:
 *   { beat_id, agent, summary, metrics?, ts? }
 *
 * The handler verifies the JWT against Google's JWKS, checks the email
 * claim matches the runner SA, the aud claim matches this Worker, then
 * INSERTs into D1 (lab_beats). Beats are read back by the dashboard via
 * the existing /feed/* GET endpoints (separate PR).
 *
 * Dev mode: when env.DEV_MODE === "true", JWT verification is skipped.
 * Used for local wrangler dev smoke tests without GCP creds. Never set
 * DEV_MODE in production — the secret store does not contain it.
 */
import type { Env } from "../types";

const BEATS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const RUNNER_SA_EMAIL =
  "atlas-distill-runner@shed-489901.iam.gserviceaccount.com";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
/** Cache JWKS for 1h — Google rotates keys roughly weekly. */
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

interface BeatBody {
  beat_id: string;
  agent: string;
  summary: string;
  metrics?: Record<string, unknown>;
  ts?: number;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BEATS_CORS, "Content-Type": "application/json" },
  });
}

function isDevMode(env: Env): boolean {
  return env.DEV_MODE === "true";
}

interface JwksKey {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

interface JwksCache {
  fetchedAt: number;
  keys: JwksKey[];
}

let jwksCache: JwksCache | null = null;

async function fetchJwks(): Promise<JwksKey[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) {
    throw new Error(`JWKS fetch failed: ${res.status}`);
  }
  const body = (await res.json()) as { keys: JwksKey[] };
  jwksCache = { fetchedAt: Date.now(), keys: body.keys };
  return body.keys;
}

/** base64url → Uint8Array. JWT segments use base64url (no padding). */
function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlDecodeJson<T>(s: string): T {
  return JSON.parse(new TextDecoder().decode(b64urlDecode(s))) as T;
}

interface JwtHeader {
  alg: string;
  kid: string;
  typ?: string;
}

interface JwtPayload {
  iss: string;
  aud: string;
  email?: string;
  email_verified?: boolean;
  exp: number;
  iat: number;
  sub: string;
}

async function importRsaKey(jwk: JwksKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg, ext: true } as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

interface JwtVerifyResult {
  ok: true;
  payload: JwtPayload;
}

interface JwtVerifyError {
  ok: false;
  reason: string;
}

/**
 * Verify a Google-signed OIDC JWT.
 * - Signature must validate against the JWKS key whose kid matches the header.
 * - exp must be in the future, iat in the past (with 60s clock skew).
 * - email claim must equal expectedEmail; email_verified must be true.
 * - aud claim must equal expectedAudience.
 * - iss must be https://accounts.google.com (canonical Google OIDC issuer).
 */
async function verifyGoogleOidcJwt(
  token: string,
  expectedEmail: string,
  expectedAudience: string,
): Promise<JwtVerifyResult | JwtVerifyError> {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed JWT" };
  const [headerB64, payloadB64, sigB64] = parts;

  let header: JwtHeader;
  let payload: JwtPayload;
  try {
    header = b64urlDecodeJson<JwtHeader>(headerB64);
    payload = b64urlDecodeJson<JwtPayload>(payloadB64);
  } catch (e) {
    return { ok: false, reason: `header/payload decode: ${String(e)}` };
  }

  if (header.alg !== "RS256") {
    return { ok: false, reason: `unsupported alg: ${header.alg}` };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now - 60) return { ok: false, reason: "token expired" };
  if (payload.iat > now + 60) return { ok: false, reason: "token from the future" };

  if (
    payload.iss !== "https://accounts.google.com" &&
    payload.iss !== "accounts.google.com"
  ) {
    return { ok: false, reason: `bad iss: ${payload.iss}` };
  }
  if (payload.aud !== expectedAudience) {
    return { ok: false, reason: `aud mismatch: ${payload.aud} != ${expectedAudience}` };
  }
  if (payload.email !== expectedEmail) {
    return { ok: false, reason: `email mismatch: ${payload.email}` };
  }
  if (payload.email_verified !== true) {
    return { ok: false, reason: "email not verified" };
  }

  const keys = await fetchJwks();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return { ok: false, reason: `unknown kid: ${header.kid}` };

  const key = await importRsaKey(jwk);
  const signed = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = b64urlDecode(sigB64);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    sig,
    signed,
  );
  if (!valid) return { ok: false, reason: "signature verify failed" };

  return { ok: true, payload };
}

function validateBody(raw: unknown): BeatBody | string {
  if (!raw || typeof raw !== "object") return "body must be a JSON object";
  const b = raw as Record<string, unknown>;
  if (typeof b.beat_id !== "string" || !b.beat_id.trim()) {
    return "beat_id must be a non-empty string";
  }
  if (typeof b.agent !== "string" || !b.agent.trim()) {
    return "agent must be a non-empty string";
  }
  if (typeof b.summary !== "string" || !b.summary.trim()) {
    return "summary must be a non-empty string";
  }
  if (b.metrics !== undefined && (typeof b.metrics !== "object" || b.metrics === null || Array.isArray(b.metrics))) {
    return "metrics must be an object";
  }
  if (b.ts !== undefined && (typeof b.ts !== "number" || !Number.isFinite(b.ts))) {
    return "ts must be a finite number (unix seconds)";
  }
  return {
    beat_id: b.beat_id.trim(),
    agent: b.agent.trim(),
    summary: b.summary.trim(),
    metrics: b.metrics as Record<string, unknown> | undefined,
    ts: b.ts as number | undefined,
  };
}

/**
 * Derive the audience the OIDC token must target. In production this is
 * the Worker's public URL; the producer must mint tokens for that exact
 * audience. We read WORKER_URL from env (set via wrangler secret/var) and
 * fall back to the request origin for first-deploy bootstrap.
 */
function expectedAudience(request: Request, env: Env): string {
  if (typeof env.WORKER_URL === "string" && env.WORKER_URL.length > 0) {
    return env.WORKER_URL;
  }
  return new URL(request.url).origin;
}

export async function handleBeatsPost(
  request: Request,
  env: Env,
  bodyText: string,
): Promise<Response> {
  // ─── Auth ───
  if (!isDevMode(env)) {
    const auth = request.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return jsonResponse({ error: "missing bearer token" }, 401);
    }
    const token = auth.slice("Bearer ".length).trim();
    const audience = expectedAudience(request, env);
    let result: JwtVerifyResult | JwtVerifyError;
    try {
      result = await verifyGoogleOidcJwt(token, RUNNER_SA_EMAIL, audience);
    } catch (e) {
      return jsonResponse({ error: `jwt verify error: ${String(e)}` }, 401);
    }
    if (!result.ok) {
      return jsonResponse({ error: `jwt verify failed: ${result.reason}` }, 401);
    }
  }

  // ─── Parse + validate body ───
  let raw: unknown;
  try {
    raw = JSON.parse(bodyText || "{}");
  } catch (e) {
    return jsonResponse({ error: `invalid json: ${String(e)}` }, 400);
  }
  const validated = validateBody(raw);
  if (typeof validated === "string") {
    return jsonResponse({ error: validated }, 400);
  }
  const beat = validated;
  const ts = beat.ts ?? Math.floor(Date.now() / 1000);
  const metricsJson = beat.metrics ? JSON.stringify(beat.metrics) : null;

  // ─── Insert ───
  try {
    await env.LEDGER
      .prepare(
        `INSERT INTO lab_beats (beat_id, agent, summary, metrics, ts)
           VALUES (?1, ?2, ?3, ?4, ?5)`,
      )
      .bind(beat.beat_id, beat.agent, beat.summary, metricsJson, ts)
      .run();
  } catch (e) {
    const msg = String(e);
    // SQLite raises "UNIQUE constraint failed" on duplicate beat_id.
    // Treat that as a 409 so the producer can dedupe idempotently.
    if (msg.includes("UNIQUE constraint failed")) {
      return jsonResponse({ error: "duplicate beat_id", beat_id: beat.beat_id }, 409);
    }
    return jsonResponse({ error: `d1 insert failed: ${msg}` }, 500);
  }

  return jsonResponse({ ok: true, beat_id: beat.beat_id });
}

export function handleBeatsOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: { ...BEATS_CORS, "Access-Control-Max-Age": "86400" },
  });
}
