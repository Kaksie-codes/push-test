const admin = require('../config/firebase');

class FCMPushService {
  constructor() {
    this.isFirebaseInitialized = false;
    this.initializeFirebase();
  }

  // Initialize Firebase for FCM
  initializeFirebase() {
    try {
      if (admin && admin.messaging) {
        this.isFirebaseInitialized = true;
        console.log('Firebase initialized for FCM push notifications');
      } else {
        console.warn('Firebase Admin not properly configured');
        this.isFirebaseInitialized = false;
      }
    } catch (error) {
      console.warn('Firebase not available for push notifications:', error.message);
      this.isFirebaseInitialized = false;
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
        // Data payload (always accessible in service worker)
        data: {
          title: payload.title || '',
          body: payload.body || '',
          icon: payload.icon || '/icon-192x192.png',
          badge: payload.badge || '/badge-72x72.png',
          type: payload.data?.type || 'notification',
          url: payload.data?.url || '/',
          postId: payload.data?.postId || '',
          authorId: payload.data?.authorId || ''
        },
        // Web push specific configuration
        webpush: {
          fcmOptions: {
            link: payload.data?.url || '/'
          }
        },
        // Android specific
        android: {
          priority: 'high',
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/icon-192x192.png',
            click_action: payload.data?.url || '/'
          }
        },
        // iOS specific
        apns: {
          headers: {
            'apns-priority': '10'
          },
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body
              },
              badge: 1,
              sound: 'default'
            }
          }
        }
      };

      console.log('Sending FCM message:', JSON.stringify(message, null, 2));
      const result = await admin.messaging().send(message);
      console.log('FCM send successful:', result);
      
      return { success: true, method: 'fcm', result };
    } catch (error) {
      console.error('FCM send error:', error);
      return { success: false, method: 'fcm', error: error.message };
    }
  }

  // Send notification to a single device (FCM only)
  async sendToDevice(device, payload, options = {}) {
    if (!device.enabled) {
      return { success: false, reason: 'Device disabled' };
    }

    if (!device.fcmToken) {
      return { success: false, reason: 'No FCM token available' };
    }

    const result = await this.sendFCMPush(device.fcmToken, payload, options);
    
    return {
      ...result,
      deviceId: device.deviceId,
      pushMethod: 'fcm'
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
    const enabledDevices = user.devices.filter(device => device.enabled && device.fcmToken);
    
    if (enabledDevices.length === 0) {
      return { success: false, reason: 'No enabled FCM devices' };
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
        successful: allResults.filter(r => r.success !== false).length,
        failed: allResults.filter(r => r.success === false).length
      }
    };
  }
}

// Export singleton instance
module.exports = new FCMPushService();