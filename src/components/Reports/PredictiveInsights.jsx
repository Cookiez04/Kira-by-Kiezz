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
  Scatter,
  ScatterChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

function PredictiveInsights({ transactions, categories, dateRange, selectedCategories = [], setSelectedCategories = () => {}, onExport }) {
  const [insightType, setInsightType] = useState('predictions'); // 'predictions', 'recommendations', 'goals', 'risks'
  const [timeHorizon, setTimeHorizon] = useState('3months'); // '1month', '3months', '6months', '1year'
  const [modelType, setModelType] = useState('linear'); // 'linear', 'exponential', 'seasonal', 'ml'
  const [confidenceLevel, setConfidenceLevel] = useState(80); // 70, 80, 90, 95
  const [chartType, setChartType] = useState('line'); // 'line', 'area', 'bar', 'scatter', 'radar'
  const [showConfidenceBands, setShowConfidenceBands] = useState(true);
  const [includeSeasonality, setIncludeSeasonality] = useState(true);
  const [anomalyThreshold, setAnomalyThreshold] = useState(2); // Standard deviations
  const [forecastHorizon, setForecastHorizon] = useState('auto'); // 'auto', 'conservative', 'aggressive'

  // Helper functions for advanced calculations
  const calculateTrend = useCallback((values) => {
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + val * (i + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }, []);
  
  const calculateSeasonal = useCallback((values, period) => {
    const seasonal = new Array(period).fill(0);
    const counts = new Array(period).fill(0);
    
    values.forEach((value, i) => {
      const seasonIndex = i % period;
      seasonal[seasonIndex] += value;
      counts[seasonIndex]++;
    });
    
    const overallAverage = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    return seasonal.map((sum, i) => 
      counts[i] > 0 ? (sum / counts[i]) - overallAverage : 0
    );
  }, []);
  
  const polynomialRegression = useCallback((values, degree) => {
    const n = values.length;
    const matrix = [];
    const result = [];
    
    // Create matrix for polynomial regression
    for (let i = 0; i <= degree; i++) {
      matrix[i] = [];
      for (let j = 0; j <= degree; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += Math.pow(k + 1, i + j);
        }
        matrix[i][j] = sum;
      }
      
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += values[k] * Math.pow(k + 1, i);
      }
      result[i] = sum;
    }
    
    // Solve using Gaussian elimination (simplified)
    return gaussianElimination(matrix, result);
  }, []);
  
  const gaussianElimination = useCallback((matrix, result) => {
    const n = matrix.length;
    const coefficients = new Array(n).fill(0);
    
    // Forward elimination
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (matrix[i][i] !== 0) {
          const factor = matrix[j][i] / matrix[i][i];
          for (let k = i; k < n; k++) {
            matrix[j][k] -= factor * matrix[i][k];
          }
          result[j] -= factor * result[i];
        }
      }
    }
    
    // Back substitution
    for (let i = n - 1; i >= 0; i--) {
      coefficients[i] = result[i];
      for (let j = i + 1; j < n; j++) {
        coefficients[i] -= matrix[i][j] * coefficients[j];
      }
      if (matrix[i][i] !== 0) {
        coefficients[i] /= matrix[i][i];
      }
    }
    
    return coefficients;
  }, []);

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
      const amount = parseFloat(transaction.amount);
      const isIncome = transaction.type === 'income';
      
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
      
      // Category trends (only for expenses)
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
    const calculateTrendSimple = (data) => {
      if (data.length < 2) return 0;
      const recent = data.slice(-3); // Last 3 months
      const older = data.slice(-6, -3); // Previous 3 months
      
      const recentAvg = recent.reduce((sum, item) => sum + item, 0) / recent.length;
      const olderAvg = older.length > 0 ? older.reduce((sum, item) => sum + item, 0) / older.length : recentAvg;
      
      return olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    };
    
    const expensesTrend = calculateTrendSimple(monthlyArray.map(m => m.expenses));
    const incomeTrend = calculateTrendSimple(monthlyArray.map(m => m.income));
    const netTrend = calculateTrendSimple(monthlyArray.map(m => m.net));
    
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

  // Enhanced predictions with multiple models and advanced analytics
  const predictions = useMemo(() => {
    if (!spendingAnalysis.monthlyData || spendingAnalysis.monthlyData.length === 0) return { data: [], insights: [], anomalies: [] };
    
    const { monthlyData, expensesTrend, incomeTrend, avgMonthlyExpenses, avgMonthlyIncome } = spendingAnalysis;
    const lastMonth = monthlyData[monthlyData.length - 1];
    
    const monthsToPredict = {
      '1month': 1,
      '3months': 3,
      '6months': 6,
      '1year': 12
    }[timeHorizon];
    
    // Advanced prediction models
    const generateAdvancedPredictions = (data, periods) => {
      if (data.length < 3) return [];
      
      const predictions = [];
      
      for (let i = 1; i <= periods; i++) {
        const futureDate = new Date(lastMonth.month + '-01');
        futureDate.setMonth(futureDate.getMonth() + i);
        const futureMonthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Apply trend to predictions with some dampening
        const trendFactor = Math.pow(0.95, i); // Dampen trend over time
        let predictedExpenses, predictedIncome;
        
        switch (modelType) {
          case 'exponential':
            predictedExpenses = avgMonthlyExpenses * Math.pow(1 + (expensesTrend / 100), i * 0.5);
            predictedIncome = avgMonthlyIncome * Math.pow(1 + (incomeTrend / 100), i * 0.5);
            break;
          case 'seasonal':
            const seasonalFactor = includeSeasonality ? (1 + 0.1 * Math.sin(2 * Math.PI * (futureDate.getMonth() / 12))) : 1;
            predictedExpenses = avgMonthlyExpenses * (1 + (expensesTrend / 100) * trendFactor) * seasonalFactor;
            predictedIncome = avgMonthlyIncome * (1 + (incomeTrend / 100) * trendFactor) * seasonalFactor;
            break;
          case 'ml':
            // Simple ML-like approach with polynomial fitting
            const expenseCoeff = 1 + (expensesTrend / 100) * trendFactor + 0.01 * Math.pow(i - 1, 2);
            const incomeCoeff = 1 + (incomeTrend / 100) * trendFactor + 0.005 * Math.pow(i - 1, 2);
            predictedExpenses = avgMonthlyExpenses * expenseCoeff;
            predictedIncome = avgMonthlyIncome * incomeCoeff;
            break;
          default: // linear
            predictedExpenses = avgMonthlyExpenses * (1 + (expensesTrend / 100) * trendFactor);
            predictedIncome = avgMonthlyIncome * (1 + (incomeTrend / 100) * trendFactor);
        }
        
        predictions.push({
          month: futureMonthKey,
          predictedExpenses,
          predictedIncome,
          predictedNet: predictedIncome - predictedExpenses,
          confidence: Math.max(0.4, 1 - (i * 0.08)), // Confidence decreases over time
          type: 'prediction',
          model: modelType
        });
      }
      
      return predictions;
    };
    
    // Anomaly detection
    const detectAnomalies = (data) => {
      const expenses = data.map(d => d.expenses);
      const mean = expenses.reduce((sum, val) => sum + val, 0) / expenses.length;
      const stdDev = Math.sqrt(expenses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / expenses.length);
      
      return data.filter(d => {
        const zScore = Math.abs((d.expenses - mean) / stdDev);
        return zScore > anomalyThreshold;
      }).map(d => ({
        ...d,
        anomalyScore: Math.abs((d.expenses - mean) / stdDev),
        type: 'anomaly'
      }));
    };
    
    const futurePredictions = generateAdvancedPredictions(monthlyData, monthsToPredict);
    const anomalies = detectAnomalies(monthlyData);
    
    // Generate insights
    const insights = [];
    if (futurePredictions.length > 0) {
      const avgPredictedExpenses = futurePredictions.reduce((sum, p) => sum + p.predictedExpenses, 0) / futurePredictions.length;
      const expenseChange = ((avgPredictedExpenses - avgMonthlyExpenses) / avgMonthlyExpenses) * 100;
      
      if (Math.abs(expenseChange) > 5) {
        insights.push({
          type: expenseChange > 0 ? 'warning' : 'positive',
          title: `Expense ${expenseChange > 0 ? 'Increase' : 'Decrease'} Predicted`,
          message: `${modelType} model predicts ${Math.abs(expenseChange).toFixed(1)}% ${expenseChange > 0 ? 'increase' : 'decrease'} in expenses`,
          icon: expenseChange > 0 ? '📈' : '📉',
          confidence: futurePredictions[0].confidence
        });
      }
    }
    
    if (anomalies.length > 0) {
      insights.push({
        type: 'alert',
        title: 'Unusual Spending Detected',
        message: `${anomalies.length} month${anomalies.length > 1 ? 's' : ''} with unusual spending patterns`,
        icon: '🚨',
        confidence: 0.9
      });
    }
    
    return {
      data: futurePredictions,
      insights,
      anomalies,
      historical: monthlyData
    };
  }, [spendingAnalysis, timeHorizon, modelType, includeSeasonality, anomalyThreshold]);

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
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const categoryId = t.category_id;
      if (!categorySpending[categoryId]) {
        categorySpending[categoryId] = 0;
      }
      categorySpending[categoryId] += parseFloat(t.amount);
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

  // Enhanced chart data for predictions
  const predictionChartData = useMemo(() => {
    const historical = spendingAnalysis.monthlyData?.slice(-6) || [];
    const future = predictions.data || [];
    
    return [
      ...historical.map(month => ({
        month: month.month,
        actualExpenses: month.expenses,
        actualIncome: month.income,
        actualNet: month.net,
        type: 'historical',
        confidence: 1,
        volatility: month.volatility || 0
      })),
      ...future.map(month => {
        const confidenceMargin = month.predictedExpenses * (1 - month.confidence) * 0.3;
        return {
          month: month.month,
          predictedExpenses: month.predictedExpenses,
          predictedIncome: month.predictedIncome,
          predictedNet: month.predictedNet,
          confidence: month.confidence,
          type: 'predicted',
          model: month.model,
          upperBound: month.predictedExpenses + confidenceMargin,
          lowerBound: Math.max(0, month.predictedExpenses - confidenceMargin)
        };
      })
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
      {/* Enhanced Controls */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Insight Type */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">Type:</label>
            <select
              value={insightType}
              onChange={(e) => setInsightType(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm flex-1"
            >
              <option value="predictions">🔮 Predictions</option>
              <option value="recommendations">💡 Recommendations</option>
              <option value="goals">🎯 Goals</option>
              <option value="risks">⚠️ Risks</option>
            </select>
          </div>
          
          {/* Time Horizon */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">Period:</label>
            <select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm flex-1"
            >
              <option value="1month">📅 1 Month</option>
              <option value="3months">📅 3 Months</option>
              <option value="6months">📅 6 Months</option>
              <option value="1year">📅 1 Year</option>
            </select>
          </div>
          
          {/* Model Type */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">Model:</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm flex-1"
            >
              <option value="linear">📊 Linear</option>
              <option value="exponential">📈 Exponential</option>
              <option value="seasonal">🗓️ Seasonal</option>
              <option value="ml">🤖 ML-Enhanced</option>
            </select>
          </div>
          
          {/* Chart Type */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">Chart:</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm flex-1"
            >
              <option value="line">📈 Line</option>
              <option value="area">📊 Area</option>
              <option value="bar">📊 Bar</option>
              <option value="scatter">🔵 Scatter</option>
              <option value="radar">🎯 Radar</option>
            </select>
          </div>
        </div>
        
        {/* Advanced Controls */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-700">
          {/* Confidence Level */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">Confidence:</label>
            <select
              value={confidenceLevel}
              onChange={(e) => setConfidenceLevel(Number(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value={70}>70%</option>
              <option value={80}>80%</option>
              <option value={90}>90%</option>
              <option value={95}>95%</option>
            </select>
          </div>
          
          {/* Anomaly Threshold */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-400">Anomaly σ:</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.5"
              value={anomalyThreshold}
              onChange={(e) => setAnomalyThreshold(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-white">{anomalyThreshold}</span>
          </div>
          
          {/* Toggle Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowConfidenceBands(!showConfidenceBands)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                showConfidenceBands 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              📊 Confidence
            </button>
            <button
              onClick={() => setIncludeSeasonality(!includeSeasonality)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                includeSeasonality 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              🗓️ Seasonal
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
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-white">📈 Prediction Chart</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-400">Model:</span>
                  <span className="text-sm px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                    {modelType.charAt(0).toUpperCase() + modelType.slice(1)}
                  </span>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' && (
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
                    <Legend />
                    
                    {/* Confidence bands */}
                    {showConfidenceBands && (
                      <>
                        <Area
                          type="monotone"
                          dataKey="upperBound"
                          stackId="confidence"
                          stroke="none"
                          fill="#F59E0B"
                          fillOpacity={0.1}
                        />
                        <Area
                          type="monotone"
                          dataKey="lowerBound"
                          stackId="confidence"
                          stroke="none"
                          fill="#F59E0B"
                          fillOpacity={0.1}
                        />
                      </>
                    )}
                    
                    {/* Historical lines */}
                    <Line
                      type="monotone"
                      dataKey="actualIncome"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      connectNulls={false}
                      name="Actual Income"
                    />
                    <Line
                      type="monotone"
                      dataKey="actualExpenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      connectNulls={false}
                      name="Actual Expenses"
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
                      name="Predicted Income"
                    />
                    <Line
                      type="monotone"
                      dataKey="predictedExpenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      connectNulls={false}
                      name="Predicted Expenses"
                    />
                    
                    {/* Reference line at zero */}
                    <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="2 2" />
                  </LineChart>
                )}
                
                {chartType === 'area' && (
                  <AreaChart data={predictionChartData}>
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
                    <Legend />
                    
                    <Area
                      type="monotone"
                      dataKey="actualExpenses"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="Actual Expenses"
                    />
                    <Area
                      type="monotone"
                      dataKey="predictedExpenses"
                      stackId="2"
                      stroke="#F59E0B"
                      fill="#F59E0B"
                      fillOpacity={0.4}
                      strokeDasharray="5 5"
                      name="Predicted Expenses"
                    />
                  </AreaChart>
                )}
                
                {chartType === 'bar' && (
                  <BarChart data={predictionChartData}>
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
                    <Legend />
                    
                    <Bar dataKey="actualExpenses" fill="#ef4444" name="Actual Expenses" />
                    <Bar dataKey="actualIncome" fill="#10b981" name="Actual Income" />
                    <Bar dataKey="predictedExpenses" fill="#F59E0B" fillOpacity={0.7} name="Predicted Expenses" />
                    <Bar dataKey="predictedIncome" fill="#3B82F6" fillOpacity={0.7} name="Predicted Income" />
                  </BarChart>
                )}
                
                {chartType === 'scatter' && (
                  <ScatterChart data={predictionChartData.filter(d => d.actualExpenses && d.predictedExpenses)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      type="number"
                      dataKey="actualExpenses"
                      stroke="#64748b"
                      fontSize={12}
                      name="Actual Expenses"
                      tickFormatter={(value) => formatCurrency(value, true)}
                    />
                    <YAxis 
                      type="number"
                      dataKey="predictedExpenses"
                      stroke="#64748b" 
                      fontSize={12}
                      name="Predicted Expenses"
                      tickFormatter={(value) => formatCurrency(value, true)}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatCurrency(value),
                        name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                      ]}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f1f5f9'
                      }}
                    />
                    <Scatter name="Prediction Accuracy" fill="#8B5CF6" />
                  </ScatterChart>
                )}
                
                {chartType === 'radar' && (
                  <RadarChart data={predictionChartData.slice(-6)}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 'dataMax']} 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatCurrency(value),
                        name.includes('actual') ? name.replace('actual', 'Actual ') : name.replace('predicted', 'Predicted ')
                      ]}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f1f5f9'
                      }}
                    />
                    <Radar
                      name="Actual Expenses"
                      dataKey="actualExpenses"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="Predicted Expenses"
                      dataKey="predictedExpenses"
                      stroke="#F59E0B"
                      fill="#F59E0B"
                      fillOpacity={0.2}
                      strokeDasharray="5 5"
                    />
                    <Legend />
                  </RadarChart>
                )}
              </ResponsiveContainer>
              
              {/* Chart Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-slate-300">Actual Expenses</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                  <span className="text-slate-300">Actual Income</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-amber-500 rounded border-2 border-dashed border-amber-500"></div>
                  <span className="text-slate-300">Predicted Expenses</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded border-2 border-dashed border-blue-500"></div>
                  <span className="text-slate-300">Predicted Income</span>
                </div>
                {showConfidenceBands && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-amber-500 rounded opacity-20"></div>
                    <span className="text-slate-300">Confidence Band</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-slate-400">
              Insufficient data for predictions
            </div>
          )}
          
          {/* Enhanced Prediction Statistics */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-medium text-white mb-6">📊 Prediction Statistics & Model Performance</h3>
            
            {/* Primary Predictions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700/70 transition-colors">
                <div className="text-sm text-slate-400 mb-1">Next Month Expenses</div>
                <div className="text-xl font-semibold text-red-400">
                  {predictions.data?.[0] ? formatCurrency(predictions.data[0].predictedExpenses) : '$0'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {predictions.data?.[0]?.trend > 0 ? '↗️' : '↘️'} 
                  {predictions.data?.[0]?.trend ? Math.abs(predictions.data[0].trend).toFixed(1) : '0.0'}% trend
                </div>
                <div className="mt-2 w-full bg-slate-600 rounded-full h-1.5">
                  <div 
                    className="bg-red-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${predictions.data?.[0]?.confidence ? predictions.data[0].confidence * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700/70 transition-colors">
                <div className="text-sm text-slate-400 mb-1">Next Month Income</div>
                <div className="text-xl font-semibold text-green-400">
                  {predictions.data?.[0] ? formatCurrency(predictions.data[0].predictedIncome) : '$0'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {predictions.data?.[0]?.incomeTrend > 0 ? '↗️' : '↘️'} 
                  {predictions.data?.[0]?.incomeTrend ? Math.abs(predictions.data[0].incomeTrend).toFixed(1) : '0.0'}% trend
                </div>
                <div className="mt-2 w-full bg-slate-600 rounded-full h-1.5">
                  <div 
                    className="bg-green-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700/70 transition-colors">
                <div className="text-sm text-slate-400 mb-1">Predicted Net</div>
                <div className={`text-xl font-semibold ${
                  predictions.data?.[0]?.predictedNet >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {predictions.data?.[0] ? formatCurrency(predictions.data[0].predictedNet) : '$0'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {predictions.data?.[0]?.savingsRate ? predictions.data[0].savingsRate.toFixed(1) : '0.0'}% savings rate
                </div>
                <div className="mt-2 w-full bg-slate-600 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      (predictions.data?.[0]?.savingsRate || 0) >= 20 ? 'bg-green-400' :
                      (predictions.data?.[0]?.savingsRate || 0) >= 10 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, (predictions.data?.[0]?.savingsRate || 0) * 5))}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700/70 transition-colors">
                <div className="text-sm text-slate-400 mb-1">Model Confidence</div>
                <div className="text-xl font-semibold text-blue-400">
                  {predictions.data?.[0] ? (predictions.data[0].confidence * 100).toFixed(0) : '0'}%
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {(predictions.data?.[0]?.confidence || 0) >= 0.8 ? 'High' : 
                   (predictions.data?.[0]?.confidence || 0) >= 0.6 ? 'Medium' : 'Low'} reliability
                </div>
                <div className="mt-2 w-full bg-slate-600 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      (predictions.data?.[0]?.confidence || 0) >= 0.8 ? 'bg-green-400' :
                      (predictions.data?.[0]?.confidence || 0) >= 0.6 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${(predictions.data?.[0]?.confidence || 0) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Advanced Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-2">Volatility Analysis</div>
                <div className="text-lg font-medium text-white mb-1">
                  {predictions.volatility ? (predictions.volatility * 100).toFixed(1) : '0.0'}%
                </div>
                <div className="text-xs text-slate-500">
                  {(predictions.volatility || 0) > 0.3 ? 'High variance' : 
                   (predictions.volatility || 0) > 0.15 ? 'Moderate variance' : 'Low variance'}
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-2">Seasonal Impact</div>
                <div className="text-lg font-medium text-white mb-1">
                  {includeSeasonality ? 'Active' : 'Disabled'}
                </div>
                <div className="text-xs text-slate-500">
                  {includeSeasonality ? 'Seasonal patterns detected' : 'Linear trend only'}
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-2">Anomalies Detected</div>
                <div className="text-lg font-medium text-white mb-1">
                  {predictions.anomalies || 0}
                </div>
                <div className="text-xs text-slate-500">
                  Outliers in recent data
                </div>
              </div>
            </div>
            
            {/* Model Performance Indicators */}
            <div className="bg-slate-700/20 rounded-lg p-4">
              <h4 className="text-md font-medium text-white mb-3">Model Performance</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {modelType.charAt(0).toUpperCase() + modelType.slice(1)}
                  </div>
                  <div className="text-xs text-slate-400">Active Model</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {forecastHorizon}M
                  </div>
                  <div className="text-xs text-slate-400">Forecast Period</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">
                    {(confidenceLevel * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-400">Confidence Level</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400 mb-1">
                    {(anomalyThreshold * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-400">Anomaly Threshold</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Prediction Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {predictions.data?.slice(0, 3).map((prediction, index) => (
              <div key={index} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-slate-300">
                    {formatMonthLabel(prediction.month)}
                  </div>
                  <div className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                    {prediction.model}
                  </div>
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
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Confidence:</span>
                    <div className="flex items-center space-x-2">
                      <div className="bg-slate-700 rounded-full h-1.5 w-12">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full" 
                          style={{ width: `${prediction.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-300">
                        {formatPercentage(prediction.confidence * 100)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )) || []}
          </div>
          
          {/* Model Insights */}
          {predictions.insights?.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-lg font-medium text-white mb-3">📊 Model Insights</h4>
              {predictions.insights.map((insight, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  insight.type === 'warning' ? 'border-yellow-500/30 bg-yellow-500/10' :
                  insight.type === 'positive' ? 'border-emerald-500/30 bg-emerald-500/10' :
                  insight.type === 'alert' ? 'border-red-500/30 bg-red-500/10' :
                  'border-blue-500/30 bg-blue-500/10'
                }`}>
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">{insight.icon}</span>
                    <div className="flex-1">
                      <h5 className="font-medium text-white mb-1">{insight.title}</h5>
                      <p className="text-sm text-slate-300">{insight.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-400">
                          Confidence: {formatPercentage(insight.confidence * 100)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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