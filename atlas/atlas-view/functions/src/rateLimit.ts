/**
 * Lightweight Firestore-backed fixed-window rate limiter — a code-side stopgap
 * for denial-of-wallet protection on the public `exchangeApiKey` endpoint.
 *
 * Design (finding EXCHANGE_ENDPOINT_MAXINSTANCES_10):
 *  - One Firestore read/write per request (a single transaction on one doc).
 *  - Fixed window keyed by a caller fingerprint (client IP). Each window is its
 *    own document so the bucket "auto-expires" simply by never being touched
 *    again; a TTL policy on `expireAt` reaps stale docs (configure in Firestore
 *    console / firestore.indexes — no app code needed to delete them).
 *  - FAIL-OPEN: if the limiter itself errors we allow the request and log it.
 *    A flaky limiter must never hard-block legitimate agent signups.
 *
 * This is intentionally cheap and reversible. The production-grade follow-up is
 * Cloud Armor per-IP rate limiting at the load balancer (and/or App Check),
 * which throttles before traffic ever reaches the function instance.
 */
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

/** Firestore collection holding one doc per (fingerprint, window). */
const RL_COLLECTION = 'rateLimits';

export interface RateLimitConfig {
  /** Max allowed requests within one window. */
  readonly max: number;
  /** Window length in milliseconds. */
  readonly windowMs: number;
}

export interface RateLimitResult {
  /** Whether this request is permitted (true also when failing open). */
  readonly allowed: boolean;
  /** Requests seen in the current window after counting this one (best-effort). */
  readonly count: number;
  /** Seconds until the current window resets — for a Retry-After hint. */
  readonly retryAfterSec: number;
}

/** Default policy for the exchange endpoint: ~10 exchanges per IP per minute. */
export const EXCHANGE_RATE_LIMIT: RateLimitConfig = { max: 10, windowMs: 60_000 };

/** Derive a stable, non-empty fingerprint for a window key from caller IP parts. */
function fingerprint(ip: string): string {
  const trimmed = ip.trim();
  // Firestore doc ids can't contain '/'; collapse IPv6/odd chars to a safe token.
  const safe = trimmed.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 100);
  return safe || 'unknown';
}

/**
 * Atomically count one hit against a fixed window for `ip`.
 *
 * Returns `allowed:false` only when the caller has exceeded `max` within the
 * current window. On ANY limiter error this resolves `allowed:true` (fail-open)
 * and logs the failure — never throws.
 */
export async function checkRateLimit(
  ip: string,
  config: RateLimitConfig = EXCHANGE_RATE_LIMIT,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const windowStart = now - (now % config.windowMs);
  const windowEnd = windowStart + config.windowMs;
  const retryAfterSec = Math.max(1, Math.ceil((windowEnd - now) / 1000));
  const docId = `${fingerprint(ip)}_${windowStart}`;

  try {
    const db = getFirestore();
    const ref = db.collection(RL_COLLECTION).doc(docId);

    const count = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const prev = snap.exists ? Number(snap.get('count')) || 0 : 0;
      const next = prev + 1;
      // `expireAt` is the TTL field: a Firestore TTL policy on it auto-reaps the
      // doc after the window closes, so the collection self-cleans.
      tx.set(
        ref,
        {
          count: FieldValue.increment(1),
          windowStart,
          expireAt: new Date(windowEnd),
        },
        { merge: true },
      );
      return next;
    });

    return { allowed: count <= config.max, count, retryAfterSec };
  } catch (err) {
    // Fail OPEN: a limiter outage must not block legitimate users.
    logger.warn('rate_limit_check_failed_open', { docId, error: String(err) });
    return { allowed: true, count: 0, retryAfterSec };
  }
}

/** Best-effort client IP from the request (trusts the platform's x-forwarded-for). */
export function clientIp(req: { ip?: string; get(name: string): string | undefined }): string {
  const fwd = req.get('x-forwarded-for') ?? '';
  // Left-most entry is the original client per XFF convention.
  const first = fwd.split(',')[0]?.trim();
  return first || req.ip || 'unknown';
}
