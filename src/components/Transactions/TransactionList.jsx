import React, { useState } from 'react';

function TransactionList() {
  // Mock data - will be replaced with Supabase data
  const [transactions] = useState([
    { id: 1, description: 'Monthly Salary', amount: 2500, type: 'income', date: '2024-01-15', category: 'Salary', notes: 'January salary payment' },
    { id: 2, description: 'Grocery Shopping', amount: -85.50, type: 'expense', date: '2024-01-14', category: 'Food', notes: 'Weekly groceries at Walmart' },
    { id: 3, description: 'Gas Station', amount: -45.00, type: 'expense', date: '2024-01-13', category: 'Transport', notes: 'Fill up tank' },
    { id: 4, description: 'Coffee Shop', amount: -4.50, type: 'expense', date: '2024-01-13', category: 'Food', notes: 'Morning coffee' },
    { id: 5, description: 'Freelance Work', amount: 500, type: 'income', date: '2024-01-12', category: 'Freelance', notes: 'Website project completion' }
  ]);

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const formatAmount = (amount) => {
    const isNegative = amount < 0;
    return {
      formatted: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(Math.abs(amount)),
      isNegative
    };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesFilter = filter === 'all' || transaction.type === filter;
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getCategoryIcon = (category) => {
    const icons = {
      'Salary': '💼',
      'Freelance': '💻',
      'Food': '🍕',
      'Transport': '🚗',
      'Shopping': '🛍️',
      'Bills': '📄',
      'Entertainment': '🎮',
      'Health': '🏥'
    };
    return icons[category] || '💰';
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          All Transactions
        </h2>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('income')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'income' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Income
            </button>
            <button 
              onClick={() => setFilter('expense')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Expenses
            </button>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => {
              const amount = formatAmount(transaction.amount);
              return (
                <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="text-2xl">
                        {getCategoryIcon(transaction.category)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {transaction.description}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.category} • {formatDate(transaction.date)}
                        </div>
                        {transaction.notes && (
                          <div className="text-sm text-gray-400 mt-1">
                            {transaction.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold text-lg ${
                        amount.isNegative ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {amount.isNegative ? '-' : '+'}
                        {amount.formatted}
                      </div>
                      <div className="text-xs text-gray-500">
                        {transaction.type}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionList;