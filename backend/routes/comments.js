const express = require('express');
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const pushService = require('../services/fcmPushService');

const router = express.Router();

// Get comments for a specific post
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get comments with author information
    const comments = await Comment.find({ 
      postId, 
      parentCommentId: null // Only top-level comments, not replies
    })
      .populate('authorId', 'displayName email avatarUrl')
      .populate({
        path: 'replies',
        populate: {
          path: 'authorId',
          select: 'displayName email avatarUrl'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Comment.countDocuments({ postId, parentCommentId: null });

    res.json({
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new comment
router.post('/', authMiddleware, [
  body('postId').isMongoId().withMessage('Valid post ID is required'),
  body('text').trim().isLength({ min: 1, max: 500 }).withMessage('Comment text must be 1-500 characters'),
  body('parentCommentId').optional().isMongoId().withMessage('Valid parent comment ID required if provided')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { postId, text, parentCommentId } = req.body;
    const authorId = req.user._id;

    // Check if post exists
    const post = await Post.findById(postId).populate('authorId', 'displayName');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // If it's a reply, check if parent comment exists
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId).populate('authorId', 'displayName');
      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
    }

    // Create comment
    const comment = new Comment({
      postId,
      authorId,
      text,
      parentCommentId: parentCommentId || null
    });

    await comment.save();

    // Populate author information
    await comment.populate('authorId', 'displayName email avatarUrl');

    // If it's a reply, add to parent comment's replies and increment reply count
    if (parentComment) {
      parentComment.replies.push(comment._id);
      parentComment.replyCount = parentComment.replies.length;
      await parentComment.save();
    }

    // Increment post comment count
    post.commentCount = (post.commentCount || 0) + 1;
    await post.save();

    res.status(201).json({
      message: 'Comment created successfully',
      comment
    });

    // Create notifications asynchronously
    try {
      const commenter = await User.findById(authorId);
      
      // Notify post author if someone else commented
      if (post.authorId._id.toString() !== authorId.toString()) {
        await createNotification(
          post.authorId._id,
          authorId,
          'comment',
          `${commenter.displayName} commented on your post`,
          post._id,
          'Post'
        );

        // Send push notification to post author
        const postAuthor = await User.findById(post.authorId._id);
        if (postAuthor && postAuthor.notificationSettings.commentsOnMyPosts) {
          const pushPayload = {
            title: `${commenter.displayName} commented on your post`,
            body: text.length > 50 ? text.substring(0, 47) + '...' : text,
            icon: commenter.avatarUrl || '/icon-192x192.png',
            badge: '/badge-72x72.png',
            data: {
              type: 'comment',
              postId: post._id.toString(),
              authorId: authorId.toString(),
              url: `/posts/${post._id}`
            }
          };

          await pushService.sendToUser(postAuthor, pushPayload);
        }
      }

      // If it's a reply, notify the parent comment author
      if (parentComment && parentComment.authorId._id.toString() !== authorId.toString()) {
        await createNotification(
          parentComment.authorId._id,
          authorId,
          'reply',
          `${commenter.displayName} replied to your comment`,
          post._id,
          'Post'
        );

        // Send push notification to parent comment author
        const parentCommentAuthor = await User.findById(parentComment.authorId._id);
        if (parentCommentAuthor && parentCommentAuthor.notificationSettings.repliesToMyComments) {
          const pushPayload = {
            title: `${commenter.displayName} replied to your comment`,
            body: text.length > 50 ? text.substring(0, 47) + '...' : text,
            icon: commenter.avatarUrl || '/icon-192x192.png',
            badge: '/badge-72x72.png',
            data: {
              type: 'reply',
              postId: post._id.toString(),
              authorId: authorId.toString(),
              url: `/posts/${post._id}`
            }
          };

          await pushService.sendToUser(parentCommentAuthor, pushPayload);
        }
      }
    } catch (notificationError) {
      console.error('Failed to create comment notifications:', notificationError);
    }
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like/unlike a comment
router.post('/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId).populate('authorId', 'displayName');
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const isLiked = comment.likes.includes(userId);

    if (isLiked) {
      // Unlike
      comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
      comment.likeCount = Math.max(0, comment.likeCount - 1);
    } else {
      // Like
      comment.likes.push(userId);
      comment.likeCount = comment.likes.length;
    }

    await comment.save();

    res.json({
      message: isLiked ? 'Comment unliked' : 'Comment liked',
      isLiked: !isLiked,
      likeCount: comment.likeCount
    });

    // Create notification for like (but not unlike)
    if (!isLiked && comment.authorId._id.toString() !== userId.toString()) {
      try {
        const liker = await User.findById(userId);
        await createNotification(
          comment.authorId._id,
          userId,
          'like',
          `${liker.displayName} liked your comment`,
          comment.postId,
          'Post'
        );

        // Send push notification
        const commentAuthor = await User.findById(comment.authorId._id);
        if (commentAuthor && commentAuthor.notificationSettings.likesOnMyPosts) {
          const pushPayload = {
            title: `${liker.displayName} liked your comment`,
            body: comment.text.length > 50 ? comment.text.substring(0, 47) + '...' : comment.text,
            icon: liker.avatarUrl || '/icon-192x192.png',
            badge: '/badge-72x72.png',
            data: {
              type: 'like',
              postId: comment.postId.toString(),
              authorId: userId.toString(),
              url: `/posts/${comment.postId}`
            }
          };

          await pushService.sendToUser(commentAuthor, pushPayload);
        }
      } catch (notificationError) {
        console.error('Failed to create like notification:', notificationError);
      }
    }
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a comment (only by author)
router.delete('/:commentId', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author of the comment
    if (comment.authorId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // If it's a top-level comment, also delete all its replies
    if (!comment.parentCommentId) {
      await Comment.deleteMany({ parentCommentId: commentId });
    } else {
      // If it's a reply, remove it from parent's replies array
      await Comment.findByIdAndUpdate(comment.parentCommentId, {
        $pull: { replies: commentId },
        $inc: { replyCount: -1 }
      });
    }

    await Comment.findByIdAndDelete(commentId);

    // Decrement post comment count
    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { commentCount: -1 }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;