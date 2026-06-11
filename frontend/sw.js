const CACHE_NAME = "marycocina-v1";

self.addEventListener("install", event => {
    console.log("Service Worker instalado");

    event.waitUntil(
        caches.open(CACHE_NAME)
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        fetch(event.request).catch(() =>
            caches.match(event.request)
        )
    );
});