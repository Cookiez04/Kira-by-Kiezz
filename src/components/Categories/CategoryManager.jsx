import React, { useMemo, useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { useAuthUser } from '../../hooks/useAuthUser';

function CategoryManager() {
  const { categories, addCategory, loading } = useCategories();
  const { userId } = useAuthUser();
  const [form, setForm] = useState({ name: '', type: 'expense', color: '#6B7280', icon: '💸' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emojiPalette = useMemo(
    () => [
      '💸','💰','🧾','🍽️','🛒','🏠','🚗','🚌','⛽','🎮','🎬','🎁','🧃','☕','🧋','🍺','🍕','🥦','🩺','💊','📱','💻','🛠️','📚','✈️','🏖️','🐾','🎓','🍼','🧹','🧺','🧴','🎟️','🧠','📈','🏦','🔁','💳','🏥'
    ],
    []
  );

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
      setForm({ name: '', type: 'expense', color: '#6B7280', icon: '💸' });
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

        <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 gap-4">
          <input
            type="text"
            placeholder="Category name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="block text-sm text-gray-300 mb-2">Type</span>
              <div className="inline-flex rounded-md border border-gray-700 overflow-hidden">
                <button type="button" onClick={() => setForm(f=>({...f, type:'expense'}))}
                  className={`px-4 py-2 text-sm ${form.type==='expense' ? 'bg-[var(--brand-600)] text-white' : 'bg-[var(--surface-1)] text-[var(--text-2)]'}`}>Expense</button>
                <button type="button" onClick={() => setForm(f=>({...f, type:'income'}))}
                  className={`px-4 py-2 text-sm ${form.type==='income' ? 'bg-[var(--brand-600)] text-white' : 'bg-[var(--surface-1)] text-[var(--text-2)]'}`}>Income</button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                title="Color"
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-10 w-10 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                style={{ WebkitAppearance: 'none', padding: 0 }}
              />
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-gray-800/50 text-white">
                <span className="text-xl" aria-label="Selected emoji">{form.icon}</span>
                <span className="text-sm text-gray-300">Icon</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Adding…' : 'Add Category'}
            </button>
          </div>
        
          <div>
            <p className="text-sm text-gray-400 mb-2">Choose an icon</p>
            <div className="grid grid-cols-10 gap-2 p-3 rounded-lg border border-gray-700 bg-gray-800/40">
              {emojiPalette.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`text-xl rounded-md p-1 hover:bg-gray-700 ${form.icon === e ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, icon: e }))}
                >
                  {e}
                </button>
              ))}
            </div>
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