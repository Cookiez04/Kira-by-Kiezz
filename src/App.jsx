import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './components/layouts/DashboardLayout';
import Dashboard from './components/Dashboard/Dashboard';
import TransactionForm from './components/Transactions/TransactionForm';
import TransactionList from './components/Transactions/TransactionList';
import CategoryManager from './components/Categories/CategoryManager';
import Reports from './components/Reports/Reports';
import SettingsPage from './pages/SettingsPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={user ? <DashboardLayout><Dashboard /></DashboardLayout> : <Navigate to="/login" />} />
        <Route path="/add-transaction" element={user ? <DashboardLayout><TransactionForm /></DashboardLayout> : <Navigate to="/login" />} />
        <Route path="/transactions" element={user ? <DashboardLayout><TransactionList /></DashboardLayout> : <Navigate to="/login" />} />
        <Route path="/categories" element={user ? <DashboardLayout><CategoryManager /></DashboardLayout> : <Navigate to="/login" />} />
        <Route path="/reports" element={user ? <DashboardLayout><Reports /></DashboardLayout> : <Navigate to="/login" />} />
        <Route path="/settings" element={user ? <DashboardLayout><SettingsPage /></DashboardLayout> : <Navigate to="/login" />} />
        
        {/* Redirect any unknown routes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;