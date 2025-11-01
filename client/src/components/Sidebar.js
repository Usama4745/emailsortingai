// client/src/components/Sidebar.js
/**
 * Sidebar component
 * Left navigation sidebar with categories and accounts
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaFolderOpen, FaHome, FaTrash } from 'react-icons/fa';

function Sidebar({ categories, accounts, onDeleteCategory }) {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-6">
        {/* Dashboard Link */}
        <Link
          to="/dashboard"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            location.pathname === '/dashboard'
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FaHome /> Dashboard
        </Link>

        {/* Categories Section */}
        <div className="mt-8">
          <h3 className="text-xs uppercase font-semibold text-gray-500 px-4 mb-3">
            Categories
          </h3>

          {categories.length === 0 ? (
            <p className="text-xs text-gray-500 px-4">No categories yet</p>
          ) : (
            <nav className="space-y-1">
              {categories.map((category) => (
                <div key={category._id} className="group">
                  <Link
                    to={`/category/${category._id}`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      location.pathname === `/category/${category._id}`
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="flex-1 truncate">{category.name}</span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded group-hover:bg-gray-300 transition-colors">
                      {category.emailCount}
                    </span>
                  </Link>
                </div>
              ))}
            </nav>
          )}
        </div>

        {/* Accounts Section */}
        <div className="mt-8">
          <h3 className="text-xs uppercase font-semibold text-gray-500 px-4 mb-3">
            Accounts
          </h3>

          {accounts.length === 0 ? (
            <p className="text-xs text-gray-500 px-4">No additional accounts</p>
          ) : (
            <nav className="space-y-1">
              {accounts.map((account) => (
                <div
                  key={account._id}
                  className="px-4 py-2 text-sm text-gray-700 flex items-start gap-2"
                >
                  <span className="mt-1 text-xs">📧</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{account.email}</p>
                    {account.isPrimary && (
                      <p className="text-xs text-gray-500">Primary</p>
                    )}
                  </div>
                </div>
              ))}
            </nav>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;