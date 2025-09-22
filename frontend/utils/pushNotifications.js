import { firebaseConfig } from '../config/firebase';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

class PushNotificationManager {
  constructor() {
    this.isSupported = false;
    this.isFirebaseInitialized = false;
    this.messaging = null;
    this.serviceWorker = null;
    this.deviceId = null;
    
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    
    if (typeof window !== 'undefined') {
      this.deviceId = this.generateDeviceId();
      this.checkSupport();
    }
  }

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

  generateDeviceId() {
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

  checkSupport() {
    try {
      this.isSupported = (
        'serviceWorker' in navigator &&
        'Notification' in window
      );
      
      if (!this.isSupported) {
        console.log('FCM is not supported in this browser');
        return false;
      }

      console.log('FCM support detected');
      return true;
    } catch (error) {
      console.error('Error checking FCM support:', error);
      this.isSupported = false;
      return false;
    }
  }

  detectEnvironment() {
    if (typeof navigator === 'undefined') {
      return { browser: 'unknown', platform: 'unknown' };
    }

    const userAgent = navigator.userAgent;
    let browser = 'other';
    let platform = 'web';

    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) browser = 'chrome';
    else if (userAgent.includes('Firefox')) browser = 'firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'safari';
    else if (userAgent.includes('Edge')) browser = 'edge';

    if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) platform = 'mac';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'ios';
    else if (userAgent.includes('Android')) platform = 'android';
    else if (userAgent.includes('Windows')) platform = 'windows';

    return { browser, platform };
  }

  async initializeFirebase() {
    if (this.isFirebaseInitialized) {
      return true;
    }

    try {
      console.log('Initializing Firebase for FCM...');
      
      const app = initializeApp(firebaseConfig);
      this.messaging = getMessaging(app);
      
      this.isFirebaseInitialized = true;
      console.log('Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      return false;
    }
  }

  async registerServiceWorker() {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      console.log('Ensuring service worker is ready...');
      
      // Remove timeout - let service worker register naturally on mobile
      await navigator.serviceWorker.ready;
      
      console.log('Service worker registration ready');
      return true;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      throw error;
    }
  }

  async getFCMToken() {
    try {
      if (!this.messaging) {
        console.error('Firebase messaging not initialized');
        return null;
      }

      console.log('Getting FCM token...');
      
      // FCM for web requires VAPID key for better security and reliability
      const token = await getToken(this.messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      
      if (token) {
        console.log('FCM enabled: true');
        console.log('FCM Token:', token);
        this.setToStorage('fcmToken', token);
        return token;
      } else {
        console.log('FCM enabled: false');
        console.log('No registration token available.');
        return null;
      }
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      throw error;
    }
  }

  async requestPermission() {
    try {
      console.log('Requesting notification permission...');
      
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported');
      }

      if (Notification.permission === 'granted') {
        console.log('Notification permission already granted');
        return 'granted';
      }

      if (Notification.permission === 'denied') {
        console.log('Notification permission denied');
        throw new Error('Notification permission was previously denied. Please enable notifications in your browser settings.');
      }

      // Just request permission - no timeout
      const permission = await Notification.requestPermission();
      console.log('Notification permission result:', permission);
      
      if (permission !== 'granted') {
        throw new Error(`Notification permission ${permission}. Please enable notifications to receive push notifications.`);
      }
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }

  async initializeSubscription() {
    try {
      console.log('Starting FCM subscription process...');

      if (!this.checkSupport()) {
        throw new Error('FCM not supported');
      }

      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      const firebaseReady = await this.initializeFirebase();
      if (!firebaseReady) {
        throw new Error('Firebase initialization failed');
      }

      // Skip manual service worker registration - let Firebase handle it
      console.log('Skipping manual service worker registration - Firebase will handle it');

      const fcmToken = await this.getFCMToken();
      if (!fcmToken) {
        throw new Error('Failed to get FCM token');
      }

      const { browser, platform } = this.detectEnvironment();

      const subscriptionData = {
        deviceId: this.deviceId,
        platform,
        browser,
        fcmToken: fcmToken,
        deviceInfo: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          language: navigator.language,
          timestamp: new Date().toISOString()
        }
      };

      console.log('FCM subscription data prepared:', {
        deviceId: subscriptionData.deviceId,
        platform: subscriptionData.platform,
        browser: subscriptionData.browser,
        hasToken: !!subscriptionData.fcmToken
      });

      return subscriptionData;
    } catch (error) {
      console.error('FCM subscription initialization failed:', error);
      throw error;
    }
  }

  async subscribe() {
    try {
      console.log('Subscribing to FCM push notifications...');

      const subscriptionData = await this.initializeSubscription();
      
      const response = await fetch(this.apiBaseUrl + '/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Subscription failed: ' + response.status);
      }

      const result = await response.json();
      console.log('FCM subscription successful:', result);

      this.setToStorage('pushSubscribed', 'true');
      this.setToStorage('subscriptionTimestamp', new Date().toISOString());

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('FCM subscription failed:', error);
      throw error;
    }
  }

  async unsubscribe() {
    try {
      console.log('Unsubscribing from FCM push notifications...');

      const response = await fetch(this.apiBaseUrl + '/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include authentication cookies
        body: JSON.stringify({
          deviceId: this.deviceId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Unsubscribe failed: ' + response.status);
      }

      const result = await response.json();
      console.log('FCM unsubscribe successful:', result);

      this.setToStorage('pushSubscribed', 'false');
      this.setToStorage('fcmToken', '');

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('FCM unsubscribe failed:', error);
      throw error;
    }
  }

  async isSubscribed() {
    try {
      const localStatus = this.getFromStorage('pushSubscribed');
      const fcmToken = this.getFromStorage('fcmToken');
      
      if (localStatus === 'true' && fcmToken) {
        return true;
      }

      const response = await fetch(this.apiBaseUrl + '/push/status?deviceId=' + this.deviceId, {
        credentials: 'include' // Include authentication cookies
      });

      if (response.ok) {
        const data = await response.json();
        const isSubscribed = data.subscribed || false;
        
        this.setToStorage('pushSubscribed', isSubscribed.toString());
        
        return isSubscribed;
      }

      return false;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  async getDevices() {
    try {
      const response = await fetch(this.apiBaseUrl + '/push/devices', {
        credentials: 'include' // Include authentication cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get devices: ' + response.status);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get devices:', error);
      throw error;
    }
  }

  async updateDeviceSettings(settings) {
    try {
      const response = await fetch(this.apiBaseUrl + '/push/devices/' + this.deviceId, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include authentication cookies
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update device: ' + response.status);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update device settings:', error);
      throw error;
    }
  }

  setupForegroundMessageListener() {
    if (!this.messaging) {
      console.error('Firebase messaging not initialized');
      return;
    }

    try {
      console.log('Setting up FCM foreground message listener...');
      
      onMessage(this.messaging, (payload) => {
        console.log('FCM message received in foreground:', payload);
        
        // Don't show notification in foreground - let service worker handle all notifications
        // This prevents double notifications
        
        // Optionally, you can dispatch a custom event or update UI state here
        // For example, refresh notifications list or show an in-app notification
        if (payload.data) {
          window.dispatchEvent(new CustomEvent('fcm-message', { 
            detail: payload 
          }));
        }
      });
      
      console.log('FCM foreground message listener set up successfully');
    } catch (error) {
      console.error('Error setting up FCM foreground message listener:', error);
    }
  }

  getDeviceInfo() {
    return {
      deviceId: this.deviceId,
      isSupported: this.isSupported,
      isFirebaseInitialized: this.isFirebaseInitialized,
      notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unknown',
      fcmToken: this.getFromStorage('fcmToken'),
      subscribed: this.getFromStorage('pushSubscribed'),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };
  }
}

const pushNotificationManager = new PushNotificationManager();
export default pushNotificationManager;