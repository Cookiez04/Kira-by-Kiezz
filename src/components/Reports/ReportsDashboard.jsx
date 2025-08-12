import React, { useMemo } from 'react';
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
  Line
} from 'recharts';

function ReportsDashboard({ transactions, categories, dateRange }) {
  // Calculate key financial metrics
  const metrics = useMemo(() => {
    const income = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
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
      .filter(t => t.amount < 0)
      .forEach(transaction => {
        const category = categories.find(c => c.id === transaction.category_id);
        const categoryName = category?.name || 'Uncategorized';
        const categoryColor = category?.color || '#64748b';
        
        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = {
            name: categoryName,
            value: 0,
            color: categoryColor,
            count: 0
          };
        }
        
        categoryTotals[categoryName].value += Math.abs(transaction.amount);
        categoryTotals[categoryName].count += 1;
      });
    
    return Object.values(categoryTotals)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
  }, [transactions, categories]);

  // Prepare daily spending trend data
  const dailyTrendData = useMemo(() => {
    const dailyTotals = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date).toISOString().split('T')[0];
      
      if (!dailyTotals[date]) {
        dailyTotals[date] = {
          date,
          income: 0,
          expenses: 0,
          net: 0
        };
      }
      
      if (transaction.amount > 0) {
        dailyTotals[date].income += transaction.amount;
      } else {
        dailyTotals[date].expenses += Math.abs(transaction.amount);
      }
      
      dailyTotals[date].net = dailyTotals[date].income - dailyTotals[date].expenses;
    });
    
    return Object.values(dailyTotals)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Last 30 days
  }, [transactions]);

  // Financial health score calculation
  const healthScore = useMemo(() => {
    let score = 50; // Base score
    
    // Positive net income adds points
    if (metrics.netIncome > 0) score += 20;
    
    // Good savings rate adds points
    if (metrics.savingsRate > 20) score += 15;
    else if (metrics.savingsRate > 10) score += 10;
    else if (metrics.savingsRate > 0) score += 5;
    
    // Consistent transaction patterns
    if (metrics.avgTransactionsPerDay > 0.5 && metrics.avgTransactionsPerDay < 5) score += 10;
    
    // Reasonable daily spending
    if (metrics.avgDailySpending < metrics.income / 30) score += 5;
    
    return Math.min(100, Math.max(0, score));
  }, [metrics]);

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

  return (
    <div className="space-y-8">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Financial Health Score */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Financial Health</h3>
            <span className="text-2xl">💚</span>
          </div>
          <div className={`text-3xl font-bold ${getHealthColor(healthScore)} mb-2`}>
            {healthScore}/100
          </div>
          <div className="text-sm text-slate-400">
            {getHealthLabel(healthScore)}
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
                      color: '#f1f5f9'
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

        {/* Daily Spending Trend */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <span className="mr-3">📊</span>
            Daily Spending Trend (30 days)
          </h3>
          
          {dailyTrendData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value, true)}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(value),
                      name === 'expenses' ? 'Expenses' : name === 'income' ? 'Income' : 'Net'
                    ]}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stackId="2"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400">
              No transaction data available
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