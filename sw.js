// @ts-check

/**
 * @changelog
 * v2.1.0 - Added comprehensive JSDoc documentation
 * v2.0.0 - Updated cache name for dark mode redesign
 * v1.0.0 - Initial release with cache-first strategy
 */

/**
 * @fileoverview EcoTrack Service Worker
 * @description Provides offline-first caching using a cache-first
 * strategy with network fallback for all application assets.
 * @version 2.1.0
 */

/**
 * @constant {string} CACHE_NAME
 * @description Versioned cache identifier for cache busting on updates
 * @since v2.0.0
 */
const CACHE_NAME = 'ecotrack-v2';

/**
 * @constant {Array<string>} CACHED_URLS
 * @description List of all critical application URLs to pre-cache
 * during the service worker install phase for offline support
 * @since v1.0.0
 */
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

/**
 * @description Handles the Service Worker install event.
 * Pre-caches all critical application assets defined in CACHED_URLS
 * to enable full offline functionality.
 * @param {ExtendableEvent} event - The install lifecycle event
 * @returns {void}
 * @complexity Time: O(n) where n = CACHED_URLS.length | Space: O(n)
 * @example
 * // Automatically triggered by browser on SW registration
 * navigator.serviceWorker.register('/sw.js');
 * @since v1.0.0
 */
(/** @type {any} */ (self)).addEventListener('install', /** @param {ExtendableEvent} event */ event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHED_URLS))
  );
});

/**
 * @description Handles fetch events using a cache-first strategy.
 * Returns cached responses when available, falling back to live
 * network requests for uncached or dynamic resources.
 * @param {FetchEvent} event - The fetch lifecycle event
 * @returns {void}
 * @complexity Time: O(1) | Space: O(1)
 * @example
 * // Automatically intercepts all fetch requests from the app
 * fetch('/app.js'); // Served from cache if available
 * @since v1.0.0
 */
(/** @type {any} */ (self)).addEventListener('fetch', /** @param {FetchEvent} event */ event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => 
        response || fetch(event.request)
      )
  );
});
