/**
 * Cross-isolate rate limit state, backed by KV.
 *
 * Workers spawn many isolates (per region/colo) — each one has its own
 * memory, so a per-isolate token bucket like rate_limit.ts can't actually
 * coordinate when 3 isolates fan out simultaneously. The result: arXiv
 * sees N parallel requests with no spacing, returns 429.
 *
 * This module persists `notBefore` (epoch ms — earliest time a new request
 * is allowed) and `consecutive429` (for exponential backoff) per upstream
 * source in env.CONFIG (KV). Every isolate reads the same value, so the
 * spacing is honoured globally.
 *
 * Usage:
 *   await claimSlot(env, "arxiv", 3000);   // wait if needed, reserve next slot
 *   const res = await fetch(url);
 *   if (res.status === 429) {
 *     const retry = parseRetryAfter(res.headers.get("retry-after"));
 *     await record429(env, "arxiv", retry);
 *     return null;
 *   }
 *   await recordSuccess(env, "arxiv");     // reset 429 counter
 *
 * The in-isolate rate_limit.ts is kept as a backstop in case KV is briefly
 * unavailable; this layer is the source of truth.
 */
import type { Env } from "../types";

const KV_PREFIX = "ratelimit:";
const MAX_BACKOFF_MS = 600_000;   // 10 min hard cap
const MAX_WAIT_PER_CALL_MS = 60_000; // never block a single call >60s
const STATE_TTL_S = 3_600;        // KV row expires after 1h of no activity

interface RateState {
  /** Earliest ms-epoch a new request to this source is allowed. */
  notBefore: number;
  /** Consecutive 429s — drives exponential backoff base. */
  consecutive429: number;
  /** Last time this source successfully responded (informational). */
  lastSuccessAt?: number;
}

async function readState(env: Env, source: string): Promise<RateState> {
  if (!env.CONFIG) {
    return { notBefore: 0, consecutive429: 0 };
  }
  const raw = await env.CONFIG.get(KV_PREFIX + source);
  if (!raw) return { notBefore: 0, consecutive429: 0 };
  try {
    const parsed = JSON.parse(raw) as Partial<RateState>;
    return {
      notBefore: typeof parsed.notBefore === "number" ? parsed.notBefore : 0,
      consecutive429: typeof parsed.consecutive429 === "number" ? parsed.consecutive429 : 0,
      lastSuccessAt: typeof parsed.lastSuccessAt === "number" ? parsed.lastSuccessAt : undefined,
    };
  } catch {
    return { notBefore: 0, consecutive429: 0 };
  }
}

async function writeState(env: Env, source: string, state: RateState): Promise<void> {
  if (!env.CONFIG) return;
  try {
    await env.CONFIG.put(
      KV_PREFIX + source,
      JSON.stringify(state),
      { expirationTtl: STATE_TTL_S },
    );
  } catch (e) {
    console.warn(`[rate_limit_kv] writeState ${source} failed:`, e);
  }
}

/**
 * Wait if necessary, then reserve the next request slot for `source`.
 * The returned promise resolves once it's safe to call the upstream API.
 *
 * `minIntervalMs` is the floor between requests when not in backoff mode —
 * arXiv unauthenticated is ~3s, OpenAlex polite is ~1s, S2 public is ~1.5s.
 *
 * If the current state's notBefore is more than 60s in the future, we cap
 * the wait at 60s and let the call try anyway — the upstream will tell us
 * if it's still rate-limited and we'll back off again.
 */
export async function claimSlot(
  env: Env,
  source: string,
  minIntervalMs: number,
): Promise<void> {
  const state = await readState(env, source);
  const now = Date.now();
  if (state.notBefore > now) {
    const wait = Math.min(state.notBefore - now, MAX_WAIT_PER_CALL_MS);
    await new Promise((r) => setTimeout(r, wait));
  }
  // Reserve the next slot. We write back even if we didn't wait — this is
  // what synchronizes parallel isolates: whoever writes first wins the slot.
  await writeState(env, source, {
    notBefore: Math.max(Date.now(), state.notBefore) + minIntervalMs,
    consecutive429: state.consecutive429,
    lastSuccessAt: state.lastSuccessAt,
  });
}

/**
 * Parse a Retry-After header value. Returns the wait in ms, or null.
 * Accepts integer seconds or HTTP-date format per RFC 7231 §7.1.3.
 */
export function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  // Plain seconds
  if (/^\d+$/.test(trimmed)) {
    return Math.min(parseInt(trimmed, 10) * 1000, MAX_BACKOFF_MS);
  }
  // HTTP-date
  const t = Date.parse(trimmed);
  if (Number.isFinite(t)) {
    return Math.max(0, Math.min(t - Date.now(), MAX_BACKOFF_MS));
  }
  return null;
}

/**
 * Record that the upstream returned 429. Computes next-eligible time using
 * the Retry-After hint when present, else exponential backoff (5s × 3^n).
 * Returns the actual backoff that was applied.
 */
export async function record429(
  env: Env,
  source: string,
  retryAfterMs: number | null,
): Promise<number> {
  const state = await readState(env, source);
  const newCount = state.consecutive429 + 1;
  const expBackoff = Math.min(5_000 * Math.pow(3, state.consecutive429), MAX_BACKOFF_MS);
  const backoffMs = retryAfterMs !== null ? retryAfterMs : expBackoff;
  await writeState(env, source, {
    notBefore: Date.now() + backoffMs,
    consecutive429: newCount,
    lastSuccessAt: state.lastSuccessAt,
  });
  console.warn(`[rate_limit_kv] ${source} 429; backing off ${Math.round(backoffMs / 1000)}s (count=${newCount})`);
  return backoffMs;
}

/**
 * Record a successful response — clears the consecutive-429 counter.
 * Cheap fast-path: skips the KV write when the counter was already 0.
 */
export async function recordSuccess(env: Env, source: string): Promise<void> {
  const state = await readState(env, source);
  if (state.consecutive429 === 0 && state.lastSuccessAt && Date.now() - state.lastSuccessAt < 60_000) {
    return; // hot path — recently successful, nothing to update
  }
  await writeState(env, source, {
    notBefore: state.notBefore,
    consecutive429: 0,
    lastSuccessAt: Date.now(),
  });
}

/**
 * Read-only snapshot for ops/observability dashboards.
 */
export async function getRateLimitSnapshot(env: Env, sources: string[]): Promise<Record<string, RateState & { now_ms: number; healthy: boolean }>> {
  const out: Record<string, RateState & { now_ms: number; healthy: boolean }> = {};
  const now = Date.now();
  for (const s of sources) {
    const state = await readState(env, s);
    out[s] = {
      ...state,
      now_ms: now,
      healthy: state.consecutive429 === 0 && state.notBefore <= now,
    };
  }
  return out;
}
