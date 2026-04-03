// public/sw.js
self.addEventListener('push', function(event) {
  const options = {
    body: 'Unknown caller detected. Tap to start SafeVoice protection.',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'call-security',
    renotify: true,
    actions: [
      {
        action: 'secure-now',
        title: '🛡️ SECURE THIS CALL',
      },
      {
        action: 'ignore',
        title: 'Ignore',
      }
    ],
    data: {
      url: '/' // The URL to open
    }
  };

  event.waitUntil(
    self.registration.showNotification('SafeVoice Guardian Active', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'secure-now') {
    // This opens the app and forces it into the "Start Listening" state
    event.waitUntil(
      clients.openWindow('/?autoStart=true')
    );
  }
});