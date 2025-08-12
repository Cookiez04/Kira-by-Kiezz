import React, { useState, useMemo } from 'react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
  ComposedChart
} from 'recharts';

// Color palette for categories - vibrant and distinct colors
const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2', '#A3E4D7',
  '#FCF3CF', '#FADBD8', '#D5DBDB', '#AED6F1', '#A9DFBF', '#F9E79F', '#D2B4DE', '#AED6F1',
  '#ABEBC6', '#F7DC6F', '#D7BDE2', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#D5DBDB'
];

function ReportsDashboard({ transactions, categories, dateRange, viewMode = 'detailed', onExport }) {
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [chartType, setChartType] = useState('area'); // 'area', 'bar', 'composed'
  const [timeGranularity, setTimeGranularity] = useState('daily'); // 'daily', 'weekly', 'monthly'
  // Calculate key financial metrics
  const metrics = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const netIncome = income - expenses;
    const savingsRate = income > 0 ? (netIncome / income) * 100 : 0;
    
    // Calculate average daily spending
    const days = Math.max(1, Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24)));
    const avgDailySpending = expenses / days;
    
    // Calculate transaction frequency
    const avgTransactionsPerDay = transactions.length / days;
    
    return {
      income,
      expenses,
      netIncome,
      savingsRate,
      avgDailySpending,
      avgTransactionsPerDay,
      totalTransactions: transactions.length
    };
  }, [transactions, dateRange]);

  // Prepare spending by category data
  const categoryData = useMemo(() => {
    const categoryTotals = {};
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const category = categories.find(c => c.id === transaction.category_id);
        const categoryName = category?.name || 'Uncategorized';
        
        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = {
            name: categoryName,
            value: 0,
            color: '', // Will be assigned below
            count: 0
          };
        }
        
        categoryTotals[categoryName].value += parseFloat(transaction.amount);
        categoryTotals[categoryName].count += 1;
      });
    
    // Assign colors to categories
    const sortedCategories = Object.values(categoryTotals)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
    
    sortedCategories.forEach((category, index) => {
      category.color = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
    
    return sortedCategories;
  }, [transactions, categories]);

  // Enhanced time-based data preparation
  const timeBasedData = useMemo(() => {
    const data = [];
    
    // Find the earliest transaction date and use today as end date
    const transactionDates = transactions.map(t => new Date(t.date)).sort((a, b) => a - b);
    const earliestDate = transactionDates.length > 0 ? transactionDates[0] : new Date();
    const today = new Date();
    
    const startDate = new Date(Math.max(earliestDate.getTime(), new Date(dateRange.start).getTime()));
    const endDate = new Date(Math.min(today.getTime(), new Date(dateRange.end).getTime()));
    
    if (timeGranularity === 'daily') {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayTransactions = transactions.filter(t => t.date === dateStr);
        const daySpending = dayTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const dayIncome = dayTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        data.push({
          date: dateStr,
          spending: daySpending,
          income: dayIncome,
          net: dayIncome - daySpending,
          transactions: dayTransactions.length,
          formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
    } else if (timeGranularity === 'weekly') {
      const weekMap = new Map();
      transactions.forEach(t => {
        const date = new Date(t.date);
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, { spending: 0, income: 0, transactions: 0, date: weekKey });
        }
        
        const week = weekMap.get(weekKey);
        if (t.type === 'expense') {
          week.spending += parseFloat(t.amount);
        } else if (t.type === 'income') {
          week.income += parseFloat(t.amount);
        }
        week.transactions++;
      });
      
      weekMap.forEach(week => {
        data.push({
          ...week,
          net: week.income - week.spending,
          formattedDate: new Date(week.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      });
    } else if (timeGranularity === 'monthly') {
      const monthMap = new Map();
      transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { spending: 0, income: 0, transactions: 0, date: monthKey });
        }
        
        const month = monthMap.get(monthKey);
        if (t.type === 'expense') {
          month.spending += parseFloat(t.amount);
        } else if (t.type === 'income') {
          month.income += parseFloat(t.amount);
        }
        month.transactions++;
      });
      
      monthMap.forEach(month => {
        data.push({
          ...month,
          net: month.income - month.spending,
          formattedDate: new Date(month.date + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        });
      });
    }
    
    return data.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [transactions, dateRange, timeGranularity]);

  // Prepare daily spending trend data
  const dailyTrendData = timeBasedData;

  // Enhanced financial health calculation
  const financialHealthMetrics = useMemo(() => {
    const debtToIncomeRatio = metrics.income > 0 ? metrics.expenses / metrics.income : 1;
    const emergencyFundRatio = metrics.netIncome > 0 ? (metrics.netIncome * 3) / metrics.expenses : 0;
    const spendingConsistency = transactions.length > 7 ? 
      1 - (Math.abs(metrics.avgDailySpending - (metrics.expenses / 30)) / metrics.avgDailySpending) : 0.5;
    
    const baseScore = (
      metrics.savingsRate * 0.3 + 
      (1 - Math.min(1, debtToIncomeRatio)) * 0.25 +
      Math.min(1, emergencyFundRatio) * 0.25 +
      spendingConsistency * 0.2
    );
    
    const score = Math.min(100, Math.max(0, baseScore));
    
    return {
      score,
      debtToIncomeRatio,
      emergencyFundRatio,
      spendingConsistency,
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'
    };
  }, [metrics, transactions]);

  // Financial health score calculation
  const healthScore = financialHealthMetrics.score;

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  // Render chart based on selected type
  const renderChart = () => {
    const commonProps = {
      data: timeBasedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };
    
    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="formattedDate" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
            />
            <Bar dataKey="spending" fill="#EF4444" name="Spending" />
            <Bar dataKey="income" fill="#10B981" name="Income" />
          </BarChart>
        );
      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="formattedDate" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
            />
            <Area
              type="monotone"
              dataKey="spending"
              fill="#EF4444"
              stroke="#EF4444"
              fillOpacity={0.3}
              name="Spending"
            />
            <Bar dataKey="income" fill="#10B981" name="Income" />
            <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2} name="Net" />
          </ComposedChart>
        );
      default:
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="formattedDate" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
            />
            <Area
              type="monotone"
              dataKey="spending"
              stackId="1"
              stroke="#EF4444"
              fill="#EF4444"
              fillOpacity={0.6}
              name="Spending"
            />
            <Area
              type="monotone"
              dataKey="income"
              stackId="2"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.6}
              name="Income"
            />
          </AreaChart>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Controls */}
      {viewMode === 'detailed' && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-slate-400">Chart Type:</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-sm text-white"
              >
                <option value="area">Area Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="composed">Composed Chart</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-slate-400">Time Period:</label>
              <select
                value={timeGranularity}
                onChange={(e) => setTimeGranularity(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-sm text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            {onExport && (
              <button
                onClick={() => onExport('csv')}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
              >
                📊 Export Data
              </button>
            )}
          </div>
        </div>
      )}
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Financial Health Score */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Financial Health</h3>
            <span className="text-2xl">💚</span>
          </div>
          <div className={`text-3xl font-bold ${getHealthColor(healthScore)} mb-2`}>
            {healthScore.toFixed(0)}/100
          </div>
          <div className={`text-sm flex items-center space-x-1 ${
            healthScore >= 80 ? 'text-emerald-300' :
            healthScore >= 60 ? 'text-yellow-300' :
            'text-red-300'
          }`}>
            <span>Grade {financialHealthMetrics.grade}</span>
            <span className="text-xs">•</span>
            <span>{getHealthLabel(healthScore)}</span>
          </div>
          <div className="mt-4 bg-slate-800 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                healthScore >= 80 ? 'bg-emerald-400' :
                healthScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Net Income */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Net Income</h3>
            <span className="text-2xl">{metrics.netIncome >= 0 ? '📈' : '📉'}</span>
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            metrics.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {formatCurrency(metrics.netIncome)}
          </div>
          <div className="text-sm text-slate-400">
            {formatPercentage(metrics.savingsRate)} savings rate
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Total Expenses</h3>
            <span className="text-2xl">💸</span>
          </div>
          <div className="text-3xl font-bold text-red-400 mb-2">
            {formatCurrency(metrics.expenses)}
          </div>
          <div className="text-sm text-slate-400">
            {formatCurrency(metrics.avgDailySpending)}/day avg
          </div>
        </div>

        {/* Transaction Activity */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Activity</h3>
            <span className="text-2xl">⚡</span>
          </div>
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {metrics.totalTransactions}
          </div>
          <div className="text-sm text-slate-400">
            {metrics.avgTransactionsPerDay.toFixed(1)} per day
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending by Category */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <span className="mr-3">🎯</span>
            Spending by Category
          </h3>
          
          {categoryData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
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
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400">
              No expense data available
            </div>
          )}
          
          {/* Category Legend */}
          <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
            {categoryData.map((category, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-slate-300">{category.name}</span>
                </div>
                <span className="text-slate-400">
                  {formatCurrency(category.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Trend */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <span className="mr-3">📊</span>
              {timeGranularity.charAt(0).toUpperCase() + timeGranularity.slice(1)} Financial Trend
            </h3>
            {viewMode === 'detailed' && (
              <div className="text-xs text-slate-400">
                {timeBasedData.length} {timeGranularity} periods
              </div>
            )}
          </div>
          
          {timeBasedData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <div className="text-4xl mb-2">📈</div>
                <div>No transaction data available</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <span className="mr-3">💡</span>
          Quick Insights
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Top Spending Category */}
          {categoryData.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: categoryData[0].color }}
                />
                <span className="text-sm font-medium text-slate-300">Top Category</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {categoryData[0].name}
              </div>
              <div className="text-sm text-slate-400">
                {formatCurrency(categoryData[0].value)} ({categoryData[0].count} transactions)
              </div>
            </div>
          )}
          
          {/* Savings Goal Progress */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-sm font-medium text-slate-300">Savings Rate</span>
            </div>
            <div className={`text-lg font-semibold ${
              metrics.savingsRate >= 20 ? 'text-emerald-400' :
              metrics.savingsRate >= 10 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {formatPercentage(metrics.savingsRate)}
            </div>
            <div className="text-sm text-slate-400">
              {metrics.savingsRate >= 20 ? 'Excellent!' :
               metrics.savingsRate >= 10 ? 'Good progress' : 'Room for improvement'}
            </div>
          </div>
          
          {/* Transaction Frequency */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-sm font-medium text-slate-300">Activity Level</span>
            </div>
            <div className="text-lg font-semibold text-blue-400">
              {metrics.avgTransactionsPerDay.toFixed(1)}/day
            </div>
            <div className="text-sm text-slate-400">
              {metrics.avgTransactionsPerDay > 3 ? 'Very active' :
               metrics.avgTransactionsPerDay > 1 ? 'Active' : 'Light usage'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsDashboard;