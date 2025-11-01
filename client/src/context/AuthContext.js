// client/src/context/AuthContext.js
/**
 * Authentication context
 * Manages user authentication state and provides auth methods
 */

import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as authAPI from '../services/api';

export const AuthContext = createContext();

/**
 * Auth context provider component
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  
  /**
   * Check if user is logged in on mount
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {

        // Check if token exists
        const token = localStorage.getItem('authToken');

        if (!token) {
          setLoading(false);
          return;
        }

        // Verify token is still valid
        const response = await authAPI.getCurrentUser();
        setUser(response.data);
      } catch (err) {
        console.error('Auth check failed:', err);
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Login user with OAuth token
   */
  const login = useCallback((token, userData) => {
    localStorage.setItem('authToken', token);
    setUser(userData);
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
    }
  }, []);

  /**
   * Update user info
   */
  const updateUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use auth context
 */
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}