// Firebase Cloud Messaging Service Worker
// Import Firebase messaging for FCM support
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDRQ5v3s6JCjQ1gCgQ9R6eGfX1W5jjbOYo",
  authDomain: "social-app-6a82f.firebaseapp.com",
  projectId: "social-app-6a82f",
  storageBucket: "social-app-6a82f.firebasestorage.app",
  messagingSenderId: "1075325806896",
  appId: "1:1075325806896:web:7e3b76b6b6e6d4e1b7a8f1"
};

let messaging = null;

// Initialize Firebase
try {
  firebase.initializeApp(FIREBASE_CONFIG);
  messaging = firebase.messaging();
  console.log('Firebase messaging initialized in service worker');
  
  // Handle background FCM messages
  messaging.onBackgroundMessage((payload) => {
    console.log('Received background FCM message:', payload);
    
    // Extract notification data from FCM payload
    const title = payload.notification?.title || payload.data?.title || 'New Notification';
    const body = payload.notification?.body || payload.data?.body || 'You have a new notification';
    const icon = payload.notification?.icon || payload.data?.icon || '/icon-192x192.png';
    const badge = payload.notification?.badge || payload.data?.badge || '/badge-72x72.png';
    
    const notificationOptions = {
      body: body,
      icon: icon,
      badge: badge,
      data: payload.data || {},
      tag: 'fcm-notification',
      requireInteraction: true,
      silent: false,
      actions: [
        {
          action: 'view',
          title: 'View'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    console.log('Showing FCM notification:', title, notificationOptions);
    return self.registration.showNotification(title, notificationOptions);
  });
} catch (error) {
  console.error('Failed to initialize Firebase in service worker:', error);
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  if (action === 'dismiss') {
    console.log('Notification dismissed');
    return;
  }
  
  // Handle notification click
  if (action === 'view' || !action) {
    const urlToOpen = data.url || '/feed';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              console.log('Focusing existing window');
              return client.focus().then(() => {
                return client.postMessage({
                  type: 'NAVIGATE',
                  url: urlToOpen
                });
              });
            }
          }
          console.log('Opening new window');
          return clients.openWindow(urlToOpen);
        })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// Service worker install event
self.addEventListener('install', (event) => {
  console.log('Service worker installing');
  self.skipWaiting();
});

// Service worker activate event
self.addEventListener('activate', (event) => {
  console.log('Service worker activating');
  event.waitUntil(self.clients.claim());
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '2.0.0-fcm-only' });
  }
});

console.log('FCM-only Service Worker loaded successfully');
