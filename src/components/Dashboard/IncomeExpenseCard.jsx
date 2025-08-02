import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function IncomeExpenseCard({ title, amount, type, color }) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const getIcon = (type) => {
    switch (type) {
      case 'income': return '💰';
      case 'expense': return '💸';
      case 'balance': return amount >= 0 ? '📈' : '📉';
      default: return '💳';
    }
  };

  const getInsight = () => {
    if (type === 'balance') {
      if (amount >= 0) {
        return 'You\'re saving money this month! 🎉';
      } else {
        return 'You\'re spending more than earning this month';
      }
    }
    if (type === 'income' && amount === 0) {
      return 'Add your income sources';
    }
    if (type === 'expense' && amount === 0) {
      return 'Start tracking your expenses';
    }
    return '';
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses[color] || colorClasses.blue} hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xl">{getIcon(type)}</span>
      </div>
      
      <p className="text-3xl font-bold mb-2">{formatCurrency(amount)}</p>
      
      {getInsight() && (
        <p className="text-xs opacity-75">
          {getInsight()}
        </p>
      )}
      
      {type === 'balance' && amount < 0 && (
        <div className="mt-2 pt-2 border-t border-current border-opacity-20">
          <p className="text-xs font-medium">
            💡 Consider reviewing your expenses or adding income sources
          </p>
        </div>
      )}
    </div>
  );
}

export default IncomeExpenseCard;