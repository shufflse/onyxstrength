const CACHE_NAME = 'onyx-strength-v4';

const urlsToCache = [
  'https://shufflse.github.io/onyxstrength/',
  'https://shufflse.github.io/onyxstrength/index.html',
  'https://shufflse.github.io/onyxstrength/manifest.json',
  'https://shufflse.github.io/onyxstrength/assets/index-pOTYJCfE.js'
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
