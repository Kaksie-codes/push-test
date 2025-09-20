const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get suggested users (users not followed by current user)
router.get('/suggested', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const currentUser = await User.findById(req.user._id);
    
    // Get users that current user is not following and exclude current user
    const suggestedUsers = await User.find({
      _id: { 
        $ne: req.user._id, // Exclude current user
        $nin: currentUser.following // Exclude users already followed
      }
    })
    .select('displayName email avatarUrl bio followerCount followingCount createdAt')
    .sort({ followerCount: -1, createdAt: -1 }) // Sort by popularity and recency
    .limit(limit);

    const users = suggestedUsers.map(user => ({
      _id: user._id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      createdAt: user.createdAt
    }));

    res.json({ users });
  } catch (error) {
    console.error('Get suggested users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash -passwordResetToken -passwordResetExpires -devices')
      .populate('followers', 'displayName avatarUrl')
      .populate('following', 'displayName avatarUrl');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if current user is following this user
    let isFollowing = false;
    if (req.user) {
      isFollowing = user.followers.some(follower => 
        follower._id.toString() === req.user._id.toString()
      );
    }

    const userResponse = {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      followers: user.followers,
      following: user.following,
      isFollowing,
      createdAt: user.createdAt
    };

    res.json({ user: userResponse });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, [
  body('displayName').optional().trim().isLength({ min: 2 }).withMessage('Display name must be at least 2 characters'),
  body('bio').optional().trim().isLength({ max: 160 }).withMessage('Bio must be 160 characters or less'),
  body('avatarUrl').optional().custom((value) => {
    // Allow empty string or valid URL (including Cloudinary URLs)
    if (value === '' || value === null || value === undefined) {
      return true;
    }
    // More flexible URL validation for Cloudinary URLs
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return true;
    }
    throw new Error('Avatar URL must be a valid URL or empty');
  }),
], async (req, res) => {
  try {
    console.log('🔄 Profile update request received');
    console.log('📝 Request body:', req.body);
    console.log('👤 User ID:', req.user._id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { displayName, bio, avatarUrl } = req.body;
    const userId = req.user._id;

    // Update user
    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    console.log('📊 Update data prepared:', updateData);

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash -passwordResetToken -passwordResetExpires -devices');

    console.log('✅ User updated successfully');
    console.log('👤 Updated user data:', {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl
    });

    // Double-check by fetching the user again from database
    const verifyUser = await User.findById(userId).select('avatarUrl displayName bio');
    console.log('🔍 Verification - user in database:', {
      id: verifyUser._id,
      displayName: verifyUser.displayName,
      bio: verifyUser.bio,
      avatarUrl: verifyUser.avatarUrl
    });

    const userResponse = {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      createdAt: user.createdAt
    };

    res.json({
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow a user
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const userToFollowId = req.params.id;
    const currentUserId = req.user._id;

    // Can't follow yourself
    if (userToFollowId === currentUserId.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    // Check if user exists
    const userToFollow = await User.findById(userToFollowId);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already following
    const currentUser = await User.findById(currentUserId);
    if (currentUser.following.includes(userToFollowId)) {
      return res.status(400).json({ message: 'You are already following this user' });
    }

    // Add to following and followers lists
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: userToFollowId }
    });

    await User.findByIdAndUpdate(userToFollowId, {
      $addToSet: { followers: currentUserId }
    });

    res.json({ message: 'User followed successfully' });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unfollow a user
router.post('/:id/unfollow', authMiddleware, async (req, res) => {
  try {
    const userToUnfollowId = req.params.id;
    const currentUserId = req.user._id;

    // Can't unfollow yourself
    if (userToUnfollowId === currentUserId.toString()) {
      return res.status(400).json({ message: 'You cannot unfollow yourself' });
    }

    // Check if user exists
    const userToUnfollow = await User.findById(userToUnfollowId);
    if (!userToUnfollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from following and followers lists
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: userToUnfollowId }
    });

    await User.findByIdAndUpdate(userToUnfollowId, {
      $pull: { followers: currentUserId }
    });

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users
router.get('/search/:query', optionalAuth, async (req, res) => {
  try {
    const { query } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    // Search users by display name or email
    const users = await User.find({
      $or: [
        { displayName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
    .select('displayName email avatarUrl bio followerCount followingCount')
    .limit(limit);

    // Add isFollowing flag if user is authenticated
    const usersWithFollowStatus = users.map(user => {
      let isFollowing = false;
      if (req.user) {
        isFollowing = req.user.following.includes(user._id);
      }

      return {
        id: user._id,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        isFollowing
      };
    });

    res.json({ users: usersWithFollowStatus });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get followers of a user
router.get('/:id/followers', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'displayName email avatarUrl bio followerCount followingCount');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add isFollowing flag if user is authenticated
    const followersWithStatus = user.followers.map(follower => {
      let isFollowing = false;
      if (req.user) {
        isFollowing = req.user.following.includes(follower._id);
      }

      return {
        id: follower._id,
        displayName: follower.displayName,
        email: follower.email,
        avatarUrl: follower.avatarUrl,
        bio: follower.bio,
        followerCount: follower.followerCount,
        followingCount: follower.followingCount,
        isFollowing
      };
    });

    res.json({ followers: followersWithStatus });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get following of a user
router.get('/:id/following', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('following', 'displayName email avatarUrl bio followerCount followingCount');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add isFollowing flag if user is authenticated
    const followingWithStatus = user.following.map(followed => {
      let isFollowing = false;
      if (req.user) {
        isFollowing = req.user.following.includes(followed._id);
      }

      return {
        id: followed._id,
        displayName: followed.displayName,
        email: followed.email,
        avatarUrl: followed.avatarUrl,
        bio: followed.bio,
        followerCount: followed.followerCount,
        followingCount: followed.followingCount,
        isFollowing
      };
    });

    res.json({ following: followingWithStatus });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get suggested users (users not followed by current user)
router.get('/suggested', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const currentUser = await User.findById(req.user._id);
    
    // Get users that current user is not following and exclude current user
    const suggestedUsers = await User.find({
      _id: { 
        $ne: req.user._id, // Exclude current user
        $nin: currentUser.following // Exclude users already followed
      }
    })
    .select('displayName email avatarUrl bio followerCount followingCount createdAt')
    .sort({ followerCount: -1, createdAt: -1 }) // Sort by popularity and recency
    .limit(limit);

    const users = suggestedUsers.map(user => ({
      _id: user._id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      createdAt: user.createdAt
    }));

    res.json({ users });
  } catch (error) {
    console.error('Get suggested users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;