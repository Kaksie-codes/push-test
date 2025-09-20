const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');

// Utility function to detect browser from user agent
const detectBrowser = (userAgent) => {
  if (!userAgent) return 'other';
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) return 'chrome';
  if (userAgent.includes('Firefox')) return 'firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'safari';
  if (userAgent.includes('Edge')) return 'edge';
  return 'other';
};

// Utility function to detect platform
const detectPlatform = (userAgent) => {
  if (!userAgent) return 'web';
  
  if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) return 'mac';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'ios';
  if (userAgent.includes('Android')) return 'android';
  if (userAgent.includes('Windows')) return 'windows';
  return 'web';
};

// Subscribe to push notifications
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { 
      deviceId, 
      webPushSubscription, 
      fcmToken, 
      pushMethod = 'auto',
      deviceInfo 
    } = req.body;

    // Validate input
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    if (!webPushSubscription && !fcmToken) {
      return res.status(400).json({ 
        error: 'Either webPushSubscription or fcmToken is required' 
      });
    }

    // Use frontend device info if provided, otherwise detect from user agent
    let browser, platform;
    
    if (deviceInfo && deviceInfo.browser && deviceInfo.platform) {
      browser = deviceInfo.browser;
      platform = deviceInfo.platform;
    } else {
      // Fallback to user agent detection
      const userAgent = req.headers['user-agent'];
      browser = detectBrowser(userAgent);
      platform = detectPlatform(userAgent);
    }

    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if device already exists
    const existingDeviceIndex = user.devices.findIndex(
      device => device.deviceId === deviceId
    );

    const deviceData = {
      deviceId,
      platform,
      browser,
      webPushSubscription: webPushSubscription || undefined,
      fcmToken: fcmToken || undefined,
      pushMethod,
      lastActiveAt: new Date(),
      enabled: true
    };

    if (existingDeviceIndex >= 0) {
      // Update existing device with new information
      user.devices[existingDeviceIndex] = { 
        ...user.devices[existingDeviceIndex].toObject(), 
        ...deviceData,
        // Force update platform and browser info
        platform,
        browser
      };
    } else {
      // Add new device
      user.devices.push(deviceData);
    }

    await user.save();

    res.json({
      message: 'Push subscription registered successfully',
      device: deviceData
    });

  } catch (error) {
    console.error('Push subscription error:', error);
    res.status(500).json({ error: 'Failed to register push subscription' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Find user and remove device
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove device from array
    user.devices = user.devices.filter(device => device.deviceId !== deviceId);
    await user.save();

    res.json({
      message: 'Push subscription removed successfully'
    });

  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
});

// Get user's registered devices
router.get('/devices', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('devices');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive subscription data from response
    const sanitizedDevices = user.devices.map(device => ({
      deviceId: device.deviceId,
      platform: device.platform,
      browser: device.browser,
      pushMethod: device.pushMethod,
      lastActiveAt: device.lastActiveAt,
      enabled: device.enabled,
      hasWebPush: !!device.webPushSubscription,
      hasFCM: !!device.fcmToken
    }));

    res.json({
      devices: sanitizedDevices
    });

  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to retrieve devices' });
  }
});

// Update device settings
router.patch('/devices/:deviceId', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { enabled, pushMethod } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find and update device
    const device = user.devices.find(d => d.deviceId === deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (typeof enabled === 'boolean') {
      device.enabled = enabled;
    }

    if (pushMethod && ['web-push', 'fcm', 'auto'].includes(pushMethod)) {
      device.pushMethod = pushMethod;
    }

    device.lastActiveAt = new Date();
    await user.save();

    res.json({
      message: 'Device settings updated successfully',
      device: {
        deviceId: device.deviceId,
        enabled: device.enabled,
        pushMethod: device.pushMethod
      }
    });

  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: 'Failed to update device settings' });
  }
});

module.exports = router;