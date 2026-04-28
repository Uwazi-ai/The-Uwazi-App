// ───────────────────────────────────────────────
// UWAZI Service Worker
// ⚠️ CACHE_VERSION is auto-replaced by vite.config.ts (injectSWVersion plugin)
// on every production build. Do NOT edit the value manually.
// ───────────────────────────────────────────────
const CACHE_VERSION = 'uwazi-dev';
const CACHE_NAME = `${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ───────────── INSTALL ─────────────
self.addEventListener('install', (event) => {
  // Take over immediately on next cycle
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// ───────────── ACTIVATE ─────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete every old cache version
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      // Take control of all open tabs immediately
      await self.clients.claim();
      // Notify all open clients that a new SW is now active
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) =>
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION })
      );
    })()
  );
});

// ───────────── MESSAGE (skipWaiting trigger from page) ─────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ───────────── FETCH ─────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Network-first for HTML navigations → always freshest app shell
  if (
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('/')))
    );
    return;
  }

  // Network-first for API / Supabase (never stale data)
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first with background refresh for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ───────────── PUSH NOTIFICATIONS ─────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'UWAZI', {
      body: data.body || 'New civic update',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
    })
  );
});

// ───────────── PERIODIC SYNC ─────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-civic-data') event.waitUntil(syncCivicData());
  if (event.tag === 'sync-legislation') event.waitUntil(syncLegislation());
  if (event.tag === 'sync-elections') event.waitUntil(syncElections());
});

async function syncCivicData() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch('/api/civic-feed');
    if (response.ok) await cache.put('/api/civic-feed', response);
  } catch (err) {
    console.log('Civic data sync failed:', err);
  }
}

async function syncLegislation() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch('/api/legislation');
    if (response.ok) await cache.put('/api/legislation', response);
  } catch (err) {
    console.log('Legislation sync failed:', err);
  }
}

async function syncElections() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch('/api/elections');
    if (response.ok) {
      await cache.put('/api/elections', response);
      const clients = await self.clients.matchAll();
      if (clients.length === 0) {
        await self.registration.showNotification('UWAZI Election Update', {
          body: 'New election information is available',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'election-update',
          renotify: false,
          data: { url: '/app/vote' },
        });
      }
    }
  } catch (err) {
    console.log('Elections sync failed:', err);
  }
}

// ───────────── NOTIFICATION CLICK ─────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
