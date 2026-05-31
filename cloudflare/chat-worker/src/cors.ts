// ═══════════════════════════════════════════════════════════════════
// cors.ts — CORS policy for the lupi-chat Worker.
//
// This is a public, read-style endpoint (no cookies, no Cloudflare Access),
// so the policy is permissive: we ECHO the request Origin when it matches
// our allow-list (localhost any port, lupi.live, *.lupine.dev, and the
// Cloud Run viewer origin), and fall back to `*` otherwise. We always set
// `Vary: Origin` so caches don't cross-pollinate per-origin responses.
//
// Mirrors the echo-Origin + Vary pattern used by cloudflare/cdn-proxy.
// ═══════════════════════════════════════════════════════════════════

import type { Env } from "./types";

/** Exact-match origins always allowed. */
const STATIC_ALLOWED = new Set<string>([
  "https://lupi.live",
  "https://glim.lupine.dev",
  "https://lupine.dev",
]);

/**
 * Pattern-matched origins:
 *   - http(s)://localhost:<port> and http(s)://127.0.0.1:<port> (any/no port)
 *   - https://<sub>.lupine.dev
 *   - https://<service>.run.app  (Cloud Run viewer origin)
 */
const ORIGIN_PATTERNS: RegExp[] = [
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https:\/\/([a-z0-9-]+\.)*lupine\.dev$/i,
  /^https:\/\/[a-z0-9-]+\.run\.app$/i,
];

function isAllowedOrigin(origin: string, env: Env): boolean {
  if (STATIC_ALLOWED.has(origin)) return true;
  if (ORIGIN_PATTERNS.some((re) => re.test(origin))) return true;
  const extra = env.EXTRA_ALLOWED_ORIGINS;
  if (extra) {
    for (const raw of extra.split(",")) {
      if (raw.trim() === origin) return true;
    }
  }
  return false;
}

/**
 * Build CORS headers for a request. Echoes the Origin when allowed; for a
 * public read-style endpoint we fall back to `*` so unknown callers (e.g.
 * a new preview origin) still work. When we echo a specific Origin we add
 * `Vary: Origin` so shared caches key correctly.
 */
export function buildCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (origin && isAllowedOrigin(origin, env)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (origin) {
    // Unknown origin: still permit (public endpoint) but do not reflect an
    // arbitrary value as if allow-listed — use the wildcard instead.
    headers["Access-Control-Allow-Origin"] = "*";
  } else {
    // Non-browser / same-origin request (no Origin header).
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

/** Handle an OPTIONS preflight request. */
export function handlePreflight(request: Request, env: Env): Response {
  return new Response(null, { status: 204, headers: buildCorsHeaders(request, env) });
}

/** Convenience: a JSON Response with CORS + content-type applied. */
export function jsonResponse(
  body: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}
