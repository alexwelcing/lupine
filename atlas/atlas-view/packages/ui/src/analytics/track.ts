/**
 * Lupi analytics — the track() entry point.
 *
 * Vendor-neutral, privacy-first, fire-and-forget. track() enriches an
 * event with the session/UTM context, strips anything that looks like PII,
 * and hands the payload to a PLUGGABLE sink:
 *
 *   - If VITE_LUPI_ANALYTICS_URL is set, POST via navigator.sendBeacon
 *     (survives page unload) with a fetch() fallback.
 *   - If unset (local dev / no backend yet), no-op + console.debug so the
 *     client is COMPLETE today and a BigQuery/Cloud-Function/PostHog sink
 *     drops in later with ZERO call-site changes.
 *
 * Hard rule: analytics must NEVER throw into the app or block UX. Every
 * path is wrapped; failures are swallowed (optionally logged in dev).
 */

import { ANALYTICS_EVENTS, type AnalyticsEvent, type AnalyticsProps } from './events';
import { trackFirebaseAnalytics } from './firebaseSink';
import { getAnalyticsContext, type AnalyticsContext } from './session';

export { ANALYTICS_EVENTS };
export type { AnalyticsEvent, AnalyticsProps };

/** Property keys we refuse to forward, even if a caller passes them. */
const PII_KEY_PATTERN =
  /(email|e-mail|name|displayname|phone|password|token|secret|address|ip\b|uid|userid|user_id)/i;

/** The fully-enriched payload shape sent to the sink. */
export interface AnalyticsPayload {
  readonly event: AnalyticsEvent;
  readonly sid: string;
  readonly ts: number;
  readonly isReturning: boolean;
  readonly utm: AnalyticsContext['utm'];
  readonly props: AnalyticsProps;
  /** Coarse client hints — never PII. Page path only (no query/hash). */
  readonly path: string;
}

function analyticsUrl(): string | undefined {
  try {
    const url = import.meta.env.VITE_LUPI_ANALYTICS_URL;
    return typeof url === 'string' && url.trim() ? url.trim() : undefined;
  } catch {
    return undefined;
  }
}

function isDev(): boolean {
  try {
    return Boolean(import.meta.env.DEV);
  } catch {
    return false;
  }
}

/**
 * Drop any prop whose key looks like PII or whose value is non-primitive.
 * Returns a new object — never mutates the caller's props.
 */
function stripPii(props: AnalyticsProps): AnalyticsProps {
  const clean: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_KEY_PATTERN.test(key)) continue;
    if (value === undefined) continue;
    const t = typeof value;
    if (value === null || t === 'string' || t === 'number' || t === 'boolean') {
      // Cap string length to avoid accidental payload bloat / smuggled blobs.
      clean[key] = t === 'string' ? (value as string).slice(0, 500) : value;
    }
  }
  return clean;
}

/** Page path only — strips query + hash so no UTM/slug PII leaks via path. */
function currentPath(): string {
  try {
    return typeof window !== 'undefined' ? window.location.pathname : '';
  } catch {
    return '';
  }
}

function send(url: string, payload: AnalyticsPayload): void {
  const body = JSON.stringify(payload);
  // sendBeacon is the right tool: queued by the browser, survives unload,
  // and never blocks. Fall back to keepalive fetch where unavailable.
  //
  // CRITICAL: the Blob MUST be `text/plain` (a CORS-safelisted content type),
  // NOT `application/json`. A non-safelisted content type forces a CORS
  // preflight, and sendBeacon CANNOT perform preflighted requests — the browser
  // returns `true` (queued) but then silently DROPS the request. Verified live:
  // application/json beacons never reached the collector; text/plain do. The
  // collector parses the raw string body, so the wire payload is unchanged.
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      const blob = new Blob([body], { type: 'text/plain' });
      const queued = navigator.sendBeacon(url, blob);
      if (queued) return;
    }
  } catch {
    // fall through to fetch
  }

  try {
    if (typeof fetch === 'function') {
      void fetch(url, {
        method: 'POST',
        // text/plain keeps the fetch fallback preflight-free too (same parsing).
        headers: { 'Content-Type': 'text/plain' },
        body,
        keepalive: true,
        // Analytics is best-effort; don't surface CORS/network noise.
        mode: 'cors',
        credentials: 'omit',
      }).catch(() => undefined);
    }
  } catch {
    // Swallow — analytics must never throw into the app.
  }
}

/**
 * Record a funnel event. Fire-and-forget; safe to call from anywhere,
 * including render paths and unload handlers.
 *
 * @param event a name from ANALYTICS_EVENTS
 * @param props optional non-PII context (auto-stripped defensively)
 */
export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  try {
    const ctx = getAnalyticsContext();
    const payload: AnalyticsPayload = {
      event,
      sid: ctx.sid,
      ts: ctx.ts,
      isReturning: ctx.isReturning,
      utm: ctx.utm,
      props: stripPii(props),
      path: currentPath(),
    };

    const url = analyticsUrl();
    trackFirebaseAnalytics(event, payload.props);
    if (!url) {
      // No sink configured yet — the client is still complete. Surface the
      // event in dev so the funnel is observable while wiring backends.
      if (isDev()) {
        // eslint-disable-next-line no-console
        console.debug('[analytics]', event, payload);
      }
      return;
    }

    send(url, payload);
  } catch {
    // Absolute backstop: analytics can never break the app.
  }
}
