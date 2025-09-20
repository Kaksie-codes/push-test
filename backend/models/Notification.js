const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // User who will receive the notification
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // User who triggered the notification
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Type of notification
  type: {
    type: String,
    enum: ['follow', 'new_post'],
    required: true
  },
  // Reference to related entity (post for new_post type)
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entityType'
  },
  entityType: {
    type: String,
    enum: ['Post', 'User']
  },
  // Notification message
  message: {
    type: String,
    required: true
  },
  // Read status
  isRead: {
    type: Boolean,
    default: false
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date
  }
});

// Create indexes for better performance
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ actorId: 1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);