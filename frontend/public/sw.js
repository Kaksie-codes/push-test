// Import Firebase messaging for FCM support
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase configuration (will be dynamically set)
let isFirebaseInitialized = false;

// Initialize Firebase if config is available
try {
  // This will be set by the main application
  if (typeof FIREBASE_CONFIG !== 'undefined') {
    firebase.initializeApp(FIREBASE_CONFIG);
    const messaging = firebase.messaging();
    isFirebaseInitialized = true;
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
        tag: 'post-notification',
        requireInteraction: true, // Keep notification visible until user interacts
        actions: [
          {
            action: 'view',
            title: 'View Post'
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
  }
} catch (error) {
  console.log('Firebase not available in service worker, using Web Push only');
}

// Handle native Web Push messages
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  // Skip if this is an FCM message (handled by Firebase)
  if (isFirebaseInitialized && event.data) {
    try {
      const data = event.data.json();
      if (data.from || data.fcmMessageId) {
        // This is an FCM message, let Firebase handle it
        return;
      }
    } catch (e) {
      // Not JSON, continue with Web Push handling
    }
  }

  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      notificationData = {
        title: 'New Notification',
        body: event.data.text() || 'You have a new notification'
      };
    }
  } else {
    notificationData = {
      title: 'New Notification',
      body: 'You have a new notification'
    };
  }

  const notificationTitle = notificationData.title || 'New Notification';
  const notificationOptions = {
    body: notificationData.body || '',
    icon: notificationData.icon || '/icon-192x192.png',
    badge: notificationData.badge || '/badge-72x72.png',
    data: notificationData.data || {},
    actions: notificationData.actions || [],
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false,
    tag: notificationData.tag || 'default',
    renotify: notificationData.renotify || false
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  // Handle action clicks
  if (event.action) {
    console.log('Action clicked:', event.action);
    
    // Handle different actions
    switch (event.action) {
      case 'view':
      case 'open':
        // Open the app
        event.waitUntil(
          clients.openWindow(event.notification.data?.url || '/')
        );
        break;
      case 'dismiss':
        // Just close the notification (already done above)
        break;
      default:
        // Handle custom actions
        event.waitUntil(
          clients.openWindow(event.notification.data?.url || '/')
        );
    }
  } else {
    // Default click action - open the app
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window if app is not open
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Optional: Send analytics or tracking data
  if (event.notification.data?.trackingId) {
    // Send close event to analytics
    fetch('/api/analytics/notification-close', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trackingId: event.notification.data.trackingId,
        action: 'close'
      })
    }).catch(console.error);
  }
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('Service worker installing');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('Service worker activating');
  
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'FIREBASE_CONFIG':
        // Dynamically initialize Firebase if not already done
        if (!isFirebaseInitialized && event.data.config) {
          try {
            firebase.initializeApp(event.data.config);
            const messaging = firebase.messaging();
            isFirebaseInitialized = true;
            console.log('Firebase dynamically initialized in service worker');
            
            // Set up background message handler with proper formatting
            messaging.onBackgroundMessage((payload) => {
              console.log('Received background FCM message (dynamic):', payload);
              
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
                tag: 'post-notification',
                requireInteraction: true, // Keep notification visible until user interacts
                actions: [
                  {
                    action: 'view',
                    title: 'View Post'
                  },
                  {
                    action: 'dismiss',
                    title: 'Dismiss'
                  }
                ]
              };

              console.log('Showing FCM notification (dynamic):', title, notificationOptions);
              return self.registration.showNotification(title, notificationOptions);
            });
            
            // Send success response
            event.ports[0]?.postMessage({ success: true });
          } catch (error) {
            console.error('Failed to initialize Firebase in service worker:', error);
            event.ports[0]?.postMessage({ success: false, error: error.message });
          }
        }
        break;
        
      case 'GET_SUBSCRIPTION':
        // Get current push subscription
        event.waitUntil(
          self.registration.pushManager.getSubscription()
            .then(subscription => {
              event.ports[0]?.postMessage({ 
                type: 'SUBSCRIPTION_RESPONSE',
                subscription: subscription ? subscription.toJSON() : null
              });
            })
        );
        break;
        
      default:
        console.log('Unknown message type:', event.data.type);
    }
  }
});