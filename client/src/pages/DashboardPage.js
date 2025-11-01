// client/src/pages/DashboardPage.js
/**
 * Dashboard page
 * Main application page showing categories, accounts, and controls
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaSync, FaSignOutAlt, FaCog, FaUser } from 'react-icons/fa';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import CategoryModal from '../components/CategoryModal';
import AccountModal from '../components/AccountModal';

function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  /**
   * Load categories and accounts on mount
   */
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Load categories and accounts
   */
  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, accountsRes] = await Promise.all([
        api.getCategories(),
        api.getAccounts(),
      ]);

      setCategories(categoriesRes.data);
      setAccounts(accountsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load categories and accounts');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle sync emails
   */
  const handleSyncEmails = async () => {
    try {
      setSyncing(true);
      const response = await api.syncEmails();
      toast.success(`Synced emails: ${response.data.results.length} accounts processed`);
      // Reload categories as email counts may have changed
      loadData();
    } catch (error) {
      console.error('Error syncing emails:', error);
      toast.error('Failed to sync emails');
    } finally {
      setSyncing(false);
    }
  };

  /**
   * Handle create/update category
   */
  const handleSaveCategory = async (categoryData) => {
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory._id, categoryData);
        toast.success('Category updated');
      } else {
        await api.createCategory(categoryData);
        toast.success('Category created');
      }

      setShowCategoryModal(false);
      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  /**
   * Handle delete category
   */
  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Delete this category? Emails will be moved to uncategorized.')) {
      try {
        await api.deleteCategory(categoryId);
        toast.success('Category deleted');
        loadData();
      } catch (error) {
        console.error('Error deleting category:', error);
        toast.error('Failed to delete category');
      }
    }
  };

  /**
   * Handle disconnect account
   */
  const handleDisconnectAccount = async (accountId, isPrimary) => {
    if (isPrimary) {
      toast.error('Cannot disconnect primary account');
      return;
    }

    if (window.confirm('Disconnect this account? All associated emails will be deleted.')) {
      try {
        await api.disconnectAccount(accountId);
        toast.success('Account disconnected');
        loadData();
      } catch (error) {
        console.error('Error disconnecting account:', error);
        toast.error('Failed to disconnect account');
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

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        categories={categories}
        accounts={accounts}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header user={user} onLogout={handleLogout} />

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-8">
            {/* Top Actions */}
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <div className="flex gap-3">
                <button
                  onClick={handleSyncEmails}
                  disabled={syncing || loading}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <FaSync className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing...' : 'Sync Emails'}
                </button>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setShowCategoryModal(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <FaPlus /> New Category
                </button>
              </div>
            </div>

            {/* Connected Accounts */}
            <div className="card p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FaUser /> Connected Accounts
              </h2>
              {accounts.length === 0 ? (
                <p className="text-gray-600">
                  Only your primary account is connected. Add more accounts to expand your email coverage.
                </p>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{account.email}</p>
                        <p className="text-xs text-gray-500">
                          {account.isPrimary ? '(Primary)' : ''} • Last sync:{' '}
                          {account.lastSyncAt
                            ? new Date(account.lastSyncAt).toLocaleDateString()
                            : 'Never'}
                        </p>
                      </div>
                      {!account.isPrimary && (
                        <button
                          onClick={() => handleDisconnectAccount(account._id, account.isPrimary)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowAccountModal(true)}
                className="mt-4 btn-secondary flex items-center gap-2"
              >
                <FaPlus /> Add Account
              </button>
            </div>

            {/* Categories Grid */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Categories</h2>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin text-4xl mb-2">⏳</div>
                  <p className="text-gray-600">Loading categories...</p>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-12 card">
                  <p className="text-gray-600 mb-4">No categories yet</p>
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setShowCategoryModal(true);
                    }}
                    className="btn-primary"
                  >
                    Create your first category
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <div
                      key={category._id}
                      onClick={() => navigate(`/category/${category._id}`)}
                      className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: category.color }}
                        >
                          <span className="text-white font-bold text-lg">
                            {category.name[0].toUpperCase()}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory(category);
                            setShowCategoryModal(true);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <FaCog />
                        </button>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {category.description}
                      </p>
                      <div className="text-sm text-gray-500">
                        {category.emailCount} email
                        {category.emailCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onSave={handleSaveCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
        />
      )}

      {showAccountModal && (
        <AccountModal
          onClose={() => setShowAccountModal(false)}
          onSuccess={() => {
            setShowAccountModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

export default DashboardPage;