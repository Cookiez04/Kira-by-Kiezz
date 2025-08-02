import React, { useState, useEffect } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { formatCurrency, formatDate } from '../../utils/formatters';

function SmartInsights() {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const [insights, setInsights] = useState([]);

  // Create category map for quick lookup
  const categoryMap = categories.reduce((map, category) => {
    map[category.id] = category;
    return map;
  }, {});

  useEffect(() => {
    if (transactions.length > 0) {
      const generatedInsights = generateInsights(transactions, categories);
      setInsights(generatedInsights);
    }
  }, [transactions, categories]);

  // Smart analytics functions
  function generateInsights(transactions, categories) {
    const insights = [];
    
    // 1. Spending pattern analysis
    insights.push(...analyzeSpendingPatterns(transactions, categoryMap));
    
    // 2. Unusual spending detection
    insights.push(...detectUnusualSpending(transactions, categoryMap));
    
    // 3. Savings opportunities
    insights.push(...findSavingsOpportunities(transactions, categoryMap));
    
    // 4. Monthly comparison
    insights.push(...monthlyComparison(transactions));
    
    return insights.sort((a, b) => b.priority - a.priority);
  }

  function analyzeSpendingPatterns(transactions, categoryMap) {
    const insights = [];
    
    // Group transactions by category for current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const categorySpending = {};
    thisMonthTransactions.forEach(t => {
      if (t.type === 'expense') {
        const categoryName = categoryMap[t.category_id]?.name || 'Uncategorized';
        categorySpending[categoryName] = (categorySpending[categoryName] || 0) + t.amount;
      }
    });
    
    // Find top spending category
    const topCategory = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCategory) {
      insights.push({
        id: 'top-spending',
        type: 'spending_pattern',
        title: `${topCategory[0]} is your biggest expense`,
        description: `You've spent ${formatCurrency(topCategory[1])} on ${topCategory[0]} this month.`,
        priority: 4,
        icon: '📊',
        color: 'blue'
      });
    }
    
    return insights;
  }

  function detectUnusualSpending(transactions, categoryMap) {
    const insights = [];
    
    if (transactions.length < 5) return insights; // Need more data
    
    // Calculate average transaction amounts by category
    const categoryAverages = {};
    const categoryTransactions = {};
    
    transactions.forEach(t => {
      if (t.type === 'expense') {
        const categoryName = categoryMap[t.category_id]?.name || 'Uncategorized';
        if (!categoryTransactions[categoryName]) {
          categoryTransactions[categoryName] = [];
        }
        categoryTransactions[categoryName].push(t.amount);
      }
    });
    
    // Calculate averages and find outliers
    Object.entries(categoryTransactions).forEach(([category, amounts]) => {
      if (amounts.length >= 3) {
        const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
        const recentTransaction = amounts[amounts.length - 1];
        
        if (recentTransaction > average * 2) {
          insights.push({
            id: `unusual-${category}`,
            type: 'unusual_spending',
            title: `Unusual ${category} spending detected`,
            description: `Your recent ${formatCurrency(recentTransaction)} ${category} expense is ${Math.round(recentTransaction / average)}x higher than your average of ${formatCurrency(average)}.`,
            priority: 5,
            icon: '⚠️',
            color: 'orange'
          });
        }
      }
    });
    
    return insights;
  }

  function findSavingsOpportunities(transactions, categoryMap) {
    const insights = [];
    
    // Find frequent small purchases
    const merchantSpending = {};
    const currentMonth = new Date().getMonth();
    
    transactions.forEach(t => {
      if (t.type === 'expense' && new Date(t.date).getMonth() === currentMonth) {
        const merchant = t.description.toLowerCase();
        if (t.amount < 20) { // Small purchases
          merchantSpending[merchant] = (merchantSpending[merchant] || 0) + t.amount;
        }
      }
    });
    
    // Find merchants with high cumulative small spending
    Object.entries(merchantSpending).forEach(([merchant, total]) => {
      if (total > 50) {
        insights.push({
          id: `savings-${merchant}`,
          type: 'saving_opportunity',
          title: 'Small purchases adding up',
          description: `Small purchases at "${merchant}" total ${formatCurrency(total)} this month. Consider bulk buying or alternatives.`,
          priority: 3,
          icon: '💡',
          color: 'green'
        });
      }
    });
    
    return insights;
  }

  function monthlyComparison(transactions) {
    const insights = [];
    
    if (transactions.length < 10) return insights;
    
    const currentMonth = new Date().getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentYear = new Date().getFullYear();
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthExpenses = transactions
      .filter(t => {
        const date = new Date(t.date);
        return t.type === 'expense' && 
               date.getMonth() === currentMonth && 
               date.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    const lastMonthExpenses = transactions
      .filter(t => {
        const date = new Date(t.date);
        return t.type === 'expense' && 
               date.getMonth() === lastMonth && 
               date.getFullYear() === lastMonthYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    if (lastMonthExpenses > 0) {
      const change = ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
      
      if (Math.abs(change) > 15) {
        insights.push({
          id: 'monthly-comparison',
          type: 'spending_pattern',
          title: `Spending ${change > 0 ? 'increased' : 'decreased'} significantly`,
          description: `Your expenses ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% compared to last month (${formatCurrency(Math.abs(currentMonthExpenses - lastMonthExpenses))} ${change > 0 ? 'more' : 'less'}).`,
          priority: change > 0 ? 4 : 3,
          icon: change > 0 ? '📈' : '📉',
          color: change > 0 ? 'red' : 'green'
        });
      }
    }
    
    return insights;
  }

  const getInsightCardClass = (color) => {
    const classes = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      red: 'bg-red-50 border-red-200 text-red-800'
    };
    return classes[color] || classes.blue;
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 Smart Insights</h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">🤖</span>
          </div>
          <p className="text-gray-500 mb-4">
            Add some transactions to get personalized financial insights!
          </p>
          <a 
            href="/add-transaction" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-block"
          >
            Add Transaction
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 Smart Insights</h3>
      
      {insights.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500">
            🎉 Great job! No unusual spending patterns detected. Keep up the good work!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.slice(0, 5).map(insight => (
            <div key={insight.id} className={`p-4 rounded-lg border ${getInsightCardClass(insight.color)}`}>
              <div className="flex items-start space-x-3">
                <span className="text-xl">{insight.icon}</span>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{insight.title}</h4>
                  <p className="text-sm opacity-90">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
          
          {insights.length > 5 && (
            <div className="text-center">
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View {insights.length - 5} more insights →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SmartInsights;