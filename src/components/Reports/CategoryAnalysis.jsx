import React, { useMemo, useState, useCallback } from 'react';
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
  AreaChart,
  ComposedChart,
  Treemap
} from 'recharts';

function CategoryAnalysis({ transactions, categories, dateRange, selectedCategories, setSelectedCategories, viewMode = 'detailed', onExport }) {
  const [viewType, setViewType] = useState('spending'); // 'spending', 'frequency', 'trends', 'treemap'
  const [sortBy, setSortBy] = useState('amount'); // 'amount', 'count', 'average', 'trend', 'volatility', 'frequency'
  const [timeframe, setTimeframe] = useState('all'); // 'all', 'month', 'quarter', 'year'
  const [showOnlyExpenses, setShowOnlyExpenses] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('current'); // 'current', 'previous', 'comparison'

  // Enhanced category statistics with time filtering
  const categoryStats = useMemo(() => {
    const stats = {};
    
    // Filter transactions by timeframe
    const now = new Date();
    let filteredTransactions = transactions;
    
    if (timeframe !== 'all') {
      const cutoffDate = new Date();
      switch (timeframe) {
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      filteredTransactions = transactions.filter(t => new Date(t.date) >= cutoffDate);
    }
    
    // Filter by expense/income type
    if (showOnlyExpenses) {
      filteredTransactions = filteredTransactions.filter(t => t.type === 'expense');
    }
    
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
        monthlyData: {},
        weeklyData: {},
        trend: 0,
        volatility: 0,
        frequency: 0
      };
    });
    
    // Process transactions
    filteredTransactions.forEach(transaction => {
      const categoryId = transaction.category_id;
      const category = categories.find(c => c.id === categoryId);
      
      if (!category) return;
      
      const amount = parseFloat(transaction.amount);
      const isIncome = transaction.type === 'income';
      const date = new Date(transaction.date);
      const month = date.toISOString().slice(0, 7); // YYYY-MM
      const week = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
      
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
      
      // Weekly data
      if (!stats[categoryId].weeklyData[week]) {
        stats[categoryId].weeklyData[week] = { amount: 0, count: 0 };
      }
      stats[categoryId].weeklyData[week].amount += amount;
      stats[categoryId].weeklyData[week].count += 1;
    });
    
    // Calculate enhanced metrics
    const totalSpending = Object.values(stats).reduce((sum, cat) => sum + cat.expenseAmount, 0);
    
    Object.values(stats).forEach(category => {
      category.averageAmount = category.transactionCount > 0 
        ? category.totalAmount / category.transactionCount 
        : 0;
      category.percentageOfTotal = totalSpending > 0 
        ? (category.expenseAmount / totalSpending) * 100 
        : 0;
      category.monthlyTrend = Object.values(category.monthlyData).sort((a, b) => a.month.localeCompare(b.month));
      
      // Calculate trend (last 3 months vs previous 3 months)
      const recentMonths = category.monthlyTrend.slice(-3);
      const previousMonths = category.monthlyTrend.slice(-6, -3);
      const recentTotal = recentMonths.reduce((sum, m) => sum + m.amount, 0);
      const previousTotal = previousMonths.reduce((sum, m) => sum + m.amount, 0);
      category.trend = previousTotal > 0 ? ((recentTotal - previousTotal) / previousTotal) * 100 : 0;
      
      // Calculate volatility (standard deviation of monthly amounts)
      if (category.monthlyTrend.length > 1) {
        const amounts = category.monthlyTrend.map(m => m.amount);
        const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
        category.volatility = Math.sqrt(variance);
      }
      
      // Calculate frequency (transactions per week)
      const weeks = Object.values(category.weeklyData);
      category.frequency = weeks.length > 0 ? category.transactionCount / weeks.length : 0;
    });
    
    return Object.values(stats)
      .filter(cat => cat.transactionCount > 0 && 
        (searchTerm === '' || cat.name.toLowerCase().includes(searchTerm.toLowerCase())))
      .sort((a, b) => {
        switch (sortBy) {
          case 'count':
            return b.transactionCount - a.transactionCount;
          case 'average':
            return b.averageAmount - a.averageAmount;
          case 'trend':
            return b.trend - a.trend;
          case 'volatility':
            return b.volatility - a.volatility;
          case 'frequency':
            return b.frequency - a.frequency;
          default:
            return b.expenseAmount - a.expenseAmount;
        }
      });
  }, [transactions, categories, sortBy, timeframe, showOnlyExpenses, searchTerm]);

  // Filter categories based on selection
  const filteredStats = useMemo(() => {
    if (selectedCategories.length === 0) return categoryStats;
    return categoryStats.filter(cat => selectedCategories.includes(cat.id));
  }, [categoryStats, selectedCategories]);

  // Enhanced chart data preparation
  const chartData = useMemo(() => {
    switch (viewType) {
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
          const monthData = { 
            month,
            formattedMonth: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          };
          filteredStats.forEach(cat => {
            const monthlyAmount = cat.monthlyData[month]?.amount || 0;
            monthData[cat.name] = monthlyAmount;
          });
          return monthData;
        });
      case 'treemap':
        // Treemap data for hierarchical view
        return filteredStats.map(cat => ({
          name: cat.name,
          size: cat.expenseAmount,
          color: cat.color,
          count: cat.transactionCount,
          average: cat.averageAmount
        }));
      default: // spending
        return filteredStats.map(cat => ({
          name: cat.name,
          value: cat.expenseAmount,
          color: cat.color,
          count: cat.transactionCount,
          percentage: cat.percentageOfTotal
        }));
    }
  }, [viewType, filteredStats, transactions]);

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

  // Enhanced category selection with bulk operations
  const toggleCategorySelection = useCallback((categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  }, [selectedCategories, setSelectedCategories]);
  
  const selectTopCategories = useCallback((count = 5) => {
    const topCategories = categoryStats.slice(0, count).map(cat => cat.id);
    setSelectedCategories(topCategories);
  }, [categoryStats, setSelectedCategories]);
  
  const clearSelection = useCallback(() => {
    setSelectedCategories([]);
  }, [setSelectedCategories]);
  
  const selectAll = useCallback(() => {
    setSelectedCategories(categoryStats.map(cat => cat.id));
  }, [categoryStats, setSelectedCategories]);

  return (
    <div className="space-y-8">
      {/* Enhanced Controls */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* View Type */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-400">View:</span>
            <div className="flex bg-slate-800 rounded-lg p-1 flex-1">
              {[
                { id: 'spending', label: 'Spending', icon: '💰' },
                { id: 'frequency', label: 'Frequency', icon: '📊' },
                { id: 'trends', label: 'Trends', icon: '📈' },
                { id: 'treemap', label: 'Tree', icon: '🌳' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setViewType(mode.id)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-all flex-1 ${
                    viewType === mode.id
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="mr-1">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Timeframe Filter */}
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
          
          {/* Search */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-400">Search:</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Category name..."
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-400">Type:</span>
            <button
              onClick={() => setShowOnlyExpenses(!showOnlyExpenses)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors flex-1 ${
                showOnlyExpenses 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              {showOnlyExpenses ? 'Expenses Only' : 'All Types'}
            </button>
          </div>
        </div>
        
        {/* Secondary Controls */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/10">
          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="amount">Amount</option>
              <option value="count">Count</option>
              <option value="average">Average</option>
              <option value="trend">Trend</option>
              <option value="volatility">Volatility</option>
              <option value="frequency">Frequency</option>
            </select>
          </div>
          
          {/* Selection Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => selectTopCategories(5)}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
            >
              Top 5
            </button>
            <button
              onClick={selectAll}
              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm transition-colors"
            >
              All
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
              className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm transition-colors"
            >
              📊 Export
            </button>
          )}
          
          {/* Category Filter Status */}
          <div className="flex items-center space-x-2 ml-auto">
            <span className="text-sm font-medium text-slate-400">
              {selectedCategories.length > 0 ? `${selectedCategories.length} selected` : 'All categories'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <span className="mr-3">
              {viewType === 'spending' ? '💰' : viewType === 'frequency' ? '📊' : viewType === 'trends' ? '📈' : '🌳'}
            </span>
            {viewType === 'spending' ? 'Spending by Category' :
             viewType === 'frequency' ? 'Transaction Frequency' : 
             viewType === 'trends' ? 'Category Trends' : 'Category Hierarchy'}
          </h3>
          {viewMode === 'detailed' && (
            <div className="text-sm text-slate-400">
              {categoryStats.length} categories • {formatCurrency(categoryStats.reduce((sum, cat) => sum + cat.expenseAmount, 0))} total
            </div>
          )}
        </div>
        
        {chartData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {viewType === 'trends' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="formattedMonth" 
                    stroke="#64748b"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value, true)}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(value), name]}
                    labelFormatter={(label) => `Period: ${label}`}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  {filteredStats.slice(0, 6).map((category, index) => (
                    <Line
                      key={category.id}
                      type="monotone"
                      dataKey={category.name}
                      stroke={category.color}
                      strokeWidth={selectedCategories.includes(category.id) ? 3 : 2}
                      dot={{ fill: category.color, strokeWidth: 2, r: selectedCategories.includes(category.id) ? 5 : 3 }}
                      opacity={selectedCategories.length === 0 || selectedCategories.includes(category.id) ? 1 : 0.3}
                    />
                  ))}
                </LineChart>
              ) : viewType === 'treemap' ? (
                <Treemap
                  data={chartData}
                  dataKey="size"
                  aspectRatio={4/3}
                  stroke="#334155"
                  fill="#8884d8"
                  content={({ root, depth, x, y, width, height, index, payload, colors, rank, name }) => {
                    return (
                      <g>
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          style={{
                            fill: payload.color,
                            stroke: '#334155',
                            strokeWidth: 2,
                            fillOpacity: 0.8
                          }}
                        />
                        {width > 60 && height > 30 && (
                          <text
                            x={x + width / 2}
                            y={y + height / 2}
                            textAnchor="middle"
                            fill="white"
                            fontSize={Math.min(width / 8, height / 4, 14)}
                            fontWeight="bold"
                          >
                            {name}
                          </text>
                        )}
                        {width > 80 && height > 50 && (
                          <text
                            x={x + width / 2}
                            y={y + height / 2 + 16}
                            textAnchor="middle"
                            fill="white"
                            fontSize={Math.min(width / 12, height / 6, 10)}
                            opacity={0.8}
                          >
                            {formatCurrency(payload.size, true)}
                          </text>
                        )}
                      </g>
                    );
                  }}
                />
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
                      viewType === 'frequency' ? value.toString() : formatCurrency(value, true)
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      viewType === 'frequency' ? `${value} transactions` : formatCurrency(value),
                      viewType === 'frequency' ? 'Count' : 'Amount'
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
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <div>No data available for selected categories</div>
              {searchTerm && (
                <div className="text-sm mt-2">Try adjusting your search or filters</div>
              )}
            </div>
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