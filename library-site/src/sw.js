// Lupine Library service worker.
// Strategy:
//  - Precache the app shell on install
//  - Network-first for /data/*.json (fresh content wins; cache is the offline
//    fallback) and for HTML; cache-first for versioned static assets
//  - Graceful offline: reader still works for articles the user has opened
//
// Rationale: this is a read-mostly research library. A returning visitor must
// never be pinned to a stale or empty manifest — that was the "no content
// ever since" failure mode. Content freshness beats offline-first for /data/;
// the cache still answers when the network is unavailable.

const VERSION = '__VERSION__';
// Bump KILL to force every client to drop ALL caches on next activate,
// regardless of VERSION skew. A escape hatch if a bad build ever ships again.
// k2: purge caches poisoned by stale cache-first /reports/ assets — a fresh
// report HTML was served against an old cached report.css, blanking the page.
const KILL = 'k2';
const SHELL_CACHE = `ll-shell-${KILL}-${VERSION}`;
const DATA_CACHE = `ll-data-${KILL}-${VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/i18n.js',
  '/styles.css',
  '/icon.svg',
  '/manifest.webmanifest',
  '/data/library.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Cache assets one-by-one. cache.addAll() aborts the whole install if
      // any single asset fails — that would leave users stuck on a previous
      // service worker, which is the failure mode we are trying to avoid.
      await Promise.all(SHELL_ASSETS.map(async (url) => {
        try { await cache.add(new Request(url, { cache: 'reload' })); }
        catch (e) { console.warn('[sw] precache miss:', url, e?.message || e); }
      }));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('message', (event) => {
  // Lets the page request an immediate take-over after a fresh deploy.
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== SHELL_CACHE && n !== DATA_CACHE)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // /data/*.json — network-first so content is always fresh when online;
  // the cache answers only when the network is unavailable (offline reading).
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(networkFirst(DATA_CACHE, req));
    return;
  }

  // HTML navigations — network-first; fall back to cached shell for offline
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(SHELL_CACHE, req, '/index.html'));
    return;
  }

  // /reports/* assets (report.css, the report JS/data, figures) — network-first.
  // These versionless URLs change content on every deploy; cache-first served a
  // stale report.css against fresh report HTML and blanked the page. Freshness
  // wins when online; the cache is still the offline fallback.
  if (url.pathname.startsWith('/reports/')) {
    event.respondWith(networkFirst(SHELL_CACHE, req));
    return;
  }

  // Static (versioned shell) assets — cache-first
  event.respondWith(cacheFirst(SHELL_CACHE, req));
});

async function cacheFirst(cacheName, req) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    if (cached) return cached;
    return new Response('offline', { status: 503, statusText: 'offline' });
  }
}

async function networkFirst(cacheName, req, fallback) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (fallback) {
      const fb = await cache.match(fallback);
      if (fb) return fb;
    }
    return new Response('offline', { status: 503, statusText: 'offline' });
  }
}
