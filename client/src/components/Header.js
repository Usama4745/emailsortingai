// client/src/components/Header.js
/**
 * Header component
 * Top navigation bar with user menu
 */

import React, { useState } from 'react';
import { FaUser, FaSignOutAlt, FaChevronDown } from 'react-icons/fa';

function Header({ user, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
      <div className="text-lg font-bold text-blue-600">
        📧 Email Sorter
      </div>

      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {user?.picture && (
            <img
              src={user.picture}
              alt={user.name}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <FaChevronDown
            className={`text-gray-600 transition-transform ${
              showMenu ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
            <div className="p-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                setShowMenu(false);
                onLogout();
              }}
              className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm font-medium"
            >
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;