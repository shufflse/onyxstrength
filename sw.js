const CACHE_NAME = 'onyx-strength-v4';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './assets/index-DGb1oU8I.js'
  // Remove the Tailwind CDN URL
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});