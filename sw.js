const VERSION = 'dont-jump-v5-20260820';
const SHELL = [
  './',
  './index.html',
  './404.html',
  './support.html',
  './privacy.html',
  './manifest.webmanifest',
  './assets/css/site.css?v=4',
  './assets/css/game-shell.css',
  './assets/js/site.js',
  './assets/js/game-shell.js',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './game/',
  './game/index.html',
  './game/app-config.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(VERSION).then((cache) => cache.put(request, copy));
        return response;
      }).catch(async () => (await caches.match(request)) || (await caches.match('./index.html')))
    );
    return;
  }

  if (new URL(request.url).origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) caches.open(VERSION).then((cache) => cache.put(request, response.clone()));
        return response;
      }))
    );
  }
});
