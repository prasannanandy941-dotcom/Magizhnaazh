import React, { useEffect, useState } from 'react';
import { Category } from '../../../../packages/shared-types';
import { fetchCategories, addCategory, deleteCategory } from '../api';
import { CrudListPanel, DeleteButton } from './CrudListPanel';

export const CategoriesTab: React.FC<{ token: string }> = ({ token }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetchCategories();
    setCategories(res.data?.categories || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <CrudListPanel
      title="Vendor Categories"
      subtitle="Categories available for vendors to list themselves under."
      items={categories}
      loading={loading}
      rowKey={(c) => c.id}
      columns={[{ label: 'Name', render: (c) => <span className="font-bold text-white">{c.name}</span> }]}
      addFields={[{ name: 'name', label: 'Category Name', placeholder: 'e.g. Fireworks' }]}
      addLabel="Add Category"
      onAdd={async (v) => { await addCategory(token, v.name); await load(); }}
      rowAction={(c) => (
        <DeleteButton
          busy={busyId === c.id}
          onClick={async () => { setBusyId(c.id); await deleteCategory(token, c.id); await load(); setBusyId(null); }}
        />
      )}
      emptyText="No categories yet."
    />
  );
};
