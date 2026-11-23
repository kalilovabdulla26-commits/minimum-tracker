// Минимум трекер — service worker: приложение ачылат интернетсиз да
const CACHE = "minimum-v1";
const SHELL = ["/", "/index.html", "/config.js", "/manifest.webmanifest",
  "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/favicon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Firebase / башка API — кэшсиз
  if (/firestore\.googleapis\.com|googleapis\.com\/identitytoolkit/.test(url.host + url.pathname)) return;

  // Шрифттер жана firebase скрипттери — кэштен
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com" || url.host === "www.gstatic.com") {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
    return;
  }

  // Өз файлдарыбыз — адегенде тармак, жок болсо кэш
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match("/index.html"))));
  }
});
