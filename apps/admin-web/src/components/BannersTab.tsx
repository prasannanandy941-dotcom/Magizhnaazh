import React, { useEffect, useState } from 'react';
import { Banner } from '../../../../packages/shared-types';
import { fetchBanners, addBanner, deleteBanner } from '../api';
import { CrudListPanel, DeleteButton } from './CrudListPanel';

export const BannersTab: React.FC<{ token: string }> = ({ token }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetchBanners();
    setBanners(res.data?.banners || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <CrudListPanel
      title="Promotional Banners"
      subtitle="Homepage promotional banners shown to customers."
      items={banners}
      loading={loading}
      rowKey={(b) => b.id}
      columns={[
        {
          label: 'Preview',
          render: (b) => (
            <img src={b.imageUrl} alt={b.title} className="w-20 h-10 object-cover rounded-lg border border-slate-800" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
          ),
        },
        { label: 'Title', render: (b) => <span className="font-bold text-white">{b.title}</span> },
        { label: 'Link', render: (b) => <span className="text-slate-400">{b.linkUrl || '—'}</span> },
        { label: 'Status', render: (b) => (b.isActive ? <span className="text-emerald-400 font-bold">Active</span> : <span className="text-slate-500">Inactive</span>) },
      ]}
      addFields={[
        { name: 'title', label: 'Title', placeholder: 'Diwali Mega Offer' },
        { name: 'imageUrl', label: 'Image URL', placeholder: 'https://...' },
        { name: 'linkUrl', label: 'Link URL (optional)', placeholder: 'https://...' },
      ]}
      addLabel="Add Banner"
      onAdd={async (v) => { await addBanner(token, { title: v.title, imageUrl: v.imageUrl, linkUrl: v.linkUrl }); await load(); }}
      rowAction={(b) => (
        <DeleteButton
          busy={busyId === b.id}
          onClick={async () => { setBusyId(b.id); await deleteBanner(token, b.id); await load(); setBusyId(null); }}
        />
      )}
      emptyText="No banners yet."
    />
  );
};
