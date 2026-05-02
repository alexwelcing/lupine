/**
 * Per-isolate token bucket. Calls `await limiter()` to wait until at least
 * `intervalMs` has elapsed since the previous call.
 *
 * One instance per upstream API; sharing breaks isolation between sources.
 */
export function createRateLimiter(intervalMs: number): () => Promise<void> {
  let lastAt = 0;
  return async () => {
    const wait = intervalMs - (Date.now() - lastAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
  };
}
