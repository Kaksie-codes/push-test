const webpush = require('web-push');
const admin = require('../config/firebase');

class HybridPushService {
  constructor() {
    this.isFirebaseInitialized = false;
    this.isWebPushInitialized = false;
    this.initializeFirebase();
    this.initializeWebPush();
  }

  // Initialize Web Push VAPID configuration
  initializeWebPush() {
    try {
      if (process.env.VAPID_SUBJECT && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT,
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        this.isWebPushInitialized = true;
        console.log('Web Push VAPID configuration initialized');
      } else {
        console.warn('Web Push VAPID keys not found. Web Push notifications will be disabled.');
        this.isWebPushInitialized = false;
      }
    } catch (error) {
      console.error('Web Push VAPID configuration failed:', error.message);
      this.isWebPushInitialized = false;
    }
  }

  initializeFirebase() {
    try {
      // Check if Firebase is properly initialized
      if (admin.apps.length > 0) {
        this.isFirebaseInitialized = true;
        console.log('Firebase initialized for push notifications');
      }
    } catch (error) {
      console.warn('Firebase not available for push notifications:', error.message);
      this.isFirebaseInitialized = false;
    }
  }

  // Determine the best push method for a device
  getBestPushMethod(device) {
    if (device.pushMethod === 'web-push' && device.webPushSubscription && this.isWebPushInitialized) {
      return 'web-push';
    }
    
    if (device.pushMethod === 'fcm' && device.fcmToken && this.isFirebaseInitialized) {
      return 'fcm';
    }

    // Auto-selection logic
    if (device.pushMethod === 'auto') {
      // Prefer native Web Push for desktop browsers (if available)
      if (device.platform === 'web' || device.platform === 'mac' || device.platform === 'windows') {
        if (device.webPushSubscription && this.isWebPushInitialized) {
          return 'web-push';
        }
      }
      
      // Use FCM for iOS Safari or when Web Push is not available
      if (device.fcmToken && this.isFirebaseInitialized) {
        return 'fcm';
      }

      // Fallback to Web Push if available
      if (device.webPushSubscription && this.isWebPushInitialized) {
        return 'web-push';
      }
    }

    return null;
  }

  // Send push notification via native Web Push API
  async sendWebPush(subscription, payload, options = {}) {
    try {
      if (!this.isWebPushInitialized) {
        throw new Error('Web Push VAPID not initialized');
      }

      const webPushOptions = {
        TTL: options.ttl || 86400, // 24 hours
        urgency: options.urgency || 'normal',
        ...options
      };

      const result = await webpush.sendNotification(subscription, payload, webPushOptions);
      return { success: true, method: 'web-push', result };
    } catch (error) {
      console.error('Web Push send error:', error);
      return { success: false, method: 'web-push', error: error.message };
    }
  }

  // Send push notification via Firebase Cloud Messaging
  async sendFCMPush(token, payload, options = {}) {
    try {
      if (!this.isFirebaseInitialized) {
        throw new Error('Firebase not initialized');
      }

      const message = {
        token,
        notification: payload.notification,
        data: payload.data || {},
        webpush: {
          notification: {
            ...payload.notification,
            icon: payload.notification.icon || '/icon-192x192.png',
            badge: payload.notification.badge || '/badge-72x72.png'
          },
          fcmOptions: {
            link: payload.data?.url || '/'
          }
        },
        android: {
          priority: options.priority || 'high',
          ttl: (options.ttl || 86400) * 1000 // Convert to milliseconds
        },
        apns: {
          headers: {
            'apns-priority': options.priority === 'high' ? '10' : '5',
            'apns-expiration': String(Math.floor(Date.now() / 1000) + (options.ttl || 86400))
          }
        }
      };

      const result = await admin.messaging().send(message);
      return { success: true, method: 'fcm', result };
    } catch (error) {
      console.error('FCM send error:', error);
      return { success: false, method: 'fcm', error: error.message };
    }
  }

  // Send notification to a single device
  async sendToDevice(device, payload, options = {}) {
    if (!device.enabled) {
      return { success: false, reason: 'Device disabled' };
    }

    const pushMethod = this.getBestPushMethod(device);
    
    if (!pushMethod) {
      return { success: false, reason: 'No available push method' };
    }

    let result;
    
    if (pushMethod === 'web-push') {
      const webPushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/badge-72x72.png',
        data: payload.data || {},
        actions: payload.actions || []
      });

      result = await this.sendWebPush(device.webPushSubscription, webPushPayload, options);
    } else if (pushMethod === 'fcm') {
      const fcmPayload = {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          badge: payload.badge
        },
        data: payload.data || {}
      };

      result = await this.sendFCMPush(device.fcmToken, fcmPayload, options);
    }

    return {
      ...result,
      deviceId: device.deviceId,
      pushMethod
    };
  }

  // Send notification to multiple devices
  async sendToDevices(devices, payload, options = {}) {
    const results = [];
    
    // Send notifications in parallel for better performance
    const promises = devices.map(device => 
      this.sendToDevice(device, payload, options)
        .catch(error => ({
          success: false,
          deviceId: device.deviceId,
          error: error.message
        }))
    );

    const sendResults = await Promise.all(promises);
    
    return {
      total: devices.length,
      successful: sendResults.filter(r => r.success).length,
      failed: sendResults.filter(r => !r.success).length,
      results: sendResults
    };
  }

  // Send notification to all user's devices
  async sendToUser(user, payload, options = {}) {
    const enabledDevices = user.devices.filter(device => device.enabled);
    
    if (enabledDevices.length === 0) {
      return { success: false, reason: 'No enabled devices' };
    }

    return await this.sendToDevices(enabledDevices, payload, options);
  }

  // Send notification to multiple users
  async sendToUsers(users, payload, options = {}) {
    const allResults = [];
    
    for (const user of users) {
      try {
        const userResult = await this.sendToUser(user, payload, options);
        allResults.push({
          userId: user._id,
          ...userResult
        });
      } catch (error) {
        allResults.push({
          userId: user._id,
          success: false,
          error: error.message
        });
      }
    }

    return {
      totalUsers: users.length,
      results: allResults,
      summary: {
        successful: allResults.filter(r => r.success).length,
        failed: allResults.filter(r => !r.success).length
      }
    };
  }
}

// Export singleton instance
module.exports = new HybridPushService();