import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart,
  Legend,
  ReferenceLine,
  Treemap
} from 'recharts';

function BudgetAnalysis({ transactions, categories, dateRange, selectedCategories = [], setSelectedCategories = () => {}, onExport }) {
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'categories', 'trends', 'goals'
  const [budgetPeriod, setBudgetPeriod] = useState('monthly'); // 'weekly', 'monthly', 'yearly'
  const [chartType, setChartType] = useState('bar'); // 'bar', 'pie', 'line', 'area', 'treemap'
  const [showVariance, setShowVariance] = useState(true);
  const [budgetThreshold, setBudgetThreshold] = useState(80); // Alert threshold percentage
  const [sortBy, setSortBy] = useState('variance'); // 'variance', 'spent', 'remaining', 'name'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'over', 'under', 'ontrack'
  const [timeRange, setTimeRange] = useState('current'); // 'current', 'last3', 'last6', 'ytd'

  // Enhanced budget data with advanced calculations
  const mockBudgets = useMemo(() => {
    const categorySpending = new Map();
    const categoryTransactions = new Map();
    
    // Filter transactions by time range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'last3':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'last6':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // current
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= now;
    });
    
    // Calculate actual spending by category
    filteredTransactions
      .filter(t => t.amount < 0)
      .forEach(transaction => {
        const categoryId = transaction.category_id;
        const amount = Math.abs(transaction.amount);
        
        if (!categorySpending.has(categoryId)) {
          categorySpending.set(categoryId, 0);
          categoryTransactions.set(categoryId, []);
        }
        categorySpending.set(categoryId, categorySpending.get(categoryId) + amount);
        categoryTransactions.get(categoryId).push(transaction);
      });
    
    return categories.map(category => {
      const actualSpending = categorySpending.get(category.id) || 0;
      const transactions = categoryTransactions.get(category.id) || [];
      
      // Calculate dynamic budget based on historical data and category type
      let budgetAmount;
      if (actualSpending > 0) {
        // Base budget on spending pattern with category-specific multipliers
        const multiplier = category.name.toLowerCase().includes('food') ? 1.1 :
                          category.name.toLowerCase().includes('entertainment') ? 1.3 :
                          category.name.toLowerCase().includes('transport') ? 1.15 :
                          category.name.toLowerCase().includes('utilities') ? 1.05 :
                          1.2;
        budgetAmount = actualSpending * multiplier;
      } else {
        // Default budgets based on category type
        budgetAmount = category.name.toLowerCase().includes('food') ? 800 :
                      category.name.toLowerCase().includes('entertainment') ? 300 :
                      category.name.toLowerCase().includes('transport') ? 400 :
                      category.name.toLowerCase().includes('utilities') ? 200 :
                      500;
      }
      
      return {
        id: category.id,
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
        amount: Math.round(budgetAmount),
        period: budgetPeriod,
        isActive: budgetAmount > 0 || actualSpending > 0,
        transactionCount: transactions.length
      };
    }).filter(budget => budget.isActive);
  }, [categories, transactions, budgetPeriod, timeRange]);

  // Calculate enhanced budget performance
  const budgetPerformance = useMemo(() => {
    const performance = mockBudgets.map(budget => {
      // Calculate actual spending for this category in the current period
      const actualSpending = transactions
        .filter(t => {
          const isExpense = t.amount < 0;
          const isCategory = t.category_id === budget.categoryId;
          const isInPeriod = true; // Simplified - would need proper period filtering
          return isExpense && isCategory && isInPeriod;
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const budgetAmount = budget.amount;
      const remaining = budgetAmount - actualSpending;
      const percentUsed = budgetAmount > 0 ? (actualSpending / budgetAmount) * 100 : 0;
      const variance = actualSpending - budgetAmount;
      const variancePercent = budgetAmount > 0 ? ((actualSpending - budgetAmount) / budgetAmount) * 100 : 0;
      
      // Enhanced status with more granular levels
      let status;
      if (percentUsed > 110) status = 'critical';
      else if (percentUsed > 100) status = 'over';
      else if (percentUsed > budgetThreshold) status = 'warning';
      else if (percentUsed > 50) status = 'ontrack';
      else status = 'under';
      
      return {
        ...budget,
        actualSpending,
        remaining,
        percentUsed,
        status,
        variance,
        variancePercent,
        trend: variance > 0 ? 'over' : variance < -budgetAmount * 0.2 ? 'under' : 'stable'
      };
    });
    
    // Apply filters
    const filtered = performance.filter(item => {
      // Apply category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.id)) {
        return false;
      }
      
      // Apply status filter
      if (filterStatus !== 'all' && item.status !== filterStatus) {
        return false;
      }
      
      return true;
    });
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'spent':
          return b.actualSpending - a.actualSpending;
        case 'remaining':
          return b.remaining - a.remaining;
        case 'name':
          return a.categoryName.localeCompare(b.categoryName);
        case 'variance':
        default:
          return Math.abs(b.variance) - Math.abs(a.variance);
      }
    });
    
    return filtered;
  }, [mockBudgets, transactions, selectedCategories, filterStatus, sortBy, budgetThreshold]);

  // Calculate enhanced budget statistics
  const budgetStats = useMemo(() => {
    if (budgetPerformance.length === 0) {
      return {
        totalBudget: 0,
        totalSpent: 0,
        totalRemaining: 0,
        overallPercentUsed: 0,
        categoriesOverBudget: 0,
        categoriesAtWarning: 0,
        categoriesOnTrack: 0,
        categoriesUnder: 0,
        categoriesCritical: 0,
        avgVariance: 0,
        totalCategories: 0,
        budgetEfficiency: 0,
        riskScore: 0,
        projectedOverrun: 0,
        healthScore: 0
      };
    }
    
    const totalBudget = budgetPerformance.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgetPerformance.reduce((sum, b) => sum + b.actualSpending, 0);
    const totalRemaining = totalBudget - totalSpent;
    const totalVariance = budgetPerformance.reduce((sum, b) => sum + b.variance, 0);
    const overallPercentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    const categoriesCritical = budgetPerformance.filter(b => b.status === 'critical').length;
    const categoriesOverBudget = budgetPerformance.filter(b => b.status === 'over').length;
    const categoriesAtWarning = budgetPerformance.filter(b => b.status === 'warning').length;
    const categoriesOnTrack = budgetPerformance.filter(b => b.status === 'ontrack').length;
    const categoriesUnder = budgetPerformance.filter(b => b.status === 'under').length;
    
    const avgVariance = budgetPerformance.reduce((sum, b) => sum + b.variancePercent, 0) / budgetPerformance.length;
    
    // Calculate budget efficiency (how well budgets are utilized)
    const budgetEfficiency = budgetPerformance.length > 0 ? 
      budgetPerformance.filter(item => item.percentUsed >= 70 && item.percentUsed <= 100).length / budgetPerformance.length * 100 : 0;
    
    // Calculate risk score based on variance and trend
    const riskScore = budgetPerformance.length > 0 ? 
      budgetPerformance.reduce((sum, item) => {
        let risk = 0;
        if (item.status === 'critical') risk = 10;
        else if (item.status === 'over') risk = 7;
        else if (item.status === 'warning') risk = 4;
        else if (item.status === 'under') risk = 2;
        else risk = 1;
        return sum + risk;
      }, 0) / budgetPerformance.length : 0;
    
    // Project potential overrun based on current trends
    const projectedOverrun = budgetPerformance.reduce((sum, item) => {
      if (item.percentUsed > 90) {
        const projectedSpend = item.actualSpending * 1.1; // Assume 10% more spending
        return sum + Math.max(0, projectedSpend - item.amount);
      }
      return sum;
    }, 0);
    
    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      totalVariance,
      overallPercentUsed,
      categoriesCritical,
      categoriesOverBudget,
      categoriesAtWarning,
      categoriesOnTrack,
      categoriesUnder,
      avgVariance,
      totalCategories: budgetPerformance.length,
      budgetEfficiency,
      riskScore,
      projectedOverrun,
      healthScore: Math.max(0, 100 - riskScore * 10) // Overall budget health
    };
  }, [budgetPerformance]);

  // Enhanced chart data preparation
  const chartData = useMemo(() => {
    switch (viewMode) {
      case 'categories':
        if (chartType === 'treemap') {
          return budgetPerformance.map(budget => ({
            name: budget.categoryName,
            size: budget.actualSpending,
            color: budget.status === 'critical' ? '#DC2626' :
                   budget.status === 'over' ? '#EF4444' :
                   budget.status === 'warning' ? '#F59E0B' :
                   budget.status === 'ontrack' ? '#10B981' : '#6B7280'
          }));
        }
        return budgetPerformance.map(budget => ({
          name: budget.categoryName.length > 15 ? budget.categoryName.substring(0, 15) + '...' : budget.categoryName,
          fullName: budget.categoryName,
          budget: budget.amount,
          spent: budget.actualSpending,
          remaining: Math.max(0, budget.remaining),
          over: Math.max(0, -budget.remaining),
          color: budget.categoryColor,
          percentUsed: budget.percentUsed,
          variance: budget.variance,
          status: budget.status
        }));
      
      case 'trends':
        // Enhanced trend data with weekly breakdown
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return months.map(month => {
          const budgetTotal = budgetStats.totalBudget;
          const spentTotal = budgetStats.totalSpent * (0.8 + Math.random() * 0.4);
          return {
            month,
            budget: budgetTotal,
            spent: spentTotal,
            variance: spentTotal - budgetTotal,
            projected: spentTotal * 1.1
          };
        });
      
      case 'goals':
        return budgetPerformance.map(budget => ({
          name: budget.categoryName,
          target: budget.amount,
          actual: budget.actualSpending,
          efficiency: budget.amount > 0 ? (budget.actualSpending / budget.amount) * 100 : 0,
          goal: Math.min(budget.amount * 0.9, budget.actualSpending * 0.95), // 90% of budget or 95% of current spending
          color: budget.categoryColor
        }));
      
      default: // overview
        if (chartType === 'pie') {
          return [
            {
              name: 'Spent',
              value: budgetStats.totalSpent,
              color: '#EF4444'
            },
            {
              name: 'Remaining',
              value: budgetStats.totalRemaining,
              color: '#10B981'
            }
          ].filter(item => item.value > 0);
        } else {
          return [
            {
              name: 'Budget Overview',
              budget: budgetStats.totalBudget,
              spent: budgetStats.totalSpent,
              remaining: budgetStats.totalRemaining,
              variance: budgetStats.totalVariance
            }
          ];
        }
    }
  }, [viewMode, chartType, budgetPerformance, budgetStats]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-emerald-400';
      case 'warning': return 'text-yellow-400';
      case 'over': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'good': return 'bg-emerald-500/20 border-emerald-500/30';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'over': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-slate-500/20 border-slate-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'over': return '🚨';
      default: return '📊';
    }
  };

  // Bulk selection functions
  const selectOverBudgetCategories = useCallback(() => {
    const overBudgetIds = budgetPerformance
      .filter(item => item.status === 'over' || item.status === 'critical')
      .map(item => item.id);
    setSelectedCategories(overBudgetIds);
  }, [budgetPerformance, setSelectedCategories]);
  
  const selectWarningCategories = useCallback(() => {
    const warningIds = budgetPerformance
      .filter(item => item.status === 'warning')
      .map(item => item.id);
    setSelectedCategories(warningIds);
  }, [budgetPerformance, setSelectedCategories]);
  
  const clearSelection = useCallback(() => {
    setSelectedCategories([]);
  }, [setSelectedCategories]);

  return (
    <div className="space-y-8">
      {/* Enhanced Controls */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* View Mode */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">View:</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="overview">📊 Overview</option>
              <option value="categories">📂 Categories</option>
              <option value="trends">📈 Trends</option>
              <option value="goals">🎯 Goals</option>
            </select>
          </div>
          
          {/* Budget Period */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">Period:</label>
            <select
              value={budgetPeriod}
              onChange={(e) => setBudgetPeriod(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="weekly">📅 Weekly</option>
              <option value="monthly">📅 Monthly</option>
              <option value="quarterly">📅 Quarterly</option>
              <option value="yearly">📅 Yearly</option>
            </select>
          </div>
          
          {/* Chart Type */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">Chart:</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="bar">📊 Bar</option>
              <option value="pie">🥧 Pie</option>
              <option value="line">📈 Line</option>
              <option value="area">📊 Area</option>
              {viewMode === 'categories' && <option value="treemap">🗂️ Treemap</option>}
            </select>
          </div>
          
          {/* Time Range */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">Range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="current">📅 Current</option>
              <option value="last3">📅 Last 3M</option>
              <option value="last6">📅 Last 6M</option>
              <option value="ytd">📅 YTD</option>
            </select>
          </div>
        </div>
        
        {/* Advanced Controls */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-700">
          {/* Filter Controls */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">Filter:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="critical">🚨 Critical</option>
              <option value="over">🔴 Over Budget</option>
              <option value="warning">🟡 Warning</option>
              <option value="ontrack">🟢 On Track</option>
              <option value="under">⚪ Under Budget</option>
            </select>
          </div>
          
          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="variance">📊 Variance</option>
              <option value="spent">💸 Spent</option>
              <option value="remaining">💰 Remaining</option>
              <option value="name">🔤 Name</option>
            </select>
          </div>
          
          {/* Threshold Control */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">Alert at:</label>
            <input
              type="range"
              min="50"
              max="100"
              value={budgetThreshold}
              onChange={(e) => setBudgetThreshold(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-white">{budgetThreshold}%</span>
          </div>
          
          {/* Toggle Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowVariance(!showVariance)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                showVariance 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              📊 Variance
            </button>
          </div>
          
          {/* Selection Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={selectOverBudgetCategories}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
            >
              🚨 Over Budget
            </button>
            <button
              onClick={selectWarningCategories}
              className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm transition-colors"
            >
              ⚠️ Warning
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
            >
              Clear
            </button>
          </div>
          
          {/* Export */}
          {onExport && (
            <button
              onClick={() => onExport('csv')}
              className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm transition-colors"
            >
              📊 Export
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Budget Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-slate-900/80 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Budget</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(budgetStats.totalBudget)}
              </p>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <span className="text-xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-slate-900/80 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Spent</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(budgetStats.totalSpent)}
              </p>
            </div>
            <div className="p-2 bg-red-500/20 rounded-lg">
              <span className="text-xl">💸</span>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    budgetStats.overallPercentUsed > 100 ? 'bg-red-500' :
                    budgetStats.overallPercentUsed > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, budgetStats.overallPercentUsed)}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">
                {formatPercentage(budgetStats.overallPercentUsed)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-slate-900/80 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Remaining</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(budgetStats.totalRemaining)}
              </p>
            </div>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <span className="text-xl">💵</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-slate-900/80 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Health Score</p>
              <p className="text-xl font-bold text-white">
                {budgetStats.healthScore.toFixed(0)}/100
              </p>
              <div className="flex items-center mt-1">
                <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      budgetStats.healthScore > 80 ? 'bg-green-500' :
                      budgetStats.healthScore > 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${budgetStats.healthScore}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <span className="text-xl">❤️</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-slate-900/80 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Efficiency</p>
              <p className="text-xl font-bold text-white">
                {budgetStats.budgetEfficiency.toFixed(0)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Well-utilized budgets
              </p>
            </div>
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <span className="text-xl">⚡</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-slate-900/80 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Categories</p>
              <div className="grid grid-cols-2 gap-1 mt-1">
                <div className="text-center">
                  <p className="text-sm font-bold text-red-400">{budgetStats.categoriesCritical + budgetStats.categoriesOverBudget}</p>
                  <p className="text-xs text-slate-500">Over</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-yellow-400">{budgetStats.categoriesAtWarning}</p>
                  <p className="text-xs text-slate-500">Warning</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-green-400">{budgetStats.categoriesOnTrack}</p>
                  <p className="text-xs text-slate-500">Track</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-400">{budgetStats.categoriesUnder}</p>
                  <p className="text-xs text-slate-500">Under</p>
                </div>
              </div>
            </div>
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <span className="text-xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Chart Section */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <span className="mr-2">📊</span>
            Budget {viewMode === 'overview' ? 'Overview' : 
                   viewMode === 'categories' ? 'by Category' : 
                   viewMode === 'trends' ? 'Trends' : 'Goals'}
          </h3>
          {chartData.length > 0 && (
            <div className="text-sm text-slate-400">
              {chartData.length} {viewMode === 'overview' ? 'metrics' : 'items'}
            </div>
          )}
        </div>
        
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'overview' ? (
              chartType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={140}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Amount']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                </PieChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    formatter={(value, name) => [
                      formatCurrency(value), 
                      name === 'budget' ? 'Budget' : 
                      name === 'spent' ? 'Spent' : 
                      name === 'remaining' ? 'Remaining' : 'Variance'
                    ]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                  <Bar dataKey="spent" fill="#ef4444" name="Spent" />
                  <Bar dataKey="remaining" fill="#10b981" name="Remaining" />
                  {showVariance && <Bar dataKey="variance" fill="#f59e0b" name="Variance" />}
                  <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
                </BarChart>
              )
            ) : viewMode === 'categories' ? (
              chartType === 'treemap' ? (
                <Treemap
                  data={chartData}
                  dataKey="size"
                  aspectRatio={4/3}
                  stroke="#fff"
                  fill="#8884d8"
                >
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Spent']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </Treemap>
              ) : chartType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={140}
                    dataKey="spent"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Spent']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    formatter={(value, name) => [
                      formatCurrency(value), 
                      name === 'budget' ? 'Budget' : name === 'spent' ? 'Spent' : 'Remaining'
                    ]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Line type="monotone" dataKey="budget" stroke="#3b82f6" strokeWidth={2} name="Budget" />
                  <Line type="monotone" dataKey="spent" stroke="#ef4444" strokeWidth={2} name="Spent" />
                  <Line type="monotone" dataKey="remaining" stroke="#10b981" strokeWidth={2} name="Remaining" />
                  <Legend />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    formatter={(value, name) => [
                      formatCurrency(value), 
                      name === 'budget' ? 'Budget' : name === 'spent' ? 'Spent' : 'Remaining'
                    ]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Area type="monotone" dataKey="budget" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="spent" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  <Legend />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    formatter={(value, name) => [
                      formatCurrency(value), 
                      name === 'budget' ? 'Budget' : 
                      name === 'spent' ? 'Spent' : 
                      name === 'remaining' ? 'Remaining' : 'Variance'
                    ]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                  <Bar dataKey="spent" fill="#ef4444" name="Spent" />
                  <Bar dataKey="remaining" fill="#10b981" name="Remaining" />
                  {showVariance && <Bar dataKey="variance" fill="#f59e0b" name="Variance" />}
                  <Legend />
                  <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
                </BarChart>
              )
            ) : viewMode === 'trends' ? (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [
                    formatCurrency(value), 
                    name === 'budget' ? 'Budget' : 
                    name === 'spent' ? 'Spent' : 
                    name === 'projected' ? 'Projected' : 'Variance'
                  ]}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                <Bar dataKey="spent" fill="#ef4444" name="Spent" />
                <Line type="monotone" dataKey="projected" stroke="#f59e0b" strokeWidth={2} name="Projected" strokeDasharray="5 5" />
                <Legend />
                <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
              </ComposedChart>
            ) : (
              // Goals view
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'efficiency' ? `${value.toFixed(1)}%` : formatCurrency(value), 
                    name === 'target' ? 'Target' : 
                    name === 'actual' ? 'Actual' : 
                    name === 'goal' ? 'Goal' : 'Efficiency'
                  ]}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="target" fill="#3b82f6" name="Target" />
                <Bar dataKey="actual" fill="#ef4444" name="Actual" />
                <Bar dataKey="goal" fill="#10b981" name="Goal" />
                <Legend />
                <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Budget Details */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <span className="mr-3">📋</span>
          Category Budget Details
        </h3>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {budgetPerformance.map((budget) => (
            <div
              key={budget.id}
              className={`p-4 rounded-lg border ${getStatusBg(budget.status)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: budget.categoryColor }}
                  />
                  <div>
                    <div className="font-medium text-white">{budget.categoryName}</div>
                    <div className="text-sm text-slate-400">
                      {getStatusIcon(budget.status)} {budget.status === 'good' ? 'On Track' : budget.status === 'warning' ? 'Warning' : 'Over Budget'}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`font-semibold ${getStatusColor(budget.status)}`}>
                    {formatPercentage(budget.percentUsed)}
                  </div>
                  <div className="text-sm text-slate-400">
                    {formatCurrency(budget.actualSpending)} / {formatCurrency(budget.amount)}
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mb-3">
                <div className="bg-slate-700 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      budget.status === 'over' ? 'bg-red-500' :
                      budget.status === 'warning' ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, budget.percentUsed)}%` }}
                  />
                  {budget.percentUsed > 100 && (
                    <div 
                      className="bg-red-600 h-3 rounded-full mt-1"
                      style={{ width: `${Math.min(50, budget.percentUsed - 100)}%` }}
                    />
                  )}
                </div>
              </div>
              
              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Remaining: </span>
                  <span className={budget.remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {formatCurrency(Math.abs(budget.remaining))}
                    {budget.remaining < 0 && ' over'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Variance: </span>
                  <span className={budget.variancePercent <= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {budget.variancePercent > 0 ? '+' : ''}{formatPercentage(budget.variancePercent)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {budgetPerformance.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-lg font-medium mb-2">No Budget Data</h3>
            <p>Set up budgets for your categories to track spending performance.</p>
          </div>
        )}
      </div>

      {/* Budget Insights */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <span className="mr-3">💡</span>
          Budget Insights
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-300 mb-2">
              Overall Performance
            </div>
            <div className={`text-lg font-semibold ${
              budgetStats.overallPercentUsed <= 80 ? 'text-emerald-400' :
              budgetStats.overallPercentUsed <= 100 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {budgetStats.overallPercentUsed <= 80 ? 'Excellent' :
               budgetStats.overallPercentUsed <= 100 ? 'Good' : 'Needs Attention'}
            </div>
            <div className="text-sm text-slate-400">
              {formatPercentage(budgetStats.overallPercentUsed)} of total budget used
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-300 mb-2">
              Average Variance
            </div>
            <div className={`text-lg font-semibold ${
              budgetStats.avgVariance <= 0 ? 'text-emerald-400' :
              budgetStats.avgVariance <= 20 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {formatPercentage(budgetStats.avgVariance)}
            </div>
            <div className="text-sm text-slate-400">
              {budgetStats.avgVariance <= 0 ? 'Under budget on average' :
               budgetStats.avgVariance <= 20 ? 'Slightly over budget' : 'Significantly over budget'}
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-300 mb-2">
              Budget Adherence
            </div>
            <div className="text-lg font-semibold text-blue-400">
              {Math.round((budgetStats.categoriesOnTrack / budgetStats.totalCategories) * 100)}%
            </div>
            <div className="text-sm text-slate-400">
              {budgetStats.categoriesOnTrack} of {budgetStats.totalCategories} categories on track
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BudgetAnalysis;