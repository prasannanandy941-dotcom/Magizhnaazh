import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Vendor } from '../../../../packages/shared-types';
import { fetchVendors, toggleVendorVerification, toggleVendorSuspension } from '../api';
import { CrudListPanel } from './CrudListPanel';

export const VendorsTab: React.FC<{ token: string }> = ({ token }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetchVendors();
    setVendors(res.data?.vendors || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runAction = async (id: string, action: (t: string, id: string) => Promise<any>) => {
    setBusyId(id);
    await action(token, id);
    await load();
    setBusyId(null);
  };

  return (
    <CrudListPanel
      title="Vendor Partners"
      subtitle="Approve new listings and suspend partners that violate platform policy."
      items={vendors}
      loading={loading}
      rowKey={(v) => v.id}
      columns={[
        { label: 'Business Name', render: (v) => <span className="font-bold text-white">{v.businessName}</span> },
        { label: 'Category', render: (v) => v.category },
        { label: 'Location', render: (v) => v.location.city },
        { label: 'Starting Price', render: (v) => <span className="text-amber-400 font-bold">₹{v.startingPrice.toLocaleString('en-IN')}</span> },
        { label: 'Rating', render: (v) => `★ ${v.ratingAverage}` },
        {
          label: 'Status',
          render: (v) => (
            <div className="flex flex-col gap-1">
              {v.isVerified ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] w-fit">Verified</span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] w-fit">Pending</span>
              )}
              {v.isSuspended && (
                <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] w-fit">Suspended</span>
              )}
            </div>
          ),
        },
      ]}
      rowAction={(v) => (
        <div className="flex flex-col gap-2 items-center">
          <button
            onClick={() => runAction(v.id, toggleVendorVerification)}
            disabled={busyId === v.id}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-60 inline-flex items-center gap-1.5 w-full justify-center ${
              v.isVerified ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300' : 'bg-emerald-500 text-slate-950'
            }`}
          >
            {busyId === v.id && <Loader2 className="w-3 h-3 animate-spin" />}
            {v.isVerified ? 'Revoke Verification' : 'Approve Vendor'}
          </button>
          <button
            onClick={() => runAction(v.id, toggleVendorSuspension)}
            disabled={busyId === v.id}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-60 inline-flex items-center gap-1.5 w-full justify-center ${
              v.isSuspended ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border border-slate-800 text-slate-300'
            }`}
          >
            {v.isSuspended ? 'Reinstate' : 'Suspend'}
          </button>
        </div>
      )}
      emptyText="No vendors registered yet."
    />
  );
};
