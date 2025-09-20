import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';
import { Button, Input, Loading } from '../components/ui';
import { postsAPI, usersAPI } from '../utils/api';
import toast from 'react-hot-toast';

interface Post {
  _id: string;
  content: string;
  author: {
    _id: string;
    displayName: string;
    email: string;
  };
  createdAt: string;
}

interface User {
  _id: string;
  displayName: string;
  email: string;
  followerCount: number;
  followingCount: number;
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load feed when component mounts
  useEffect(() => {
    if (user) {
      loadFeed();
      loadSuggestedUsers();
    }
  }, [user]);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getFeed();
      setPosts(response.data.posts || []);
    } catch (error: any) {
      toast.error('Failed to load feed');
      console.error('Feed load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestedUsers = async () => {
    try {
      const response = await usersAPI.getSuggested();
      setSuggestedUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load suggested users:', error);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPost.trim()) {
      toast.error('Post content cannot be empty');
      return;
    }

    try {
      setPosting(true);
      const response = await postsAPI.createPost(newPost);
      setPosts([response.data.post, ...posts]);
      setNewPost('');
      toast.success('Post created successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await usersAPI.followUser(userId);
      setSuggestedUsers(suggestedUsers.filter(u => u._id !== userId));
      toast.success('User followed successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to follow user');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loading size="lg" />
        </div>
      </Layout>
    );
  }

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.displayName}!
          </h1>
          <p className="text-gray-600">
            Share what's on your mind with your followers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <form onSubmit={handleCreatePost}>
                <div className="mb-4">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="What's happening?"
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    maxLength={280}
                  />
                  <div className="text-right text-sm text-gray-500 mt-1">
                    {newPost.length}/280
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={posting || !newPost.trim()}
                    className="px-6"
                  >
                    {posting ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loading size="lg" />
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                  <p className="text-gray-500 text-lg">No posts to show yet.</p>
                  <p className="text-gray-400 mt-2">
                    Follow some users or create your first post!
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post._id} className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {post.author.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            {post.author.displayName}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {formatDate(post.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-gray-800 whitespace-pre-wrap">
                          {post.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Stats */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Following</span>
                  <span className="font-medium">{user.followingCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Followers</span>
                  <span className="font-medium">{user.followerCount || 0}</span>
                </div>
              </div>
            </div>

            {/* Suggested Users */}
            {suggestedUsers.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Who to Follow</h2>
                <div className="space-y-3">
                  {suggestedUsers.slice(0, 3).map((suggestedUser) => (
                    <div key={suggestedUser._id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {suggestedUser.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {suggestedUser.displayName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {suggestedUser.followerCount} followers
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleFollow(suggestedUser._id)}
                        className="text-xs"
                      >
                        Follow
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}