import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

function RecentTransactions({ transactions = [], categories = [] }) {
  // Create a map for quick category lookup
  const categoryMap = categories.reduce((map, category) => {
    map[category.id] = category;
    return map;
  }, {});

  if (transactions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Transactions</h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">💳</span>
          </div>
          <p className="text-gray-500 mb-4">
            No transactions yet. Add your first transaction to get started!
          </p>
          <a 
            href="/add-transaction" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-block"
          >
            Add First Transaction
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
        <a 
          href="/transactions" 
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View all →
        </a>
      </div>
      
      <div className="space-y-3">
        {transactions.map(transaction => {
          const category = categoryMap[transaction.category_id];
          const isIncome = transaction.type === 'income';
          
          return (
            <div 
              key={transaction.id} 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isIncome ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <span className="text-lg">
                    {category?.icon || (isIncome ? '💰' : '🏷️')}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{transaction.description}</p>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{category?.name || 'Uncategorized'}</span>
                    <span>•</span>
                    <span>{formatDate(transaction.date)}</span>
                  </div>
                </div>
              </div>
              
              <div className={`font-semibold text-lg ${
                isIncome ? 'text-green-600' : 'text-red-600'
              }`}>
                {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecentTransactions;