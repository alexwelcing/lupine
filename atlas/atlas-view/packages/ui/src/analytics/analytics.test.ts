// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_EVENTS } from './events';

/**
 * The analytics layer reads import.meta.env and module-level session state.
 * We re-import fresh per test (resetModules) so each case starts clean.
 */

async function freshModules() {
  vi.resetModules();
  const session = await import('./session');
  const track = await import('./track');
  return { ...session, ...track };
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  // Same-origin relative reset (jsdom forbids cross-origin replaceState).
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('analytics session', () => {
  it('mints a stable session id into sessionStorage', async () => {
    const { ensureAnalyticsSession, getAnalyticsContext } = await freshModules();
    ensureAnalyticsSession();
    const a = getAnalyticsContext();
    const b = getAnalyticsContext();
    expect(a.sid).toBe(b.sid);
    expect(a.sid).not.toBe('unknown');
    expect(window.sessionStorage.getItem('lupi_sid')).toBe(a.sid);
  });

  it('captures utm params on entry and persists them', async () => {
    window.history.replaceState({}, '', '/?utm_source=hn&utm_campaign=launch');
    const { getAnalyticsContext } = await freshModules();
    const ctx = getAnalyticsContext();
    expect(ctx.utm.utm_source).toBe('hn');
    expect(ctx.utm.utm_campaign).toBe('launch');
  });

  it('treats a brand-new browser as not returning, then returning', async () => {
    const first = await freshModules();
    first.ensureAnalyticsSession();
    expect(first.getAnalyticsContext().isReturning).toBe(false);
    // Second visit: localStorage first-seen now exists.
    const second = await freshModules();
    second.ensureAnalyticsSession();
    expect(second.getAnalyticsContext().isReturning).toBe(true);
  });
});

describe('analytics track', () => {
  it('no-ops without a sink and never throws', async () => {
    vi.stubEnv('VITE_LUPI_ANALYTICS_URL', '');
    const { track } = await freshModules();
    expect(() => track(ANALYTICS_EVENTS.APP_LANDED)).not.toThrow();
  });

  it('strips PII keys and forwards a clean payload to the sink', async () => {
    vi.stubEnv('VITE_LUPI_ANALYTICS_URL', 'https://sink.example/collect');
    const beacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { ...window.navigator, sendBeacon: beacon });

    const { track } = await freshModules();
    track(ANALYTICS_EVENTS.VIEW_SAVED, {
      atoms: 42,
      email: 'leak@example.com',
      displayName: 'Should Drop',
      bonds: true,
    });

    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, blob] = beacon.mock.calls[0] as [string, Blob];
    expect(url).toBe('https://sink.example/collect');
    // MUST be a CORS-safelisted content type: application/json forces a preflight
    // that sendBeacon cannot perform, so the browser silently drops the beacon.
    expect(blob.type).toBe('text/plain');
    const text = await blob.text();
    const payload = JSON.parse(text);
    expect(payload.event).toBe('view_saved');
    expect(payload.props.atoms).toBe(42);
    expect(payload.props.bonds).toBe(true);
    expect(payload.props.email).toBeUndefined();
    expect(payload.props.displayName).toBeUndefined();
    expect(payload.sid).toBeTruthy();
  });
});
