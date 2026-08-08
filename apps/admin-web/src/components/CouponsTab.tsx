import React, { useEffect, useState } from 'react';
import { Coupon } from '../../../../packages/shared-types';
import { fetchCoupons, addCoupon, deleteCoupon } from '../api';
import { CrudListPanel, DeleteButton } from './CrudListPanel';

export const CouponsTab: React.FC<{ token: string }> = ({ token }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetchCoupons(token);
    setCoupons(res.data?.coupons || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <CrudListPanel
        title="Discount Coupons"
        subtitle="Admin-managed coupon codes. Not yet applied automatically during booking checkout — that's a follow-up."
        items={coupons}
        loading={loading}
        rowKey={(c) => c.id}
        columns={[
          { label: 'Code', render: (c) => <span className="font-bold text-white font-mono">{c.code}</span> },
          { label: 'Discount', render: (c) => <span className="text-amber-400 font-bold">{c.discountPercent}%</span> },
          { label: 'Expires', render: (c) => c.expiresAt || 'Never' },
          { label: 'Status', render: (c) => (c.isActive ? <span className="text-emerald-400 font-bold">Active</span> : <span className="text-slate-500">Inactive</span>) },
        ]}
        addFields={[
          { name: 'code', label: 'Coupon Code', placeholder: 'WEDDING10' },
          { name: 'discountPercent', label: 'Discount %', type: 'number', placeholder: '10' },
          { name: 'expiresAt', label: 'Expires (optional)', type: 'date' },
        ]}
        addLabel="Create Coupon"
        onAdd={async (v) => {
          await addCoupon(token, { code: v.code, discountPercent: Number(v.discountPercent), expiresAt: v.expiresAt || undefined });
          await load();
        }}
        rowAction={(c) => (
          <DeleteButton
            busy={busyId === c.id}
            onClick={async () => { setBusyId(c.id); await deleteCoupon(token, c.id); await load(); setBusyId(null); }}
          />
        )}
        emptyText="No coupons yet."
      />
    </div>
  );
};
