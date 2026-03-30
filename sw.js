// Service Worker for Onyx Strength
const CACHE_NAME = `onyx-strength-${self.APP_VERSION || '1.0.0'}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/version.js'
];

// Active timers storage
let activeTimers = new Map();

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
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

// Message handling for timer and cache operations
self.addEventListener('message', (event) => {
  const { type, timerId, duration, endTime, data, key } = event.data;

  // Timer operations
  if (type === 'START_REST') {
    // Cancel existing timer with same ID
    if (activeTimers.has(timerId)) {
      clearTimeout(activeTimers.get(timerId).timeout);
      activeTimers.delete(timerId);
    }

    const now = Date.now();
    const targetEndTime = endTime || (now + duration * 1000);
    const remainingMs = targetEndTime - now;

    if (remainingMs > 0) {
      // Store timer info
      activeTimers.set(timerId, {
        endTime: targetEndTime,
        timeout: setTimeout(() => {
          // Send notification when timer completes
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
            ],
            data: {
              timerId: timerId
            }
          });
          activeTimers.delete(timerId);
        }, remainingMs)
      });

      // Confirm timer started
      event.source?.postMessage({
        type: 'TIMER_STARTED',
        timerId,
        endTime: targetEndTime
      });
    }
  }

  if (type === 'CANCEL_REST') {
    if (activeTimers.has(timerId)) {
      clearTimeout(activeTimers.get(timerId).timeout);
      activeTimers.delete(timerId);
    }
    event.source?.postMessage({
      type: 'TIMER_CANCELLED',
      timerId
    });
  }

  if (type === 'GET_TIMER_STATUS') {
    const timer = activeTimers.get(timerId);
    if (timer) {
      const remaining = Math.max(0, Math.ceil((timer.endTime - Date.now()) / 1000));
      event.source?.postMessage({
        type: 'TIMER_STATUS',
        timerId,
        remaining,
        active: remaining > 0
      });
    } else {
      event.source?.postMessage({
        type: 'TIMER_STATUS',
        timerId,
        remaining: 0,
        active: false
      });
    }
  }

  // Cache operations for current workout
  if (type === 'CACHE_WORKOUT') {
    const workoutKey = key || 'currentWorkout';
    const workoutData = JSON.stringify(data);
    caches.open(CACHE_NAME).then(cache => {
      const response = new Response(workoutData, {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(`/${workoutKey}`, response);
    });
  }

  if (type === 'GET_CACHED_WORKOUT') {
    const workoutKey = key || 'currentWorkout';
    caches.open(CACHE_NAME).then(cache => {
      cache.match(`/${workoutKey}`).then(response => {
        if (response) {
          response.json().then(data => {
            event.source?.postMessage({
              type: 'CACHED_WORKOUT_DATA',
              key: workoutKey,
              data
            });
          });
        } else {
          event.source?.postMessage({
            type: 'CACHED_WORKOUT_DATA',
            key: workoutKey,
            data: null
          });
        }
      });
    });
  }

  if (type === 'CLEAR_CACHED_WORKOUT') {
    const workoutKey = key || 'currentWorkout';
    caches.open(CACHE_NAME).then(cache => {
      cache.delete(`/${workoutKey}`);
    });
  }

  // Skip waiting for updates
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
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

// Periodic sync for timer (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'timer-sync') {
    // Check active timers and send notifications
    activeTimers.forEach((timer, timerId) => {
      const remaining = timer.endTime - Date.now();
      if (remaining <= 0) {
        self.registration.showNotification('Onyx Strength', {
          body: 'Rest time is up!',
          icon: '/icons/icon-192x192.png',
          tag: timerId
        });
        activeTimers.delete(timerId);
      }
    });
  }
});
