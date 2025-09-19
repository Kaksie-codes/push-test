const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['web', 'android', 'ios', 'mac'],
    required: true
  },
  pushToken: {
    type: String,
    required: true
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
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
  return this.followers.length;
});

// Get following count
userSchema.virtual('followingCount').get(function() {
  return this.following.length;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);