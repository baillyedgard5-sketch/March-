const CACHE_NAME = 'marche-v1'; // change le numéro à chaque mise à jour
const ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.json', './images/icon-192.png', './images/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
