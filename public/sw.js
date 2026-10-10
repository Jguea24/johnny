const CACHE_NAME = "johnny-pwa-static-v1";
const STATIC_ASSET_LIMIT = 80;
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("johnny-pwa-") && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("authorization")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const offlinePage = await cache.match("/offline.html");
        if (!offlinePage) throw new Error("Offline fallback is unavailable.");
        return new Response(offlinePage.body, {
          status: 503,
          statusText: "Offline",
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }),
    );
    return;
  }

  if (!url.pathname.startsWith("/_next/static/")) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      const cacheControl = response.headers.get("Cache-Control") ?? "";
      if (
        response.ok &&
        response.type === "basic" &&
        !/\b(?:private|no-store)\b/i.test(cacheControl)
      ) {
        await cache.put(request, response.clone());
        const staticAssets = (await cache.keys()).filter((entry) =>
          new URL(entry.url).pathname.startsWith("/_next/static/"),
        );
        const expiredAssets = staticAssets.slice(
          0,
          Math.max(0, staticAssets.length - STATIC_ASSET_LIMIT),
        );
        await Promise.all(expiredAssets.map((entry) => cache.delete(entry)));
      }
      return response;
    }),
  );
});
