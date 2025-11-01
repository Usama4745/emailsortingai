// client/src/pages/EmailPage.js
/**
 * Email detail page
 * Shows full email content with read-only view
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaTrash } from 'react-icons/fa';
import * as api from '../services/api';

function EmailPage() {
  const { emailId } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load email
   */
  useEffect(() => {
    loadEmail();
  }, [emailId]);

  /**
   * Load email details
   */
  const loadEmail = async () => {
    try {
      setLoading(true);
      const response = await api.getEmail(emailId);
      setEmail(response.data);
    } catch (error) {
      console.error('Error loading email:', error);
      toast.error('Failed to load email');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle delete email
   */
  const handleDeleteEmail = async () => {
    if (window.confirm('Delete this email?')) {
      try {
        await api.deleteEmails([emailId]);
        toast.success('Email deleted');
        navigate('/dashboard');
      } catch (error) {
        console.error('Error deleting email:', error);
        toast.error('Failed to delete email');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl mb-2">⏳</div>
          <p className="text-gray-600">Loading email...</p>
        </div>
      </div>
    );
  }

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-6"
        >
          <FaArrowLeft /> Back
        </button>

        {/* Email Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{email.subject}</h1>
                <div className="space-y-1">
                  <p className="text-blue-100">From: {email.from}</p>
                  <p className="text-blue-100">To: {email.to}</p>
                  <p className="text-blue-100">
                    Date:{' '}
                    {new Date(email.receivedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDeleteEmail}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <FaTrash /> Delete
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* AI Summary */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-2">AI Summary</h3>
              <p className="text-gray-700">{email.aiSummary}</p>
            </div>

            {/* Category Info */}
            {email.aiCategory && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Categorization
                </h3>
                <div className="space-y-1">
                  <p className="text-gray-700">
                    <strong>Category:</strong> {email.aiCategory}
                  </p>
                  <p className="text-gray-700">
                    <strong>Confidence:</strong>{' '}
                    {(email.confidenceScore * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            {/* Full Email Content */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Full Email</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap text-gray-700 overflow-auto max-h-96">
                {email.body}
              </div>
            </div>

            {/* Unsubscribe Info */}
            {email.hasUnsubscribeLink && (
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-700">
                  ✓ This email has an unsubscribe link. Use bulk unsubscribe
                  from the category page to automatically unsubscribe.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailPage;