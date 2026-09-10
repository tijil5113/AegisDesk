// Service Worker for AegisDesk PWA
// Bump CACHE_VERSION on each production release so old shells are dropped.
const CACHE_VERSION = 'aegisdesk-v3';
const PRECACHE_URLS = [
  '/desktop.html',
  '/welcome.html',
  '/login.html',
  '/styles/main.css',
  '/styles/window.css',
  '/js/main.js'
];

function isApiRequest(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith('/api/');
  } catch (_) {
    return false;
  }
}

function isSensitiveRequest(request) {
  const url = request.url;
  if (isApiRequest(url)) return true;
  if (request.method && request.method !== 'GET') return true;
  if (request.headers && request.headers.get('Authorization')) return true;
  return /\/api\/(chat|mail|login|news|gnews|music)/.test(url);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((error) => {
        console.error('Cache install failed:', error);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  if (isSensitiveRequest(event.request)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200 && response.type === 'basic' && event.request.method === 'GET') {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => {
      return caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.destination === 'document') {
          return caches.match('/desktop.html');
        }
      });
    })
  );
});
