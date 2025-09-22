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

      console.log(`📤 Sending FCM to token: ${token.substring(0, 20)}...`);
      console.log(`📧 Message content:`, {
        title: payload.title,
        body: payload.body,
        type: payload.data?.type,
        url: payload.data?.url
      });
      
      const result = await admin.messaging().send(message);
      console.log(`✅ FCM send successful to ${token.substring(0, 20)}...:`, result);
      
      return { success: true, method: 'fcm', result };
    } catch (error) {
      console.error(`❌ FCM send failed to ${token.substring(0, 20)}...:`, error.message);
      if (error.code) {
        console.error(`🔍 Error code: ${error.code}`);
      }
      return { success: false, method: 'fcm', error: error.message, errorCode: error.code };
    }
  }

  // Send notification to a single device (FCM only)
  async sendToDevice(device, payload, options = {}) {
    console.log(`🔄 Processing device ${device.deviceId} (${device.platform}/${device.browser})`);
    console.log(`📱 Device info:`, {
      deviceId: device.deviceId,
      platform: device.platform,
      browser: device.browser,
      enabled: device.enabled,
      hasToken: !!device.fcmToken,
      tokenPreview: device.fcmToken ? device.fcmToken.substring(0, 20) + '...' : 'none'
    });

    if (!device.enabled) {
      console.log(`⏭️  Device ${device.deviceId} is disabled, skipping`);
      return { success: false, reason: 'Device disabled', deviceId: device.deviceId };
    }

    if (!device.fcmToken) {
      console.log(`⚠️  Device ${device.deviceId} has no FCM token, skipping`);
      return { success: false, reason: 'No FCM token available', deviceId: device.deviceId };
    }

    const result = await this.sendFCMPush(device.fcmToken, payload, options);
    
    if (result.success) {
      console.log(`✅ Successfully sent to device ${device.deviceId}`);
    } else {
      console.log(`❌ Failed to send to device ${device.deviceId}:`, result.error);
    }
    
    return {
      ...result,
      deviceId: device.deviceId,
      platform: device.platform,
      browser: device.browser,
      pushMethod: 'fcm'
    };
  }

  // Send notification to multiple devices
  async sendToDevices(devices, payload, options = {}) {
    console.log(`📢 Sending notifications to ${devices.length} devices`);
    const results = [];
    
    // Send notifications in parallel for better performance
    const promises = devices.map(device => 
      this.sendToDevice(device, payload, options)
        .catch(error => {
          console.error(`❌ Unexpected error for device ${device.deviceId}:`, error.message);
          return {
            success: false,
            deviceId: device.deviceId,
            platform: device.platform,
            browser: device.browser,
            error: error.message
          };
        })
    );

    const sendResults = await Promise.all(promises);
    
    const successful = sendResults.filter(r => r.success).length;
    const failed = sendResults.filter(r => !r.success).length;
    
    console.log(`📊 Device sending summary: ${successful} successful, ${failed} failed out of ${devices.length} total`);
    
    // Log failed devices for debugging
    sendResults.filter(r => !r.success).forEach(result => {
      console.log(`❌ Failed device ${result.deviceId}: ${result.reason || result.error}`);
    });
    
    return {
      total: devices.length,
      successful,
      failed,
      results: sendResults
    };
  }

  // Send notification to all user's devices
  async sendToUser(user, payload, options = {}) {
    console.log(`👤 Processing user ${user.displayName} (${user._id})`);
    console.log(`📱 User has ${user.devices.length} total devices`);
    
    const enabledDevices = user.devices.filter(device => device.enabled && device.fcmToken);
    console.log(`✅ ${enabledDevices.length} enabled devices with FCM tokens`);
    
    if (enabledDevices.length === 0) {
      console.log(`⚠️  User ${user.displayName} has no enabled FCM devices`);
      return { 
        success: false, 
        reason: 'No enabled FCM devices',
        userId: user._id,
        userName: user.displayName,
        totalDevices: user.devices.length,
        enabledDevices: 0
      };
    }

    const result = await this.sendToDevices(enabledDevices, payload, options);
    console.log(`📊 User ${user.displayName} notification result: ${result.successful}/${result.total} devices reached`);
    
    return {
      ...result,
      userId: user._id,
      userName: user.displayName,
      totalDevices: user.devices.length,
      enabledDevices: enabledDevices.length
    };
  }

  // Send notification to multiple users
  async sendToUsers(users, payload, options = {}) {
    console.log(`\n🚀 Starting bulk notification send to ${users.length} users`);
    console.log(`📧 Notification: "${payload.title}" - ${payload.body}`);
    
    const allResults = [];
    
    for (const user of users) {
      try {
        console.log(`\n--- Processing User ${allResults.length + 1}/${users.length} ---`);
        const userResult = await this.sendToUser(user, payload, options);
        allResults.push(userResult);
      } catch (error) {
        console.error(`❌ Unexpected error processing user ${user.displayName}:`, error.message);
        allResults.push({
          userId: user._id,
          userName: user.displayName,
          success: false,
          error: error.message
        });
      }
    }

    const successful = allResults.filter(r => r.success !== false).length;
    const failed = allResults.filter(r => r.success === false).length;
    const totalDevicesReached = allResults.reduce((sum, r) => sum + (r.successful || 0), 0);
    const totalDevicesAttempted = allResults.reduce((sum, r) => sum + (r.total || 0), 0);

    console.log(`\n📊 === BULK NOTIFICATION SUMMARY ===`);
    console.log(`👥 Users: ${successful}/${users.length} successfully processed`);
    console.log(`📱 Devices: ${totalDevicesReached}/${totalDevicesAttempted} notifications delivered`);
    console.log(`❌ Failed users: ${failed}`);
    
    // Log details for failed users
    allResults.filter(r => r.success === false).forEach(result => {
      console.log(`❌ Failed user: ${result.userName} - ${result.reason || result.error}`);
    });
    
    // Log details for users with partial device failures
    allResults.filter(r => r.failed > 0).forEach(result => {
      console.log(`⚠️  Partial failure for ${result.userName}: ${result.failed}/${result.total} devices failed`);
    });

    console.log(`=== END SUMMARY ===\n`);

    return {
      totalUsers: users.length,
      results: allResults,
      summary: {
        successful,
        failed,
        totalDevicesReached,
        totalDevicesAttempted
      }
    };
  }
}

// Export singleton instance
module.exports = new FCMPushService();