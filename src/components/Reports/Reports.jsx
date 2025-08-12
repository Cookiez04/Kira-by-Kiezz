import React, { useState, useEffect } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import LoadingSpinner from '../common/LoadingSpinner';
import ReportsDashboard from './ReportsDashboard';
import CategoryAnalysis from './CategoryAnalysis';
import TimeAnalysis from './TimeAnalysis';
import BudgetAnalysis from './BudgetAnalysis';
import PredictiveInsights from './PredictiveInsights';

function Reports() {
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { categories, loading: categoriesLoading } = useCategories();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
    end: new Date()
  });
  const [selectedCategories, setSelectedCategories] = useState([]);

  const loading = transactionsLoading || categoriesLoading;

  // Navigation tabs configuration
  const tabs = [
    {
      id: 'dashboard',
      name: 'Overview',
      icon: '📊',
      description: 'Financial health & key metrics'
    },
    {
      id: 'categories',
      name: 'Categories',
      icon: '🎯',
      description: 'Spending by category analysis'
    },
    {
      id: 'time',
      name: 'Time Analysis',
      icon: '⏰',
      description: 'Trends & patterns over time'
    },
    {
      id: 'budget',
      name: 'Budget Performance',
      icon: '💰',
      description: 'Budget vs actual spending'
    },
    {
      id: 'insights',
      name: 'Smart Insights',
      icon: '🔮',
      description: 'AI-powered recommendations'
    }
  ];

  // Filter transactions based on date range and selected categories
  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    const inDateRange = transactionDate >= dateRange.start && transactionDate <= dateRange.end;
    const inSelectedCategories = selectedCategories.length === 0 || 
      selectedCategories.includes(transaction.category_id);
    return inDateRange && inSelectedCategories;
  });

  // Render active tab content
  const renderTabContent = () => {
    const commonProps = {
      transactions: filteredTransactions,
      categories,
      dateRange,
      setDateRange,
      selectedCategories,
      setSelectedCategories
    };

    switch (activeTab) {
      case 'dashboard':
        return <ReportsDashboard {...commonProps} />;
      case 'categories':
        return <CategoryAnalysis {...commonProps} />;
      case 'time':
        return <TimeAnalysis {...commonProps} />;
      case 'budget':
        return <BudgetAnalysis {...commonProps} />;
      case 'insights':
        return <PredictiveInsights {...commonProps} />;
      default:
        return <ReportsDashboard {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/60 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  📊 Financial Reports
                </h1>
                <p className="text-slate-400">
                  Discover insights and patterns in your financial data
                </p>
              </div>
              
              {/* Quick Stats */}
              <div className="hidden lg:flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {filteredTransactions.length}
                  </div>
                  <div className="text-xs text-slate-400">Transactions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {categories.length}
                  </div>
                  <div className="text-xs text-slate-400">Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24))}
                  </div>
                  <div className="text-xs text-slate-400">Days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-800/30 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                  whitespace-nowrap min-w-fit
                  ${
                    activeTab === tab.id
                      ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300 shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{tab.name}</div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {transactions.length === 0 ? (
          // Empty State
          <div className="text-center py-16">
            <div className="bg-slate-800/50 rounded-2xl p-12 border border-slate-700/50 max-w-md mx-auto">
              <div className="text-6xl mb-6">📊</div>
              <h3 className="text-xl font-semibold text-white mb-4">
                No Data Available
              </h3>
              <p className="text-slate-400 mb-6">
                Start by adding some transactions to see beautiful reports and insights.
              </p>
              <a
                href="/transactions"
                className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
              >
                <span className="mr-2">➕</span>
                Add Transaction
              </a>
            </div>
          </div>
        ) : (
          // Reports Content
          <div className="space-y-8">
            {renderTabContent()}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;