// Lupine Library service worker.
// Strategy:
//  - Precache the app shell on install
//  - Cache-first for /data/*.json and static assets; network-first for HTML
//  - Graceful offline: reader still works for articles the user has opened

const VERSION = '__VERSION__';
const SHELL_CACHE = `ll-shell-${VERSION}`;
const DATA_CACHE = `ll-data-${VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/i18n.js',
  '/styles.css',
  '/icon.svg',
  '/manifest.webmanifest',
  '/vendor/force-graph.min.js',
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

  // /data/*.json — cache-first, fall back to network, populate on success
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(cacheFirst(DATA_CACHE, req));
    return;
  }

  // HTML navigations — network-first; fall back to cached shell for offline
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(SHELL_CACHE, req, '/index.html'));
    return;
  }

  // Static assets — cache-first
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
