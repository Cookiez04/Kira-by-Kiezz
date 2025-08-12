import React, { useState, useEffect, useMemo } from 'react';
import IncomeExpenseCard from './IncomeExpenseCard';
import RecentTransactions from './RecentTransactions';
import SmartInsights from '../SmartInsights/SmartInsights';
import LoadingSpinner from '../common/LoadingSpinner';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { supabase } from '../../services/supabase';
import { getPayCycleRange } from '../../utils/payCycle';

function Dashboard() {
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { categories, loading: categoriesLoading } = useCategories();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    monthlyGrowth: 0,
    topCategory: null
  });
  const [viewMode, setViewMode] = useState('cycle'); // 'cycle' | 'calendar' | 'all'
  const [cycleLabel, setCycleLabel] = useState('');

  // Get user information and profile
  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Try to get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setUserProfile(profile);
      }
    };
    getUserData();
  }, []);

  const filteredByView = useMemo(() => {
    const now = new Date();
    if (viewMode === 'all') {
      setCycleLabel('All Time');
      return transactions;
    }
    if (viewMode === 'calendar') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      setCycleLabel(start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
      return transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    }
    const startDay = userProfile?.pay_cycle_start_day || 1;
    const { start, end, label } = getPayCycleRange(now, startDay);
    setCycleLabel(label);
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
  }, [transactions, viewMode, userProfile]);

  useEffect(() => {
    const txs = filteredByView;
    const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Growth: compare same window immediately preceding
    let monthlyGrowth = 0;
    if (viewMode !== 'all') {
      let prevStart, prevEnd;
      if (viewMode === 'calendar') {
        const now = new Date();
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else {
        const startDay = userProfile?.pay_cycle_start_day || 1;
        const now = new Date();
        const { start } = getPayCycleRange(now, startDay);
        const prevRef = new Date(start);
        prevRef.setDate(prevRef.getDate() - 1);
        const prev = getPayCycleRange(prevRef, startDay);
        prevStart = prev.start;
        prevEnd = prev.end;
      }
      const prevTxs = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= prevStart && d <= prevEnd;
      });
      const prevExpenses = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      if (prevExpenses > 0) monthlyGrowth = ((totalExpenses - prevExpenses) / prevExpenses) * 100;
    }

    const categorySpending = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
      const categoryName = t.categories?.name || 'Other';
      categorySpending[categoryName] = (categorySpending[categoryName] || 0) + t.amount;
    });
    const topCategory = Object.keys(categorySpending).length > 0
      ? Object.keys(categorySpending).reduce((a, b) => categorySpending[a] > categorySpending[b] ? a : b)
      : null;

    setStats({
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      monthlyGrowth,
      topCategory,
      categorySpending
    });
  }, [filteredByView, transactions, userProfile, viewMode]);

  const loading = transactionsLoading || categoriesLoading;

  if (loading) {
    return <LoadingSpinner size="large" message="Loading your financial data..." />;
  }

  // Get user display name
  const getUserDisplayName = () => {
    if (userProfile?.first_name) {
      return userProfile.first_name;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Friend';
  };

  // Greeting
  const getGreeting = () => 'Hello';

  // Get financial status emoji
  const getFinancialStatusEmoji = () => {
    if (stats.balance > stats.totalExpenses * 0.2) return '🚀';
    if (stats.balance > 0) return '💪';
    return '⚠️';
  };

  return (
    <div className="space-y-8">
      {/* Modern Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 p-4 sm:p-6 lg:p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-teal-500/10"></div>
        <div className="relative z-10">
          {/* Header with greeting */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
              {getGreeting()}, {getUserDisplayName()}! {getFinancialStatusEmoji()}
            </h1>
            
            {/* Period selector for mobile-first design */}
            {transactions.length > 0 && (
              <div className="space-y-3 sm:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="text-base sm:text-lg text-slate-300">
                    Overview for
                  </span>
                  <div className="flex items-center gap-2">
                    <select 
                      value={viewMode} 
                      onChange={(e)=>setViewMode(e.target.value)} 
                      className="bg-slate-800/70 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="cycle">Pay Cycle</option>
                      <option value="calendar">Calendar Month</option>
                      <option value="all">All Time</option>
                    </select>
                    <span className="text-white/80 font-medium text-sm sm:text-base">
                      {cycleLabel}
                    </span>
                  </div>
                </div>
                
                {/* Financial Health Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      stats.balance > stats.totalExpenses * 0.2 ? 'bg-emerald-400' :
                      stats.balance > 0 ? 'bg-amber-400' : 'bg-rose-400'
                    }`}></div>
                    <span className="text-slate-300 text-sm">
                      {stats.balance > stats.totalExpenses * 0.2 ? 'Excellent' :
                       stats.balance > 0 ? 'Good' : 'Needs Attention'}
                    </span>
                  </div>
                  {stats.monthlyGrowth !== 0 && (
                    <div className="flex items-center space-x-1">
                      <span className={`text-sm ${
                        stats.monthlyGrowth > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {stats.monthlyGrowth > 0 ? '↗️' : '↘️'} 
                        {Math.abs(stats.monthlyGrowth).toFixed(1)}% vs last month
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {transactions.length === 0 && (
              <p className="text-base sm:text-lg text-slate-300">
                Let's set up your financial tracking
              </p>
            )}
          </div>
          
          {/* Quick Stats Preview - Mobile optimized */}
          {transactions.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-slate-800/30 rounded-lg p-3 sm:p-4">
                <p className="text-slate-400 text-xs sm:text-sm mb-1">Net Income</p>
                <p className={`text-lg sm:text-xl lg:text-2xl font-bold ${
                  stats.balance > 0 ? 'text-emerald-400' : stats.balance < 0 ? 'text-rose-400' : 'text-slate-300'
                }`}>
                  {stats.balance < 0 ? '-' : stats.balance > 0 ? '+' : ''}${Math.abs(stats.balance).toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3 sm:p-4">
                <p className="text-slate-400 text-xs sm:text-sm mb-1">Top Category</p>
                <p className="text-white font-semibold text-sm sm:text-base truncate">
                  {stats.topCategory || 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>
          
          {/* First Time User Onboarding */}
          {transactions.length === 0 && (
            <div className="mt-6 p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🎯</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Ready to take control?</h3>
                  <p className="text-slate-300 mb-4">
                    Start by adding your first transaction to see personalized insights and track your financial journey.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a 
                      href="/add-transaction?type=income" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <span>💰</span>
                      <span>Add Income</span>
                    </a>
                    <a 
                      href="/add-transaction?type=expense" 
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <span>💸</span>
                      <span>Add Expense</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Modern Stats Cards */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <IncomeExpenseCard
            title="💰 Monthly Income"
            amount={stats.totalIncome}
            type="income"
            color="green"
          />
          <IncomeExpenseCard
            title="💸 Monthly Expenses"
            amount={stats.totalExpenses}
            type="expense"
            color="blue"
          />
          <IncomeExpenseCard
            title="📊 Net Income"
            amount={stats.balance}
            type="balance"
            color={stats.balance >= 0 ? "green" : "red"}
          />
        </div>
      )}

      {/* Modern Quick Actions */}
      {transactions.length > 0 && (
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-xl font-semibold text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a 
              href="/add-transaction?type=income" 
              className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white p-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">💰</span>
                </div>
                <div>
                  <p className="font-semibold">Add Income</p>
                  <p className="text-xs text-emerald-100">Track earnings</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
            
            <a 
              href="/add-transaction?type=expense" 
              className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white p-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">💸</span>
                </div>
                <div>
                  <p className="font-semibold">Add Expense</p>
                  <p className="text-xs text-blue-100">Log spending</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
            
            <a 
              href="/transactions" 
              className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white p-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <p className="font-semibold">View All</p>
                  <p className="text-xs text-purple-100">Full history</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
            
            <a 
              href="/reports" 
              className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white p-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📈</span>
                </div>
                <div>
                  <p className="font-semibold">Reports</p>
                  <p className="text-xs text-amber-100">Insights</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
          </div>
        </div>
      )}

      {/* Personalized Spending Insights */}
      {transactions.length > 0 && stats.topCategory && (
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-xl font-semibold text-white mb-6">💡 Personal Insights</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <h4 className="font-semibold text-blue-300 mb-2">Top Spending Category</h4>
                <p className="text-white text-lg">{stats.topCategory}</p>
                <p className="text-slate-400 text-sm">
                  ${stats.categorySpending?.[stats.topCategory]?.toLocaleString() || 0} this month
                </p>
              </div>
              
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <h4 className="font-semibold text-emerald-300 mb-2">Financial Health</h4>
                <p className="text-white">
                  {stats.balance > stats.totalExpenses * 0.2 
                    ? 'Excellent! You\'re saving well.' 
                    : stats.balance > 0 
                    ? 'Good progress on your finances.' 
                    : 'Consider reducing expenses.'}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-700/50 rounded-xl">
                <h4 className="font-semibold text-slate-300 mb-3">Monthly Overview</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Transactions</span>
                    <span className="text-white">{transactions.filter(t => {
                      const date = new Date(t.date);
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg per day</span>
                    <span className="text-white">
                      ${(stats.totalExpenses / new Date().getDate()).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Categories used</span>
                    <span className="text-white">{Object.keys(stats.categorySpending || {}).length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Insights */}
      <SmartInsights />

      {/* Recent Transactions */}
      <RecentTransactions transactions={transactions.slice(0, 5)} categories={categories} />
    </div>
  );
}

export default Dashboard;