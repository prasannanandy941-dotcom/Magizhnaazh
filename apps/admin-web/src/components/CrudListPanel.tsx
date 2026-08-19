import React, { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

export interface CrudColumn<T> {
  label: string;
  render: (item: T) => React.ReactNode;
}

export interface CrudField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}

interface CrudListPanelProps<T> {
  title: string;
  subtitle?: string;
  items: T[];
  loading: boolean;
  columns: CrudColumn<T>[];
  rowKey: (item: T) => string;
  rowAction?: (item: T) => React.ReactNode;
  addFields?: CrudField[];
  onAdd?: (values: Record<string, string>) => Promise<void>;
  addLabel?: string;
  emptyText?: string;
  // Optional controls (e.g. filter tabs) rendered between the header and the
  // table.
  toolbar?: React.ReactNode;
}

export function CrudListPanel<T>({
  title,
  subtitle,
  items,
  loading,
  columns,
  rowKey,
  rowAction,
  addFields,
  onAdd,
  addLabel = 'Add',
  emptyText = 'Nothing here yet.',
  toolbar,
}: CrudListPanelProps<T>) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAdd) return;
    setSaving(true);
    setError('');
    try {
      await onAdd(formValues);
      setFormValues({});
    } catch (err: any) {
      setError(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl text-white">{title}</h2>
        {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
      </div>

      {toolbar}

      {addFields && onAdd && (
        <form onSubmit={handleAdd} className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-wrap items-end gap-3">
          {addFields.map((f) => (
            <div key={f.name} className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{f.label}</label>
              <input
                type={f.type || 'text'}
                placeholder={f.placeholder}
                value={formValues[f.name] || ''}
                onChange={(e) => setFormValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md disabled:opacity-60 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {addLabel}
          </button>
          {error && <p className="w-full text-xs text-rose-400">{error}</p>}
        </form>
      )}

      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase">
                  {columns.map((c) => (
                    <th key={c.label} className="p-4">{c.label}</th>
                  ))}
                  {rowAction && <th className="p-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {items.map((item) => (
                  <tr key={rowKey(item)} className="hover:bg-slate-900/40">
                    {columns.map((c) => (
                      <td key={c.label} className="p-4">{c.render(item)}</td>
                    ))}
                    {rowAction && <td className="p-4 text-center">{rowAction(item)}</td>}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + (rowAction ? 1 : 0)} className="p-8 text-center text-slate-500">
                      {emptyText}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function DeleteButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs shadow-md disabled:opacity-60 inline-flex items-center gap-1.5"
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
      Remove
    </button>
  );
}
