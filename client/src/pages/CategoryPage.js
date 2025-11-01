// client/src/pages/CategoryPage.js
/**
 * Category page
 * Shows all emails in a specific category with bulk actions
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaTrash,
  FaLink,
  FaCheck,
  FaSync,
} from 'react-icons/fa';
import * as api from '../services/api';

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [category, setCategory] = useState(null);
  const [emails, setEmails] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [page, setPage] = useState(0);
  const [totalEmails, setTotalEmails] = useState(0);
  const limit = 20;

  /**
   * Load category and emails
   */
  useEffect(() => {
    loadData();
  }, [categoryId, page]);

  /**
   * Load all data
   */
  const loadData = async () => {
    try {
      setLoading(true);

      // Load categories and accounts
      const [catRes, accRes] = await Promise.all([
        api.getCategories(),
        api.getAccounts(),
      ]);
      setCategories(catRes.data);
      setAccounts(accRes.data);

      // Load specific category
      const categoryData = catRes.data.find((c) => c._id === categoryId);
      if (!categoryData) {
        toast.error('Category not found');
        navigate('/dashboard');
        return;
      }
      setCategory(categoryData);

      // Load emails in category
      const emailsRes = await api.getEmails({
        categoryId,
        limit,
        page,
      });
      setEmails(emailsRes.data.emails);
      setTotalEmails(emailsRes.data.total);
      setSelectedEmails(new Set());
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle email selection
   */
  const toggleEmailSelection = (emailId) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  };

  /**
   * Toggle select all
   */
  const toggleSelectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map((e) => e._id)));
    }
  };

  /**
   * Delete selected emails
   */
  const handleDeleteEmails = async () => {
    if (selectedEmails.size === 0) {
      toast.warning('No emails selected');
      return;
    }

    if (window.confirm(`Delete ${selectedEmails.size} email(s)?`)) {
      try {
        setProcessing(true);
        await api.deleteEmails(Array.from(selectedEmails));
        toast.success(`Deleted ${selectedEmails.size} email(s)`);
        loadData();
      } catch (error) {
        console.error('Error deleting emails:', error);
        toast.error('Failed to delete emails');
      } finally {
        setProcessing(false);
      }
    }
  };

  /**
   * Unsubscribe from selected emails
   */
  const handleUnsubscribeEmails = async () => {
    if (selectedEmails.size === 0) {
      toast.warning('No emails selected');
      return;
    }

    if (
      window.confirm(
        `Attempt to unsubscribe from ${selectedEmails.size} email(s)? This may take a while.`
      )
    ) {
      try {
        setProcessing(true);
        const response = await api.unsubscribeFromEmails(
          Array.from(selectedEmails)
        );
        toast.success(
          `Unsubscribe results: ${response.data.succeeded} succeeded, ${response.data.failed} failed, ${response.data.skipped} skipped`
        );
        loadData();
      } catch (error) {
        console.error('Error unsubscribing:', error);
        toast.error('Failed to unsubscribe');
      } finally {
        setProcessing(false);
      }
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar categories={categories} accounts={accounts} />
        <div className="flex-1 flex flex-col">
          <Header user={user} onLogout={handleLogout} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin text-4xl mb-2">⏳</div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar categories={categories} accounts={accounts} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header user={user} onLogout={handleLogout} />

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-8">
            {/* Back Button and Title */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                <FaArrowLeft /> Back
              </button>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: category.color }}
              >
                <span className="text-white font-bold text-xl">
                  {category.name[0].toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {category.name}
                </h1>
                <p className="text-gray-600">{category.description}</p>
              </div>
            </div>

            {/* Bulk Actions */}
            {emails.length > 0 && (
              <div className="card p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEmails.size === emails.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">
                      {selectedEmails.size > 0
                        ? `${selectedEmails.size} selected`
                        : 'Select all'}
                    </span>
                  </label>
                </div>

                {selectedEmails.size > 0 && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleUnsubscribeEmails}
                      disabled={processing}
                      className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                    >
                      <FaLink /> Unsubscribe
                    </button>
                    <button
                      onClick={handleDeleteEmails}
                      disabled={processing}
                      className="btn-danger flex items-center gap-2 disabled:opacity-50"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Emails List */}
            {emails.length === 0 ? (
              <div className="text-center py-12 card">
                <p className="text-gray-600">No emails in this category yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {emails.map((email) => (
                  <div
                    key={email._id}
                    className="card p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(email._id)}
                        onChange={() => toggleEmailSelection(email._id)}
                        className="w-4 h-4 mt-1 cursor-pointer"
                      />
                      <div
                        className="flex-1 cursor-pointer hover:text-blue-600"
                        onClick={() => navigate(`/email/${email._id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {email.subject}
                            </p>
                            <p className="text-sm text-gray-600">{email.from}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(email.receivedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {email.aiSummary}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalEmails > limit && (
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {page + 1} of {Math.ceil(totalEmails / limit)}
                </span>
                <button
                  onClick={() =>
                    setPage(
                      Math.min(
                        Math.ceil(totalEmails / limit) - 1,
                        page + 1
                      )
                    )
                  }
                  disabled={page >= Math.ceil(totalEmails / limit) - 1}
                  className="btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CategoryPage;