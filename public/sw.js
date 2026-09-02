/* TipJar PWA service worker — v1 network-first for navigation, cache-first for /icons */
const CACHE = 'tipjar-v1';
const ICONS = ['/icon-192.png', '/icon-512.png', '/favicon.ico'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ICONS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only handle same-origin GET
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // For icons/manifest: cache-first
  if (ICONS.some(p => url.pathname === p) || url.pathname === '/manifest.json') {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)); return res; })));
    return;
  }
  // For API: network-only (no cache)
  if (url.pathname.startsWith('/api/')) return;
  // For navigation/documents: network-first (fallback to cache only if offline)
  if (e.request.mode === 'navigate' || e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Other same-origin: network-first
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
