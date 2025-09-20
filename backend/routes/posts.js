const express = require('express');
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const User = require('../models/User');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const pushService = require('../services/pushService');

const router = express.Router();

// Create a new post
router.post('/', authMiddleware, [
  body('text').trim().isLength({ min: 1, max: 280 }).withMessage('Post text must be 1-280 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { text } = req.body;
    const authorId = req.user._id;

    // Create new post
    const post = new Post({
      authorId,
      text
    });

    await post.save();

    // Populate author information
    await post.populate('authorId', 'displayName email avatarUrl');

    const postResponse = {
      _id: post._id,
      text: post.text,
      author: {
        _id: post.authorId._id,
        displayName: post.authorId.displayName,
        email: post.authorId.email,
        avatarUrl: post.authorId.avatarUrl
      },
      likeCount: post.likeCount,
      isLiked: false, // New post, so current user hasn't liked it yet
      createdAt: post.createdAt
    };

    res.status(201).json({
      message: 'Post created successfully',
      post: postResponse
    });

    // Create notifications for followers
    try {
      const author = await User.findById(authorId);
      
      // Find users who follow this author (users who have this author in their following list)
      const followers = await User.find({
        following: authorId,  // Users who are following this author
        'notificationSettings.postsFromFollowed': true  // And want post notifications
      });

      console.log(`Post created by ${author.displayName}: Found ${followers.length} followers who want notifications`);

      if (followers.length > 0) {
        // Create in-app notifications for followers
        const notificationPromises = followers.map(follower =>
          createNotification(
            follower._id,
            authorId,
            'new_post',
            `${author.displayName} posted: "${text.length > 50 ? text.substring(0, 50) + '...' : text}"`,
            post._id,
            'Post'
          ).catch(err => {
            console.error(`Failed to create notification for follower ${follower._id}:`, err);
            return null; // Continue with other notifications even if one fails
          })
        );
        
        await Promise.allSettled(notificationPromises);

        // Send push notifications to followers
        if (followers.length > 0) {
          try {
            const pushPayload = {
              title: `New post from ${author.displayName}`,
              body: text.length > 100 ? text.substring(0, 100) + '...' : text,
              icon: author.avatarUrl || '/icon-192x192.png',
              badge: '/badge-72x72.png',
              data: {
                type: 'new_post',
                postId: post._id.toString(),
                authorId: authorId.toString(),
                url: `/feed`
              },
              actions: [
                {
                  action: 'view',
                  title: 'View Post'
                },
                {
                  action: 'dismiss',
                  title: 'Dismiss'
                }
              ]
            };

            // Send push notifications to all followers who want post notifications
            const pushResult = await pushService.sendToUsers(followers, pushPayload, {
              urgency: 'normal',
              ttl: 86400 // 24 hours
            });

            console.log(`Push notifications sent for new post: ${pushResult.summary.successful}/${pushResult.totalUsers} successful`);
          } catch (pushError) {
            console.error('Failed to send push notifications for post:', pushError);
            // Don't fail the post creation if push notifications fail
          }
        } else {
          console.log('No followers want post notifications');
        }
      }
    } catch (notificationError) {
      console.error('Failed to create post notifications:', notificationError);
      // Don't fail the post creation if notification creation fails
    }
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get feed (posts from followed users)
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get current user with following list
    const currentUser = await User.findById(req.user._id);
    
    // Get posts from followed users (and own posts)
    const followingIds = [...currentUser.following, currentUser._id];
    
    const posts = await Post.find({
      authorId: { $in: followingIds },
      isDeleted: false
    })
    .populate('authorId', 'displayName email avatarUrl')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Add isLiked flag for current user
    const postsWithLikeStatus = posts.map(post => {
      const isLiked = post.isLikedBy(currentUser._id);
      
      return {
        _id: post._id,
        text: post.text,
        author: {
          _id: post.authorId._id,
          displayName: post.authorId.displayName,
          email: post.authorId.email,
          avatarUrl: post.authorId.avatarUrl
        },
        likeCount: post.likeCount,
        isLiked,
        createdAt: post.createdAt
      };
    });

    res.json({
      posts: postsWithLikeStatus,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get posts by a specific user
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate ObjectId format
    if (!userId || userId === 'undefined' || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const posts = await Post.find({
      authorId: userId,
      isDeleted: false
    })
    .populate('authorId', 'displayName email avatarUrl')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Add isLiked flag if user is authenticated
    const postsWithLikeStatus = posts.map(post => {
      let isLiked = false;
      if (req.user) {
        isLiked = post.isLikedBy(req.user._id);
      }
      
      return {
        id: post._id,
        text: post.text,
        author: {
          id: post.authorId._id,
          displayName: post.authorId.displayName,
          email: post.authorId.email,
          avatarUrl: post.authorId.avatarUrl
        },
        likeCount: post.likeCount,
        isLiked,
        createdAt: post.createdAt
      };
    });

    res.json({
      posts: postsWithLikeStatus,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      isDeleted: false
    }).populate('authorId', 'displayName email avatarUrl');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Add isLiked flag if user is authenticated
    let isLiked = false;
    if (req.user) {
      isLiked = post.isLikedBy(req.user._id);
    }

    const postResponse = {
      id: post._id,
      text: post.text,
      author: {
        id: post.authorId._id,
        displayName: post.authorId.displayName,
        email: post.authorId.email,
        avatarUrl: post.authorId.avatarUrl
      },
      likeCount: post.likeCount,
      isLiked,
      createdAt: post.createdAt
    };

    res.json({ post: postResponse });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like/unlike a post
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const wasLiked = post.isLikedBy(req.user._id);
    await post.toggleLike(req.user._id);

    const action = wasLiked ? 'unliked' : 'liked';
    
    res.json({
      message: `Post ${action} successfully`,
      isLiked: !wasLiked,
      likeCount: post.likeCount
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a post (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    // Soft delete
    post.isDeleted = true;
    await post.save();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get trending posts (most liked in last 24 hours)
router.get('/trending/recent', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const posts = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: oneDayAgo },
          isDeleted: false
        }
      },
      {
        $addFields: {
          likeCount: { $size: '$likes' }
        }
      },
      {
        $sort: { likeCount: -1, createdAt: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author',
          pipeline: [
            {
              $project: {
                displayName: 1,
                email: 1,
                avatarUrl: 1
              }
            }
          ]
        }
      },
      {
        $unwind: '$author'
      }
    ]);

    // Add isLiked flag if user is authenticated
    const postsWithLikeStatus = posts.map(post => {
      let isLiked = false;
      if (req.user) {
        isLiked = post.likes.some(like => like.userId.toString() === req.user._id.toString());
      }
      
      return {
        id: post._id,
        text: post.text,
        author: {
          id: post.author._id,
          displayName: post.author.displayName,
          email: post.author.email,
          avatarUrl: post.author.avatarUrl
        },
        likeCount: post.likeCount,
        isLiked,
        createdAt: post.createdAt
      };
    });

    res.json({ posts: postsWithLikeStatus });
  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;