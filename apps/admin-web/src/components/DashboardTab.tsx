import React, { useEffect, useState } from 'react';
import { Loader2, Layers, Star, CalendarClock, Wallet, TrendingUp, ShieldCheck } from 'lucide-react';
import {
  fetchVendors,
  fetchAdminMetrics,
  fetchEvents,
  fetchBookings,
  AdminMetrics,
} from '../api';
import { Vendor, Booking } from '../../../../packages/shared-types';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

const STATUS_TONE: Record<string, string> = {
  confirmed: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
  completed: 'bg-indigo-950/70 text-indigo-300 border-indigo-500/40',
  pending: 'bg-amber-950/70 text-amber-300 border-amber-500/40',
  quote_sent: 'bg-sky-950/70 text-sky-300 border-sky-500/40',
  cancelled: 'bg-rose-950/70 text-rose-300 border-rose-500/40',
};
const statusTone = (s: string) => STATUS_TONE[s] ?? 'bg-slate-800 text-slate-300 border-slate-700';
const prettyStatus = (s: string) => s.replace(/_/g, ' ');

export const DashboardTab: React.FC<{ token: string }> = ({ token }) => {
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    (async () => {
      const [vendorsRes, metricsRes, eventsRes, bookingsRes] = await Promise.all([
        fetchVendors().catch(() => null),
        fetchAdminMetrics(token).catch(() => null),
        fetchEvents(token).catch(() => null),
        fetchBookings(token).catch(() => null),
      ]);
      setVendors(vendorsRes?.data?.vendors ?? []);
      setMetrics(metricsRes?.data ?? null);
      setEventCount(eventsRes?.data?.events.length ?? 0);
      setBookings(bookingsRes?.data?.bookings ?? []);
    })();
  }, [token]);

  const vendorCount = vendors?.length ?? null;
  const grossVolume = metrics?.grossBookingVolume ?? 0;
  const platformCommission = metrics?.platformCommissionEarned ?? 0;
  const advanceCollected = metrics?.totalAdvanceCollected ?? 0;
  const remainingDue = Math.max(grossVolume - advanceCollected, 0);

  // Vendors grouped by category (descending).
  const vendorsByCategory = Object.entries(
    (vendors ?? []).reduce<Record<string, number>>((acc, v) => {
      acc[v.category] = (acc[v.category] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...vendorsByCategory.map(([, c]) => c));

  const topVendors = [...(vendors ?? [])].sort((a, b) => b.ratingAverage - a.ratingAverage).slice(0, 5);

  const recentBookings = [...(bookings ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const advancePct = grossVolume > 0 ? Math.round((advanceCollected / grossVolume) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-white">Platform Health &amp; Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Super Governance Dashboard for Magizhnaazh Microservices</p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-rose-500/30 flex items-center gap-6">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Platform Commission</span>
            <span className="font-display font-extrabold text-2xl text-amber-400">{inr(platformCommission)}</span>
          </div>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Active Events" value={eventCount === null ? null : `${eventCount} Events`} tone="text-white" />
        <StatCard label="Vendor Partners" value={vendorCount === null ? null : `${vendorCount} Vendors`} tone="text-indigo-400" labelTone="text-indigo-400" />
        <StatCard label="Total Bookings" value={metrics === null ? null : `${metrics.totalBookings} Bookings`} tone="text-emerald-400" labelTone="text-emerald-400" />
        <StatCard label="Gross Booking Volume" value={inr(grossVolume)} tone="text-amber-400" labelTone="text-amber-400" />
      </div>

      {/* Analytics row: revenue split + vendors by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue flow */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800">
          <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" /> Revenue Flow
          </h3>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Advance collected</span>
              <span className="font-semibold text-slate-200">
                {inr(advanceCollected)} <span className="text-slate-500">/ {inr(grossVolume)}</span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${advancePct}%` }} />
              <div className="h-full bg-slate-700" style={{ width: `${100 - advancePct}%` }} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Collected {advancePct}%</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600" /> Remaining {inr(remainingDue)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MiniStat icon={<TrendingUp className="w-4 h-4 text-amber-400" />} label="Gross" value={inr(grossVolume)} />
            <MiniStat icon={<Wallet className="w-4 h-4 text-emerald-400" />} label="Advance" value={inr(advanceCollected)} />
            <MiniStat icon={<ShieldCheck className="w-4 h-4 text-rose-400" />} label="Commission" value={inr(platformCommission)} />
          </div>
        </div>

        {/* Vendors by category */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800">
          <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" /> Vendors by Category
          </h3>

          {vendors === null ? (
            <Loading />
          ) : vendorsByCategory.length === 0 ? (
            <Empty text="No vendors onboarded yet." />
          ) : (
            <div className="space-y-2.5">
              {vendorsByCategory.map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">{cat}</span>
                    <span className="text-slate-400 font-semibold">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${(count / maxCat) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent bookings + top vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent bookings */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800 lg:col-span-2">
          <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-emerald-400" /> Recent Bookings
          </h3>

          {bookings === null ? (
            <Loading />
          ) : recentBookings.length === 0 ? (
            <Empty text="No bookings yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase text-slate-500 text-left border-b border-slate-800">
                    <th className="py-2 pr-3 font-semibold">Booking</th>
                    <th className="py-2 pr-3 font-semibold">Vendor</th>
                    <th className="py-2 pr-3 font-semibold hidden sm:table-cell">Category</th>
                    <th className="py-2 pr-3 font-semibold text-right">Amount</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="border-b border-slate-800/60 last:border-0">
                      <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">{b.bookingNumber}</td>
                      <td className="py-2.5 pr-3 text-slate-200 font-medium">{b.vendorName}</td>
                      <td className="py-2.5 pr-3 text-slate-400 hidden sm:table-cell">{b.vendorCategory}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-amber-400">{inr(b.agreedPrice)}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold capitalize ${statusTone(b.status)}`}>
                          {prettyStatus(b.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top-rated vendors */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800">
          <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" /> Top-Rated Vendors
          </h3>

          {vendors === null ? (
            <Loading />
          ) : topVendors.length === 0 ? (
            <Empty text="No vendors yet." />
          ) : (
            <div className="space-y-3">
              {topVendors.map((v, i) => (
                <div key={v.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-200 font-medium truncate">{v.businessName}</div>
                    <div className="text-[11px] text-slate-500">{v.category}</div>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400 shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {v.ratingAverage.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

// --- small presentational helpers ---

const StatCard: React.FC<{ label: string; value: string | null; tone: string; labelTone?: string }> = ({
  label,
  value,
  tone,
  labelTone = 'text-slate-400',
}) => (
  <div className="glass-card p-5 rounded-2xl border border-slate-800">
    <span className={`text-xs font-bold uppercase ${labelTone}`}>{label}</span>
    <div className={`font-display font-extrabold text-2xl mt-1 ${tone}`}>
      {value === null ? <Loader2 className="w-5 h-5 animate-spin" /> : value}
    </div>
  </div>
);

const MiniStat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">{icon} {label}</div>
    <div className="text-sm font-extrabold text-white mt-1">{value}</div>
  </div>
);

const Loading: React.FC = () => (
  <div className="text-center text-xs text-slate-500 py-6 flex items-center justify-center gap-2">
    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-center text-xs text-slate-500 py-6">{text}</div>
);
