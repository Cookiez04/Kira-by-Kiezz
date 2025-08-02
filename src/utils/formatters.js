// Utility functions for formatting data throughout the app

// Format currency amounts
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Math.abs(amount));
};

// Format date for display
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return new Date(date).toLocaleDateString('en-US', {
    ...defaultOptions,
    ...options
  });
};

// Format date for input fields (YYYY-MM-DD)
export const formatDateForInput = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

// Format relative time (e.g., "2 days ago")
export const formatRelativeTime = (date) => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInMs = now - targetDate;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(date);
  }
};

// Format percentage
export const formatPercentage = (value, total, decimals = 1) => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

// Format transaction amount with sign
export const formatTransactionAmount = (amount, type) => {
  const formattedAmount = formatCurrency(amount);
  const isNegative = type === 'expense';
  
  return {
    formatted: formattedAmount,
    display: `${isNegative ? '-' : '+'}${formattedAmount}`,
    isNegative
  };
};

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 50) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Generate a random color for categories
export const generateRandomColor = () => {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Capitalize first letter
export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Generate month options for date filters
export const getMonthOptions = (yearsBack = 2) => {
  const options = [];
  const now = new Date();
  
  for (let i = 0; i < yearsBack * 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = date.toISOString().substring(0, 7); // YYYY-MM
    const label = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
    
    options.push({ value, label });
  }
  
  return options;
};

// Calculate budget progress
export const calculateBudgetProgress = (spent, limit) => {
  if (limit === 0) return { percentage: 0, status: 'safe', remaining: 0 };
  
  const percentage = Math.min((spent / limit) * 100, 100);
  let status = 'safe';
  
  if (percentage >= 100) {
    status = 'over';
  } else if (percentage >= 80) {
    status = 'warning';
  }
  
  return {
    percentage: Math.round(percentage),
    status,
    remaining: Math.max(limit - spent, 0),
    isOverBudget: spent > limit
  };
};

// Group transactions by date
export const groupTransactionsByDate = (transactions) => {
  const grouped = {};
  
  transactions.forEach(transaction => {
    const date = formatDate(transaction.date);
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(transaction);
  });
  
  return grouped;
};

// Export data to CSV
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};