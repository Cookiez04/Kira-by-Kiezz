import React, { useMemo, useState, useCallback } from 'react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Enhanced color palette for better visual distinction
const CATEGORY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2', '#A3E4D7',
  '#FCF3CF', '#FADBD8', '#D5DBDB', '#AED6F1', '#A9DFBF', '#F9E79F', '#D2B4DE', '#AED6F1'
];

function CategoryAnalysis({ transactions, categories, dateRange, selectedCategories, setSelectedCategories, viewMode = 'detailed', onExport }) {
  const [timeframe, setTimeframe] = useState('all'); // 'all', 'month', 'quarter', 'year'
  const [chartType, setChartType] = useState('pie'); // 'pie', 'bar', 'treemap'
  const [sortBy, setSortBy] = useState('amount'); // 'amount', 'count', 'growth', 'efficiency'
  const [showOnlyExpenses] = useState(true);
  const [showImpactTooltip, setShowImpactTooltip] = useState(false);

  // Enhanced category analytics with actionable insights
  const categoryAnalytics = useMemo(() => {
    const analytics = {};
    const now = new Date();
    
    // Filter transactions by timeframe
    let filteredTransactions = transactions.filter(t => {
      if (showOnlyExpenses && t.type !== 'expense') return false;
      
      const transactionDate = new Date(t.date);
      switch (timeframe) {
        case 'month':
          return transactionDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        case 'quarter':
          return transactionDate >= new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        case 'year':
          return transactionDate >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        default:
          return true;
      }
    });

    // Initialize category analytics
    categories.forEach((category, index) => {
      analytics[category.id] = {
        id: category.id,
        name: category.name,
        color: category.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        totalAmount: 0,
        transactionCount: 0,
        averageAmount: 0,
        percentageOfTotal: 0,
        monthlyAverage: 0,
        efficiency: 0, // Amount per transaction
        trend: 'stable', // 'growing', 'declining', 'stable'
        trendPercentage: 0,
        lastTransactionDate: null,
        frequency: 0, // Transactions per month
        budgetImpact: 'medium', // 'high', 'medium', 'low'
        insights: []
      };
    });

    // Process transactions and calculate metrics
    filteredTransactions.forEach(transaction => {
      const categoryId = transaction.category_id;
      const category = categories.find(c => c.id === categoryId);
      
      if (!category || !analytics[categoryId]) return;
      
      const amount = parseFloat(transaction.amount);
      const transactionDate = new Date(transaction.date);
      
      analytics[categoryId].totalAmount += amount;
      analytics[categoryId].transactionCount += 1;
      
      if (!analytics[categoryId].lastTransactionDate || 
          transactionDate > analytics[categoryId].lastTransactionDate) {
        analytics[categoryId].lastTransactionDate = transactionDate;
      }
    });

    // Calculate derived metrics and insights
    const totalSpending = Object.values(analytics).reduce((sum, cat) => sum + cat.totalAmount, 0);
    
    // Calculate period length for frequency calculations
    const periodMonths = timeframe === 'month' ? 1 : timeframe === 'quarter' ? 3 : timeframe === 'year' ? 12 : 12;
    
    Object.values(analytics).forEach(category => {
      // Basic calculations
      category.averageAmount = category.transactionCount > 0 
        ? category.totalAmount / category.transactionCount 
        : 0;
      
      category.percentageOfTotal = totalSpending > 0 
        ? (category.totalAmount / totalSpending) * 100 
        : 0;
      
      category.monthlyAverage = category.totalAmount / periodMonths;
      category.efficiency = category.averageAmount;
      category.frequency = category.transactionCount / periodMonths;
      
      // Budget impact classification
      if (category.percentageOfTotal > 20) {
        category.budgetImpact = 'high';
      } else if (category.percentageOfTotal > 10) {
        category.budgetImpact = 'medium';
      } else {
        category.budgetImpact = 'low';
      }
      
      // Generate actionable insights
      category.insights = [];
      
      if (category.percentageOfTotal > 25) {
        category.insights.push({
          type: 'warning',
          message: `High spending category - ${formatPercentage(category.percentageOfTotal)} of total budget`,
          action: 'Consider setting a spending limit or finding alternatives'
        });
      }
      
      if (category.frequency > 10) {
        category.insights.push({
          type: 'info',
          message: `Very frequent transactions (${category.frequency.toFixed(1)}/month)`,
          action: 'Look for subscription services or recurring charges'
        });
      }
      
      if (category.averageAmount > 100 && category.transactionCount < 5) {
        category.insights.push({
          type: 'tip',
          message: 'High-value, low-frequency spending',
          action: 'Plan these expenses in advance for better budgeting'
        });
      }
      
      if (category.transactionCount === 0) {
        category.insights.push({
          type: 'neutral',
          message: 'No activity in this period',
          action: 'Consider if this category is still relevant'
        });
      }
    });

    return Object.values(analytics)
      .filter(cat => cat.transactionCount > 0)
      .sort((a, b) => {
        switch (sortBy) {
          case 'count':
            return b.transactionCount - a.transactionCount;
          case 'efficiency':
            return b.efficiency - a.efficiency;
          case 'growth':
            return b.trendPercentage - a.trendPercentage;
          default:
            return b.totalAmount - a.totalAmount;
        }
      });
  }, [transactions, categories, timeframe, showOnlyExpenses, sortBy]);

  // Smart insights engine
  const smartInsights = useMemo(() => {
    const insights = [];
    
    if (categoryAnalytics.length === 0) return insights;
    
    const topCategory = categoryAnalytics[0];
    const totalSpending = categoryAnalytics.reduce((sum, cat) => sum + cat.totalAmount, 0);
    const avgCategorySpending = totalSpending / categoryAnalytics.length;
    
    // Top spending insight
    insights.push({
      type: 'primary',
      icon: '🎯',
      title: 'Biggest Expense Category',
      value: formatCurrency(topCategory.totalAmount),
      description: `${topCategory.name} accounts for ${formatPercentage(topCategory.percentageOfTotal)} of your spending`,
      action: topCategory.percentageOfTotal > 30 ? 'Consider reducing expenses in this category' : 'Monitor this category closely',
      color: topCategory.color
    });
    
    // Efficiency insight
    const mostEfficient = [...categoryAnalytics].sort((a, b) => a.efficiency - b.efficiency)[0];
    if (mostEfficient && mostEfficient.efficiency < avgCategorySpending * 0.5) {
      insights.push({
        type: 'positive',
        icon: '💡',
        title: 'Most Cost-Effective',
        value: formatCurrency(mostEfficient.efficiency),
        description: `${mostEfficient.name} has the lowest average transaction amount`,
        action: 'Great job keeping costs low in this category',
        color: mostEfficient.color
      });
    }
    
    // Frequency insight
    const mostFrequent = [...categoryAnalytics].sort((a, b) => b.frequency - a.frequency)[0];
    if (mostFrequent && mostFrequent.frequency > 5) {
      insights.push({
        type: 'info',
        icon: '📊',
        title: 'Most Active Category',
        value: `${mostFrequent.frequency.toFixed(1)}/month`,
        description: `${mostFrequent.name} has the highest transaction frequency`,
        action: 'Check for recurring subscriptions or regular expenses',
        color: mostFrequent.color
      });
    }
    
    // Budget distribution insight
    const highImpactCategories = categoryAnalytics.filter(cat => cat.budgetImpact === 'high');
    if (highImpactCategories.length > 0) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'High-Impact Categories',
        value: `${highImpactCategories.length} categories`,
        description: `${formatPercentage(highImpactCategories.reduce((sum, cat) => sum + cat.percentageOfTotal, 0))} of total spending`,
        action: 'Focus budget optimization efforts on these categories',
        color: '#FF6B6B'
      });
    }
    
    return insights;
  }, [categoryAnalytics]);

  // Chart data preparation
  const chartData = useMemo(() => {
    const filteredData = selectedCategories.length > 0 
      ? categoryAnalytics.filter(cat => selectedCategories.includes(cat.id))
      : categoryAnalytics;
    
    return filteredData.map(category => ({
      name: category.name,
      value: category.totalAmount,
      count: category.transactionCount,
      percentage: category.percentageOfTotal,
      efficiency: category.efficiency,
      frequency: category.frequency,
      color: category.color
    }));
  }, [categoryAnalytics, selectedCategories]);

  // Category selection handlers
  const toggleCategorySelection = useCallback((categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  }, [selectedCategories, setSelectedCategories]);

  const selectTopCategories = useCallback((count = 5) => {
    const topCategories = categoryAnalytics.slice(0, count).map(cat => cat.id);
    setSelectedCategories(topCategories);
  }, [categoryAnalytics, setSelectedCategories]);

  const clearSelection = useCallback(() => {
    setSelectedCategories([]);
  }, [setSelectedCategories]);

  // Render different chart types
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <div>No data available for selected categories</div>
          </div>
        </div>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value, true)}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Amount']}
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                fill="#8884d8"
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
                  color: '#ffffff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Control Panel */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Timeframe */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-400">Period:</span>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          
          {/* Chart Type */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-400">Chart:</span>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pie">Pie Chart</option>
              <option value="bar">Bar Chart</option>
            </select>
          </div>
          
          {/* Sort Options */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="amount">Amount</option>
              <option value="count">Frequency</option>
              <option value="efficiency">Efficiency</option>
            </select>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/10">
          <button
            onClick={() => selectTopCategories(5)}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
          >
            Top 5
          </button>
          <button
            onClick={clearSelection}
            className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
          >
            Clear
          </button>
          {onExport && (
            <button
              onClick={() => onExport('csv')}
              className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm transition-colors"
            >
              📊 Export
            </button>
          )}
          <div className="ml-auto text-sm text-slate-400">
            {selectedCategories.length > 0 ? `${selectedCategories.length} selected` : 'All categories'}
          </div>
        </div>
      </div>

      {/* Main Visualization - Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <span className="mr-3">📈</span>
              Category Overview
            </h3>
            <div className="text-sm text-slate-400">
              {categoryAnalytics.length} categories • {formatCurrency(categoryAnalytics.reduce((sum, cat) => sum + cat.totalAmount, 0))} total
            </div>
          </div>
          
          <div className="h-96">
            {renderChart()}
          </div>
        </div>
        
        {/* Category Details */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <span className="mr-3">📋</span>
              Category Details
            </h3>
            <button
              onMouseEnter={() => setShowImpactTooltip(true)}
              onMouseLeave={() => setShowImpactTooltip(false)}
              className="text-slate-400 hover:text-white transition-colors relative"
            >
              ⓘ
              {/* Impact Tooltip */}
              {showImpactTooltip && (
                <div className="absolute top-6 right-0 w-80 bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-xl text-sm z-50">
                  <h4 className="text-white font-semibold mb-3">Budget Impact Levels</h4>
                  <div className="space-y-3 text-slate-300">
                    <div className="flex items-center space-x-3">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300">HIGH IMPACT</span>
                      <span className="text-sm">More than 20% of total spending</span>
                    </div>
                    <div className="text-xs text-slate-400 ml-16">
                      These categories significantly affect your budget. Consider setting spending limits or finding alternatives.
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">MEDIUM IMPACT</span>
                      <span className="text-sm">10-20% of total spending</span>
                    </div>
                    <div className="text-xs text-slate-400 ml-16">
                      Moderate influence on your budget. Monitor regularly and look for optimization opportunities.
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">LOW IMPACT</span>
                      <span className="text-sm">Less than 10% of total spending</span>
                    </div>
                    <div className="text-xs text-slate-400 ml-16">
                      Minor impact on your budget. These are typically well-controlled expenses.
                    </div>
                  </div>
                </div>
              )}
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {categoryAnalytics.map((category) => (
              <div
                key={category.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedCategories.includes(category.id)
                    ? 'bg-blue-500/20 border-blue-500/30'
                    : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
                }`}
                onClick={() => toggleCategorySelection(category.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <div className="font-medium text-white">{category.name}</div>
                      <div className="text-xs text-slate-400">
                        {category.transactionCount} transactions
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-white">
                      {formatCurrency(category.totalAmount)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatPercentage(category.percentageOfTotal)}
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mb-2">
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
                
                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-slate-400">
                    Avg: {formatCurrency(category.averageAmount)}
                  </div>
                  <div className="text-slate-400">
                    Freq: {category.frequency.toFixed(1)}/mo
                  </div>
                </div>
                
                {/* Budget impact indicator */}
                <div className="mt-2">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    category.budgetImpact === 'high' ? 'bg-red-500/20 text-red-300' :
                    category.budgetImpact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    {category.budgetImpact.toUpperCase()} IMPACT
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Smart Insights Panel */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <span className="mr-3">🧠</span>
          Smart Insights & Recommendations
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {smartInsights.map((insight, index) => (
            <div key={index} className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">{insight.icon}</span>
                <div>
                  <h4 className="text-lg font-semibold text-white">{insight.title}</h4>
                  <div className="text-2xl font-bold text-blue-400 mt-1">{insight.value}</div>
                </div>
              </div>
              <p className="text-slate-300 mb-3">{insight.description}</p>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-sm font-medium text-slate-400 mb-1">Recommendation:</div>
                <div className="text-sm text-slate-200">{insight.action}</div>
              </div>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
}

export default CategoryAnalysis;