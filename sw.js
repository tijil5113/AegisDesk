// Service Worker for AegisDesk PWA
// Bump CACHE_VERSION on each production release so old shells are dropped.
const CACHE_VERSION = 'aegisdesk-v19';
const PRECACHE_URLS = [
  '/index.html',
  '/desktop.html',
  '/login.html',
  '/signup.html',
  '/404.html',
  '/product.html',
  '/features.html',
  '/apps.html',
  '/intelligence.html',
  '/security.html',
  '/about.html',
  '/docs.html',
  '/styles/aegis-design-system.css',
  '/styles/aegis-os-shell.css',
  '/styles/aegis-apps.css',
  '/styles/aegis-intelligence.css',
  '/styles/aegis-site.css',
  '/styles/aegis-auth.css',
  '/styles/aegis-world-clock.css',
  '/styles/aegis-experience.css',
  '/styles/main.css',
  '/styles/window.css',
  '/js/main.js',
  '/js/auth/aegis-auth-ui.js',
  '/js/core/aegis-shell.js',
  '/js/core/aegis-app-icons.js',
  '/js/core/aegis-app-kit.js',
  '/js/core/aegis-docs.js',
  '/js/core/aegis-actions.js',
  '/js/core/aegis-intelligence.js',
  '/js/core/aegis-os.js',
  '/js/core/aegis-experience.js',
  '/js/core/world-clock-engine.js',
  '/js/apps/world-clock.js',
  '/js/site/aegis-site.js',
  '/assets/brand/favicon.svg',
  '/assets/brand/aegis-mark.svg',
  '/assets/brand/aegis-mark-app.svg',
  '/assets/brand/aegis-mark-light.svg',
  '/assets/brand/aegis-mark-mono.svg',
  '/assets/brand/aegis-wordmark.svg',
  '/assets/brand/aegis-lockup.svg'
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
  if (/\/api\/(chat|intent|mail|login|news|gnews|music|auth|code-studio)/.test(url)) return true;
  try {
    const parsed = new URL(url);
    if (parsed.pathname === '/health') return true;
  } catch (_) { /* ignore */ }
  return false;
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
          return caches.match('/index.html');
        }
      });
    })
  );
});
