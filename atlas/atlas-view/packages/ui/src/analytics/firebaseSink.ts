/**
 * Optional Firebase Analytics sink.
 *
 * The default deployment deliberately does not load the Google Analytics
 * client: no consent banner, no Firebase Analytics data. A deploy can opt in
 * only after there is a valid consent/legal basis by setting:
 *
 *   VITE_FIREBASE_ANALYTICS_ENABLED=true
 *   VITE_FIREBASE_ANALYTICS_CONSENT=granted
 */
import { firebaseApp } from '../auth/firebase';
import type { AnalyticsEvent, AnalyticsProps } from './events';

type FirebaseAnalyticsModule = typeof import('firebase/analytics');
type FirebaseAnalytics = import('firebase/analytics').Analytics;

let analyticsPromise: Promise<FirebaseAnalytics | null> | null = null;

function envString(name: string): string {
  try {
    const value = import.meta.env[name];
    return typeof value === 'string' ? value.trim() : '';
  } catch {
    return '';
  }
}

function envFlag(name: string): boolean {
  const value = envString(name).toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function firebaseAnalyticsAllowed(): boolean {
  if (!firebaseApp) return false;
  if (!envString('VITE_FIREBASE_MEASUREMENT_ID')) return false;
  if (!envFlag('VITE_FIREBASE_ANALYTICS_ENABLED')) return false;
  return envString('VITE_FIREBASE_ANALYTICS_CONSENT').toLowerCase() === 'granted';
}

async function getFirebaseAnalytics(): Promise<FirebaseAnalytics | null> {
  if (!firebaseAnalyticsAllowed()) return null;
  const app = firebaseApp;
  if (!app) return null;
  if (!analyticsPromise) {
    analyticsPromise = import('firebase/analytics')
      .then(async (mod: FirebaseAnalyticsModule) => {
        if (!(await mod.isSupported())) return null;
        const analytics = mod.initializeAnalytics(app, {
          config: { send_page_view: false },
        });
        mod.setConsent({
          analytics_storage: 'granted',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        });
        mod.setAnalyticsCollectionEnabled(analytics, true);
        return analytics;
      })
      .catch(() => null);
  }
  return analyticsPromise;
}

function firebaseEventName(event: AnalyticsEvent): string {
  return `lupi_${event}`;
}

function firebaseParams(props: AnalyticsProps): Record<string, string | number | boolean | null> {
  const params: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    params[key.slice(0, 40)] = typeof value === 'string' ? value.slice(0, 100) : value;
  }
  return params;
}

export function trackFirebaseAnalytics(event: AnalyticsEvent, props: AnalyticsProps): void {
  if (!firebaseAnalyticsAllowed()) return;
  void getFirebaseAnalytics().then((analytics) => {
    if (!analytics) return;
    void import('firebase/analytics')
      .then((mod) => mod.logEvent(analytics, firebaseEventName(event), firebaseParams(props)))
      .catch(() => undefined);
  });
}
