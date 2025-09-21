const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 280,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  meta: {
    attachments: [{
      type: String, // URL to attachment
      contentType: String // image, video, etc.
    }],
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    hashtags: [String]
  },
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  commentCount: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
});

// Create indexes for better performance
postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ 'meta.hashtags': 1 });

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Method to check if user liked the post
postSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.userId.toString() === userId.toString());
};

// Method to like/unlike post
postSchema.methods.toggleLike = function(userId) {
  const existingLike = this.likes.find(like => like.userId.toString() === userId.toString());
  
  if (existingLike) {
    // Unlike: remove the like
    this.likes = this.likes.filter(like => like.userId.toString() !== userId.toString());
  } else {
    // Like: add the like
    this.likes.push({ userId });
  }
  
  return this.save();
};

// Ensure virtual fields are serialized
postSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);