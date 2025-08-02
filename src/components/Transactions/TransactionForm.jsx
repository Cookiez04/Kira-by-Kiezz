import React, { useState, useEffect } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { supabaseOperations } from '../../services/supabase';
import { formatDateForInput } from '../../utils/formatters';

function TransactionForm() {
  const { categories, loading: categoriesLoading } = useCategories();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    type: 'expense',
    description: '',
    amount: '',
    category_id: '',
    date: formatDateForInput(),
    notes: ''
  });

  // Get URL parameters to pre-select transaction type
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    if (type === 'income' || type === 'expense') {
      setFormData(prev => ({ ...prev, type }));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate form
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      if (!formData.amount || formData.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (!formData.date) {
        throw new Error('Date is required');
      }

      // Prepare transaction data
      const transactionData = {
        description: formData.description.trim(),
        amount: Math.abs(parseFloat(formData.amount)), // Always store positive amounts
        type: formData.type,
        category_id: formData.category_id || null,
        date: formData.date,
        notes: formData.notes.trim() || null,
        user_id: null // Will be set by RLS
      };

      const { data, error } = await supabaseOperations.addTransaction(transactionData);
      
      if (error) {
        throw error;
      }

      setSuccess(true);
      setFormData({
        type: formData.type, // Keep the same type for easy multiple entries
        description: '',
        amount: '',
        category_id: '',
        date: formatDateForInput(),
        notes: ''
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter categories by type
  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Add {formData.type === 'income' ? 'Income' : 'Expense'}
      </h1>
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            ✅ Transaction added successfully!
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type
            </label>
            <select 
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="expense">💸 Expense</option>
              <option value="income">💰 Income</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <input 
              type="text" 
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
              placeholder="What was this transaction for?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount * ($)
            </label>
            <input 
              type="number" 
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              step="0.01" 
              min="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select 
              name="category_id"
              value={formData.category_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              disabled={categoriesLoading}
            >
              <option value="">Select a category (optional)</option>
              {filteredCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
            {categoriesLoading && (
              <p className="text-sm text-gray-500 mt-1">Loading categories...</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input 
              type="date" 
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea 
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
              rows="3"
              placeholder="Any additional notes about this transaction..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Adding...' : `Add ${formData.type === 'income' ? 'Income' : 'Expense'}`}
            </button>
            <a 
              href="/"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-center"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TransactionForm;