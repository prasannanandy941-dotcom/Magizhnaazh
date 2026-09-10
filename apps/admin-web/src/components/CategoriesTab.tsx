import React, { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Category } from '../../../../packages/shared-types';
import { fetchCategories, addCategory, deleteCategory } from '../api';
import { DeleteButton } from './CrudListPanel';

export const CategoriesTab: React.FC<{ token: string }> = ({ token }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetchCategories();
    setCategories(res.data?.categories || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await addCategory(token, name.trim());
      setName('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl text-white">Vendor Categories</h2>
        <p className="text-slate-400 text-sm mt-1">
          Categories available for vendors to list themselves under.
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category Name</label>
          <input
            type="text"
            placeholder="e.g. Fireworks"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md disabled:opacity-60 flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Category
        </button>
        {error && <p className="w-full text-xs text-rose-400">{error}</p>}
      </form>

      {/* List */}
      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No categories yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-900/40">
                <span className="font-bold text-white truncate">{c.name}</span>
                <DeleteButton
                  busy={busyId === c.id}
                  onClick={async () => {
                    setBusyId(c.id);
                    await deleteCategory(token, c.id);
                    await load();
                    setBusyId(null);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
