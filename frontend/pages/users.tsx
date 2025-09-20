import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Layout } from '../components/Layout';
import { Button, Input } from '../components/ui';
import { usersAPI } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const router = useRouter();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAllUsers();
      setUsers(response.data.users);
    } catch (error: any) {
      toast.error('Failed to load users');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchAllUsers();
      return;
    }

    if (searchQuery.length < 2) {
      toast.error('Search query must be at least 2 characters');
      return;
    }

    try {
      setSearchLoading(true);
      const response = await usersAPI.searchUsers(searchQuery);
      setUsers(response.data.users);
    } catch (error: any) {
      toast.error('Search failed');
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await usersAPI.followUser(userId);
      setUsers(users.map(user => 
        user._id === userId 
          ? { ...user, isFollowing: true, followerCount: user.followerCount + 1 }
          : user
      ));
      toast.success('User followed successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to follow user');
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      await usersAPI.unfollowUser(userId);
      setUsers(users.map(user => 
        user._id === userId 
          ? { ...user, isFollowing: false, followerCount: user.followerCount - 1 }
          : user
      ));
      toast.success('User unfollowed successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to unfollow user');
    }
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    fetchAllUsers();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discover Users</h1>
          <p className="text-gray-600">
            Find and connect with other members of our community
          </p>
        </div>

        {/* Search */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search users by name or email..."
                className="w-full"
              />
            </div>
            <Button 
              type="submit" 
              disabled={searchLoading}
              className="px-6"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </Button>
            {searchQuery && (
              <Button 
                type="button" 
                variant="secondary"
                onClick={clearSearch}
                className="px-4"
              >
                Clear
              </Button>
            )}
          </form>
        </div>

        {/* Results Header */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {searchQuery ? `Search Results (${users.length})` : `All Users (${users.length})`}
          </h2>
          <div className="text-sm text-gray-500">
            Sorted by join date (newest first)
          </div>
        </div>

        {/* Users Grid */}
        {users.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No users found' : 'No users yet'}
            </h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search terms' : 'Be the first to join this community!'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <div key={user._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                {/* User Avatar and Basic Info */}
                <div className="flex items-center mb-4">
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="ml-3 flex-1">
                    <Link 
                      href={`/users/${user._id}`}
                      className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {user.displayName}
                    </Link>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>

                {/* Bio */}
                {user.bio && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {user.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{user.followerCount}</div>
                    <div>Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{user.followingCount}</div>
                    <div>Following</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {formatJoinDate(user.createdAt).split(',')[0]}
                    </div>
                    <div>Joined</div>
                  </div>
                </div>

                {/* Join Date */}
                <div className="text-xs text-gray-400 mb-4 text-center">
                  Joined {formatJoinDate(user.createdAt)}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => router.push(`/users/${user._id}`)}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    View Profile
                  </Button>
                  
                  {/* Only show follow/unfollow buttons if not viewing own profile */}
                  {currentUser && user._id !== currentUser.id && (
                    <>
                      {user.isFollowing ? (
                        <Button
                          onClick={() => handleUnfollow(user._id)}
                          variant="secondary"
                          size="sm"
                          className="px-4"
                        >
                          Unfollow
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleFollow(user._id)}
                          size="sm"
                          className="px-4"
                        >
                          Follow
                        </Button>
                      )}
                    </>
                  )}
                  
                  {/* Show "You" indicator for current user */}
                  {currentUser && user._id === currentUser.id && (
                    <div className="px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded">
                      You
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}