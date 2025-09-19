const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get notification settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationSettings');
    
    res.json({
      notificationSettings: user.notificationSettings
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update notification settings
router.patch('/settings', authMiddleware, [
  body('follows').optional().isBoolean(),
  body('postsFromFollowed').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { follows, postsFromFollowed } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (follows !== undefined) updateData['notificationSettings.follows'] = follows;
    if (postsFromFollowed !== undefined) updateData['notificationSettings.postsFromFollowed'] = postsFromFollowed;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('notificationSettings');

    res.json({
      message: 'Notification settings updated successfully',
      notificationSettings: user.notificationSettings
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register device for push notifications
router.post('/subscribe', authMiddleware, [
  body('deviceId').notEmpty().withMessage('Device ID is required'),
  body('platform').isIn(['web', 'android', 'ios', 'mac']).withMessage('Invalid platform'),
  body('pushToken').notEmpty().withMessage('Push token is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { deviceId, platform, pushToken } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    
    // Add or update device
    await user.addDevice({
      deviceId,
      platform,
      pushToken,
      lastActiveAt: new Date()
    });

    res.json({ message: 'Device registered for push notifications successfully' });
  } catch (error) {
    console.error('Subscribe to notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unregister device from push notifications
router.post('/unsubscribe', authMiddleware, [
  body('deviceId').notEmpty().withMessage('Device ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { deviceId } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    await user.removeDevice(deviceId);

    res.json({ message: 'Device unregistered from push notifications successfully' });
  } catch (error) {
    console.error('Unsubscribe from notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's devices
router.get('/devices', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('devices');
    
    // Don't expose push tokens in response for security
    const devicesResponse = user.devices.map(device => ({
      deviceId: device.deviceId,
      platform: device.platform,
      lastActiveAt: device.lastActiveAt,
      enabled: device.enabled
    }));

    res.json({ devices: devicesResponse });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;