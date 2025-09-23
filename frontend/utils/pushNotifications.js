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
      // Check and display FCM token on app load if already enabled
      this.checkAndDisplayFCMToken();
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
      const { browser, platform } = this.detectEnvironment();
      
      // Basic FCM support requirements
      const hasBasicSupport = (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      );

      // iOS/Safari specific checks
      let iOSSupported = true;
      let safariVersion = null;
      
      if (platform === 'ios' || browser === 'safari') {
        // Check for HTTPS requirement
        const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
        if (!isHTTPS) {
          console.warn('⚠️ iOS/Safari requires HTTPS for push notifications');
          iOSSupported = false;
        }
        
        // Check Safari version for FCM compatibility
        const userAgent = navigator.userAgent;
        const safariMatch = userAgent.match(/Version\/(\d+)\.(\d+)/);
        if (safariMatch) {
          const majorVersion = parseInt(safariMatch[1]);
          safariVersion = `${majorVersion}.${safariMatch[2]}`;
          
          // Safari 16.4+ (iOS 16.4+, macOS 13.3+) has better FCM support
          if (majorVersion < 16 || (majorVersion === 16 && parseInt(safariMatch[2]) < 4)) {
            console.warn(`⚠️ Safari ${safariVersion} has limited FCM support. Upgrade to Safari 16.4+ for best experience`);
            // Don't block, but warn
          }
        }
      }

      this.isSupported = hasBasicSupport && iOSSupported;
      
      console.log('FCM support check:', {
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        notification: 'Notification' in window,
        platform,
        browser,
        safariVersion,
        isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost',
        iOSSupported,
        overall: this.isSupported
      });
      
      return true;
    } catch (error) {
      console.error('Error checking FCM support:', error);
      this.isSupported = false;
      return false;
    }
  }

  checkAndDisplayFCMToken() {
    try {
      const storedToken = this.getFromStorage('fcmToken');
      const isSubscribed = this.getFromStorage('pushSubscribed') === 'true';
      const notificationPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
      
      if (storedToken && isSubscribed && notificationPermission === 'granted') {
        console.log('FCM enabled: true');
        console.log('FCM Token:', storedToken);
      } else {
        console.log('FCM enabled: false (notifications not enabled)');
      }
    } catch (error) {
      console.error('Error checking FCM token:', error);
    }
  }

  detectEnvironment() {
    if (typeof navigator === 'undefined') {
      return { browser: 'unknown', platform: 'unknown' };
    }

    const userAgent = navigator.userAgent;
    let browser = 'other';
    let platform = 'web';

    // Browser detection - order matters! Check most specific first
    if (userAgent.includes('Brave/') || (userAgent.includes('Chrome') && navigator.brave)) {
      browser = 'brave';
    } else if (userAgent.includes('Edg/') || userAgent.includes('Edge/')) {
      browser = 'edge';
    } else if (userAgent.includes('OPR/') || userAgent.includes('Opera')) {
      browser = 'opera';
    } else if (userAgent.includes('Firefox/')) {
      browser = 'firefox';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
      browser = 'safari';
    } else if (userAgent.includes('Chrome/')) {
      browser = 'chrome';
    } else if (userAgent.includes('Phoenix')) {
      browser = 'phoenix';
    }

    // Platform detection
    if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) platform = 'mac';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'ios';
    else if (userAgent.includes('Android')) platform = 'android';
    else if (userAgent.includes('Windows')) platform = 'windows';
    else if (userAgent.includes('Linux')) platform = 'linux';

    console.log('🌐 Environment detected:', { browser, platform, userAgent: userAgent.substring(0, 100) + '...' });

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
      
      // Edge may need explicit service worker registration
      const { browser } = this.detectEnvironment();
      if (browser === 'edge') {
        console.log('Edge detected - ensuring service worker is properly registered...');
        await this.registerServiceWorker();
      }
      
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
      
      const { browser, platform } = this.detectEnvironment();
      
      if (browser === 'edge') {
        // Edge sometimes needs explicit registration
        console.log('Registering service worker explicitly for Edge...');
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
          });
          console.log('Service worker registered for Edge:', registration);
          await navigator.serviceWorker.ready;
        } catch (swError) {
          console.warn('Edge service worker registration warning:', swError);
          // Fallback to ready check
          await navigator.serviceWorker.ready;
        }
      } else if (platform === 'ios' || browser === 'safari') {
        // iOS Safari specific service worker handling
        console.log('🍎 Registering service worker for iOS/Safari...');
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
            updateViaCache: 'none' // iOS Safari specific
          });
          console.log('Service worker registered for iOS/Safari:', registration);
          
          // Wait for service worker to be fully ready on iOS
          await navigator.serviceWorker.ready;
          console.log('🍎 iOS/Safari service worker ready');
        } catch (swError) {
          console.warn('iOS Safari service worker registration warning:', swError);
          await navigator.serviceWorker.ready;
        }
      } else {
        // Other browsers - let Firebase handle it or use ready
        await navigator.serviceWorker.ready;
      }
      
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
      
      const { browser, platform } = this.detectEnvironment();
      
      // iOS/Safari specific handling
      if (platform === 'ios' || browser === 'safari') {
        console.log('🍎 Getting FCM token for iOS/Safari...');
        
        // Ensure we have proper permissions first
        if (Notification.permission !== 'granted') {
          console.warn('iOS Safari: Notification permission not granted');
          return null;
        }
        
        // Add extra delay for iOS Safari to ensure service worker is ready
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // FCM for web requires VAPID key for better security and reliability
      const token = await getToken(this.messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      
      if (token) {
        console.log('FCM enabled: true');
        console.log('FCM Token:', token);
        console.log(`✅ Token obtained successfully on ${browser} (${platform})`);
        this.setToStorage('fcmToken', token);
        return token;
      } else {
        console.log('FCM enabled: false');
        console.log('No registration token available.');
        console.log(`⚠️  No token available on ${browser} - check notification permissions`);
        return null;
      }
    } catch (error) {
      const { browser } = this.detectEnvironment();
      console.error(`❌ Failed to get FCM token on ${browser}:`, error);
      
      if (browser === 'edge' && error.message.includes('messaging/failed-service-worker-registration')) {
        console.error('🔧 Edge service worker issue detected. Try refreshing the page.');
      } else if (browser === 'brave') {
        if (error.message.includes('Registration failed') || error.message.includes('push service error')) {
          console.error('🔧 Brave privacy settings blocking push notifications. Please:');
          console.error('1. Click the Brave shield icon (🛡️) in address bar');
          console.error('2. Turn off "Block Scripts" for this site');
          console.error('3. Ensure "Notifications" are allowed');
          console.error('4. Refresh the page and try again');
        }
      }
      
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
        
        const { browser, platform } = this.detectEnvironment();
        let instructions = '';
        
        switch (browser) {
          case 'firefox':
            instructions = 'In Firefox: Click the padlock icon in the address bar → Find "Notifications" → Change from "Blocked" to "Allow" → Refresh the page';
            break;
          case 'edge':
            instructions = 'In Edge: Click the padlock icon in the address bar → Click "Notifications" → Select "Allow" → Refresh the page';
            break;
          case 'safari':
            if (platform === 'ios') {
              instructions = 'On iPhone/iPad: Go to Settings → Safari → Advanced → Website Data → Find your site → Swipe left → Delete. Then revisit the site and allow notifications when prompted.';
            } else {
              instructions = 'In Safari: Go to Safari menu → Settings → Websites → Notifications → Find your site → Change to "Allow"';
            }
            break;
          case 'brave':
            instructions = 'In Brave: Click the Brave shield icon → Turn off "Block Scripts" → Click the padlock icon → Set "Notifications" to "Allow" → Refresh the page';
            break;
          case 'chrome':
          default:
            instructions = 'In Chrome: Click the padlock icon in the address bar → Click "Notifications" → Select "Allow" → Refresh the page';
        }
        
        throw new Error(`Notification permission was previously denied. ${instructions}`);
      }

      // iOS/Safari specific permission handling
      const { browser, platform } = this.detectEnvironment();
      let permission;
      
      if (platform === 'ios' || browser === 'safari') {
        // iOS Safari requires user gesture and has different behavior
        console.log('🍎 Requesting permission for iOS/Safari...');
        
        // For iOS Safari, we need to be extra careful about user gesture
        try {
          permission = await Notification.requestPermission();
        } catch (error) {
          console.error('iOS Safari permission request failed:', error);
          throw new Error('iOS Safari requires user interaction to enable notifications. Please tap the button again.');
        }
      } else {
        // Standard permission request for other browsers
        permission = await Notification.requestPermission();
      }
      
      console.log('Notification permission result:', permission);
      
      if (permission !== 'granted') {
        let message = `Notification permission ${permission}. Please enable notifications to receive push notifications.`;
        
        if (platform === 'ios') {
          message += ' On iOS, you may need to enable notifications in Safari settings if the prompt didn\'t appear.';
        }
        
        throw new Error(message);
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

      const { browser, platform } = this.detectEnvironment();
      
      // iOS/Safari specific pre-checks and guidance
      if (platform === 'ios' || browser === 'safari') {
        console.log('🍎 Setting up push notifications for iOS/Safari...');
        
        // Check HTTPS requirement
        const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
        if (!isSecure) {
          throw new Error('🍎 iOS/Safari requires HTTPS for push notifications. Please use HTTPS or localhost.');
        }
        
        console.log('🍎 HTTPS requirement satisfied');
        console.log('🍎 Note: iOS notifications may take a moment to appear and work best when the site is added to Home Screen');
      }

      if (!this.checkSupport()) {
        const supportMessage = platform === 'ios' 
          ? 'FCM not supported. Ensure you\'re using Safari 16.4+ and have enabled notifications in Settings → Safari → Advanced.'
          : 'FCM not supported';
        throw new Error(supportMessage);
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

  getiOSSetupInstructions() {
    return {
      requirements: [
        "📱 iOS 16.4+ or Safari 16.4+ for best compatibility",
        "🔒 HTTPS connection (required for iOS push notifications)", 
        "🏠 Consider adding the site to Home Screen for better reliability",
        "⚙️ Enable notifications in device Settings if prompted"
      ],
      troubleshooting: [
        "If notifications don't appear: Check Settings → Safari → Advanced → Website Data",
        "Clear website data and try again if having issues",
        "Make sure the site isn't in Private Browsing mode",
        "iOS Safari may delay showing notifications - this is normal behavior"
      ],
      limitations: [
        "iOS notifications may not show immediately like on other platforms",
        "Background sync may be limited compared to desktop browsers", 
        "Some FCM features may not work identically to Android/Chrome"
      ]
    };
  }

  // Test function specifically for iOS debugging
  async testiOSNotifications() {
    const { platform, browser } = this.detectEnvironment();
    
    if (platform !== 'ios' && browser !== 'safari') {
      console.log('This test is designed for iOS/Safari');
      return;
    }
    
    console.log('🍎 Testing iOS notification system...');
    console.log('Environment:', { platform, browser });
    console.log('Location protocol:', location.protocol);
    console.log('Notification permission:', Notification.permission);
    console.log('FCM support:', this.isSupported);
    
    if (this.isSupported && Notification.permission === 'granted') {
      try {
        // Test basic notification
        new Notification('iOS Test', {
          body: 'If you see this, basic notifications work!',
          icon: '/icon-192x192.png'
        });
        console.log('✅ Basic notification test sent');
      } catch (error) {
        console.error('❌ Basic notification test failed:', error);
      }
    }
    
    return this.getiOSSetupInstructions();
  }
}

const pushNotificationManager = new PushNotificationManager();
export default pushNotificationManager;