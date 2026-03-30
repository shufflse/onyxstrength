const CACHE_NAME = `onyx-strength-${APP_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/version.js'
];

let restTimers = {};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'START_REST') {
    const { timerId, duration } = event.data;
    
    if (restTimers[timerId]) {
      clearTimeout(restTimers[timerId]);
    }
    
    restTimers[timerId] = setTimeout(() => {
      self.registration.showNotification('Onyx Strength', {
        body: 'Rest time is up! Ready for your next set?',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: timerId,
        requireInteraction: true,
        actions: [
          {
            action: 'open',
            title: 'Open App'
          }
        ]
      });
      delete restTimers[timerId];
    }, duration * 1000);
  }
  
  if (event.data.type === 'CANCEL_REST') {
    const { timerId } = event.data;
    if (restTimers[timerId]) {
      clearTimeout(restTimers[timerId]);
      delete restTimers[timerId];
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }
          return client.focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});
