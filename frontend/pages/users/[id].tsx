import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { Layout } from '../../components/Layout';
import { Button, Input, Loading } from '../../components/ui';
import { ImageUpload } from '../../components/ImageUpload';
import { usersAPI, postsAPI } from '../../utils/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followerCount: number;
  followingCount: number;
  followers: any[];
  following: any[];
  isFollowing: boolean;
  createdAt: string;
}

interface Post {
  id: string;
  text: string;
  author: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string;
  };
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
}

export default function UserProfilePage() {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    avatarUrl: ''
  });
  
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  // Load user profile when component mounts
  useEffect(() => {
    if (id && currentUser) {
      loadUserProfile(id as string);
      loadUserPosts(id as string);
    }
  }, [id, currentUser]);

  const loadUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      const response = await usersAPI.getProfile(userId);
      setProfileUser(response.data.user);
      setEditForm({
        displayName: response.data.user.displayName,
        bio: response.data.user.bio || '',
        avatarUrl: response.data.user.avatarUrl || ''
      });
    } catch (error: any) {
      toast.error('Failed to load user profile');
      console.error('Profile load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async (userId: string) => {
    try {
      setPostsLoading(true);
      const response = await postsAPI.getUserPosts(userId);
      setUserPosts(response.data.posts || []);
    } catch (error) {
      console.error('Failed to load user posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profileUser) return;
    
    try {
      setFollowing(true);
      if (profileUser.isFollowing) {
        await usersAPI.unfollowUser(profileUser.id);
        setProfileUser({
          ...profileUser,
          isFollowing: false,
          followerCount: profileUser.followerCount - 1
        });
        toast.success('Unfollowed successfully');
      } else {
        await usersAPI.followUser(profileUser.id);
        setProfileUser({
          ...profileUser,
          isFollowing: true,
          followerCount: profileUser.followerCount + 1
        });
        toast.success('Followed successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update follow status');
    } finally {
      setFollowing(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await usersAPI.updateProfile(editForm);
      setProfileUser({
        ...profileUser!,
        displayName: editForm.displayName,
        bio: editForm.bio,
        avatarUrl: editForm.avatarUrl
      });
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPostDate = (dateString: string) => {
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
  if (!currentUser) {
    return null;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loading size="lg" />
        </div>
      </Layout>
    );
  }

  if (!profileUser) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
          <p className="text-gray-600 mb-6">The user you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/feed')}>
            Back to Feed
          </Button>
        </div>
      </Layout>
    );
  }

  const isOwnProfile = currentUser.id === profileUser.id;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profileUser.avatarUrl ? (
                <img
                  src={profileUser.avatarUrl}
                  alt={profileUser.displayName}
                  className="h-24 w-24 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-blue-500 flex items-center justify-center border-4 border-gray-200">
                  <span className="text-2xl font-bold text-white">
                    {profileUser.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    {profileUser.displayName}
                  </h1>
                  <p className="text-gray-600">{profileUser.email}</p>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 sm:mt-0">
                  {isOwnProfile ? (
                    <Button
                      onClick={() => setEditing(!editing)}
                      variant={editing ? 'secondary' : 'primary'}
                    >
                      {editing ? 'Cancel' : 'Edit Profile'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleFollow}
                      disabled={following}
                      variant={profileUser.isFollowing ? 'secondary' : 'primary'}
                    >
                      {following ? 'Loading...' : (profileUser.isFollowing ? 'Unfollow' : 'Follow')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Bio */}
              <p className="text-gray-700 mb-4">
                {profileUser.bio || 'No bio available.'}
              </p>

              {/* Stats */}
              <div className="flex justify-center sm:justify-start space-x-6 text-sm">
                <div className="text-center">
                  <span className="block font-bold text-gray-900">{profileUser.followerCount}</span>
                  <span className="text-gray-600">Followers</span>
                </div>
                <div className="text-center">
                  <span className="block font-bold text-gray-900">{profileUser.followingCount}</span>
                  <span className="text-gray-600">Following</span>
                </div>
                <div className="text-center">
                  <span className="block font-bold text-gray-900">{userPosts.length}</span>
                  <span className="text-gray-600">Posts</span>
                </div>
              </div>

              {/* Join Date */}
              <p className="text-sm text-gray-500 mt-2">
                Joined {formatDate(profileUser.createdAt)}
              </p>
            </div>
          </div>

          {/* Edit Profile Form */}
          {editing && isOwnProfile && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Profile Picture
                  </label>
                  <div className="flex flex-col space-y-4">
                    {/* Image Upload Component */}
                    <ImageUpload
                      currentImageUrl={editForm.avatarUrl}
                      onImageUploaded={(imageUrl) => setEditForm({ ...editForm, avatarUrl: imageUrl })}
                      onImageRemoved={() => setEditForm({ ...editForm, avatarUrl: '' })}
                    />
                    
                    {/* OR divider */}
                    <div className="flex items-center">
                      <div className="flex-1 border-t border-gray-300"></div>
                      <div className="px-3 text-sm text-gray-500">OR</div>
                      <div className="flex-1 border-t border-gray-300"></div>
                    </div>
                    
                    {/* URL Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Avatar URL
                      </label>
                      <Input
                        value={editForm.avatarUrl}
                        onChange={(value) => setEditForm({ ...editForm, avatarUrl: value })}
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <Input
                    value={editForm.displayName}
                    onChange={(value) => setEditForm({ ...editForm, displayName: value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    maxLength={160}
                    placeholder="Tell us about yourself..."
                  />
                  <div className="text-right text-sm text-gray-500 mt-1">
                    {editForm.bio.length}/160
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button type="submit">Save Changes</Button>
                  <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* User Posts */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isOwnProfile ? 'Your Posts' : `${profileUser.displayName}'s Posts`}
          </h2>
          
          {postsLoading ? (
            <div className="flex justify-center py-8">
              <Loading size="lg" />
            </div>
          ) : userPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">
                {isOwnProfile ? "You haven't posted anything yet." : "This user hasn't posted anything yet."}
              </p>
              {isOwnProfile && (
                <Button onClick={() => router.push('/feed')} className="mt-4">
                  Create Your First Post
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {post.author.avatarUrl ? (
                        <img
                          src={post.author.avatarUrl}
                          alt={post.author.displayName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {post.author.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {post.author.displayName}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {formatPostDate(post.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-gray-800 whitespace-pre-wrap">
                        {post.text}
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <span>{post.likeCount} likes</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}