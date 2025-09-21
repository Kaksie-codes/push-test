// General Service Worker (not for FCM)
// FCM is handled by firebase-messaging-sw.js

// Service worker install event
self.addEventListener('install', (event) => {
  console.log('General service worker installing');
  self.skipWaiting();
});

// Service worker activate event
self.addEventListener('activate', (event) => {
  console.log('General service worker activating');
  event.waitUntil(self.clients.claim());
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('General service worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '2.0.0-general-sw' });
  }
});

console.log('General Service Worker loaded successfully (FCM handled by firebase-messaging-sw.js)');
