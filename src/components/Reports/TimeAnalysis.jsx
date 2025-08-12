import React, { useMemo, useState } from 'react';
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
  ComposedChart
} from 'recharts';

function TimeAnalysis({ transactions, categories, dateRange }) {
  const [timeframe, setTimeframe] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'yearly'
  const [metric, setMetric] = useState('net'); // 'income', 'expenses', 'net', 'count'
  const [comparison, setComparison] = useState('none'); // 'none', 'previous', 'average'

  // Generate time-based data
  const timeData = useMemo(() => {
    const data = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      let key;
      
      switch (timeframe) {
        case 'daily':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!data[key]) {
        data[key] = {
          period: key,
          income: 0,
          expenses: 0,
          net: 0,
          count: 0,
          transactions: []
        };
      }
      
      const amount = Math.abs(transaction.amount);
      data[key].count += 1;
      data[key].transactions.push(transaction);
      
      if (transaction.amount > 0) {
        data[key].income += amount;
      } else {
        data[key].expenses += amount;
      }
      
      data[key].net = data[key].income - data[key].expenses;
    });
    
    return Object.values(data).sort((a, b) => a.period.localeCompare(b.period));
  }, [transactions, timeframe]);

  // Calculate comparison data
  const comparisonData = useMemo(() => {
    if (comparison === 'none' || timeData.length === 0) return timeData;
    
    return timeData.map((period, index) => {
      let comparisonValue = 0;
      
      if (comparison === 'previous' && index > 0) {
        comparisonValue = timeData[index - 1][metric];
      } else if (comparison === 'average') {
        const total = timeData.reduce((sum, p) => sum + p[metric], 0);
        comparisonValue = total / timeData.length;
      }
      
      const currentValue = period[metric];
      const change = comparisonValue !== 0 ? ((currentValue - comparisonValue) / comparisonValue) * 100 : 0;
      
      return {
        ...period,
        comparison: comparisonValue,
        change,
        changeDirection: change > 0 ? 'up' : change < 0 ? 'down' : 'same'
      };
    });
  }, [timeData, comparison, metric]);

  // Calculate statistics
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
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const trend = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';
    
    // Volatility (standard deviation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / n;
    const volatility = Math.sqrt(variance);
    
    return {
      total,
      average,
      max,
      min,
      trend,
      slope,
      volatility,
      periods: n
    };
  }, [timeData, metric]);

  // Format period labels
  const formatPeriodLabel = (period) => {
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
  };

  // Get metric color
  const getMetricColor = (value) => {
    switch (metric) {
      case 'income':
        return '#10b981'; // emerald
      case 'expenses':
        return '#ef4444'; // red
      case 'net':
        return value >= 0 ? '#10b981' : '#ef4444';
      case 'count':
        return '#3b82f6'; // blue
      default:
        return '#64748b'; // slate
    }
  };

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
      {/* Controls */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Timeframe Selector */}
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
          
          {/* Metric Selector */}
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
            </select>
          </div>
          
          {/* Comparison Selector */}
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
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Total {metric.charAt(0).toUpperCase() + metric.slice(1)}</h3>
            <span className="text-2xl">
              {metric === 'income' ? '📈' : metric === 'expenses' ? '📉' : metric === 'net' ? '💰' : '🔢'}
            </span>
          </div>
          <div className={`text-3xl font-bold mb-2`} style={{ color: getMetricColor(stats.total) }}>
            {metric === 'count' ? stats.total : formatCurrency(stats.total)}
          </div>
          <div className="text-sm text-slate-400">
            Over {stats.periods} periods
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Average</h3>
            <span className="text-2xl">📊</span>
          </div>
          <div className={`text-3xl font-bold mb-2`} style={{ color: getMetricColor(stats.average) }}>
            {metric === 'count' ? stats.average?.toFixed(1) : formatCurrency(stats.average)}
          </div>
          <div className="text-sm text-slate-400">
            Per {timeframe.slice(0, -2)}
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Trend</h3>
            <span className="text-2xl">
              {stats.trend === 'increasing' ? '📈' : stats.trend === 'decreasing' ? '📉' : '➡️'}
            </span>
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            stats.trend === 'increasing' ? 'text-emerald-400' :
            stats.trend === 'decreasing' ? 'text-red-400' : 'text-slate-400'
          }`}>
            {stats.trend === 'increasing' ? '↗️' : stats.trend === 'decreasing' ? '↘️' : '→'}
          </div>
          <div className="text-sm text-slate-400">
            {stats.trend.charAt(0).toUpperCase() + stats.trend.slice(1)}
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Volatility</h3>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {metric === 'count' ? stats.volatility?.toFixed(1) : formatCurrency(stats.volatility)}
          </div>
          <div className="text-sm text-slate-400">
            Standard deviation
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <span className="mr-3">📈</span>
          {metric.charAt(0).toUpperCase() + metric.slice(1)} Over Time
          {comparison !== 'none' && (
            <span className="ml-2 text-sm text-slate-400">
              (vs {comparison === 'previous' ? 'Previous Period' : 'Average'})
            </span>
          )}
        </h3>
        
        {comparisonData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {comparison !== 'none' ? (
                <ComposedChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="period" 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={formatPeriodLabel}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => 
                      metric === 'count' ? value.toString() : formatCurrency(value, true)
                    }
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      metric === 'count' ? `${value} transactions` : formatCurrency(value),
                      name === metric ? 'Current' : 'Comparison'
                    ]}
                    labelFormatter={formatPeriodLabel}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="comparison"
                    stroke="#64748b"
                    fill="#64748b"
                    fillOpacity={0.2}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey={metric}
                    stroke={getMetricColor(stats.average)}
                    strokeWidth={3}
                    dot={{ fill: getMetricColor(stats.average), strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              ) : (
                <AreaChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="period" 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={formatPeriodLabel}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => 
                      metric === 'count' ? value.toString() : formatCurrency(value, true)
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      metric === 'count' ? `${value} transactions` : formatCurrency(value),
                      metric.charAt(0).toUpperCase() + metric.slice(1)
                    ]}
                    labelFormatter={formatPeriodLabel}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric}
                    stroke={getMetricColor(stats.average)}
                    fill={getMetricColor(stats.average)}
                    fillOpacity={0.3}
                  />
                </AreaChart>
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