// client/src/App.js
/**
 * Main App component
 * Sets up routing and global layout
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/index.css';

import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CategoryPage from './pages/CategoryPage';
import EmailPage from './pages/EmailPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import LoadingPage from './pages/LoadingPage';

/**
 * Protected route wrapper
 * Redirects to login if not authenticated
 */
function ProtectedRoute({ element }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return element;
}

/**
 * Public route wrapper
 * Redirects to dashboard if already authenticated
 */
function PublicRoute({ element }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return element;
}

/**
 * Main App component
 */
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicRoute element={<LoginPage />} />} />
          <Route
            path="/auth/callback"
            element={<AuthCallbackPage />}
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute element={<DashboardPage />} />}
          />
          <Route
            path="/category/:categoryId"
            element={<ProtectedRoute element={<CategoryPage />} />}
          />
          <Route
            path="/email/:emailId"
            element={<ProtectedRoute element={<EmailPage />} />}
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Toast notifications */}
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </AuthProvider>
    </Router>
  );
}

export default App;