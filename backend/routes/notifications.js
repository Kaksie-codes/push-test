const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all notifications for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get notifications with actor details
    const notifications = await Notification.find({ recipientId: req.user._id })
      .populate('actorId', 'displayName email avatarUrl')
      .populate('entityId') // Will populate post or user based on entityType
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Notification.countDocuments({ recipientId: req.user._id });

    // Get unread count
    const unreadCount = await Notification.countDocuments({ 
      recipientId: req.user._id, 
      isRead: false 
    });

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id, 
        recipientId: req.user._id // Ensure user can only mark their own notifications as read
      },
      { 
        isRead: true, 
        readAt: new Date() 
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipientId: req.user._id // Ensure user can only delete their own notifications
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unread notifications count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ 
      recipientId: req.user._id, 
      isRead: false 
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Utility function to create notifications (used by other routes)
const createNotification = async (recipientId, actorId, type, message, entityId = null, entityType = null) => {
  try {
    // Don't create notification if actor is the same as recipient
    if (recipientId.toString() === actorId.toString()) {
      return null;
    }

    const notification = new Notification({
      recipientId,
      actorId,
      type,
      message,
      entityId,
      entityType
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

module.exports = router;
module.exports.createNotification = createNotification;