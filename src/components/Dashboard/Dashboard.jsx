import React, { useState, useEffect } from 'react';
import IncomeExpenseCard from './IncomeExpenseCard';
import RecentTransactions from './RecentTransactions';
import SmartInsights from '../SmartInsights/SmartInsights';
import LoadingSpinner from '../common/LoadingSpinner';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';

function Dashboard() {
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { categories, loading: categoriesLoading } = useCategories();
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0
  });

  // Calculate real statistics from transactions
  useEffect(() => {
    if (transactions.length > 0) {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const thisMonthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
      });

      const totalIncome = thisMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpenses = thisMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      setStats({
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses
      });
    }
  }, [transactions]);

  const loading = transactionsLoading || categoriesLoading;

  if (loading) {
    return <LoadingSpinner size="large" message="Loading your financial data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome back, Kiezz! 👋
        </h2>
        <p className="text-gray-300">
          Here's what's happening with your finances this month.
        </p>
        {transactions.length === 0 && (
          <div className="mt-4 p-4 status-info rounded-lg">
            <p className="text-blue-300">
              🎉 Ready to start tracking? Add your first transaction to see your financial insights!
            </p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <IncomeExpenseCard
          title="💰 Total Income"
          amount={stats.totalIncome}
          type="income"
          color="green"
        />
        <IncomeExpenseCard
          title="💸 Total Expenses"
          amount={stats.totalExpenses}
          type="expense"
          color="red"
        />
        <IncomeExpenseCard
          title="📊 Net Income"
          amount={stats.balance}
          type="balance"
          color={stats.balance >= 0 ? "green" : "red"}
        />
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <a 
            href="/add-transaction?type=income" 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ➕ Add Income
          </a>
          <a 
            href="/add-transaction?type=expense" 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ➖ Add Expense
          </a>
          <a 
            href="/transactions" 
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            📊 View All Transactions
          </a>
        </div>
      </div>

      {/* Smart Insights */}
      <SmartInsights />

      {/* Recent Transactions */}
      <RecentTransactions transactions={transactions.slice(0, 5)} categories={categories} />
    </div>
  );
}

export default Dashboard;