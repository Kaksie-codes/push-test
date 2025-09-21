// Firebase Cloud Messaging Service Worker
// Import Firebase messaging for FCM support
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCve9w8m0FCGZhLhXnPHNyBUuLOoPfQHcw",
  authDomain: "push-notifications-test-1317a.firebaseapp.com",
  projectId: "push-notifications-test-1317a",
  storageBucket: "push-notifications-test-1317a.firebasestorage.app",
  messagingSenderId: "225573471934",
  appId: "1:225573471934:web:30796e972a6c97b37000ef"
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
      tag: `fcm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique tag per notification
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
    
    console.log('Notification data:', data);
    console.log('URL to open:', urlToOpen);
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          console.log('Found clients:', clientList.length);
          for (const client of clientList) {
            console.log('Client URL:', client.url);
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              console.log('Focusing existing window and sending navigation message');
              return client.focus().then(() => {
                return client.postMessage({
                  type: 'NAVIGATE',
                  url: urlToOpen
                });
              });
            }
          }
          console.log('Opening new window with URL:', urlToOpen);
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
  console.log('Firebase messaging service worker installing');
  self.skipWaiting();
});

// Service worker activate event
self.addEventListener('activate', (event) => {
  console.log('Firebase messaging service worker activating');
  event.waitUntil(self.clients.claim());
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Firebase messaging service worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '2.0.0-fcm-firebase-sw' });
  }
});

console.log('Firebase Cloud Messaging Service Worker loaded successfully');