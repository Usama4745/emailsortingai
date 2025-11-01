// client/src/pages/LoginPage.js
/**
 * Login page
 * Displays Google login button to authenticate users
 */

import React from 'react';
import { FaGoogle, FaEnvelope } from 'react-icons/fa';

function LoginPage() {
  /**
   * Handle Google OAuth login
   */
  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <FaEnvelope className="text-3xl text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Email Sorter
          </h1>
          <p className="text-gray-600">
            Intelligent email management powered by AI
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          <div className="flex items-start">
            <span className="text-green-500 mr-3 text-xl">✓</span>
            <span className="text-gray-700">Auto-categorize emails with AI</span>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 mr-3 text-xl">✓</span>
            <span className="text-gray-700">Get AI summaries of each email</span>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 mr-3 text-xl">✓</span>
            <span className="text-gray-700">Manage multiple Gmail accounts</span>
          </div>
          <div className="flex items-start">
            <span className="text-green-500 mr-3 text-xl">✓</span>
            <span className="text-gray-700">One-click unsubscribe from emails</span>
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <FaGoogle className="text-lg" />
          Sign in with Google
        </button>

        {/* Info Text */}
        <p className="text-xs text-gray-500 text-center mt-6">
          By signing in, you authorize Email Sorter to access your Gmail inbox
          to sort and organize your emails. Your data is secure and private.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;