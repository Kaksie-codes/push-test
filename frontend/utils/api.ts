import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies in requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login if we're not already on an auth page
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const authPages = ['/login', '/register', '/verify-email', '/resend-verification', '/forgot-password', '/reset-password'];
        
        // Don't redirect if we're already on an auth page
        if (!authPages.includes(currentPath)) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; displayName: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  logout: () =>
    api.post('/auth/logout'),
  
  getCurrentUser: () =>
    api.get('/auth/me'),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (data: { token: string; password: string }) =>
    api.post('/auth/reset-password', data),
  
  verifyEmail: (token: string) =>
    api.post('/auth/verify-email', { token }),
  
  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),
};

// Users API
export const usersAPI = {
  getAllUsers: (limit = 50, page = 1) =>
    api.get('/users/all', { params: { limit, page } }),
    
  getProfile: (id: string) =>
    api.get(`/users/${id}`),
  
  updateProfile: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
    api.put('/users/profile', data),
  
  followUser: (id: string) =>
    api.post(`/users/${id}/follow`),
  
  unfollowUser: (id: string) =>
    api.post(`/users/${id}/unfollow`),
  
  searchUsers: (query: string, limit = 20) =>
    api.get(`/users/search/${encodeURIComponent(query)}`, { params: { limit } }),
  
  getSuggested: (limit = 10) =>
    api.get('/users/suggested', { params: { limit } }),
  
  getFollowers: (id: string) =>
    api.get(`/users/${id}/followers`),
  
  getFollowing: (id: string) =>
    api.get(`/users/${id}/following`),
};

// Posts API
export const postsAPI = {
  createPost: (text: string) =>
    api.post('/posts', { text }),
  
  getFeed: (page = 1, limit = 20) =>
    api.get('/posts/feed', { params: { page, limit } }),
  
  getUserPosts: (userId: string, page = 1, limit = 20) =>
    api.get(`/posts/user/${userId}`, { params: { page, limit } }),
  
  getPost: (id: string) =>
    api.get(`/posts/${id}`),
  
  likePost: (id: string) =>
    api.post(`/posts/${id}/like`),
  
  deletePost: (id: string) =>
    api.delete(`/posts/${id}`),
  
  getTrendingPosts: (limit = 20) =>
    api.get('/posts/trending/recent', { params: { limit } }),
};

// Notifications API
export const notificationsAPI = {
  // In-app notifications
  getNotifications: (page = 1, limit = 20) =>
    api.get('/notifications', { params: { page, limit } }),
  
  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),
  
  markAllAsRead: () =>
    api.patch('/notifications/mark-all-read'),
  
  deleteNotification: (id: string) =>
    api.delete(`/notifications/${id}`),
  
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),
  
  // Notification settings (legacy)
  getSettings: () =>
    api.get('/notifications/settings'),
  
  updateSettings: (settings: { follows?: boolean; postsFromFollowed?: boolean }) =>
    api.patch('/notifications/settings', settings),
  
  subscribeDevice: (data: { deviceId: string; platform: string; pushToken: string }) =>
    api.post('/notifications/subscribe', data),
  
  unsubscribeDevice: (deviceId: string) =>
    api.post('/notifications/unsubscribe', { deviceId }),
  
  getDevices: () =>
    api.get('/notifications/devices'),
};

export default api;