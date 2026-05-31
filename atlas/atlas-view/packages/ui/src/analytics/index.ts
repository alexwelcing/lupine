/**
 * Lupi analytics — vendor-neutral, privacy-first, zero-PII event layer.
 *
 * Public surface for the rest of the app. Call sites should import from
 * here and stay tiny:
 *
 *   import { track, ANALYTICS_EVENTS } from './analytics';
 *   track(ANALYTICS_EVENTS.VIEW_SAVED, { atoms: count });
 *
 * The sink is pluggable behind VITE_LUPI_ANALYTICS_URL (see track.ts), so
 * a BigQuery/Cloud-Function/PostHog backend can be added later with ZERO
 * changes at any call site.
 */

export { ANALYTICS_EVENTS } from './events';
export type { AnalyticsEvent, AnalyticsProps } from './events';
export { track } from './track';
export type { AnalyticsPayload } from './track';
export {
  ensureAnalyticsSession,
  getAnalyticsContext,
} from './session';
export type { AnalyticsContext, UtmParams } from './session';
