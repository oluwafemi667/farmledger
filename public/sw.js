/* Farmledger service worker: lets the farmhand screens open without a signal.
 *  - Built files (/_next/static) are cached forever: their names change when the code does.
 *  - The few farmhand pages are network-first, with the last good copy as a fallback.
 *  - Everything else, including the owner area, money and every data call, is never cached.
 * Sign-out clears the cache so the next person on a shared phone never sees the last one's pages. */
const STATIC = "fl-static-v1";
const PAGES = "fl-pages-v1";
const PAGE_PATHS = [/^\/today$/, /^\/log(\/(eggs|feed|mortality|vaccinations))?$/, /^\/history$/];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("message", (e) => {
  if (e.data === "clear") e.waitUntil(Promise.all([caches.delete(PAGES), caches.delete(STATIC)]));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate" && PAGE_PATHS.some((re) => re.test(url.pathname))) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(async () => (await caches.match(req)) || new Response("You are offline and this page was not saved yet. Open it once with a signal.", { status: 503, headers: { "content-type": "text/plain" } })),
    );
  }
});
