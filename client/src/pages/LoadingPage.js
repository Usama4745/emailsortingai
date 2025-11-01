// client/src/pages/LoadingPage.js
/**
 * Loading page
 * Displayed while verifying authentication
 */

import React from 'react';

function LoadingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin text-white text-4xl mb-4">
          ⏳
        </div>
        <h2 className="text-white text-2xl font-semibold">
          Loading...
        </h2>
      </div>
    </div>
  );
}

export default LoadingPage;