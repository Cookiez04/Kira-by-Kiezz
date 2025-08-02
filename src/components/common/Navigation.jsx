import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: '🏠 Dashboard', icon: '📊' },
    { path: '/add-transaction', label: '➕ Add Transaction', icon: '💰' },
    { path: '/transactions', label: '📋 Transactions', icon: '📋' },
    { path: '/categories', label: '🏷️ Categories', icon: '🏷️' },
    { path: '/reports', label: '📈 Reports', icon: '📊' }
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex space-x-1 overflow-x-auto py-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link whitespace-nowrap ${
                location.pathname === item.path ? 'active' : ''
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Navigation;