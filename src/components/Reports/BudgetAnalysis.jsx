import React, { useMemo, useState } from 'react';
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
  AreaChart
} from 'recharts';

function BudgetAnalysis({ transactions, categories, dateRange }) {
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'categories', 'trends'
  const [budgetPeriod, setBudgetPeriod] = useState('monthly'); // 'weekly', 'monthly', 'yearly'

  // Mock budget data - In a real app, this would come from a budgets API
  const mockBudgets = useMemo(() => {
    // Create realistic budgets based on actual spending patterns
    const categorySpending = {};
    
    transactions
      .filter(t => t.amount < 0)
      .forEach(transaction => {
        const categoryId = transaction.category_id;
        if (!categorySpending[categoryId]) {
          categorySpending[categoryId] = 0;
        }
        categorySpending[categoryId] += Math.abs(transaction.amount);
      });
    
    return categories.map(category => {
      const actualSpending = categorySpending[category.id] || 0;
      // Set budget as 120% of actual spending with some randomization
      const budgetAmount = actualSpending * (1.1 + Math.random() * 0.3);
      
      return {
        id: category.id,
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
        amount: Math.round(budgetAmount),
        period: budgetPeriod,
        isActive: actualSpending > 0
      };
    }).filter(budget => budget.isActive);
  }, [categories, transactions, budgetPeriod]);

  // Calculate budget performance
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
      const status = percentUsed > 100 ? 'over' : percentUsed > 80 ? 'warning' : 'good';
      
      return {
        ...budget,
        actualSpending,
        remaining,
        percentUsed,
        status,
        variance: actualSpending - budgetAmount,
        variancePercent: budgetAmount > 0 ? ((actualSpending - budgetAmount) / budgetAmount) * 100 : 0
      };
    });
    
    return performance.sort((a, b) => b.percentUsed - a.percentUsed);
  }, [mockBudgets, transactions]);

  // Calculate overall budget statistics
  const budgetStats = useMemo(() => {
    if (budgetPerformance.length === 0) return {};
    
    const totalBudget = budgetPerformance.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgetPerformance.reduce((sum, b) => sum + b.actualSpending, 0);
    const totalRemaining = totalBudget - totalSpent;
    const overallPercentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    const categoriesOverBudget = budgetPerformance.filter(b => b.status === 'over').length;
    const categoriesAtWarning = budgetPerformance.filter(b => b.status === 'warning').length;
    const categoriesOnTrack = budgetPerformance.filter(b => b.status === 'good').length;
    
    const avgVariance = budgetPerformance.reduce((sum, b) => sum + b.variancePercent, 0) / budgetPerformance.length;
    
    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      overallPercentUsed,
      categoriesOverBudget,
      categoriesAtWarning,
      categoriesOnTrack,
      avgVariance,
      totalCategories: budgetPerformance.length
    };
  }, [budgetPerformance]);

  // Prepare chart data
  const chartData = useMemo(() => {
    switch (viewMode) {
      case 'categories':
        return budgetPerformance.map(budget => ({
          name: budget.categoryName,
          budget: budget.amount,
          spent: budget.actualSpending,
          remaining: Math.max(0, budget.remaining),
          over: Math.max(0, -budget.remaining),
          color: budget.categoryColor,
          percentUsed: budget.percentUsed
        }));
      
      case 'trends':
        // Mock monthly trend data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return months.map(month => {
          const budgetTotal = budgetStats.totalBudget;
          const spentTotal = budgetStats.totalSpent * (0.8 + Math.random() * 0.4);
          return {
            month,
            budget: budgetTotal,
            spent: spentTotal,
            variance: spentTotal - budgetTotal
          };
        });
      
      default: // overview
        return [
          {
            name: 'On Track',
            value: budgetStats.categoriesOnTrack,
            color: '#10b981'
          },
          {
            name: 'Warning',
            value: budgetStats.categoriesAtWarning,
            color: '#f59e0b'
          },
          {
            name: 'Over Budget',
            value: budgetStats.categoriesOverBudget,
            color: '#ef4444'
          }
        ].filter(item => item.value > 0);
    }
  }, [viewMode, budgetPerformance, budgetStats]);

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

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* View Mode Selector */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-400">View:</span>
            <div className="flex bg-slate-800 rounded-lg p-1">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'categories', label: 'Categories', icon: '🎯' },
                { id: 'trends', label: 'Trends', icon: '📈' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === mode.id
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="mr-2">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Budget Period Selector */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-400">Period:</span>
            <select
              value={budgetPeriod}
              onChange={(e) => setBudgetPeriod(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Total Budget</h3>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {formatCurrency(budgetStats.totalBudget)}
          </div>
          <div className="text-sm text-slate-400">
            {budgetStats.totalCategories} categories
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Total Spent</h3>
            <span className="text-2xl">💸</span>
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            budgetStats.overallPercentUsed > 100 ? 'text-red-400' :
            budgetStats.overallPercentUsed > 80 ? 'text-yellow-400' : 'text-emerald-400'
          }`}>
            {formatCurrency(budgetStats.totalSpent)}
          </div>
          <div className="text-sm text-slate-400">
            {formatPercentage(budgetStats.overallPercentUsed)} of budget
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Remaining</h3>
            <span className="text-2xl">{budgetStats.totalRemaining >= 0 ? '💚' : '🚨'}</span>
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            budgetStats.totalRemaining >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {formatCurrency(Math.abs(budgetStats.totalRemaining))}
          </div>
          <div className="text-sm text-slate-400">
            {budgetStats.totalRemaining >= 0 ? 'Under budget' : 'Over budget'}
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Categories</h3>
            <span className="text-2xl">🎯</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-400">On Track: {budgetStats.categoriesOnTrack}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-yellow-400">Warning: {budgetStats.categoriesAtWarning}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-400">Over: {budgetStats.categoriesOverBudget}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <span className="mr-3">
            {viewMode === 'overview' ? '📊' : viewMode === 'categories' ? '🎯' : '📈'}
          </span>
          {viewMode === 'overview' ? 'Budget Status Overview' :
           viewMode === 'categories' ? 'Budget vs Actual by Category' : 'Budget Performance Trends'}
        </h3>
        
        {chartData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'overview' ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} categories`, name]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                </PieChart>
              ) : viewMode === 'categories' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value, true)}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(value),
                      name === 'budget' ? 'Budget' : name === 'spent' ? 'Spent' : name === 'remaining' ? 'Remaining' : 'Over Budget'
                    ]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Bar dataKey="budget" fill="#64748b" name="budget" />
                  <Bar dataKey="spent" fill="#3b82f6" name="spent" />
                  <Bar dataKey="over" fill="#ef4444" name="over" />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value, true)}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(value),
                      name === 'budget' ? 'Budget' : name === 'spent' ? 'Spent' : 'Variance'
                    ]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#64748b', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="spent"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-slate-400">
            No budget data available
          </div>
        )}
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