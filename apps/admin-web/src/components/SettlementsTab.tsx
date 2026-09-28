import React, { useEffect, useRef, useState } from 'react';
import { usePagination, Pagination } from '../../../../packages/shared-ui/pagination';
import { Loader2, Wallet, CheckCircle2, RefreshCw, Truck, AlertTriangle, Clock } from 'lucide-react';
import { fetchSettlements, markSettlement, syncSettlements, PayoutStage, Settlement, SettlementTotals, SettlementTransfer } from '../api';

const rupee = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const shortDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');

type Filter = 'all' | 'pending' | 'in_transit' | 'settled';
const IN_TRANSIT: PayoutStage[] = ['in_transit', 'transfer_pending', 'on_hold'];

const STAGES: Record<PayoutStage, { label: string; tone: string; Icon: React.ElementType }> = {
  settled: { label: 'Whole payment credited to vendor', tone: 'bg-emerald-500/20 text-emerald-300', Icon: CheckCircle2 },
  manual_settled: { label: 'Paid to vendor (manual)', tone: 'bg-emerald-500/20 text-emerald-300', Icon: CheckCircle2 },
  in_transit: { label: 'Razorpay is sending to vendor', tone: 'bg-indigo-500/20 text-indigo-300', Icon: Truck },
  transfer_pending: { label: 'Transfer processing', tone: 'bg-amber-500/20 text-amber-300', Icon: Clock },
  on_hold: { label: 'Payout on hold', tone: 'bg-amber-500/20 text-amber-300', Icon: Clock },
  transfer_failed: { label: 'Transfer failed', tone: 'bg-red-500/20 text-red-300', Icon: AlertTriangle },
  manual: { label: 'Pending', tone: 'bg-amber-500/20 text-amber-300', Icon: Clock },
};

// One line of the Razorpay trail for a payment: what was routed to the vendor
// and where it stands (transfer -> bank settlement, with UTR once credited).
const transferLine = (t: SettlementTransfer): string => {
  const what = `${t.type === 'advance' ? 'Advance' : 'Balance'} ${rupee(t.amount)}`;
  if (t.status === 'failed') return `${what} · transfer failed${t.error ? `: ${t.error}` : ''}`;
  if (t.settlementStatus === 'settled') return `${what} · credited to vendor's bank${t.settledAt ? ` ${shortDate(t.settledAt)}` : ''}${t.utr ? ` · UTR ${t.utr}` : t.settlementId ? ` · ${t.settlementId}` : ''}`;
  if (t.settlementStatus === 'on_hold') return `${what} · on hold${t.onHoldUntil ? ` until ${shortDate(t.onHoldUntil)}` : ''}`;
  if (t.status === 'processed') return `${what} · received by vendor's Razorpay account${t.processedAt ? ` ${shortDate(t.processedAt)}` : ''}, bank credit pending`;
  return `${what} · transfer ${t.status}`;
};

const MANUAL_REASONS: Record<string, string> = {
  nothing_collected: 'Nothing collected from the customer yet',
  vendor_not_on_route: 'Vendor is not connected to Razorpay Route — the money is in your Razorpay balance and must be paid out manually',
  paid_outside_razorpay: 'Paid outside Razorpay (UPI / cash) — pay the vendor manually',
};

export const SettlementsTab: React.FC<{ token: string }> = ({ token }) => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [totals, setTotals] = useState<SettlementTotals>({ commission: 0, payout: 0, collected: 0, paidOut: 0, inTransit: 0, pendingPayout: 0 });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const didAutoSync = useRef(false);

  const load = async () => {
    const res = await fetchSettlements(token);
    setSettlements(res.data?.settlements || []);
    if (res.data?.totals) setTotals(res.data.totals);
    setLastSyncedAt(res.data?.lastSyncedAt || null);
    setLoading(false);
  };

  // Pull the latest transfer/settlement state from Razorpay, then re-read.
  const sync = async () => {
    setSyncing(true);
    setSyncNote('');
    const res = await syncSettlements(token);
    setSyncNote(res.success ? `Synced with Razorpay (${res.data?.checked ?? 0} payment${res.data?.checked === 1 ? '' : 's'} checked).` : res.message || 'Could not reach Razorpay.');
    await load();
    setSyncing(false);
  };

  useEffect(() => {
    // Show the register straight away, then refresh from Razorpay in the background.
    load().then(() => {
      if (!didAutoSync.current) {
        didAutoSync.current = true;
        sync();
      }
    });
  }, []);

  const toggle = async (s: Settlement) => {
    setBusyId(s.bookingId);
    await markSettlement(token, s.bookingId, s.settlementStatus !== 'settled');
    await load();
    setBusyId(null);
  };

  const rows = settlements.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'in_transit') return IN_TRANSIT.includes(s.payoutStage);
    return s.settlementStatus === filter;
  });
  // Paging: 10 settlements per page; back to page 1 when the filter changes.
  const pager = usePagination(rows, 10, filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">Vendor Settlements</h2>
          <p className="text-slate-400 text-sm mt-1">Commission earned and vendor payouts per confirmed booking, tracked live from Razorpay — customer payment, transfer to the vendor, and bank settlement.</p>
        </div>
        <div className="text-right">
          <button onClick={sync} disabled={syncing}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 disabled:opacity-60">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync with Razorpay
          </button>
          <span className="block text-[10px] text-slate-500 mt-1">
            {syncNote || (lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString('en-IN')}` : 'Updates automatically via Razorpay webhooks')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Collected from customers', value: totals.collected, tone: 'text-emerald-400' },
          { label: 'Platform commission', value: totals.commission, tone: 'text-indigo-400' },
          { label: 'Credited to vendors', value: totals.paidOut, tone: 'text-white' },
          { label: 'Razorpay sending to vendors', value: totals.inTransit, tone: 'text-sky-400' },
          { label: 'Payouts pending', value: Math.max(0, totals.pendingPayout - totals.inTransit), tone: 'text-amber-400' },
        ].map((c) => (
          <div key={c.label} className="glass-card p-5 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block">{c.label}</span>
            <span className={`text-xl font-display font-extrabold mt-1 block ${c.tone}`}>{rupee(c.value)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {([['all', 'All'], ['pending', 'Pending'], ['in_transit', 'In transit'], ['settled', 'Credited']] as const).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filter === f ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300'}`}>
            {label}
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
          <>
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
              {pager.pageItems.map((s) => {
                const stage = STAGES[s.payoutStage] || STAGES.manual;
                return (
                  <tr key={s.bookingId} className="border-b border-slate-800/60 text-sm align-top">
                    <td className="p-3">
                      <span className="text-white font-semibold">{s.bookingNumber}</span>
                      <span className="block text-[10px] text-slate-500">{s.eventDate}</span>
                    </td>
                    <td className="p-3 text-slate-300">{s.vendorName}</td>
                    <td className="p-3 text-right text-white">{rupee(s.agreedPrice)}</td>
                    <td className="p-3 text-right text-indigo-300">{rupee(s.commission)}</td>
                    <td className="p-3 text-right text-emerald-300 font-semibold">{rupee(s.vendorPayout)}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] ${stage.tone}`}>
                        <stage.Icon className="w-3 h-3" /> {stage.label}
                      </span>
                      {!s.paidInFull && <span className="block text-[10px] text-slate-500 mt-1">Not fully collected</span>}
                      {s.manualReason && MANUAL_REASONS[s.manualReason] && (
                        <span className="block text-[10px] text-amber-300/80 mt-1 max-w-xs">{MANUAL_REASONS[s.manualReason]}</span>
                      )}
                      {s.transfers.map((t) => (
                        <span key={t.transferId || t.paymentId} className={`block text-[10px] mt-1 max-w-xs ${t.status === 'failed' ? 'text-red-300' : 'text-slate-500'}`}
                          title={[t.transferId, t.settlementId].filter(Boolean).join(' · ')}>
                          {transferLine(t)}
                        </span>
                      ))}
                    </td>
                    <td className="p-3">
                      {s.canSettleManually && (
                        <button onClick={() => toggle(s)} disabled={busyId === s.bookingId}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] inline-flex items-center gap-1.5 disabled:opacity-60 ${
                            s.settlementStatus === 'settled' ? 'bg-slate-900 border border-slate-800 text-slate-300' : 'bg-emerald-500 text-slate-950'
                          }`}>
                          {busyId === s.bookingId && <Loader2 className="w-3 h-3 animate-spin" />}
                          {s.settlementStatus === 'settled' ? 'Mark pending' : <><Wallet className="w-3.5 h-3.5" /> Mark settled</>}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination pager={pager} label="settlements" />
          </>
        )}
      </div>
    </div>
  );
};
