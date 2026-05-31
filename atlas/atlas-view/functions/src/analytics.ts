/**
 * First-party analytics collector (Phase 0 measurement sink).
 *
 * The web client's vendor-neutral `track()` layer POSTs enriched, zero-PII
 * events here (via navigator.sendBeacon / fetch). We validate + size-cap them
 * and emit them as structured Cloud Logging entries — the cheapest MVP sink.
 * Query in Logs Explorer with `jsonPayload.component="lupi_analytics"`, and
 * export the `lupi_analytics` sink to BigQuery later if/when SQL funnels are
 * wanted (zero client changes — this stays the same endpoint).
 *
 * Privacy: the client already strips PII and sends only an opaque random
 * session id + UTM campaign attribution + non-PII props. We additionally
 * allowlist event names, cap payload size, and never persist anything but logs.
 *
 * Abuse: `maxInstances` bounds blast radius + log volume. Per-IP rate limiting
 * at the edge (Cloud Armor / App Check) is the production follow-up; we do NOT
 * do a Firestore write per event (that would dominate cost at scale).
 */
import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

const ANALYTICS_CORS = ['https://lupi.live', 'http://localhost:5180', 'http://localhost:3000'];
const MAX_BODY_BYTES = 16 * 1024;

// Allowlist mirrors the client event taxonomy (packages/ui/src/analytics/events.ts).
const ALLOWED_EVENTS = new Set([
  'app_landed',
  'molecule_loaded',
  'molecule_interacted',
  'signup_start',
  'signup_complete',
  'view_saved',
  'view_shared',
  'view_forked',
  'return_active',
  'render_failed',
  'render_fallback_shown',
]);

/** Keep only known, non-PII-shaped fields; cap sizes. Returns null to drop. */
function sanitizeEvent(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  const name = typeof e.event === 'string' ? e.event : null;
  if (!name || !ALLOWED_EVENTS.has(name)) return null;

  const out: Record<string, unknown> = { event: name };
  if (typeof e.sid === 'string') out.sid = e.sid.slice(0, 64);
  if (typeof e.ts === 'number' && Number.isFinite(e.ts)) out.ts = e.ts;
  if (typeof e.isReturning === 'boolean') out.isReturning = e.isReturning;
  if (e.utm && typeof e.utm === 'object') out.utm = e.utm; // client already campaign-only
  if (e.props && typeof e.props === 'object') out.props = e.props;
  return out;
}

export const collectAnalytics = onRequest(
  // minInstances:1 keeps one warm instance so a cold start never drops a beacon
  // (sendBeacon does not retry) — measurement must survive idle gaps during the
  // ad push. maxInstances bounds cost/blast-radius at the top end.
  { cors: ANALYTICS_CORS, maxInstances: 10, minInstances: 1 },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' });
      return;
    }
    try {
      const rawLen = req.rawBody ? req.rawBody.length : 0;
      if (rawLen > MAX_BODY_BYTES) {
        res.status(413).send('');
        return;
      }
      let body: unknown = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = null;
        }
      }
      const items = Array.isArray(body) ? body : [body];
      for (const item of items) {
        const ev = sanitizeEvent(item);
        if (ev) logger.info('lupi_analytics_event', { component: 'lupi_analytics', ...ev });
      }
      res.status(204).send('');
    } catch (err) {
      // Analytics must never surface as a user-visible failure.
      logger.warn('analytics_collect_failed', { error: String(err) });
      res.status(204).send('');
    }
  },
);
