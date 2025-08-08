import React from 'react';

function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/apple-touch-icon.png" alt="Kira by Kiezz" className="w-8 h-8 rounded-lg" onError={(e)=>{e.currentTarget.onerror=null;e.currentTarget.src='/favicon-32x32.png';}} />
            <h1 className="text-2xl font-bold text-gray-800">
              Kira by Kiezz
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome back, Kiezz! 👋
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;