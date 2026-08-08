import React, { useEffect, useState } from 'react';
import { Loader2, BarChart3 } from 'lucide-react';
import { Vendor, Booking } from '../../../../packages/shared-types';
import { fetchVendors, fetchBookings } from '../api';

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 font-semibold">{label}</span>
        <span className="text-slate-400 font-bold">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-900 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const AnalyticsTab: React.FC<{ token: string }> = ({ token }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [vRes, bRes] = await Promise.all([fetchVendors(), fetchBookings(token)]);
      setVendors(vRes.data?.vendors || []);
      setBookings(bRes.data?.bookings || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Crunching numbers...
      </div>
    );
  }

  const byCategory: Record<string, number> = {};
  vendors.forEach((v) => { byCategory[v.category] = (byCategory[v.category] || 0) + 1; });
  const maxCategory = Math.max(1, ...Object.values(byCategory));

  const byStatus: Record<string, number> = {};
  bookings.forEach((b) => { byStatus[b.status] = (byStatus[b.status] || 0) + 1; });
  const maxStatus = Math.max(1, ...Object.values(byStatus));

  const totalRevenue = bookings.reduce((acc, b) => acc + b.agreedPrice, 0);
  const avgBookingValue = bookings.length ? Math.round(totalRevenue / bookings.length) : 0;
  const verifiedCount = vendors.filter((v) => v.isVerified).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" /> Platform Analytics
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Computed live from current vendor/booking data — not a separate analytics pipeline yet (that's future work: event streaming into a warehouse).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Average Booking Value</span>
          <div className="font-display font-extrabold text-2xl text-white mt-1">₹{avgBookingValue.toLocaleString('en-IN')}</div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-emerald-400 uppercase">Verified Vendors</span>
          <div className="font-display font-extrabold text-2xl text-emerald-400 mt-1">{verifiedCount} / {vendors.length}</div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-amber-400 uppercase">Total Gross Volume</span>
          <div className="font-display font-extrabold text-2xl text-amber-400 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-white">Vendors by Category</h3>
          {Object.entries(byCategory).length === 0 && <p className="text-xs text-slate-500">No vendor data yet.</p>}
          {Object.entries(byCategory).map(([cat, count]) => (
            <Bar key={cat} label={cat} value={count} max={maxCategory} color="bg-indigo-500" />
          ))}
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-white">Bookings by Status</h3>
          {Object.entries(byStatus).length === 0 && <p className="text-xs text-slate-500">No booking data yet.</p>}
          {Object.entries(byStatus).map(([status, count]) => (
            <Bar key={status} label={status.replace('_', ' ')} value={count} max={maxStatus} color="bg-amber-500" />
          ))}
        </div>
      </div>
    </div>
  );
};
