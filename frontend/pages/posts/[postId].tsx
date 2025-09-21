import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/ui';
import { postsAPI, commentsAPI } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface Author {
  _id: string;
  displayName: string;
  email: string;
  avatarUrl: string;
}

interface Post {
  _id: string;
  text: string;
  author: Author;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
}

interface Comment {
  _id: string;
  postId: string;
  authorId: Author;
  text: string;
  likes: string[];
  likeCount: number;
  parentCommentId?: string;
  replies: Comment[];
  replyCount: number;
  createdAt: string;
}

interface CommentsResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function PostDetailsPage() {
  const router = useRouter();
  const { postId } = router.query;
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (postId && typeof postId === 'string') {
      fetchPost();
      fetchComments();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getPost(postId as string);
      setPost(response.data.post);
    } catch (error: any) {
      console.error('Failed to fetch post:', error);
      toast.error('Failed to load post');
      if (error.response?.status === 404) {
        router.push('/feed');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      setCommentsLoading(true);
      const response = await commentsAPI.getComments(postId as string);
      const data: CommentsResponse = response.data;
      setComments(data.comments);
    } catch (error: any) {
      console.error('Failed to fetch comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleLikePost = async () => {
    if (!user || !post) return;

    try {
      setLikeLoading(prev => new Set(prev).add(post._id));
      const response = await postsAPI.likePost(post._id);
      
      setPost(prev => prev ? {
        ...prev,
        isLiked: response.data.isLiked,
        likeCount: response.data.likeCount
      } : null);
    } catch (error: any) {
      console.error('Failed to like post:', error);
      toast.error('Failed to like post');
    } finally {
      setLikeLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(post._id);
        return newSet;
      });
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    try {
      setLikeLoading(prev => new Set(prev).add(commentId));
      const response = await commentsAPI.likeComment(commentId);
      
      setComments(prev => prev.map(comment => 
        comment._id === commentId 
          ? { 
              ...comment, 
              likeCount: response.data.likeCount,
              likes: response.data.isLiked 
                ? [...comment.likes, user.id]
                : comment.likes.filter(id => id !== user.id)
            }
          : comment
      ));
    } catch (error: any) {
      console.error('Failed to like comment:', error);
      toast.error('Failed to like comment');
    } finally {
      setLikeLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !post || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const commentData = {
        postId: post._id,
        text: newComment.trim(),
        ...(replyTo && { parentCommentId: replyTo })
      };

      const response = await commentsAPI.createComment(commentData);
      
      if (replyTo) {
        // Handle reply
        setComments(prev => prev.map(comment => 
          comment._id === replyTo 
            ? { ...comment, replies: [...comment.replies, response.data.comment] }
            : comment
        ));
      } else {
        // Handle new top-level comment
        setComments(prev => [response.data.comment, ...prev]);
      }

      // Update post comment count
      setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
      
      setNewComment('');
      setReplyTo(null);
      toast.success('Comment posted!');
    } catch (error: any) {
      console.error('Failed to post comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
          <Button onClick={() => router.push('/feed')}>
            Back to Feed
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <Button 
            variant="secondary" 
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </Button>
        </div>

        {/* Post */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start space-x-3">
            <img
              src={post.author.avatarUrl}
              alt={post.author.displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {post.author.displayName}
                </h3>
                <span className="text-sm text-gray-500">
                  {formatTimeAgo(post.createdAt)}
                </span>
              </div>
              <p className="text-gray-700 mt-2 text-lg">{post.text}</p>
              
              {/* Post actions */}
              <div className="flex items-center space-x-6 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={handleLikePost}
                  disabled={!user || likeLoading.has(post._id)}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-colors ${
                    post.isLiked
                      ? 'text-red-600 bg-red-50 hover:bg-red-100'
                      : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                  } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-5 h-5" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-sm font-medium">{post.likeCount}</span>
                </button>
                
                <div className="flex items-center space-x-2 text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-sm font-medium">{post.commentCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comment form */}
        {user && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <form onSubmit={handleSubmitComment}>
              <div className="flex space-x-3">
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  {replyTo && (
                    <div className="mb-2 p-2 bg-gray-100 rounded text-sm">
                      <span className="text-gray-600">Replying to comment</span>
                      <button
                        type="button"
                        onClick={() => setReplyTo(null)}
                        className="ml-2 text-blue-600 hover:text-blue-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {newComment.length}/500
                    </span>
                    <Button
                      type="submit"
                      disabled={!newComment.trim() || submittingComment}
                      variant="primary"
                      size="sm"
                    >
                      {submittingComment ? 'Posting...' : replyTo ? 'Reply' : 'Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">
            Comments ({post.commentCount})
          </h2>
          
          {commentsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No comments yet. {user && "Be the first to comment!"}
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment._id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-start space-x-3">
                  <img
                    src={comment.authorId.avatarUrl}
                    alt={comment.authorId.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900">
                        {comment.authorId.displayName}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {formatTimeAgo(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1">{comment.text}</p>
                    
                    {/* Comment actions */}
                    <div className="flex items-center space-x-4 mt-2">
                      <button
                        onClick={() => handleLikeComment(comment._id)}
                        disabled={!user || likeLoading.has(comment._id)}
                        className={`flex items-center space-x-1 text-sm transition-colors ${
                          user && comment.likes.includes(user.id)
                            ? 'text-red-600'
                            : 'text-gray-600 hover:text-red-600'
                        } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <svg className="w-4 h-4" fill={user && comment.likes.includes(user.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>{comment.likeCount}</span>
                      </button>
                      
                      {user && (
                        <button
                          onClick={() => setReplyTo(comment._id)}
                          className="text-sm text-gray-600 hover:text-blue-600"
                        >
                          Reply
                        </button>
                      )}
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
                        {comment.replies.map((reply) => (
                          <div key={reply._id} className="flex items-start space-x-3">
                            <img
                              src={reply.authorId.avatarUrl}
                              alt={reply.authorId.displayName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h5 className="font-medium text-gray-900 text-sm">
                                  {reply.authorId.displayName}
                                </h5>
                                <span className="text-xs text-gray-500">
                                  {formatTimeAgo(reply.createdAt)}
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm mt-1">{reply.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}