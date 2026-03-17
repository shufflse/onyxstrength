const CACHE_NAME = 'onyx-strength-v1';

// All the files and CDNs your app needs to run offline
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com/3.4.17',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
];

// Install the service worker and cache assets
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Timer management
const timers = new Map();

// Listen for messages from the client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'START_REST') {
    const { timerId, duration } = event.data;
    // Set a timeout to show notification
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
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    // Open or focus the app
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