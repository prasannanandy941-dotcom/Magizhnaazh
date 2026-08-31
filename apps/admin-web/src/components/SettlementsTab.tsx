import React, { useEffect, useState } from 'react';
import { Loader2, Wallet, CheckCircle2 } from 'lucide-react';
import { fetchSettlements, markSettlement, Settlement, SettlementTotals } from '../api';

const rupee = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

export const SettlementsTab: React.FC<{ token: string }> = ({ token }) => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [totals, setTotals] = useState<SettlementTotals>({ commission: 0, payout: 0, collected: 0, pendingPayout: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('all');

  const load = async () => {
    setLoading(true);
    const res = await fetchSettlements(token);
    setSettlements(res.data?.settlements || []);
    if (res.data?.totals) setTotals(res.data.totals);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (s: Settlement) => {
    setBusyId(s.bookingId);
    await markSettlement(token, s.bookingId, s.settlementStatus !== 'settled');
    await load();
    setBusyId(null);
  };

  const rows = settlements.filter((s) => filter === 'all' || s.settlementStatus === filter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl text-white">Vendor Settlements</h2>
        <p className="text-slate-400 text-sm mt-1">Commission earned and payouts owed to vendors, per confirmed booking.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Collected from customers', value: totals.collected, tone: 'text-emerald-400' },
          { label: 'Platform commission', value: totals.commission, tone: 'text-indigo-400' },
          { label: 'Total vendor payouts', value: totals.payout, tone: 'text-white' },
          { label: 'Payouts pending', value: totals.pendingPayout, tone: 'text-amber-400' },
        ].map((c) => (
          <div key={c.label} className="glass-card p-5 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block">{c.label}</span>
            <span className={`text-xl font-display font-extrabold mt-1 block ${c.tone}`}>{rupee(c.value)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'pending', 'settled'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize ${filter === f ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-3xl border border-slate-800 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading settlements...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No settlements to show.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
                <th className="p-3">Booking</th>
                <th className="p-3">Vendor</th>
                <th className="p-3 text-right">Booking value</th>
                <th className="p-3 text-right">Commission</th>
                <th className="p-3 text-right">Vendor payout</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.bookingId} className="border-b border-slate-800/60 text-sm">
                  <td className="p-3">
                    <span className="text-white font-semibold">{s.bookingNumber}</span>
                    <span className="block text-[10px] text-slate-500">{s.eventDate}</span>
                  </td>
                  <td className="p-3 text-slate-300">{s.vendorName}</td>
                  <td className="p-3 text-right text-white">{rupee(s.agreedPrice)}</td>
                  <td className="p-3 text-right text-indigo-300">{rupee(s.commission)}</td>
                  <td className="p-3 text-right text-emerald-300 font-semibold">{rupee(s.vendorPayout)}</td>
                  <td className="p-3">
                    {s.settlementStatus === 'settled' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]"><CheckCircle2 className="w-3 h-3" /> Settled</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">Pending</span>
                    )}
                    {!s.paidInFull && <span className="block text-[10px] text-slate-500 mt-1">Not fully collected</span>}
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggle(s)} disabled={busyId === s.bookingId}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] inline-flex items-center gap-1.5 disabled:opacity-60 ${
                        s.settlementStatus === 'settled' ? 'bg-slate-900 border border-slate-800 text-slate-300' : 'bg-emerald-500 text-slate-950'
                      }`}>
                      {busyId === s.bookingId && <Loader2 className="w-3 h-3 animate-spin" />}
                      {s.settlementStatus === 'settled' ? 'Mark pending' : <><Wallet className="w-3.5 h-3.5" /> Mark settled</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
