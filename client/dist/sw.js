/* Blur Talk — Service Worker v1.0 */
const CACHE_NAME = 'blur-talk-v1';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/logo-192.png',
  '/logo-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
  '/favicon.ico',
];

/* ── Install: pre-cache shell ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

/* ── Activate: clean old caches ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: network-first for API/socket, cache-first for assets ── */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  /* Never intercept WebSocket upgrades or socket.io calls */
  if (
    url.pathname.startsWith('/socket.io') ||
    event.request.headers.get('upgrade') === 'websocket'
  ) {
    return;
  }

  /* For navigation requests, try network first, fall back to cache */
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/') || caches.match(event.request))
    );
    return;
  }

  /* For static assets: cache-first */
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
    )
  );
});
