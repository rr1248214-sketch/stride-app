/* Stride — offline cache.
   Caches only the app shell. Step data lives in localStorage and is never
   cached, read or transmitted by this worker.

   Strategy:
     - navigations : network-first, so a new deploy is picked up immediately,
                     falling back to the cached shell when offline.
     - static files: stale-while-revalidate, so the page opens instantly from
                     cache AND the next load gets the updated file.
   Cache-first-everything would pin old code forever — the classic service
   worker bug where returning users never receive an update. */

const CACHE = 'stride-v2';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((c) => c.addAll(ASSETS))
            .then(() => self.skipWaiting())
            .catch(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    // Network-first for navigation so updates land, cache fallback offline.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put('./index.html', copy));
                    return res;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Cache-first for static assets would pin old code forever; use
    // stale-while-revalidate instead: serve the cache, refresh it in the
    // background so the NEXT load gets the update.
    event.respondWith(
        caches.match(req).then((cached) => {
            const network = fetch(req)
                .then((res) => {
                    if (res && res.status === 200 && res.type === 'basic') {
                        const copy = res.clone();
                        caches.open(CACHE).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
