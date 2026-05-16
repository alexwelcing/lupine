/**
 * Cloudflare Access JWT verification middleware.
 *
 * Cloudflare Access sits in front of the worker (configured in the CF
 * dashboard, not in wrangler.toml). When a user has authenticated against an
 * Access policy, CF injects a `Cf-Access-Jwt-Assertion` header carrying a JWT
 * signed by the team's JWKS endpoint. This middleware verifies that JWT and
 * gates the underlying handler.
 *
 * On verification failure we return 403 (not 401): Access handles the login
 * redirect at the edge upstream of us. If a request reaches the worker
 * without a valid Access JWT, it is either a misconfiguration (Access policy
 * not actually fronting this route) or a direct API call bypassing Access,
 * both of which are caller-side errors.
 *
 * DEV bypass: when `env.DEV_MODE === "true"` we skip verification entirely
 * so that `wrangler dev` and local curl-driven smoke tests work without
 * standing up a real Access tunnel. This MUST never be true in production.
 */
import type { Env } from "../types";

export type AccessHandler = (
  request: Request,
  env: Env,
  ctx?: ExecutionContext,
) => Response | Promise<Response>;

interface AccessJwtPayload {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iss?: string;
  sub?: string;
}

interface CachedJwks {
  keys: Map<string, CryptoKey>;
  fetchedAt: number;
}

const JWKS_TTL_MS = 60 * 60 * 1000;
const jwksCache = new Map<string, CachedJwks>();

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function decodeJsonSegment<T>(segment: string): T {
  try {
    const json = new TextDecoder().decode(base64UrlDecode(segment));
    return JSON.parse(json) as T;
  } catch {
    throw new Error("malformed jwt segment");
  }
}

/** Constant-time string compare — avoids leaking the secret via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function forbidden(reason: string): Response {
  return Response.json(
    { error: "forbidden", reason },
    { status: 403, headers: { "Content-Type": "application/json" } },
  );
}

async function loadJwks(teamDomain: string): Promise<Map<string, CryptoKey>> {
  const cached = jwksCache.get(teamDomain);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) {
    return cached.keys;
  }

  const url = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`jwks fetch ${res.status}`);
  const body = (await res.json()) as { keys?: Array<JsonWebKey & { kid?: string }> };
  const keys = new Map<string, CryptoKey>();
  for (const jwk of body.keys ?? []) {
    if (!jwk.kid) continue;
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    keys.set(jwk.kid, key);
  }
  jwksCache.set(teamDomain, { keys, fetchedAt: Date.now() });
  return keys;
}

async function verifyJwt(
  token: string,
  teamDomain: string,
  expectedAud: string,
): Promise<AccessJwtPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed jwt");
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = decodeJsonSegment<{ alg?: string; kid?: string }>(headerB64);
  if (header.alg !== "RS256") throw new Error(`unsupported alg ${header.alg}`);
  if (!header.kid) throw new Error("missing kid");

  const keys = await loadJwks(teamDomain);
  const key = keys.get(header.kid);
  if (!key) throw new Error(`unknown kid ${header.kid}`);

  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature,
    signedData,
  );
  if (!valid) throw new Error("bad signature");

  const payload = decodeJsonSegment<AccessJwtPayload>(payloadB64);
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) {
    throw new Error("expired");
  }

  const aud = payload.aud;
  const audOk = Array.isArray(aud)
    ? aud.includes(expectedAud)
    : aud === expectedAud;
  if (!audOk) throw new Error("aud mismatch");

  const expectedIss = `https://${teamDomain}.cloudflareaccess.com`;
  if (payload.iss && payload.iss !== expectedIss) {
    throw new Error("iss mismatch");
  }

  return payload;
}

function normalizeAllowList(emails: readonly string[]): Set<string> {
  return new Set(
    emails
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0),
  );
}

/**
 * Inline guard for the big-switch router in server.ts.
 * Returns a Response when the request must be rejected, or null when the
 * caller should proceed.
 */
export async function checkAccess(
  request: Request,
  env: Env,
  allowedEmails: readonly string[],
): Promise<Response | null> {
  if (env.DEV_MODE === "true") return null;

  // Trusted internal bypass. The research queue consumer self-fetches gated
  // routes (POST /run, /literature/search, …) to reuse handler logic; those
  // subrequests carry no Cloudflare Access JWT and would 403. A constant-time
  // match against a shared secret authorizes them. Only honored when the
  // secret is configured (never an open bypass).
  const internalToken = env.INTERNAL_TASK_TOKEN?.trim();
  if (internalToken) {
    const presented = request.headers.get("X-Internal-Token");
    if (presented && timingSafeEqual(presented, internalToken)) return null;
  }

  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN;
  const aud = env.CF_ACCESS_AUD;
  if (!teamDomain || !aud) return forbidden("access not configured");

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return forbidden("missing access jwt");

  let payload: AccessJwtPayload;
  try {
    payload = await verifyJwt(token, teamDomain, aud);
  } catch (e) {
    return forbidden(`jwt verification failed: ${(e as Error).message}`);
  }

  const allowed = normalizeAllowList(allowedEmails);
  if (allowed.size > 0) {
    const email = payload.email?.toLowerCase();
    if (!email || !allowed.has(email)) {
      return forbidden("email not in allow-list");
    }
  }
  return null;
}

/**
 * Handler-wrapping form of the gate, per the unit-10 spec. Less ergonomic
 * for the existing if-block router but provided for future handler-based
 * refactors and for callers that compose middleware into pipelines.
 */
export function requireAccess(allowedEmails: readonly string[]) {
  return function wrap(handler: AccessHandler): AccessHandler {
    return async (request, env, ctx) => {
      const denial = await checkAccess(request, env, allowedEmails);
      if (denial) return denial;
      return handler(request, env, ctx);
    };
  };
}

/**
 * Convenience predicate for `url.pathname` testing — captures the set of
 * write/admin routes that must be gated. Public-by-design routes (`/feed/*`,
 * `/health`, `/research`, `/live`) are deliberately NOT covered.
 */
export function isGatedRoute(pathname: string, method: string): boolean {
  if (pathname.startsWith("/admin/") || pathname === "/admin") return true;
  if (pathname.startsWith("/ops/") || pathname === "/ops") {
    // OPTIONS preflights for CORS must pass through unguarded; the browser
    // sends them without credentials.
    if (method === "OPTIONS") return false;
    // Read-only ops endpoints stay public for the live dashboard; only
    // mutating endpoints are gated.
    if (method === "GET") return false;
    return true;
  }
  if (method !== "POST") return false;
  return (
    pathname === "/run" ||
    pathname === "/fleet/run" ||
    pathname === "/ingest/batch" ||
    pathname === "/broadcasts/trigger"
  );
}
