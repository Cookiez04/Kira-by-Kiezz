import React, { useMemo, useState } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';

function TransactionList() {
  const { transactions, loading } = useTransactions();
  const { categories } = useCategories();

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTx, setEditTx] = useState(null);

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

  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter((transaction) => {
      const matchesFilter = filter === 'all' || transaction.type === filter;
      const categoryName = transaction.categories?.name || transaction.category || '';
      const matchesSearch = transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [transactions, filter, searchTerm]);

  const openEdit = (tx) => {
    setEditTx({
      id: tx.id,
      description: tx.description || '',
      amount: Number(tx.amount) || 0,
      type: tx.type || 'expense',
      category_id: tx.category_id || '',
      date: tx.date ? new Date(tx.date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
      notes: tx.notes || ''
    });
    setIsEditing(true);
  };

  const { updateTransaction, deleteTransaction } = useTransactions();

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditTx((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editTx) return;
    await updateTransaction(editTx.id, {
      description: editTx.description.trim(),
      amount: Math.abs(parseFloat(editTx.amount)) || 0,
      type: editTx.type,
      category_id: editTx.category_id || null,
      date: editTx.date,
      notes: editTx.notes?.trim() || null,
    });
    setIsEditing(false);
    setEditTx(null);
  };

  const handleDelete = async (tx) => {
    const ok = window.confirm('Delete this transaction?');
    if (!ok) return;
    await deleteTransaction(tx.id);
  };

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
        <h2 className="text-2xl font-bold text-gray-100 mb-6">
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
              className="input text-gray-200 placeholder-gray-400"
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
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading transactions…</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => {
              const amount = formatAmount(transaction.amount);
              return (
                <div key={transaction.id} className="border border-gray-700 rounded-lg p-4 hover:bg-gray-800/40 transition-colors bg-gray-900/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="text-2xl">
                        {getCategoryIcon(transaction.categories?.name || transaction.category)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-200">
                          {transaction.description}
                        </div>
                        <div className="text-sm text-gray-400">
                          {(transaction.categories?.name || transaction.category || 'Other')} • {formatDate(transaction.date)}
                        </div>
                        {transaction.notes && (
                          <div className="text-sm text-gray-500 mt-1">
                            {transaction.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div className={`font-semibold text-lg ${
                        transaction.type === 'expense' || amount.isNegative ? 'text-red-500' : 'text-green-400'
                      }`}>
                        {(transaction.type === 'expense' || amount.isNegative) ? '-' : '+'}{amount.formatted}
                      </div>
                      <div className="text-xs text-gray-400 mr-2 min-w-[56px] text-right">{transaction.type}</div>
                      <button onClick={() => openEdit(transaction)} className="text-sm px-3 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200">Edit</button>
                      <button onClick={() => handleDelete(transaction)} className="text-sm px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isEditing && editTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Edit Transaction</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Type</label>
                  <select name="type" value={editTx.type} onChange={handleEditChange} className="input">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Amount</label>
                  <input name="amount" type="number" step="0.01" min="0.01" value={editTx.amount} onChange={handleEditChange} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Description</label>
                <input name="description" value={editTx.description} onChange={handleEditChange} className="input" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Category</label>
                <select name="category_id" value={editTx.category_id || ''} onChange={handleEditChange} className="input">
                  <option value="">None</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Date</label>
                <input name="date" type="date" value={editTx.date} onChange={handleEditChange} className="input" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Notes</label>
                <textarea name="notes" rows="3" value={editTx.notes} onChange={handleEditChange} className="input" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary">Save Changes</button>
                <button type="button" onClick={()=>{setIsEditing(false);setEditTx(null);}} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionList;