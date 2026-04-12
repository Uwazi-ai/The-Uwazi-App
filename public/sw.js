const CACHE_NAME = 'uwazi-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Network first for API calls and auth
  if (url.pathname.startsWith('/api') || 
      url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(event.request).catch(() => 
        caches.match(event.request)
      )
    );
    return;
  }
  
  // Cache first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }).catch(() => caches.match('/'))
  );
});

self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'UWAZI', {
      body: data.body || 'New civic update',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
    })
  );
});

self.addEventListener('periodicsync', event => {
  console.log('Periodic sync fired:', event.tag);
  if (event.tag === 'sync-civic-data') {
    event.waitUntil(syncCivicData());
  }
  if (event.tag === 'sync-legislation') {
    event.waitUntil(syncLegislation());
  }
  if (event.tag === 'sync-elections') {
    event.waitUntil(syncElections());
  }
});

async function syncCivicData() {
  try {
    const cache = await caches.open('uwazi-v1');
    const response = await fetch('/api/civic-feed');
    if (response.ok) {
      await cache.put('/api/civic-feed', response);
      console.log('Civic feed synced in background');
    }
  } catch (err) {
    console.log('Civic data sync failed:', err);
  }
}

async function syncLegislation() {
  try {
    const cache = await caches.open('uwazi-v1');
    const response = await fetch('/api/legislation');
    if (response.ok) {
      await cache.put('/api/legislation', response);
      console.log('Legislation synced in background');
    }
  } catch (err) {
    console.log('Legislation sync failed:', err);
  }
}

async function syncElections() {
  try {
    const cache = await caches.open('uwazi-v1');
    const response = await fetch('/api/elections');
    if (response.ok) {
      await cache.put('/api/elections', response);
      const clients = await self.clients.matchAll();
      if (clients.length === 0) {
        await self.registration.showNotification(
          'UWAZI Election Update', {
          body: 'New election information is available',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'election-update',
          renotify: false,
          data: { url: '/vote' }
        });
      }
      console.log('Elections synced in background');
    }
  } catch (err) {
    console.log('Elections sync failed:', err);
  }
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
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
