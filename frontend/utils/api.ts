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
      // Redirect to login on unauthorized
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
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
};

// Users API
export const usersAPI = {
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