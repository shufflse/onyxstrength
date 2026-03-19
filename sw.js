// sw.js
importScripts('./version.js'); // sets APP_VERSION globally

const CACHE_NAME = `onyx-strength-${APP_VERSION}`;

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './version.js', // cache the version file too
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    ).then(() => clients.claim())
  );
});

const timers = new Map();

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'START_REST') {
    const { timerId, duration } = event.data;
    const timeoutId = setTimeout(() => {
      self.registration.showNotification('Rest finished!', {
        body: 'Time for your next set.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'rest-timer',
        renotify: true,
        actions: [{ action: 'open', title: 'Open app' }]
      });
      timers.delete(timerId);
    }, duration * 1000);
    timers.set(timerId, timeoutId);
  } else if (event.data && event.data.type === 'CANCEL_REST') {
    const { timerId } = event.data;
    const timeoutId = timers.get(timerId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timers.delete(timerId);
    }
  } else if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        if (clientList.length > 0) return clientList[0].focus();
        return clients.openWindow('/');
      })
    );
  }
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});