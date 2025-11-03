// client/src/services/api.js
/**
 * API service layer
 * Centralized HTTP client for all API calls
 */

import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

/**
 * Request interceptor - add JWT token to headers
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response interceptor - handle auth errors
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token
      localStorage.removeItem('authToken');

      // Only redirect if not already on login page and not on callback page
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/auth/callback') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============ Auth Endpoints ============

/**
 * Verify current authentication status
 */
export const verifyAuth = () => api.get('/auth/verify');

/**
 * Get current user info
 */
export const getCurrentUser = () => api.get('/auth/me');

/**
 * Logout
 */
export const logout = () => api.post('/auth/logout');

// ============ Categories Endpoints ============

/**
 * Get all categories
 */
export const getCategories = () => api.get('/categories');

/**
 * Get single category
 */
export const getCategory = (id) => api.get(`/categories/${id}`);

/**
 * Create new category
 */
export const createCategory = (data) => api.post('/categories', data);

/**
 * Update category
 */
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);

/**
 * Delete category
 */
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// ============ Emails Endpoints ============

/**
 * Get emails with filters
 * @param {object} params - Query parameters (categoryId, limit, page, search)
 */
export const getEmails = (params) => api.get('/emails', { params });

/**
 * Get single email
 */
export const getEmail = (id) => api.get(`/emails/${id}`);

/**
 * Sync new emails from Gmail
 */
export const syncEmails = (accountId) =>
  api.post('/emails/sync', accountId ? { accountId } : {});

/**
 * Stop syncing emails
 */
export const stopSyncEmails = (accountId) =>
  api.post('/emails/stop-sync', accountId ? { accountId } : {});

/**
 * Delete emails
 */
export const deleteEmails = (emailIds) =>
  api.delete('/emails', { data: { emailIds } });

/**
 * Archive emails
 */
export const archiveEmails = (emailIds) =>
  api.post('/emails/archive', { emailIds });

/**
 * Unsubscribe from emails
 */
export const unsubscribeFromEmails = (emailIds) =>
  api.post('/emails/unsubscribe', { emailIds });

/**
 * Recategorize emails
 */
export const recategorizeEmails = (emailIds, categoryId) =>
  api.put('/emails/recategorize', { emailIds, categoryId });

// ============ Accounts Endpoints ============

/**
 * Get all connected accounts
 */
export const getAccounts = () => api.get('/accounts');

/**
 * Get single account
 */
export const getAccount = (id) => api.get(`/accounts/${id}`);

/**
 * Get account sync status
 */
export const getAccountStatus = (id) => api.get(`/accounts/${id}/status`);

/**
 * Disconnect account
 */
export const disconnectAccount = (id) => api.delete(`/accounts/${id}`);

export default api;