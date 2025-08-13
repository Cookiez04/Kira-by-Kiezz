import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState('detailed'); // 'detailed' | 'compact'
  const [autoRefresh, setAutoRefresh] = useState(false);

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

  // Memoized filtered transactions for performance
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const inDateRange = transactionDate >= dateRange.start && transactionDate <= dateRange.end;
      const inSelectedCategories = selectedCategories.length === 0 || 
        selectedCategories.includes(transaction.category_id);
      return inDateRange && inSelectedCategories;
    });
  }, [transactions, dateRange, selectedCategories]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      // Trigger data refresh if needed
      window.location.reload();
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Export functionality
  const handleExport = useCallback(async (format = 'csv') => {
    setIsExporting(true);
    try {
      const data = filteredTransactions.map(t => ({
        date: t.date,
        amount: t.amount,
        description: t.description,
        category: categories.find(c => c.id === t.category_id)?.name || 'Unknown'
      }));
      
      if (format === 'csv') {
        const csv = [
          'Date,Amount,Description,Category',
          ...data.map(row => `${row.date},${row.amount},"${row.description}",${row.category}`)
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [filteredTransactions, categories]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'e':
            e.preventDefault();
            handleExport();
            break;
          case '1':
            e.preventDefault();
            setActiveTab('dashboard');
            break;
          case '2':
            e.preventDefault();
            setActiveTab('categories');
            break;
          case '3':
            e.preventDefault();
            setActiveTab('time');
            break;
          case '4':
            e.preventDefault();
            setActiveTab('budget');
            break;
          case '5':
            e.preventDefault();
            setActiveTab('insights');
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleExport]);

  // Render active tab content with error boundary
  const renderTabContent = useCallback(() => {
    const commonProps = {
      transactions: filteredTransactions,
      categories,
      dateRange,
      setDateRange,
      selectedCategories,
      setSelectedCategories,
      viewMode,
      onExport: handleExport
    };

    try {
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
    } catch (error) {
      console.error('Error rendering tab content:', error);
      return (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-400 mb-2">Something went wrong</h3>
          <p className="text-slate-400 mb-4">There was an error loading this report section.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }
  }, [activeTab, filteredTransactions, categories, dateRange, setDateRange, selectedCategories, setSelectedCategories, viewMode, handleExport]);

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
              {/* Quick Stats & Controls */}
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
                    {(() => {
                      if (filteredTransactions.length === 0) return 0;
                      const transactionDates = filteredTransactions.map(t => new Date(t.date));
                      const earliestDate = new Date(Math.min(...transactionDates));
                      const latestDate = new Date(Math.max(...transactionDates));
                      return Math.ceil((latestDate - earliestDate) / (1000 * 60 * 60 * 24)) + 1;
                    })()} 
                  </div>
                  <div className="text-xs text-slate-400">Days</div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-6">
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={isExporting || filteredTransactions.length === 0}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white rounded-lg text-sm transition-colors flex items-center space-x-2"
                    title="Export to CSV (Ctrl+E)"
                  >
                    <span>{isExporting ? '⏳' : '📊'}</span>
                    <span>Export</span>
                  </button>
                  
                  <button
                    onClick={() => setViewMode(viewMode === 'detailed' ? 'compact' : 'detailed')}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                    title="Toggle view mode"
                  >
                    {viewMode === 'detailed' ? '📋' : '📊'}
                  </button>
                  
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      autoRefresh 
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                    title="Auto-refresh every 5 minutes"
                  >
                    {autoRefresh ? '🔄' : '⏸️'}
                  </button>
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
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                  whitespace-nowrap min-w-fit group relative
                  ${
                    activeTab === tab.id
                      ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300 shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }
                `}
                title={`${tab.name} (Ctrl+${index + 1})`}
                aria-label={`Switch to ${tab.name} tab`}
              >
                <span className="text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div className="font-medium flex items-center">
                    {tab.name}
                    <span className="ml-2 text-xs opacity-50">⌘{index + 1}</span>
                  </div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
                
                {/* Active indicator */}
                {activeTab === tab.id && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full" />
                )}
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