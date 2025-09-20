import { firebaseConfig, vapidKey } from '../config/firebase';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

class PushNotificationManager {
  constructor() {
    this.isSupported = false;
    this.isFirebaseInitialized = false;
    this.messaging = null;
    this.serviceWorker = null;
    this.deviceId = null;
    
    // Only initialize if we're in the browser
    if (typeof window !== 'undefined') {
      this.deviceId = this.generateDeviceId();
      this.checkSupport();
    }
  }

  // Safe localStorage access
  getFromStorage(key) {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }

  setToStorage(key, value) {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  // Generate a unique device ID
  generateDeviceId() {
    // Check if we're in the browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }
    
    let deviceId = this.getFromStorage('deviceId');
    if (!deviceId) {
      deviceId = 'web_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      this.setToStorage('deviceId', deviceId);
    }
    return deviceId;
  }

  // Check if push notifications are supported
  checkSupport() {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      this.isSupported = false;
      return false;
    }
    
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    return this.isSupported;
  }

  // Detect browser and platform
  detectEnvironment() {
    // Check if we're in the browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return { browser: 'unknown', platform: 'unknown' };
    }
    
    const userAgent = navigator.userAgent;
    
    let browser = 'other';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) browser = 'chrome';
    else if (userAgent.includes('Firefox')) browser = 'firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'safari';
    else if (userAgent.includes('Edge')) browser = 'edge';

    let platform = 'web';
    if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) platform = 'mac';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'ios';
    else if (userAgent.includes('Android')) platform = 'android';
    else if (userAgent.includes('Windows')) platform = 'windows';

    return { browser, platform };
  }

  // Register service worker
  async registerServiceWorker() {
    if (typeof window === 'undefined') {
      throw new Error('Service workers only available in browser');
    }
    
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered successfully');
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      this.serviceWorker = registration;
      
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      throw error;
    }
  }

  // Initialize Firebase for FCM
  async initializeFirebase() {
    try {
      const app = initializeApp(firebaseConfig);
      this.messaging = getMessaging(app);
      this.isFirebaseInitialized = true;
      
      // Send Firebase config to service worker
      if (this.serviceWorker) {
        const channel = new MessageChannel();
        this.serviceWorker.active?.postMessage({
          type: 'FIREBASE_CONFIG',
          config: firebaseConfig
        }, [channel.port2]);
      }
      
      console.log('Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      this.isFirebaseInitialized = false;
      return false;
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    return permission;
  }

  // Get native Web Push subscription
  async getWebPushSubscription() {
    if (!this.serviceWorker) {
      await this.registerServiceWorker();
    }

    try {
      const subscription = await this.serviceWorker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      });

      return subscription.toJSON();
    } catch (error) {
      console.error('Failed to get Web Push subscription:', error);
      return null;
    }
  }

  // Get FCM token
  async getFCMToken() {
    if (!this.isFirebaseInitialized) {
      const initialized = await this.initializeFirebase();
      if (!initialized) {
        return null;
      }
    }

    try {
      const token = await getToken(this.messaging, { 
        vapidKey: vapidKey,
        serviceWorkerRegistration: this.serviceWorker 
      });
      
      console.log('FCM token obtained successfully');
      return token;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  // Determine the best push method for current environment
  getBestPushMethod() {
    const { browser, platform } = this.detectEnvironment();
    
    // iOS Safari works better with FCM
    if (platform === 'ios' && browser === 'safari') {
      return 'fcm';
    }
    
    // Desktop browsers work well with native Web Push
    if (platform === 'web' || platform === 'mac' || platform === 'windows') {
      return 'web-push';
    }
    
    // Default to auto-selection
    return 'auto';
  }

  // Subscribe to push notifications (hybrid approach)
  async subscribe(options = {}) {
    const { method = 'auto', forceUpdate = false } = options;
    
    try {
      // Request permission first
      await this.requestPermission();
      
      // Register service worker
      await this.registerServiceWorker();
      
      // Detect device information
      const deviceInfo = this.detectEnvironment();
      
      // Prepare subscription data
      const subscriptionData = {
        deviceId: this.deviceId,
        pushMethod: method === 'auto' ? this.getBestPushMethod() : method,
        deviceInfo: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          type: deviceInfo.platform,
          browser: deviceInfo.browser,
          platform: deviceInfo.platform,
          pushMethod: method === 'auto' ? this.getBestPushMethod() : method
        }
      };

      // Get Web Push subscription
      const webPushSubscription = await this.getWebPushSubscription();
      if (webPushSubscription) {
        subscriptionData.webPushSubscription = webPushSubscription;
      }

      // Get FCM token
      const fcmToken = await this.getFCMToken();
      if (fcmToken) {
        subscriptionData.fcmToken = fcmToken;
      }

      // Check if we have at least one subscription method
      if (!webPushSubscription && !fcmToken) {
        throw new Error('Failed to obtain any push subscription');
      }

      // Send to backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getFromStorage('token')}`
        },
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Subscription failed');
      }

      const result = await response.json();
      console.log('Push subscription successful:', result);

      // Set up foreground message listener for FCM
      if (this.isFirebaseInitialized) {
        onMessage(this.messaging, (payload) => {
          console.log('Foreground message received:', payload);
          
          // Show notification if app is in foreground
          if (document.visibilityState === 'visible') {
            new Notification(payload.notification?.title || 'New Notification', {
              body: payload.notification?.body || '',
              icon: payload.notification?.icon || '/icon-192x192.png',
              data: payload.data || {}
            });
          }
        });
      }

      return result;
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getFromStorage('token')}`
        },
        body: JSON.stringify({
          deviceId: this.deviceId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Unsubscribe failed');
      }

      // Unsubscribe from Web Push
      if (this.serviceWorker) {
        const subscription = await this.serviceWorker.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      console.log('Push unsubscribe successful');
      return true;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      throw error;
    }
  }

  // Check if user is subscribed
  async isSubscribed() {
    try {
      const response = await fetch('/api/push/devices', {
        headers: {
          'Authorization': `Bearer ${this.getFromStorage('token')}`
        }
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.devices.some(device => device.deviceId === this.deviceId && device.enabled);
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  // Get user's registered devices
  async getDevices() {
    try {
      const response = await fetch('/api/push/devices', {
        headers: {
          'Authorization': `Bearer ${this.getFromStorage('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get devices:', error);
      throw error;
    }
  }

  // Update device settings
  async updateDeviceSettings(settings) {
    try {
      const response = await fetch(`/api/push/devices/${this.deviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getFromStorage('token')}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Update failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update device settings:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new PushNotificationManager();