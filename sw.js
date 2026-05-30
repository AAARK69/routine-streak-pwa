const CACHE_NAME = 'aether-cache-v13';
const ASSETS = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/audio.js',
  'js/storage.js',
  'js/scheduler.js',
  'js/ui.js',
  'manifest.json',
  'favicon.svg'
];

// Create a Set of absolute asset URLs at startup for O(1) matching latency
const ASSET_URLS = new Set(
  ASSETS.map(asset => new URL(asset, self.location.href).href)
);

// Install Event - Pre-cache core shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Cache-first falling back to network
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Cache dynamic assets if they are successful
        const requestUrl = e.request.url.split('?')[0];
        const isAppAsset = ASSET_URLS.has(requestUrl);
        const isFont = e.request.url.includes('fonts.googleapis.com') || e.request.url.includes('fonts.gstatic.com');

        const isSuccess = networkResponse.status === 200;
        const isOpaque = networkResponse.status === 0;

        if (
          (isSuccess && (isAppAsset || isFont)) ||
          (isOpaque && isFont)
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone).catch(err => {
              console.error('[Service Worker] Failed to write to cache', err);
            });
          }).catch(err => {
            console.error('[Service Worker] Failed to open cache', err);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Graceful offline fallback: if navigation fails, return app shell index.html
      if (e.request.mode === 'navigate') {
        return caches.match('./').then((response) => {
          return response || caches.match('index.html');
        });
      }
    })
  );
});
