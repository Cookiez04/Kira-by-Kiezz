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
  Area,
  AreaChart
} from 'recharts';

function CategoryAnalysis({ transactions, categories, dateRange, selectedCategories, setSelectedCategories }) {
  const [viewMode, setViewMode] = useState('spending'); // 'spending', 'frequency', 'trends'
  const [sortBy, setSortBy] = useState('amount'); // 'amount', 'count', 'average'

  // Calculate comprehensive category statistics
  const categoryStats = useMemo(() => {
    const stats = {};
    
    // Initialize all categories
    categories.forEach(category => {
      stats[category.id] = {
        id: category.id,
        name: category.name,
        color: category.color,
        totalAmount: 0,
        transactionCount: 0,
        averageAmount: 0,
        incomeAmount: 0,
        expenseAmount: 0,
        transactions: [],
        monthlyData: {}
      };
    });
    
    // Process transactions
    transactions.forEach(transaction => {
      const categoryId = transaction.category_id;
      const category = categories.find(c => c.id === categoryId);
      
      if (!category) return;
      
      const amount = Math.abs(transaction.amount);
      const isIncome = transaction.amount > 0;
      const month = new Date(transaction.date).toISOString().slice(0, 7); // YYYY-MM
      
      // Update totals
      stats[categoryId].totalAmount += amount;
      stats[categoryId].transactionCount += 1;
      stats[categoryId].transactions.push(transaction);
      
      if (isIncome) {
        stats[categoryId].incomeAmount += amount;
      } else {
        stats[categoryId].expenseAmount += amount;
      }
      
      // Monthly data for trends
      if (!stats[categoryId].monthlyData[month]) {
        stats[categoryId].monthlyData[month] = {
          month,
          amount: 0,
          count: 0
        };
      }
      stats[categoryId].monthlyData[month].amount += amount;
      stats[categoryId].monthlyData[month].count += 1;
    });
    
    // Calculate averages and percentages
    const totalSpending = Object.values(stats).reduce((sum, cat) => sum + cat.expenseAmount, 0);
    
    Object.values(stats).forEach(category => {
      category.averageAmount = category.transactionCount > 0 
        ? category.totalAmount / category.transactionCount 
        : 0;
      category.percentageOfTotal = totalSpending > 0 
        ? (category.expenseAmount / totalSpending) * 100 
        : 0;
      category.monthlyTrend = Object.values(category.monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    });
    
    return Object.values(stats)
      .filter(cat => cat.transactionCount > 0)
      .sort((a, b) => {
        switch (sortBy) {
          case 'count':
            return b.transactionCount - a.transactionCount;
          case 'average':
            return b.averageAmount - a.averageAmount;
          default:
            return b.expenseAmount - a.expenseAmount;
        }
      });
  }, [transactions, categories, sortBy]);

  // Filter categories based on selection
  const filteredStats = useMemo(() => {
    if (selectedCategories.length === 0) return categoryStats;
    return categoryStats.filter(cat => selectedCategories.includes(cat.id));
  }, [categoryStats, selectedCategories]);

  // Prepare chart data based on view mode
  const chartData = useMemo(() => {
    switch (viewMode) {
      case 'frequency':
        return filteredStats.map(cat => ({
          name: cat.name,
          value: cat.transactionCount,
          color: cat.color,
          average: cat.averageAmount
        }));
      case 'trends':
        // Prepare monthly trend data for line chart
        const months = [...new Set(transactions.map(t => 
          new Date(t.date).toISOString().slice(0, 7)
        ))].sort();
        
        return months.map(month => {
          const monthData = { month };
          filteredStats.forEach(cat => {
            const monthlyAmount = cat.monthlyData[month]?.amount || 0;
            monthData[cat.name] = monthlyAmount;
          });
          return monthData;
        });
      default: // spending
        return filteredStats.map(cat => ({
          name: cat.name,
          value: cat.expenseAmount,
          color: cat.color,
          count: cat.transactionCount,
          percentage: cat.percentageOfTotal
        }));
    }
  }, [viewMode, filteredStats, transactions]);

  // Category comparison insights
  const insights = useMemo(() => {
    if (categoryStats.length === 0) return [];
    
    const insights = [];
    const topCategory = categoryStats[0];
    const totalCategories = categoryStats.length;
    const avgSpendingPerCategory = categoryStats.reduce((sum, cat) => sum + cat.expenseAmount, 0) / totalCategories;
    
    // Top spending category
    insights.push({
      type: 'top',
      title: 'Highest Spending',
      description: `${topCategory.name} accounts for ${formatPercentage(topCategory.percentageOfTotal)} of your expenses`,
      value: formatCurrency(topCategory.expenseAmount),
      color: topCategory.color
    });
    
    // Most frequent category
    const mostFrequent = [...categoryStats].sort((a, b) => b.transactionCount - a.transactionCount)[0];
    if (mostFrequent.id !== topCategory.id) {
      insights.push({
        type: 'frequent',
        title: 'Most Transactions',
        description: `${mostFrequent.name} has ${mostFrequent.transactionCount} transactions`,
        value: `${mostFrequent.transactionCount} txns`,
        color: mostFrequent.color
      });
    }
    
    // Highest average transaction
    const highestAvg = [...categoryStats].sort((a, b) => b.averageAmount - a.averageAmount)[0];
    insights.push({
      type: 'average',
      title: 'Highest Average',
      description: `${highestAvg.name} averages ${formatCurrency(highestAvg.averageAmount)} per transaction`,
      value: formatCurrency(highestAvg.averageAmount),
      color: highestAvg.color
    });
    
    return insights;
  }, [categoryStats]);

  const toggleCategorySelection = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const clearSelection = () => {
    setSelectedCategories([]);
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
                { id: 'spending', label: 'Spending', icon: '💰' },
                { id: 'frequency', label: 'Frequency', icon: '📊' },
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
          
          {/* Sort Options */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="amount">Total Amount</option>
              <option value="count">Transaction Count</option>
              <option value="average">Average Amount</option>
            </select>
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-400">
              {selectedCategories.length > 0 ? `${selectedCategories.length} selected` : 'All categories'}
            </span>
            {selectedCategories.length > 0 && (
              <button
                onClick={clearSelection}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <span className="mr-3">
            {viewMode === 'spending' ? '💰' : viewMode === 'frequency' ? '📊' : '📈'}
          </span>
          {viewMode === 'spending' ? 'Spending by Category' :
           viewMode === 'frequency' ? 'Transaction Frequency' : 'Category Trends'}
        </h3>
        
        {chartData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'trends' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(month) => new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value, true)}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(value), name]}
                    labelFormatter={(month) => new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  {filteredStats.slice(0, 5).map((category, index) => (
                    <Line
                      key={category.id}
                      type="monotone"
                      dataKey={category.name}
                      stroke={category.color}
                      strokeWidth={2}
                      dot={{ fill: category.color, strokeWidth: 2, r: 4 }}
                    />
                  ))}
                </LineChart>
              ) : (
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
                    tickFormatter={(value) => 
                      viewMode === 'frequency' ? value.toString() : formatCurrency(value, true)
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      viewMode === 'frequency' ? `${value} transactions` : formatCurrency(value),
                      viewMode === 'frequency' ? 'Count' : 'Amount'
                    ]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill={(entry) => entry.color}
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-slate-400">
            No data available for selected categories
          </div>
        )}
      </div>

      {/* Category List & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category List */}
        <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <span className="mr-3">📋</span>
            Category Details
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {categoryStats.map((category) => (
              <div
                key={category.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedCategories.includes(category.id)
                    ? 'bg-blue-500/20 border-blue-500/30'
                    : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
                }`}
                onClick={() => toggleCategorySelection(category.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <div className="font-medium text-white">{category.name}</div>
                      <div className="text-sm text-slate-400">
                        {category.transactionCount} transactions • Avg: {formatCurrency(category.averageAmount)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-white">
                      {formatCurrency(category.expenseAmount)}
                    </div>
                    <div className="text-sm text-slate-400">
                      {formatPercentage(category.percentageOfTotal)}
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="bg-slate-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: category.color,
                        width: `${Math.min(100, category.percentageOfTotal * 2)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Insights Panel */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <span className="mr-3">💡</span>
            Key Insights
          </h3>
          
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: insight.color }}
                  />
                  <span className="text-sm font-medium text-slate-300">
                    {insight.title}
                  </span>
                </div>
                <div className="text-lg font-semibold text-white mb-1">
                  {insight.value}
                </div>
                <div className="text-sm text-slate-400">
                  {insight.description}
                </div>
              </div>
            ))}
            
            {/* Category Distribution */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-300 mb-2">
                Distribution
              </div>
              <div className="text-lg font-semibold text-white mb-1">
                {categoryStats.length} Categories
              </div>
              <div className="text-sm text-slate-400">
                Average {formatCurrency(categoryStats.reduce((sum, cat) => sum + cat.expenseAmount, 0) / categoryStats.length)} per category
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CategoryAnalysis;