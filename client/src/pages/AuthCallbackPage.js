// client/src/pages/AuthCallbackPage.js
/**
 * OAuth callback page
 * Handles the redirect from Google OAuth
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loading } = useAuth();

  useEffect(() => {
    /**
     * Process OAuth callback
     */
    const processCallback = async () => {
      try {
        const token = searchParams.get('token');
        const userId = searchParams.get('userId');

        if (!token || !userId) {
          throw new Error('Missing auth parameters');
        }

        // Store token and user info
        const userData = {
          id: userId,
          email: searchParams.get('email'),
          name: searchParams.get('name'),
        };

        login(token, userData);

        toast.success('Successfully logged in!');

        // Redirect to dashboard
        navigate('/dashboard');
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      }
    };

    processCallback();
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin text-white text-4xl mb-4">
          ⏳
        </div>
        <h2 className="text-white text-2xl font-semibold">
          Completing authentication...
        </h2>
        <p className="text-blue-100 mt-2">Please wait</p>
      </div>
    </div>
  );
}

export default AuthCallbackPage;