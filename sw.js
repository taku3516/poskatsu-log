const CACHE_NAME = "poskatsu-log-v7";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/store.js",
  "./js/data.js",
  "./js/firebase-adapter.js",
  "./js/security.js",
  "./data/demographics.js",
  "./data/firebase-config.js",
  "./manifest.webmanifest",
  "./assets/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.hostname.includes("tile.openstreetmap.org")) return;
  const isAppAsset = url.origin === self.location.origin;
  const isBoundary = url.hostname === "geoshape.ex.nii.ac.jp";
  if (!isAppAsset && !isBoundary) return;
  event.respondWith(caches.match(event.request).then((cached) => {
    const network = fetch(event.request).then((response) => {
      if (response.ok || response.type === "opaque") caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
      return response;
    });
    return cached || network.catch(() => isAppAsset ? caches.match("./index.html") : Response.error());
  }));
});
