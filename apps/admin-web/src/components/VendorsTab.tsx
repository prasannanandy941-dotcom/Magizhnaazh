import React, { useEffect, useState } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { Vendor } from '../../../../packages/shared-types';
import { fetchVendors, toggleVendorVerification, toggleVendorSuspension, decideVendorVerification, GATEWAY_URL } from '../api';
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

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    let reason: string | undefined;
    if (decision === 'reject') {
      reason = window.prompt('Reason for rejecting this verification (shown to the vendor):') || '';
      if (reason.trim() === '') return; // cancelled / empty
    }
    setBusyId(id);
    await decideVendorVerification(token, id, decision, reason);
    await load();
    setBusyId(null);
  };

  const statusOf = (v: Vendor) => v.verification?.status || (v.isVerified ? 'verified' : 'unverified');

  return (
    <CrudListPanel
      title="Vendor Partners"
      subtitle="Review verification requests, approve new listings, and suspend partners that violate platform policy."
      items={vendors}
      loading={loading}
      rowKey={(v) => v.id}
      columns={[
        { label: 'Business Name', render: (v) => <span className="font-bold text-white">{v.businessName}</span> },
        { label: 'Category', render: (v) => v.category },
        { label: 'Location', render: (v) => v.location.city },
        { label: 'Rating', render: (v) => `★ ${v.ratingAverage}` },
        {
          label: 'Verification',
          render: (v) => {
            const s = statusOf(v);
            const ver = v.verification;
            return (
              <div className="flex flex-col gap-1">
                {s === 'verified' && <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] w-fit">Verified</span>}
                {s === 'pending' && <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] w-fit">Pending review</span>}
                {s === 'rejected' && <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] w-fit">Rejected</span>}
                {s === 'unverified' && <span className="px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-400 font-bold text-[10px] w-fit">Not submitted</span>}
                {v.isSuspended && <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] w-fit">Suspended</span>}
                {(s === 'pending' || s === 'rejected' || s === 'verified') && ver && (ver.legalName || ver.registrationNumber) && (
                  <div className="mt-1 text-[10px] text-slate-400 leading-relaxed max-w-[220px]">
                    {ver.legalName && <div>Legal: <span className="text-slate-300">{ver.legalName}</span></div>}
                    {ver.registrationNumber && <div>Reg#: <span className="text-slate-300">{ver.registrationNumber}</span></div>}
                    {ver.gstNumber && <div>GST: <span className="text-slate-300">{ver.gstNumber}</span></div>}
                    {(ver.documents?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {ver.documents!.map((d, i) => (
                          <a key={i} href={d.startsWith('http') ? d : `${GATEWAY_URL}${d}`} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline">
                            <FileText className="w-3 h-3" /> Doc {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          },
        },
      ]}
      rowAction={(v) => {
        const s = statusOf(v);
        return (
          <div className="flex flex-col gap-2 items-center">
            {s === 'pending' ? (
              <>
                <button onClick={() => decide(v.id, 'approve')} disabled={busyId === v.id}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-60 inline-flex items-center gap-1.5 w-full justify-center bg-emerald-500 text-slate-950">
                  {busyId === v.id && <Loader2 className="w-3 h-3 animate-spin" />} Approve
                </button>
                <button onClick={() => decide(v.id, 'reject')} disabled={busyId === v.id}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-60 inline-flex items-center gap-1.5 w-full justify-center bg-rose-500/20 border border-rose-500/30 text-rose-300">
                  Reject
                </button>
              </>
            ) : (
              <button onClick={() => runAction(v.id, toggleVendorVerification)} disabled={busyId === v.id}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-60 inline-flex items-center gap-1.5 w-full justify-center ${
                  v.isVerified ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300' : 'bg-emerald-500 text-slate-950'
                }`}>
                {busyId === v.id && <Loader2 className="w-3 h-3 animate-spin" />}
                {v.isVerified ? 'Revoke Verification' : 'Verify manually'}
              </button>
            )}
            <button onClick={() => runAction(v.id, toggleVendorSuspension)} disabled={busyId === v.id}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-60 inline-flex items-center gap-1.5 w-full justify-center ${
                v.isSuspended ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border border-slate-800 text-slate-300'
              }`}>
              {v.isSuspended ? 'Reinstate' : 'Suspend'}
            </button>
          </div>
        );
      }}
      emptyText="No vendors registered yet."
    />
  );
};
