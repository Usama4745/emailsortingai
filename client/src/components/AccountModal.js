// client/src/components/AccountModal.js
/**
 * Account modal
 * Dialog for connecting additional Gmail accounts via OAuth
 */

import React from 'react';
import { FaTimes, FaGoogle } from 'react-icons/fa';

function AccountModal({ onClose, onSuccess }) {
  /**
   * Handle connect account - redirect to OAuth
   */
  const handleConnectAccount = () => {
    // Redirect to backend Google OAuth endpoint
    // The backend will handle adding the account for authenticated users
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Connect Gmail Account
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Connect another Gmail account to expand your email coverage and
            organize emails from multiple inboxes.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> You'll need to sign in to the Gmail account
              you want to connect. Make sure to grant the necessary permissions
              for email access.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleConnectAccount}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <FaGoogle /> Connect Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountModal;