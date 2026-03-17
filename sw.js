const CACHE_VERSION = '26.03.17';
const CACHE_NAME = `onyx-strength-${CACHE_VERSION}`;

// All the files and CDNs your app needs to run offline
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
];

// Install the service worker and cache assets
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate and claim clients, also clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

// Timer management
const timers = new Map();

// Listen for messages from the client
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

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});

// Intercept network requests and return cached versions if offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if found, otherwise fetch from network
        return response || fetch(event.request);
      })
  );
});