/*
 * Floridanomics service worker.
 * Beats the GitHub Pages 10-minute cache ceiling client-side so repeat visits are fast,
 * without a CDN. Safe pattern:
 *  - cache-first ONLY for content-hashed /assets/* (immutable, so never stale)
 *  - network-first for HTML and JSON (fresh data + new deploys always win; cache is an
 *    offline fallback only)
 *  - cross-origin requests (analytics, etc.) are ignored
 * Because HTML is network-first, a future deploy can always update or disable this worker.
 */
const VERSION = "v1";
const CACHE = `fn-${VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Content-hashed bundles are immutable: cache-first.
  if (url.pathname.includes("/assets/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }),
    );
    return;
  }

  // HTML + JSON + everything else: network-first, cache as offline fallback.
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok && (url.pathname.endsWith(".json") || request.mode === "navigate")) {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
          return cached;
        }
        throw error;
      }
    })(),
  );
});
