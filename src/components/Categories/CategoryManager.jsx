import React, { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { useAuthUser } from '../../hooks/useAuthUser';

function CategoryManager() {
  const { categories, addCategory, loading } = useCategories();
  const { userId } = useAuthUser();
  const [form, setForm] = useState({ name: '', type: 'expense', color: '#6B7280', icon: 'folder' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!userId) {
      setError('You must be logged in.');
      return;
    }
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    try {
      await addCategory({
        name: form.name.trim(),
        type: form.type,
        color: form.color,
        icon: form.icon,
        user_id: userId,
      });
      setForm({ name: '', type: 'expense', color: '#6B7280', icon: 'folder' });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Categories</h2>

        <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Category name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input md:col-span-2"
          />
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="input"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.color}
              title="Color"
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              className="h-10 w-16 p-0 border border-gray-300 rounded"
            />
            <input
              type="text"
              placeholder="icon"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && <div className="text-gray-500">Loading…</div>}
          {!loading && categories.map((c) => (
            <div key={c.id} className="border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <div className="text-xl" style={{ color: c.color }}>{c.icon || '🏷️'}</div>
              <div className="flex-1">
                <div className="font-medium text-gray-800">{c.name}</div>
                <div className="text-xs text-gray-500 uppercase">{c.type}</div>
              </div>
            </div>
          ))}
          {!loading && categories.length === 0 && (
            <div className="text-gray-500">No categories yet. Create your first above.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryManager;