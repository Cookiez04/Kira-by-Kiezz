import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Legend,
  ReferenceLine,
  Brush
} from 'recharts';

function TimeAnalysis({ transactions, categories, dateRange, selectedCategories = [], setSelectedCategories = () => {}, viewMode = 'detailed', onExport }) {
  const [timeframe, setTimeframe] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'yearly'
  const [metric, setMetric] = useState('net'); // 'income', 'expenses', 'net', 'count', 'cumulative'
  const [comparison, setComparison] = useState('none'); // 'none', 'previous', 'average', 'trend'
  const [chartType, setChartType] = useState('line'); // 'line', 'area', 'bar', 'composed'
  const [showTrendline, setShowTrendline] = useState(false);
  const [smoothing, setSmoothing] = useState(false);
  const [showOutliers, setShowOutliers] = useState(true);
  const [groupBy, setGroupBy] = useState('all'); // 'all', 'category', 'type'

  // Enhanced time-based data calculation
  const timeData = useMemo(() => {
    const data = {};
    
    // Filter transactions by selected categories if any
    let filteredTransactions = transactions;
    if (selectedCategories.length > 0) {
      filteredTransactions = transactions.filter(t => 
        selectedCategories.includes(t.category_id)
      );
    }
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      let key, displayPeriod;
      
      switch (timeframe) {
        case 'daily':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          displayPeriod = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          displayPeriod = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          displayPeriod = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          break;
        case 'yearly':
          key = date.getFullYear().toString();
          displayPeriod = key;
          break;
        default:
          key = date.toISOString().split('T')[0];
          displayPeriod = date.toLocaleDateString();
      }
      
      if (!data[key]) {
        data[key] = {
          period: key,
          displayPeriod,
          income: 0,
          expenses: 0,
          net: 0,
          count: 0,
          transactions: [],
          categories: new Map(),
          averageTransaction: 0,
          maxTransaction: 0,
          minTransaction: Infinity
        };
      }
      
      const amount = Math.abs(transaction.amount);
      const category = categories.find(c => c.id === transaction.category_id);
      
      data[key].count += 1;
      data[key].transactions.push(transaction);
      
      if (transaction.amount > 0) {
        data[key].income += amount;
      } else {
        data[key].expenses += amount;
      }
      
      data[key].net = data[key].income - data[key].expenses;
      
      // Track category spending
      if (category) {
        if (!data[key].categories.has(category.id)) {
          data[key].categories.set(category.id, {
            name: category.name,
            amount: 0,
            count: 0,
            color: category.color
          });
        }
        const catData = data[key].categories.get(category.id);
        catData.amount += amount;
        catData.count += 1;
      }
      
      // Track transaction size metrics
      data[key].maxTransaction = Math.max(data[key].maxTransaction, amount);
      data[key].minTransaction = Math.min(data[key].minTransaction, amount);
    });
    
    // Calculate averages and cumulative data
    const sortedData = Object.values(data).sort((a, b) => a.period.localeCompare(b.period));
    let cumulative = 0;
    
    sortedData.forEach((periodData, index) => {
      periodData.averageTransaction = periodData.count > 0 ? 
        (periodData.income + periodData.expenses) / periodData.count : 0;
      
      if (periodData.minTransaction === Infinity) {
        periodData.minTransaction = 0;
      }
      
      // Calculate cumulative values
      cumulative += periodData.net;
      periodData.cumulative = cumulative;
      
      // Convert categories map to array
      periodData.topCategories = Array.from(periodData.categories.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);
    });
    
    return sortedData;
  }, [transactions, timeframe, selectedCategories, categories]);

  // Enhanced comparison data with trend analysis
  const comparisonData = useMemo(() => {
    if (comparison === 'none' || timeData.length === 0) return timeData;
    
    return timeData.map((period, index) => {
      let comparisonValue = 0;
      let trendValue = 0;
      
      if (comparison === 'previous' && index > 0) {
        comparisonValue = timeData[index - 1][metric];
      } else if (comparison === 'average') {
        const total = timeData.reduce((sum, p) => sum + p[metric], 0);
        comparisonValue = total / timeData.length;
      } else if (comparison === 'trend') {
        // Calculate moving average trend
        const windowSize = Math.min(3, index + 1);
        const window = timeData.slice(Math.max(0, index - windowSize + 1), index + 1);
        comparisonValue = window.reduce((sum, item) => sum + item[metric], 0) / window.length;
        
        // Calculate trend direction
        if (index >= 2) {
          const recent = timeData.slice(index - 2, index + 1);
          const slope = (recent[2][metric] - recent[0][metric]) / 2;
          trendValue = slope;
        }
      }
      
      const currentValue = period[metric];
      const change = comparisonValue !== 0 ? ((currentValue - comparisonValue) / comparisonValue) * 100 : 0;
      
      return {
        ...period,
        comparison: comparisonValue,
        change,
        trend: trendValue,
        changeDirection: change > 5 ? 'up' : change < -5 ? 'down' : 'stable'
      };
    });
  }, [timeData, comparison, metric]);

  // Enhanced statistics with advanced metrics
  const stats = useMemo(() => {
    if (timeData.length === 0) return {};
    
    const values = timeData.map(d => d[metric]);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // Calculate trend (simple linear regression slope)
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = total;
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
    const trend = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
    
    // Volatility (standard deviation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / n;
    const volatility = Math.sqrt(variance);
    
    // Calculate additional metrics
    const median = [...values].sort((a, b) => a - b)[Math.floor(n / 2)];
    const q1 = [...values].sort((a, b) => a - b)[Math.floor(n * 0.25)];
    const q3 = [...values].sort((a, b) => a - b)[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    
    // Detect outliers
    const outlierThreshold = 1.5 * iqr;
    const outliers = values.filter(val => 
      val < (q1 - outlierThreshold) || val > (q3 + outlierThreshold)
    );
    
    // Calculate consistency score (inverse of coefficient of variation)
    const coefficientOfVariation = average > 0 ? volatility / average : 0;
    const consistencyScore = Math.max(0, 100 - (coefficientOfVariation * 100));
    
    // Growth rate (comparing first and last periods)
    const growthRate = values.length > 1 && values[0] > 0 ? 
      ((values[values.length - 1] - values[0]) / values[0]) * 100 : 0;
    
    return {
      total,
      average,
      median,
      max,
      min,
      q1,
      q3,
      iqr,
      trend,
      slope,
      volatility,
      consistencyScore,
      growthRate,
      outliers: outliers.length,
      periods: n,
      coefficientOfVariation
    };
  }, [timeData, metric]);

  // Enhanced period formatting and data smoothing
  const formatPeriodLabel = useCallback((period) => {
    switch (timeframe) {
      case 'daily':
        return new Date(period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'weekly':
        return `Week of ${new Date(period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'monthly':
        return new Date(period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      case 'yearly':
        return period;
      default:
        return period;
    }
  }, [timeframe]);
  
  // Apply smoothing if enabled
  const smoothedData = useMemo(() => {
    if (!smoothing || comparisonData.length < 3) return comparisonData;
    
    return comparisonData.map((item, index) => {
      if (index === 0 || index === comparisonData.length - 1) return item;
      
      const prev = comparisonData[index - 1];
      const next = comparisonData[index + 1];
      const smoothedValue = (prev[metric] + item[metric] + next[metric]) / 3;
      
      return {
        ...item,
        [metric]: metric === 'count' ? Math.round(smoothedValue) : smoothedValue
      };
    });
  }, [comparisonData, smoothing, metric]);

  // Enhanced metric color with trend awareness
  const getMetricColor = useCallback((value, comparison, trend) => {
    switch (metric) {
      case 'income':
        return '#10b981'; // emerald
      case 'expenses':
        return '#ef4444'; // red
      case 'net':
        return value >= 0 ? '#10b981' : '#ef4444';
      case 'count':
        return '#3b82f6'; // blue
      case 'cumulative':
        return value >= 0 ? '#10b981' : '#ef4444';
      default:
        return '#64748b'; // slate
    }
  }, [metric]);
  
  // Bulk selection functions
  const selectTopSpendingPeriods = useCallback((count = 5) => {
    const topPeriods = [...timeData]
      .sort((a, b) => b.expenses - a.expenses)
      .slice(0, count)
      .map(item => item.period);
    setSelectedCategories(topPeriods);
  }, [timeData, setSelectedCategories]);
  
  const clearSelection = useCallback(() => {
    setSelectedCategories([]);
  }, [setSelectedCategories]);

  // Spending patterns analysis
  const patterns = useMemo(() => {
    if (timeData.length === 0) return {};
    
    // Day of week analysis (for daily/weekly data)
    const dayOfWeekData = {};
    const monthlyData = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday
      const month = date.getMonth(); // 0 = January
      
      if (!dayOfWeekData[dayOfWeek]) {
        dayOfWeekData[dayOfWeek] = { count: 0, amount: 0 };
      }
      if (!monthlyData[month]) {
        monthlyData[month] = { count: 0, amount: 0 };
      }
      
      const amount = Math.abs(transaction.amount);
      dayOfWeekData[dayOfWeek].count += 1;
      dayOfWeekData[dayOfWeek].amount += amount;
      monthlyData[month].count += 1;
      monthlyData[month].amount += amount;
    });
    
    // Find peak spending days/months
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const peakDay = Object.entries(dayOfWeekData)
      .sort(([,a], [,b]) => b.amount - a.amount)[0];
    
    const peakMonth = Object.entries(monthlyData)
      .sort(([,a], [,b]) => b.amount - a.amount)[0];
    
    return {
      peakDay: peakDay ? {
        name: dayNames[parseInt(peakDay[0])],
        amount: peakDay[1].amount,
        count: peakDay[1].count
      } : null,
      peakMonth: peakMonth ? {
        name: monthNames[parseInt(peakMonth[0])],
        amount: peakMonth[1].amount,
        count: peakMonth[1].count
      } : null
    };
  }, [transactions, timeData]);

  return (
    <div className="space-y-8">
      {/* Enhanced Controls */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Timeframe */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Timeframe</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'daily', label: 'Daily', icon: '📅' },
                { id: 'weekly', label: 'Weekly', icon: '📊' },
                { id: 'monthly', label: 'Monthly', icon: '📈' },
                { id: 'yearly', label: 'Yearly', icon: '🗓️' }
              ].map(frame => (
                <button
                  key={frame.id}
                  onClick={() => setTimeframe(frame.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    timeframe === frame.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="mr-1">{frame.icon}</span>
                  {frame.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Metric */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="net">💰 Net Income</option>
              <option value="income">📈 Income</option>
              <option value="expenses">📉 Expenses</option>
              <option value="count">🔢 Transaction Count</option>
              <option value="cumulative">📊 Cumulative</option>
            </select>
          </div>
          
          {/* Chart Type */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="line">📈 Line</option>
              <option value="area">📊 Area</option>
              <option value="bar">📊 Bar</option>
              <option value="composed">📈 Composed</option>
            </select>
          </div>
          
          {/* Comparison */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Compare to</label>
            <select
              value={comparison}
              onChange={(e) => setComparison(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">No Comparison</option>
              <option value="previous">Previous Period</option>
              <option value="average">Average</option>
              <option value="trend">Trend</option>
            </select>
          </div>
        </div>
        
        {/* Advanced Controls */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-700">
          {/* Toggle Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTrendline(!showTrendline)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                showTrendline 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              📈 Trendline
            </button>
            <button
              onClick={() => setSmoothing(!smoothing)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                smoothing 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              🔄 Smooth
            </button>
            <button
              onClick={() => setShowOutliers(!showOutliers)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                showOutliers 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              ⚠️ Outliers
            </button>
          </div>
          
          {/* Selection Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => selectTopSpendingPeriods(5)}
              className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm transition-colors"
            >
              Top 5
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

      {/* Enhanced Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <span className="text-blue-400 text-xl">📊</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-slate-400">Average</h4>
              <p className="text-xl font-bold text-white">
                {metric === 'count' ? stats.average?.toFixed(1) : formatCurrency(stats.average || 0)}
              </p>
              <p className="text-xs text-slate-500">Median: {metric === 'count' ? stats.median?.toFixed(1) : formatCurrency(stats.median || 0)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <span className="text-green-400 text-xl">
                {stats.trend === 'increasing' ? '📈' : stats.trend === 'decreasing' ? '📉' : '➡️'}
              </span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-slate-400">Trend</h4>
              <p className="text-xl font-bold text-white capitalize">
                {stats.trend}
              </p>
              <p className="text-xs text-slate-500">Growth: {formatPercentage(stats.growthRate || 0)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <span className="text-purple-400 text-xl">🎯</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-slate-400">Consistency</h4>
              <p className="text-xl font-bold text-white">
                {stats.consistencyScore?.toFixed(0)}%
              </p>
              <p className="text-xs text-slate-500">Volatility: {metric === 'count' ? stats.volatility?.toFixed(1) : formatCurrency(stats.volatility || 0)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <span className="text-orange-400 text-xl">⚠️</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-slate-400">Outliers</h4>
              <p className="text-xl font-bold text-white">
                {stats.outliers || 0}
              </p>
              <p className="text-xs text-slate-500">Range: {metric === 'count' ? 
                `${stats.min?.toFixed(0)} - ${stats.max?.toFixed(0)}` :
                `${formatCurrency(stats.min || 0)} - ${formatCurrency(stats.max || 0)}`
              }</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <h4 className="text-lg font-semibold text-white mb-4">📊 Distribution</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Q1 (25th percentile)</span>
              <span className="text-white font-medium">
                {metric === 'count' ? stats.q1?.toFixed(1) : formatCurrency(stats.q1 || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Q3 (75th percentile)</span>
              <span className="text-white font-medium">
                {metric === 'count' ? stats.q3?.toFixed(1) : formatCurrency(stats.q3 || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Interquartile Range</span>
              <span className="text-white font-medium">
                {metric === 'count' ? stats.iqr?.toFixed(1) : formatCurrency(stats.iqr || 0)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <h4 className="text-lg font-semibold text-white mb-4">📈 Performance</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Periods</span>
              <span className="text-white font-medium">{stats.periods}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Coefficient of Variation</span>
              <span className="text-white font-medium">{formatPercentage(stats.coefficientOfVariation || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Data Quality</span>
              <span className={`font-medium ${
                stats.consistencyScore > 80 ? 'text-green-400' :
                stats.consistencyScore > 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {stats.consistencyScore > 80 ? 'Excellent' :
                 stats.consistencyScore > 60 ? 'Good' : 'Variable'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <h4 className="text-lg font-semibold text-white mb-4">🎯 Insights</h4>
          <div className="space-y-3">
            <div className="text-sm text-slate-300">
              {stats.trend === 'increasing' && (
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">📈</span>
                  <span>Upward trend detected</span>
                </div>
              )}
              {stats.trend === 'decreasing' && (
                <div className="flex items-center space-x-2">
                  <span className="text-red-400">📉</span>
                  <span>Downward trend detected</span>
                </div>
              )}
              {stats.trend === 'stable' && (
                <div className="flex items-center space-x-2">
                  <span className="text-blue-400">➡️</span>
                  <span>Stable pattern</span>
                </div>
              )}
            </div>
            <div className="text-sm text-slate-300">
              {stats.outliers > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-orange-400">⚠️</span>
                  <span>{stats.outliers} outlier{stats.outliers > 1 ? 's' : ''} detected</span>
                </div>
              )}
              {stats.outliers === 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">✅</span>
                  <span>No outliers detected</span>
                </div>
              )}
            </div>
            <div className="text-sm text-slate-300">
              {stats.consistencyScore > 80 && (
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">🎯</span>
                  <span>Highly consistent pattern</span>
                </div>
              )}
              {stats.consistencyScore <= 80 && stats.consistencyScore > 60 && (
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-400">📊</span>
                  <span>Moderately consistent</span>
                </div>
              )}
              {stats.consistencyScore <= 60 && (
                <div className="flex items-center space-x-2">
                  <span className="text-red-400">📈</span>
                  <span>High variability</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Main Chart */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {metric === 'income' ? '💰 Income' : 
             metric === 'expenses' ? '💸 Expenses' : 
             metric === 'net' ? '📊 Net Cash Flow' : 
             metric === 'cumulative' ? '📈 Cumulative' : '🔢 Transaction Count'} Over Time
          </h3>
          <div className="text-sm text-slate-400">
            {smoothedData.length} periods • {formatPeriodLabel(smoothedData[0]?.period)} to {formatPeriodLabel(smoothedData[smoothedData.length - 1]?.period)}
          </div>
        </div>
        
        {comparisonData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' && (
                <LineChart data={smoothedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="period" 
                    tickFormatter={formatPeriodLabel}
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(value) => 
                      metric === 'count' ? value.toString() : formatCurrency(value)
                    }
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value, name) => {
                      const formattedValue = metric === 'count' ? value.toString() : formatCurrency(value);
                      const label = name === 'comparison' ? 'Comparison' : 
                                   metric === 'income' ? 'Income' : 
                                   metric === 'expenses' ? 'Expenses' : 
                                   metric === 'net' ? 'Net' : 
                                   metric === 'cumulative' ? 'Cumulative' : 'Count';
                      return [formattedValue, label];
                    }}
                    labelFormatter={(label) => formatPeriodLabel(label)}
                  />
                  <Line
                    type="monotone"
                    dataKey={metric}
                    stroke={getMetricColor(1)}
                    strokeWidth={3}
                    dot={{ fill: getMetricColor(1), strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: getMetricColor(1), strokeWidth: 2 }}
                  />
                  {comparison !== 'none' && (
                    <Line
                      type="monotone"
                      dataKey="comparison"
                      stroke="#6B7280"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  )}
                  {showTrendline && stats.slope && (
                    <ReferenceLine 
                      segment={[
                        { x: smoothedData[0]?.period, y: smoothedData[0]?.[metric] },
                        { x: smoothedData[smoothedData.length - 1]?.period, y: smoothedData[smoothedData.length - 1]?.[metric] }
                      ]}
                      stroke="#F59E0B" 
                      strokeWidth={2} 
                      strokeDasharray="8 4"
                    />
                  )}
                  <Legend />
                  <Brush dataKey="period" height={30} stroke="#6366F1" />
                </LineChart>
              )}
              
              {chartType === 'area' && (
                <AreaChart data={smoothedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="period" 
                    tickFormatter={formatPeriodLabel}
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(value) => 
                      metric === 'count' ? value.toString() : formatCurrency(value)
                    }
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value, name) => [
                      metric === 'count' ? value.toString() : formatCurrency(value),
                      name === 'comparison' ? 'Comparison' : 
                      metric === 'income' ? 'Income' : 
                      metric === 'expenses' ? 'Expenses' : 
                      metric === 'net' ? 'Net' : 
                      metric === 'cumulative' ? 'Cumulative' : 'Count'
                    ]}
                    labelFormatter={(label) => formatPeriodLabel(label)}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric}
                    stroke={getMetricColor(1)}
                    fill={getMetricColor(1)}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  {comparison !== 'none' && (
                    <Area
                      type="monotone"
                      dataKey="comparison"
                      stroke="#6B7280"
                      fill="#6B7280"
                      fillOpacity={0.1}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                    />
                  )}
                  <Legend />
                  <Brush dataKey="period" height={30} stroke="#6366F1" />
                </AreaChart>
              )}
              
              {chartType === 'bar' && (
                <BarChart data={smoothedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="period" 
                    tickFormatter={formatPeriodLabel}
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(value) => 
                      metric === 'count' ? value.toString() : formatCurrency(value)
                    }
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value, name) => [
                      metric === 'count' ? value.toString() : formatCurrency(value),
                      name === 'comparison' ? 'Comparison' : 
                      metric === 'income' ? 'Income' : 
                      metric === 'expenses' ? 'Expenses' : 
                      metric === 'net' ? 'Net' : 
                      metric === 'cumulative' ? 'Cumulative' : 'Count'
                    ]}
                    labelFormatter={(label) => formatPeriodLabel(label)}
                  />
                  <Bar
                    dataKey={metric}
                    fill={getMetricColor(1)}
                    radius={[4, 4, 0, 0]}
                  />
                  {comparison !== 'none' && (
                    <Bar
                      dataKey="comparison"
                      fill="#6B7280"
                      fillOpacity={0.5}
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                  <Legend />
                  <Brush dataKey="period" height={30} stroke="#6366F1" />
                </BarChart>
              )}
              
              {chartType === 'composed' && (
                <ComposedChart data={smoothedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="period" 
                    tickFormatter={formatPeriodLabel}
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(value) => 
                      metric === 'count' ? value.toString() : formatCurrency(value)
                    }
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value, name) => [
                      metric === 'count' ? value.toString() : formatCurrency(value),
                      name === 'comparison' ? 'Comparison' : 
                      metric === 'income' ? 'Income' : 
                      metric === 'expenses' ? 'Expenses' : 
                      metric === 'net' ? 'Net' : 
                      metric === 'cumulative' ? 'Cumulative' : 'Count'
                    ]}
                    labelFormatter={(label) => formatPeriodLabel(label)}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric}
                    fill={getMetricColor(1)}
                    fillOpacity={0.2}
                    stroke="none"
                  />
                  <Line
                    type="monotone"
                    dataKey={metric}
                    stroke={getMetricColor(1)}
                    strokeWidth={3}
                    dot={{ fill: getMetricColor(1), strokeWidth: 2, r: 4 }}
                  />
                  {comparison !== 'none' && (
                    <Line
                      type="monotone"
                      dataKey="comparison"
                      stroke="#6B7280"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  )}
                  <Legend />
                  <Brush dataKey="period" height={30} stroke="#6366F1" />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-slate-400">
            No data available for the selected timeframe
          </div>
        )}
      </div>

      {/* Patterns & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending Patterns */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <span className="mr-3">🔍</span>
            Spending Patterns
          </h3>
          
          <div className="space-y-4">
            {patterns.peakDay && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-sm font-medium text-slate-300 mb-2">
                  Peak Spending Day
                </div>
                <div className="text-lg font-semibold text-white">
                  {patterns.peakDay.name}
                </div>
                <div className="text-sm text-slate-400">
                  {formatCurrency(patterns.peakDay.amount)} • {patterns.peakDay.count} transactions
                </div>
              </div>
            )}
            
            {patterns.peakMonth && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-sm font-medium text-slate-300 mb-2">
                  Peak Spending Month
                </div>
                <div className="text-lg font-semibold text-white">
                  {patterns.peakMonth.name}
                </div>
                <div className="text-sm text-slate-400">
                  {formatCurrency(patterns.peakMonth.amount)} • {patterns.peakMonth.count} transactions
                </div>
              </div>
            )}
            
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-300 mb-2">
                Data Range
              </div>
              <div className="text-lg font-semibold text-white">
                {stats.periods} {timeframe.slice(0, -2)} periods
              </div>
              <div className="text-sm text-slate-400">
                {formatPeriodLabel(timeData[0]?.period)} - {formatPeriodLabel(timeData[timeData.length - 1]?.period)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Key Insights */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <span className="mr-3">💡</span>
            Key Insights
          </h3>
          
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-300 mb-2">
                Best Period
              </div>
              <div className="text-lg font-semibold text-emerald-400">
                {formatPeriodLabel(timeData.find(d => d[metric] === stats.max)?.period)}
              </div>
              <div className="text-sm text-slate-400">
                {metric === 'count' ? `${stats.max} transactions` : formatCurrency(stats.max)}
              </div>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-300 mb-2">
                Lowest Period
              </div>
              <div className="text-lg font-semibold text-red-400">
                {formatPeriodLabel(timeData.find(d => d[metric] === stats.min)?.period)}
              </div>
              <div className="text-sm text-slate-400">
                {metric === 'count' ? `${stats.min} transactions` : formatCurrency(stats.min)}
              </div>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-300 mb-2">
                Consistency
              </div>
              <div className={`text-lg font-semibold ${
                stats.volatility < stats.average * 0.2 ? 'text-emerald-400' :
                stats.volatility < stats.average * 0.5 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {stats.volatility < stats.average * 0.2 ? 'Very Consistent' :
                 stats.volatility < stats.average * 0.5 ? 'Moderately Consistent' : 'Highly Variable'}
              </div>
              <div className="text-sm text-slate-400">
                {formatPercentage((stats.volatility / stats.average) * 100)} variation
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimeAnalysis;