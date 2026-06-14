const CACHE_NAME = 'ecotrack-v2';
const CACHED_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/config.js',
  '/logger.js',
  '/bigquery-integration.js',
  '/tests.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHED_URLS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => 
        response || fetch(event.request)
      )
  );
});
