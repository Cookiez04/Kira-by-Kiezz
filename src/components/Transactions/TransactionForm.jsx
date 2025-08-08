import React, { useState, useEffect } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { useAuthUser } from '../../hooks/useAuthUser';
import { supabaseOperations } from '../../services/supabase';
import { formatDateForInput } from '../../utils/formatters';

function TransactionForm() {
  const { categories, loading: categoriesLoading } = useCategories();
  const { userId } = useAuthUser();
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
      if (!userId) {
        throw new Error('You must be logged in to add a transaction');
      }
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
        user_id: userId
      };

      const { error } = await supabaseOperations.addTransaction(transactionData);
      
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
      <h1 className="text-3xl font-bold text-white mb-6">
        Add {formData.type === 'income' ? 'Income' : 'Expense'}
      </h1>
      
      {success && (
        <div className="mb-6 p-3 rounded-md border status-success">
          <p>✅ Transaction added successfully!</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-3 rounded-md border status-error">
          <p>{error}</p>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Transaction type segmented control */}
          <div>
            <span className="block text-sm text-gray-300 mb-2">Transaction Type</span>
            <div className="inline-flex rounded-md border border-gray-700 overflow-hidden">
              <button type="button" onClick={() => setFormData(f => ({...f, type:'expense'}))}
                className={`px-4 py-2 text-sm ${formData.type==='expense' ? 'bg-[var(--brand-600)] text-white' : 'bg-[var(--surface-1)] text-[var(--text-2)]'}`}>
                💸 Expense
              </button>
              <button type="button" onClick={() => setFormData(f => ({...f, type:'income'}))}
                className={`px-4 py-2 text-sm ${formData.type==='income' ? 'bg-[var(--brand-600)] text-white' : 'bg-[var(--surface-1)] text-[var(--text-2)]'}`}>
                💰 Income
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Description *</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="input"
              placeholder="What was this transaction for?"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Amount * ($)</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              step="0.01"
              min="0.01"
              className="input"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFormData(f=>({...f, category_id: ''}))}
                className={`px-3 py-1 rounded-full text-sm border ${!formData.category_id ? 'bg-[var(--brand-600)] text-white border-transparent' : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-1)]'}`}>None</button>
              {filteredCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFormData(f=>({...f, category_id: c.id}))}
                  className={`px-3 py-1 rounded-full text-sm border ${formData.category_id===c.id ? 'bg-[var(--brand-600)] text-white border-transparent' : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-1)]'}`}
                  title={c.name}
                >
                  <span className="mr-1">{c.icon}</span>{c.name}
                </button>
              ))}
            </div>
            {categoriesLoading && <p className="text-sm text-gray-400 mt-1">Loading categories...</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Notes (optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="input"
              rows="3"
              placeholder="Any additional notes about this transaction..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Adding…' : `Add ${formData.type === 'income' ? 'Income' : 'Expense'}`}
            </button>
            <a href="/" className="btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TransactionForm;