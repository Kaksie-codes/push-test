const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generateSVGAvatar } = require('../utils/avatar');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['web', 'android', 'ios', 'mac', 'windows'],
    required: true
  },
  browser: {
    type: String,
    enum: ['chrome', 'firefox', 'safari', 'edge', 'other'],
    default: 'other'
  },
  // For native Web Push API
  webPushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  },
  // For Firebase Cloud Messaging
  fcmToken: String,
  // Push notification method preference
  pushMethod: {
    type: String,
    enum: ['web-push', 'fcm', 'auto'],
    default: 'auto'
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  enabled: {
    type: Boolean,
    default: true
  }
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 160,
    default: ''
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  devices: [deviceSchema],
  notificationSettings: {
    follows: {
      type: Boolean,
      default: true
    },
    postsFromFollowed: {
      type: Boolean,
      default: true
    }
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving and generate avatar for new users
userSchema.pre('save', async function(next) {
  try {
    // Hash password if modified
    if (this.isModified('passwordHash')) {
      const salt = await bcrypt.genSalt(12);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    }
    
    // Generate avatar for new users if no avatar is set
    if (this.isNew && !this.avatarUrl) {
      this.avatarUrl = generateSVGAvatar(this.displayName, this.email);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Add device method
userSchema.methods.addDevice = function(deviceData) {
  // Remove existing device with same deviceId
  this.devices = this.devices.filter(device => device.deviceId !== deviceData.deviceId);
  // Add new device
  this.devices.push(deviceData);
  return this.save();
};

// Remove device method
userSchema.methods.removeDevice = function(deviceId) {
  this.devices = this.devices.filter(device => device.deviceId !== deviceId);
  return this.save();
};

// Get follower count
userSchema.virtual('followerCount').get(function() {
  return this.followers ? this.followers.length : 0;
});

// Get following count
userSchema.virtual('followingCount').get(function() {
  return this.following ? this.following.length : 0;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);