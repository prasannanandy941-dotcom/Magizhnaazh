import React, { useState } from 'react';
import { Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { VendorEnquiryRow, fetchEnquiries, toggleEnquiryResolved, deleteEnquiry } from '../api';
import { useCachedList } from '../useCachedList';
import { CrudListPanel, DeleteButton } from './CrudListPanel';

export const EnquiriesTab: React.FC<{ token: string }> = ({ token }) => {
  const { items, setItems, loading, refreshing } = useCachedList<VendorEnquiryRow>('enquiries', async () => (await fetchEnquiries(token)).data?.enquiries || []);
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <CrudListPanel
      itemLabel="requests"
      title="Vendor Requests"
      subtitle="Customers who could not find a vendor for their event date. Contact them once you have found one, then mark the request done."
      items={items}
      loading={loading}
      refreshing={refreshing}
      rowKey={(e) => e.id}
      columns={[
        { label: 'Customer', render: (e) => <div><span className="font-bold text-white block">{e.customerName || '—'}</span><span className="text-slate-400">{e.email}</span>{e.phone && <span className="block text-slate-400">{e.phone}</span>}</div> },
        { label: 'Needs', render: (e) => <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase">{e.category}</span> },
        { label: 'Event', render: (e) => <div><span className="text-white font-semibold block">{e.eventDate}</span><span className="text-slate-400">{[e.eventTitle, e.city].filter(Boolean).join(' · ')}</span></div> },
        { label: 'Notes', render: (e) => <span className="text-slate-300 max-w-[18rem] block whitespace-normal">{e.notes || '—'}</span> },
        { label: 'Status', render: (e) => (e.status === 'open' ? <span className="text-amber-300 font-bold">Open</span> : <span className="text-emerald-400 font-bold">Done</span>) },
        { label: 'Received', render: (e) => <span className="text-slate-400">{new Date(e.createdAt).toLocaleDateString('en-IN')}</span> },
      ]}
      rowAction={(e) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={async () => {
              setBusyId(e.id);
              await toggleEnquiryResolved(token, e.id);
              setItems((prev) => prev.map((x) => (x.id === e.id ? { ...x, status: x.status === 'open' ? 'resolved' : 'open' } : x)));
              setBusyId(null);
            }}
            disabled={busyId === e.id}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-60 inline-flex items-center gap-1.5 ${e.status === 'open' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 border border-slate-700 text-slate-300'}`}
          >
            {busyId === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : e.status === 'open' ? <CheckCircle2 className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
            {e.status === 'open' ? 'Mark done' : 'Reopen'}
          </button>
          <DeleteButton
            busy={busyId === e.id}
            onClick={async () => { setBusyId(e.id); await deleteEnquiry(token, e.id); setItems((prev) => prev.filter((x) => x.id !== e.id)); setBusyId(null); }}
          />
        </div>
      )}
      emptyText="No vendor requests yet."
    />
  );
};
