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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

function PredictiveInsights({ transactions, categories, dateRange }) {
  const [insightType, setInsightType] = useState('predictions'); // 'predictions', 'recommendations', 'goals', 'risks'
  const [timeHorizon, setTimeHorizon] = useState('3months'); // '1month', '3months', '6months', '1year'

  // Calculate spending patterns and trends
  const spendingAnalysis = useMemo(() => {
    if (transactions.length === 0) return {};
    
    // Group transactions by month
    const monthlyData = {};
    const categoryTrends = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const categoryId = transaction.category_id;
      const amount = Math.abs(transaction.amount);
      const isIncome = transaction.amount > 0;
      
      // Monthly totals
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          income: 0,
          expenses: 0,
          net: 0,
          transactionCount: 0
        };
      }
      
      monthlyData[monthKey].transactionCount += 1;
      if (isIncome) {
        monthlyData[monthKey].income += amount;
      } else {
        monthlyData[monthKey].expenses += amount;
      }
      monthlyData[monthKey].net = monthlyData[monthKey].income - monthlyData[monthKey].expenses;
      
      // Category trends
      if (!isIncome) {
        if (!categoryTrends[categoryId]) {
          categoryTrends[categoryId] = {};
        }
        if (!categoryTrends[categoryId][monthKey]) {
          categoryTrends[categoryId][monthKey] = 0;
        }
        categoryTrends[categoryId][monthKey] += amount;
      }
    });
    
    const monthlyArray = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    
    // Calculate trends
    const calculateTrend = (data) => {
      if (data.length < 2) return 0;
      const recent = data.slice(-3); // Last 3 months
      const older = data.slice(-6, -3); // Previous 3 months
      
      const recentAvg = recent.reduce((sum, item) => sum + item, 0) / recent.length;
      const olderAvg = older.length > 0 ? older.reduce((sum, item) => sum + item, 0) / older.length : recentAvg;
      
      return olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    };
    
    const expensesTrend = calculateTrend(monthlyArray.map(m => m.expenses));
    const incomeTrend = calculateTrend(monthlyArray.map(m => m.income));
    const netTrend = calculateTrend(monthlyArray.map(m => m.net));
    
    return {
      monthlyData: monthlyArray,
      categoryTrends,
      expensesTrend,
      incomeTrend,
      netTrend,
      avgMonthlyExpenses: monthlyArray.reduce((sum, m) => sum + m.expenses, 0) / monthlyArray.length,
      avgMonthlyIncome: monthlyArray.reduce((sum, m) => sum + m.income, 0) / monthlyArray.length
    };
  }, [transactions]);

  // Generate predictions
  const predictions = useMemo(() => {
    if (!spendingAnalysis.monthlyData || spendingAnalysis.monthlyData.length === 0) return [];
    
    const { monthlyData, expensesTrend, incomeTrend, avgMonthlyExpenses, avgMonthlyIncome } = spendingAnalysis;
    const lastMonth = monthlyData[monthlyData.length - 1];
    
    const monthsToPredict = {
      '1month': 1,
      '3months': 3,
      '6months': 6,
      '1year': 12
    }[timeHorizon];
    
    const predictions = [];
    
    for (let i = 1; i <= monthsToPredict; i++) {
      const futureDate = new Date(lastMonth.month + '-01');
      futureDate.setMonth(futureDate.getMonth() + i);
      const futureMonthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Apply trend to predictions with some dampening
      const trendFactor = Math.pow(0.95, i); // Dampen trend over time
      const predictedExpenses = avgMonthlyExpenses * (1 + (expensesTrend / 100) * trendFactor);
      const predictedIncome = avgMonthlyIncome * (1 + (incomeTrend / 100) * trendFactor);
      
      predictions.push({
        month: futureMonthKey,
        predictedExpenses,
        predictedIncome,
        predictedNet: predictedIncome - predictedExpenses,
        confidence: Math.max(0.5, 1 - (i * 0.1)) // Confidence decreases over time
      });
    }
    
    return predictions;
  }, [spendingAnalysis, timeHorizon]);

  // Generate smart recommendations
  const recommendations = useMemo(() => {
    if (!spendingAnalysis.monthlyData || spendingAnalysis.monthlyData.length === 0) return [];
    
    const recommendations = [];
    const { expensesTrend, incomeTrend, netTrend, avgMonthlyExpenses, avgMonthlyIncome } = spendingAnalysis;
    
    // Expense trend analysis
    if (expensesTrend > 10) {
      recommendations.push({
        type: 'warning',
        category: 'Spending Control',
        title: 'Rising Expenses Detected',
        description: `Your expenses have increased by ${formatPercentage(expensesTrend)} recently. Consider reviewing your spending habits.`,
        impact: 'high',
        actionable: true,
        icon: '⚠️'
      });
    }
    
    // Income trend analysis
    if (incomeTrend < -5) {
      recommendations.push({
        type: 'alert',
        category: 'Income',
        title: 'Declining Income Trend',
        description: `Your income has decreased by ${formatPercentage(Math.abs(incomeTrend))} recently. Consider diversifying income sources.`,
        impact: 'high',
        actionable: true,
        icon: '📉'
      });
    }
    
    // Savings rate analysis
    const savingsRate = avgMonthlyIncome > 0 ? ((avgMonthlyIncome - avgMonthlyExpenses) / avgMonthlyIncome) * 100 : 0;
    
    if (savingsRate < 10) {
      recommendations.push({
        type: 'suggestion',
        category: 'Savings',
        title: 'Low Savings Rate',
        description: `Your current savings rate is ${formatPercentage(savingsRate)}. Aim for at least 20% to build financial security.`,
        impact: 'medium',
        actionable: true,
        icon: '💰'
      });
    } else if (savingsRate > 30) {
      recommendations.push({
        type: 'positive',
        category: 'Savings',
        title: 'Excellent Savings Rate',
        description: `Your savings rate of ${formatPercentage(savingsRate)} is excellent! Consider investing surplus funds.`,
        impact: 'positive',
        actionable: true,
        icon: '🎉'
      });
    }
    
    // Category-specific recommendations
    const categorySpending = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
      const categoryId = t.category_id;
      if (!categorySpending[categoryId]) {
        categorySpending[categoryId] = 0;
      }
      categorySpending[categoryId] += Math.abs(t.amount);
    });
    
    const totalExpenses = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);
    const topCategory = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCategory && totalExpenses > 0) {
      const categoryPercent = (topCategory[1] / totalExpenses) * 100;
      const category = categories.find(c => c.id === topCategory[0]);
      
      if (categoryPercent > 40) {
        recommendations.push({
          type: 'suggestion',
          category: 'Budget Balance',
          title: 'Category Concentration Risk',
          description: `${category?.name || 'One category'} accounts for ${formatPercentage(categoryPercent)} of your spending. Consider diversifying expenses.`,
          impact: 'medium',
          actionable: true,
          icon: '🎯'
        });
      }
    }
    
    return recommendations.slice(0, 6); // Limit to 6 recommendations
  }, [spendingAnalysis, transactions, categories]);

  // Financial health score
  const healthScore = useMemo(() => {
    if (!spendingAnalysis.avgMonthlyIncome) return 0;
    
    let score = 50; // Base score
    const { avgMonthlyIncome, avgMonthlyExpenses, netTrend, expensesTrend } = spendingAnalysis;
    
    // Savings rate component (30 points)
    const savingsRate = ((avgMonthlyIncome - avgMonthlyExpenses) / avgMonthlyIncome) * 100;
    if (savingsRate > 20) score += 30;
    else if (savingsRate > 10) score += 20;
    else if (savingsRate > 0) score += 10;
    else score -= 10;
    
    // Trend component (20 points)
    if (netTrend > 5) score += 20;
    else if (netTrend > 0) score += 10;
    else if (netTrend > -5) score += 5;
    else score -= 10;
    
    // Expense control (20 points)
    if (expensesTrend < 0) score += 20;
    else if (expensesTrend < 5) score += 10;
    else if (expensesTrend < 15) score += 5;
    else score -= 10;
    
    return Math.min(100, Math.max(0, score));
  }, [spendingAnalysis]);

  // Risk assessment
  const riskAssessment = useMemo(() => {
    const risks = [];
    const { expensesTrend, incomeTrend, avgMonthlyIncome, avgMonthlyExpenses } = spendingAnalysis;
    
    // High expense growth risk
    if (expensesTrend > 15) {
      risks.push({
        type: 'high',
        title: 'Rapid Expense Growth',
        description: 'Expenses are growing faster than sustainable levels',
        probability: 0.8,
        impact: 'High'
      });
    }
    
    // Income volatility risk
    if (Math.abs(incomeTrend) > 20) {
      risks.push({
        type: 'medium',
        title: 'Income Volatility',
        description: 'Income shows high volatility which may affect planning',
        probability: 0.6,
        impact: 'Medium'
      });
    }
    
    // Low savings buffer risk
    const savingsRate = avgMonthlyIncome > 0 ? ((avgMonthlyIncome - avgMonthlyExpenses) / avgMonthlyIncome) * 100 : 0;
    if (savingsRate < 5) {
      risks.push({
        type: 'high',
        title: 'Insufficient Emergency Fund',
        description: 'Low savings rate may leave you vulnerable to unexpected expenses',
        probability: 0.9,
        impact: 'High'
      });
    }
    
    return risks;
  }, [spendingAnalysis]);

  // Chart data for predictions
  const predictionChartData = useMemo(() => {
    const historical = spendingAnalysis.monthlyData?.slice(-6) || [];
    const future = predictions;
    
    return [
      ...historical.map(month => ({
        month: month.month,
        actualExpenses: month.expenses,
        actualIncome: month.income,
        actualNet: month.net,
        type: 'historical'
      })),
      ...future.map(month => ({
        month: month.month,
        predictedExpenses: month.predictedExpenses,
        predictedIncome: month.predictedIncome,
        predictedNet: month.predictedNet,
        confidence: month.confidence,
        type: 'predicted'
      }))
    ];
  }, [spendingAnalysis.monthlyData, predictions]);

  const formatMonthLabel = (month) => {
    return new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getRecommendationColor = (type) => {
    switch (type) {
      case 'warning': return 'border-yellow-500/30 bg-yellow-500/10';
      case 'alert': return 'border-red-500/30 bg-red-500/10';
      case 'positive': return 'border-emerald-500/30 bg-emerald-500/10';
      default: return 'border-blue-500/30 bg-blue-500/10';
    }
  };

  const getRiskColor = (type) => {
    switch (type) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-emerald-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Insight Type Selector */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-400">Insights:</span>
            <div className="flex bg-slate-800 rounded-lg p-1">
              {[
                { id: 'predictions', label: 'Predictions', icon: '🔮' },
                { id: 'recommendations', label: 'Recommendations', icon: '💡' },
                { id: 'goals', label: 'Goals', icon: '🎯' },
                { id: 'risks', label: 'Risks', icon: '⚠️' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setInsightType(type.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    insightType === type.id
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Time Horizon Selector */}
          {insightType === 'predictions' && (
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-slate-400">Forecast:</span>
              <select
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1month">1 Month</option>
                <option value="3months">3 Months</option>
                <option value="6months">6 Months</option>
                <option value="1year">1 Year</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Financial Health Score */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <span className="mr-3">💚</span>
          Financial Health Score
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className={`text-6xl font-bold mb-4 ${
              healthScore >= 80 ? 'text-emerald-400' :
              healthScore >= 60 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {healthScore}
            </div>
            <div className="text-lg font-medium text-white mb-2">
              {healthScore >= 80 ? 'Excellent' :
               healthScore >= 60 ? 'Good' :
               healthScore >= 40 ? 'Fair' : 'Needs Improvement'}
            </div>
            <div className="text-sm text-slate-400">
              Overall financial health
            </div>
          </div>
          
          <div className="md:col-span-2">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Savings Rate</span>
                  <span className="text-white">
                    {formatPercentage(spendingAnalysis.avgMonthlyIncome > 0 ? 
                      ((spendingAnalysis.avgMonthlyIncome - spendingAnalysis.avgMonthlyExpenses) / spendingAnalysis.avgMonthlyIncome) * 100 : 0
                    )}
                  </span>
                </div>
                <div className="bg-slate-700 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '70%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Expense Control</span>
                  <span className="text-white">
                    {spendingAnalysis.expensesTrend < 0 ? 'Improving' :
                     spendingAnalysis.expensesTrend < 10 ? 'Stable' : 'Concerning'}
                  </span>
                </div>
                <div className="bg-slate-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${
                    spendingAnalysis.expensesTrend < 0 ? 'bg-emerald-500' :
                    spendingAnalysis.expensesTrend < 10 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} style={{ width: '60%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Income Stability</span>
                  <span className="text-white">
                    {Math.abs(spendingAnalysis.incomeTrend) < 5 ? 'Stable' :
                     Math.abs(spendingAnalysis.incomeTrend) < 15 ? 'Moderate' : 'Volatile'}
                  </span>
                </div>
                <div className="bg-slate-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '80%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Based on Selected Type */}
      {insightType === 'predictions' && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <span className="mr-3">🔮</span>
            Financial Predictions ({timeHorizon.replace('months', ' Months').replace('month', ' Month').replace('year', ' Year')})
          </h3>
          
          {predictionChartData.length > 0 ? (
            <div className="h-96 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={formatMonthLabel}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value, true)}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(value),
                      name.includes('actual') ? name.replace('actual', 'Actual ') : name.replace('predicted', 'Predicted ')
                    ]}
                    labelFormatter={formatMonthLabel}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  {/* Historical lines */}
                  <Line
                    type="monotone"
                    dataKey="actualIncome"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actualExpenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                  {/* Predicted lines */}
                  <Line
                    type="monotone"
                    dataKey="predictedIncome"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predictedExpenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-slate-400">
              Insufficient data for predictions
            </div>
          )}
          
          {/* Prediction Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {predictions.slice(0, 3).map((prediction, index) => (
              <div key={index} className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-sm font-medium text-slate-300 mb-2">
                  {formatMonthLabel(prediction.month)}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Income:</span>
                    <span className="text-emerald-400">{formatCurrency(prediction.predictedIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Expenses:</span>
                    <span className="text-red-400">{formatCurrency(prediction.predictedExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Net:</span>
                    <span className={prediction.predictedNet >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatCurrency(prediction.predictedNet)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Confidence: {formatPercentage(prediction.confidence * 100)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {insightType === 'recommendations' && (
        <div className="space-y-6">
          {recommendations.map((rec, index) => (
            <div key={index} className={`border rounded-xl p-6 ${getRecommendationColor(rec.type)}`}>
              <div className="flex items-start space-x-4">
                <div className="text-3xl">{rec.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-white">{rec.title}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rec.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                      rec.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      rec.impact === 'positive' ? 'bg-emerald-500/20 text-emerald-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {rec.impact === 'positive' ? 'Positive' : `${rec.impact} Impact`}
                    </span>
                  </div>
                  <p className="text-slate-300 mb-3">{rec.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{rec.category}</span>
                    {rec.actionable && (
                      <button className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors">
                        Take Action
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {recommendations.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-lg font-medium mb-2">All Good!</h3>
              <p>Your financial habits look healthy. Keep up the great work!</p>
            </div>
          )}
        </div>
      )}

      {insightType === 'goals' && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <span className="mr-3">🎯</span>
            Financial Goals & Targets
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Emergency Fund Goal */}
            <div className="bg-slate-800/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-white">Emergency Fund</h4>
                <span className="text-2xl">🛡️</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target:</span>
                  <span className="text-white">{formatCurrency(spendingAnalysis.avgMonthlyExpenses * 6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current:</span>
                  <span className="text-emerald-400">{formatCurrency(spendingAnalysis.avgMonthlyExpenses * 2)}</span>
                </div>
                <div className="bg-slate-700 rounded-full h-3">
                  <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '33%' }} />
                </div>
                <div className="text-sm text-slate-400">33% complete • 4 months remaining</div>
              </div>
            </div>
            
            {/* Savings Rate Goal */}
            <div className="bg-slate-800/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-white">Savings Rate</h4>
                <span className="text-2xl">💰</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target:</span>
                  <span className="text-white">20%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current:</span>
                  <span className="text-yellow-400">
                    {formatPercentage(spendingAnalysis.avgMonthlyIncome > 0 ? 
                      ((spendingAnalysis.avgMonthlyIncome - spendingAnalysis.avgMonthlyExpenses) / spendingAnalysis.avgMonthlyIncome) * 100 : 0
                    )}
                  </span>
                </div>
                <div className="bg-slate-700 rounded-full h-3">
                  <div className="bg-yellow-500 h-3 rounded-full" style={{ width: '60%' }} />
                </div>
                <div className="text-sm text-slate-400">On track • Reduce expenses by {formatCurrency(spendingAnalysis.avgMonthlyExpenses * 0.1)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {insightType === 'risks' && (
        <div className="space-y-6">
          {riskAssessment.map((risk, index) => (
            <div key={index} className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className={`text-2xl ${
                  risk.type === 'high' ? 'text-red-400' :
                  risk.type === 'medium' ? 'text-yellow-400' : 'text-emerald-400'
                }`}>
                  {risk.type === 'high' ? '🚨' : risk.type === 'medium' ? '⚠️' : '✅'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-white">{risk.title}</h4>
                    <div className="flex items-center space-x-4">
                      <span className={`text-sm font-medium ${getRiskColor(risk.type)}`}>
                        {risk.impact} Impact
                      </span>
                      <span className="text-sm text-slate-400">
                        {formatPercentage(risk.probability * 100)} probability
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-300">{risk.description}</p>
                </div>
              </div>
            </div>
          ))}
          
          {riskAssessment.length === 0 && (
            <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-white mb-2">Low Risk Profile</h3>
              <p className="text-slate-400">Your financial situation shows minimal risk factors. Keep monitoring regularly.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PredictiveInsights;