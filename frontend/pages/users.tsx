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
  postCount: number;
  isFollowing?: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
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
      setFollowingUsers(prev => new Set(prev).add(userId));
      await usersAPI.followUser(userId);
      setUsers(users.map(user => 
        user._id === userId 
          ? { ...user, isFollowing: true, followerCount: user.followerCount + 1 }
          : user
      ));
      toast.success('User followed successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to follow user');
    } finally {
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      setFollowingUsers(prev => new Set(prev).add(userId));
      await usersAPI.unfollowUser(userId);
      setUsers(users.map(user => 
        user._id === userId 
          ? { ...user, isFollowing: false, followerCount: user.followerCount - 1 }
          : user
      ));
      toast.success('User unfollowed successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to unfollow user');
    } finally {
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
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
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            {users.map((user) => (
              <div key={user._id} className="group relative bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Card Content */}
                <div className="relative p-6">
                  {/* Header with Avatar and Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm cursor-pointer hover:ring-blue-300 transition-all duration-200"
                          onClick={() => router.push(`/users/${user._id}`)}
                        />
                        {/* Online status indicator (could be dynamic) */}
                        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-400 border-2 border-white rounded-full"></div>
                      </div>
                      
                      {/* Current user badge */}
                      {currentUser && user._id === currentUser.id && (
                        <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    
                    {/* Join date badge */}
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {formatJoinDate(user.createdAt).split(',')[0]}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className="mb-4">
                    <Link 
                      href={`/users/${user._id}`}
                      className="group/link inline-block"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 group-hover/link:text-blue-600 transition-colors duration-200 mb-1">
                        {user.displayName}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-500 mb-2">{user.email}</p>
                    
                    {/* Bio */}
                    {user.bio ? (
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {user.bio}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No bio available</p>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-1 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{user.followerCount}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Followers</div>
                    </div>
                    <div className="text-center border-x border-gray-200">
                      <div className="text-lg font-bold text-gray-900">{user.followingCount}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Following</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {user.postCount || 0}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Posts</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => router.push(`/users/${user._id}`)}
                      variant="secondary"
                      size="sm"
                      className="flex-1 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="truncate">Profile</span>
                    </Button>
                    
                    {/* Only show follow/unfollow buttons if not viewing own profile */}
                    {currentUser && user._id !== currentUser.id && (
                      <>
                        {user.isFollowing ? (
                          <Button
                            onClick={() => handleUnfollow(user._id)}
                            disabled={followingUsers.has(user._id)}
                            variant="secondary"
                            size="sm"
                            className="px-3 flex items-center justify-center text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 min-w-[90px]"
                          >
                            {followingUsers.has(user._id) ? (
                              <>
                                <svg className="w-4 h-4 mr-1.5 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="truncate">Loading</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                                </svg>
                                <span className="truncate">Unfollow</span>
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleFollow(user._id)}
                            disabled={followingUsers.has(user._id)}
                            size="sm"
                            className="px-3 flex items-center justify-center bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 min-w-[90px]"
                          >
                            {followingUsers.has(user._id) ? (
                              <>
                                <svg className="w-4 h-4 mr-1.5 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="truncate">Loading</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                <span className="truncate">Follow</span>
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}