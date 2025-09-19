const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttemptedAt: {
    type: Date,
    default: Date.now
  },
  errorMessage: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for better performance
notificationLogSchema.index({ userId: 1, status: 1 });
notificationLogSchema.index({ postId: 1 });
notificationLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);

module.exports = mongoose.model('NotificationLog', notificationLogSchema);