// ═══════════════════════════════════════════════════════════════════
// index.ts — lupi-chat Worker entry point.
//
// Powers the LUPI home-page "configure a molecule via chat" experience.
//
// Routes:
//   POST    /chat   → run the MiniMax tool-use loop, return ChatResponseBody
//   OPTIONS /chat   → CORS preflight
//   GET     /health → liveness probe (no auth, no rate limit)
//
// Cross-cutting: permissive CORS (see cors.ts), a KV-backed per-IP
// fixed-window rate limiter (CHAT_RL), and strict request validation.
// ═══════════════════════════════════════════════════════════════════

import { runChat } from "./minimax";
import { buildCorsHeaders, handlePreflight, jsonResponse } from "./cors";
import type {
  CatalogEntry,
  ChatMessage,
  ChatRequestBody,
  Env,
  ViewerState,
} from "./types";

// ─── Rate limit config (fixed window, per IP) ───

const RATE_LIMIT_MAX_DEFAULT = 30; // requests
const RATE_LIMIT_WINDOW_SECONDS = 60; // per minute

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const cors = buildCorsHeaders(request, env);
    const url = new URL(request.url);

    // Health check: cheap, unauthenticated, never rate-limited.
    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true, service: "lupi-chat" }, 200, cors);
    }

    if (url.pathname !== "/chat") {
      return jsonResponse({ error: "Not found" }, 404, cors);
    }

    if (request.method === "OPTIONS") {
      return handlePreflight(request, env);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, {
        ...cors,
        Allow: "POST, OPTIONS",
      });
    }

    // Fail fast if the secret is missing (misconfiguration, not user error).
    if (!env.MINIMAX_API_KEY) {
      return jsonResponse(
        { error: "Server not configured: missing MINIMAX_API_KEY." },
        500,
        cors,
      );
    }

    // ─── Rate limit ───
    const ip = clientIp(request);
    const rl = await enforceRateLimit(env, ip);
    if (!rl.allowed) {
      return jsonResponse(
        { error: "Rate limit exceeded. Please slow down and try again shortly." },
        429,
        { ...cors, "Retry-After": String(rl.retryAfterSeconds) },
      );
    }

    // ─── Parse + validate body ───
    let parsed: ChatRequestBody;
    try {
      parsed = validateBody(await request.json());
    } catch (err) {
      return jsonResponse(
        { error: err instanceof Error ? err.message : "Invalid request body." },
        400,
        cors,
      );
    }

    // ─── Run the MiniMax tool-use loop ───
    try {
      const result = await runChat(env, {
        messages: parsed.messages,
        viewer: parsed.viewer,
        catalog: parsed.catalog,
      });
      return jsonResponse(result, 200, cors);
    } catch (err) {
      console.error("chat error:", err);
      return jsonResponse(
        { error: "The assistant is unavailable right now. Please try again." },
        502,
        cors,
      );
    }
  },
};

// ─── Request validation ───

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8000;
const MAX_CATALOG = 2000;

function validateBody(raw: unknown): ChatRequestBody {
  if (!raw || typeof raw !== "object") {
    throw new Error("Request body must be a JSON object.");
  }
  const body = raw as Record<string, unknown>;

  const messages = validateMessages(body.messages);
  const viewer = validateViewer(body.viewer);
  const catalog = validateCatalog(body.catalog);

  return { messages, viewer, catalog };
}

function validateMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) throw new Error("`messages` must be an array.");
  if (raw.length === 0) throw new Error("`messages` must not be empty.");
  if (raw.length > MAX_MESSAGES) {
    throw new Error(`"messages" exceeds the maximum of ${MAX_MESSAGES}.`);
  }
  return raw.map((m, i) => {
    if (!m || typeof m !== "object") {
      throw new Error(`messages[${i}] must be an object.`);
    }
    const msg = m as Record<string, unknown>;
    if (msg.role !== "user" && msg.role !== "assistant") {
      throw new Error(`messages[${i}].role must be "user" or "assistant".`);
    }
    if (typeof msg.content !== "string") {
      throw new Error(`messages[${i}].content must be a string.`);
    }
    if (msg.content.length > MAX_MESSAGE_CHARS) {
      throw new Error(
        `messages[${i}].content exceeds ${MAX_MESSAGE_CHARS} characters.`,
      );
    }
    return { role: msg.role, content: msg.content };
  });
}

function validateViewer(raw: unknown): ViewerState {
  if (!raw || typeof raw !== "object") {
    throw new Error("`viewer` must be an object.");
  }
  const v = raw as Record<string, unknown>;
  const fileName =
    v.fileName === null || typeof v.fileName === "string"
      ? (v.fileName as string | null)
      : null;
  const atomCount = typeof v.atomCount === "number" && Number.isFinite(v.atomCount)
    ? v.atomCount
    : 0;
  const colorScheme = typeof v.colorScheme === "string" ? v.colorScheme : "element";
  const showBonds = typeof v.showBonds === "boolean" ? v.showBonds : false;
  // Preserve any forward-compatible extra fields the viewer reported.
  return { ...v, fileName, atomCount, colorScheme, showBonds };
}

function validateCatalog(raw: unknown): CatalogEntry[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new Error("`catalog` must be an array.");
  if (raw.length > MAX_CATALOG) {
    throw new Error(`"catalog" exceeds the maximum of ${MAX_CATALOG} entries.`);
  }
  const out: CatalogEntry[] = [];
  for (let i = 0; i < raw.length; i++) {
    const e = raw[i] as Record<string, unknown> | null;
    if (!e || typeof e !== "object") continue; // skip malformed entries
    if (typeof e.id !== "string" || typeof e.title !== "string") continue;
    const entry: CatalogEntry = { id: e.id, title: e.title };
    if (typeof e.subtitle === "string") entry.subtitle = e.subtitle;
    if (typeof e.formula === "string") entry.formula = e.formula;
    if (typeof e.domain === "string") entry.domain = e.domain;
    if (Array.isArray(e.elements)) {
      entry.elements = e.elements.filter((x): x is string => typeof x === "string");
    }
    if (Array.isArray(e.tags)) {
      entry.tags = e.tags.filter((x): x is string => typeof x === "string");
    }
    out.push(entry);
  }
  return out;
}

// ─── Rate limiting (KV-backed fixed window per IP) ───

function clientIp(request: Request): string {
  // CF-Connecting-IP is set by Cloudflare for all client requests.
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Fixed-window limiter: one KV key per (ip, window). The window index is
 * floor(now / WINDOW). We store the integer count with a TTL equal to the
 * window so keys self-expire. Reads/writes are best-effort: if KV is
 * unavailable we fail OPEN (allow) rather than block legitimate traffic.
 */
async function enforceRateLimit(env: Env, ip: string): Promise<RateLimitResult> {
  const max = parsePositiveInt(env.RATE_LIMIT_MAX, RATE_LIMIT_MAX_DEFAULT);
  const nowSec = Math.floor(Date.now() / 1000);
  const windowIndex = Math.floor(nowSec / RATE_LIMIT_WINDOW_SECONDS);
  const key = `rl:${ip}:${windowIndex}`;
  const resetAtSec = (windowIndex + 1) * RATE_LIMIT_WINDOW_SECONDS;
  const retryAfterSeconds = Math.max(1, resetAtSec - nowSec);

  try {
    const current = await env.CHAT_RL.get(key);
    const count = current ? parseInt(current, 10) || 0 : 0;

    if (count >= max) {
      return { allowed: false, retryAfterSeconds };
    }

    // Increment. TTL covers the remainder of the window (+1s slack). KV
    // requires a minimum expiration TTL of 60s, so clamp accordingly.
    const ttl = Math.max(60, retryAfterSeconds + 1);
    await env.CHAT_RL.put(key, String(count + 1), { expirationTtl: ttl });
    return { allowed: true, retryAfterSeconds };
  } catch (err) {
    console.warn("rate limit KV error (failing open):", err);
    return { allowed: true, retryAfterSeconds };
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
