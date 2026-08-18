import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, BarChart3, Download, Filter, X } from 'lucide-react';
import { Vendor, Booking, VENDOR_CATEGORIES } from '../../../../packages/shared-types';
import { fetchVendors, fetchBookings, fetchSettings } from '../api';

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

interface TrendPoint {
  label: string;
  value: number;
}

// Simple dependency-free SVG line chart for the revenue trend.
function TrendChart({ data }: { data: TrendPoint[] }) {
  const width = 640;
  const height = 200;
  const padding = 36;

  if (data.length === 0) {
    return <p className="text-xs text-slate-500">No bookings in this range yet.</p>;
  }

  const formatShort = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
  };

  const maxVal = Math.max(1, ...data.map((d) => d.value));

  // With a single point there's no "step" to space it by — just center it.
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const startX = data.length === 1 ? width / 2 : padding;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? startX : padding + i * stepX;
    const y = height - padding - (d.value / maxVal) * (height - padding * 2);
    return { x, y, ...d };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const baselineY = height - padding;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* baseline for scale reference */}
      <line x1={padding} y1={baselineY} x2={width - padding} y2={baselineY} stroke="rgb(51 65 85)" strokeWidth={1} />
      <text x={padding} y={baselineY + 14} fontSize={9} fill="rgb(100 116 139)">₹0</text>
      <text x={padding} y={padding - 8} fontSize={9} fill="rgb(100 116 139)">{formatShort(maxVal)}</text>

      {data.length > 1 && (
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="rgb(129 140 248)" // indigo-400
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="rgb(129 140 248)" />
          <text x={p.x} y={p.y - 12} fontSize={10} fontWeight={700} fill="rgb(226 232 240)" textAnchor="middle">
            {formatShort(p.value)}
          </text>
          <text x={p.x} y={height - 6} fontSize={9} fill="rgb(148 163 184)" textAnchor="middle">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export const AnalyticsTab: React.FC<{ token: string }> = ({ token }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [commissionRate, setCommissionRate] = useState(0);
  const [loading, setLoading] = useState(true);

  // --- Filters ---
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [vRes, bRes, sRes] = await Promise.all([fetchVendors(), fetchBookings(token), fetchSettings(token)]);
      setVendors(vRes.data?.vendors || []);
      setBookings(bRes.data?.bookings || []);
      setCommissionRate(sRes.data?.settings?.commissionRate || 0);
      setLoading(false);
    })();
  }, []);

  // vendorId -> city, so bookings (which don't carry city directly) can be filtered by it
  const vendorCityMap = useMemo(() => {
    const map: Record<string, string> = {};
    vendors.forEach((v) => { map[v.id] = v.location?.city || 'Unknown'; });
    return map;
  }, [vendors]);

  const cityOptions = useMemo(() => {
    const set = new Set(vendors.map((v) => v.location?.city).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [vendors]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (dateFrom && b.eventDate < dateFrom) return false;
      if (dateTo && b.eventDate > dateTo) return false;
      if (cityFilter && vendorCityMap[b.vendorId] !== cityFilter) return false;
      if (categoryFilter && b.vendorCategory !== categoryFilter) return false;
      return true;
    });
  }, [bookings, dateFrom, dateTo, cityFilter, categoryFilter, vendorCityMap]);

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setCityFilter('');
    setCategoryFilter('');
  };

  const hasActiveFilters = !!(dateFrom || dateTo || cityFilter || categoryFilter);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Crunching numbers...
      </div>
    );
  }

  // --- Metrics (computed from filtered bookings) ---
  const byCategory: Record<string, number> = {};
  vendors.forEach((v) => { byCategory[v.category] = (byCategory[v.category] || 0) + 1; });
  const maxCategory = Math.max(1, ...Object.values(byCategory));

  const byStatus: Record<string, number> = {};
  filteredBookings.forEach((b) => { byStatus[b.status] = (byStatus[b.status] || 0) + 1; });
  const maxStatus = Math.max(1, ...Object.values(byStatus));

  const totalRevenue = filteredBookings.reduce((acc, b) => acc + b.agreedPrice, 0);
  const avgBookingValue = filteredBookings.length ? Math.round(totalRevenue / filteredBookings.length) : 0;
  const verifiedCount = vendors.filter((v) => v.isVerified).length;
  const commissionEarned = Math.round(totalRevenue * commissionRate);
  const advanceCollected = filteredBookings.reduce((acc, b) => acc + b.advanceAmountPaid, 0);

  // Revenue trend by month (YYYY-MM), based on eventDate
  const trendMap: Record<string, number> = {};
  filteredBookings.forEach((b) => {
    const monthKey = (b.eventDate || '').slice(0, 7); // "YYYY-MM"
    if (!monthKey) return;
    trendMap[monthKey] = (trendMap[monthKey] || 0) + b.agreedPrice;
  });
  const trendData: TrendPoint[] = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      label: month.slice(5) + '/' + month.slice(2, 4), // "MM/YY"
      value,
    }));

  // Top vendors by revenue within filtered bookings
  const vendorRevenue: Record<string, number> = {};
  filteredBookings.forEach((b) => { vendorRevenue[b.vendorId] = (vendorRevenue[b.vendorId] || 0) + b.agreedPrice; });
  const topVendors = Object.entries(vendorRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([vendorId, revenue]) => {
      const vendor = vendors.find((v) => v.id === vendorId);
      return { name: vendor?.businessName || 'Unknown Vendor', category: vendor?.category || '', revenue };
    });

  const handleExportCsv = () => {
    const headers = ['Booking Number', 'Vendor', 'Category', 'Event Date', 'Agreed Price', 'Advance Paid', 'Remaining', 'Status', 'Created At'];
    const rows = filteredBookings.map((b) => [
      b.bookingNumber,
      b.vendorName,
      b.vendorCategory,
      b.eventDate,
      b.agreedPrice,
      b.advanceAmountPaid,
      b.remainingAmount,
      b.status,
      b.createdAt,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" /> Platform Analytics
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Computed live from current vendor/booking data — not a separate analytics pipeline yet (that's future work: event streaming into a warehouse).
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={filteredBookings.length === 0}
          className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-xs shadow-md disabled:opacity-40 flex items-center gap-2 shrink-0"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* --- Filters --- */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase">Filters</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="ml-auto text-[11px] text-slate-400 hover:text-white flex items-center gap-1">
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Event date from</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Event date to</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">City</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
            >
              <option value="">All cities</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
            >
              <option value="">All categories</option>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <p className="text-[11px] text-slate-500 mt-3">
            Showing {filteredBookings.length} of {bookings.length} bookings
          </p>
        )}
      </div>

      {/* --- Top metrics --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-indigo-400 uppercase">Commission Earned</span>
          <div className="font-display font-extrabold text-2xl text-indigo-400 mt-1">₹{commissionEarned.toLocaleString('en-IN')}</div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-teal-400 uppercase">Advance Collected</span>
          <div className="font-display font-extrabold text-2xl text-teal-400 mt-1">₹{advanceCollected.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* --- Revenue trend --- */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800">
        <h3 className="font-bold text-sm text-white mb-4">Revenue Trend (by event month)</h3>
        <TrendChart data={trendData} />
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
          {Object.entries(byStatus).length === 0 && <p className="text-xs text-slate-500">No booking data in this range.</p>}
          {Object.entries(byStatus).map(([status, count]) => (
            <Bar key={status} label={status.replace('_', ' ')} value={count} max={maxStatus} color="bg-amber-500" />
          ))}
        </div>
      </div>

      {/* --- Top vendors --- */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800">
        <h3 className="font-bold text-sm text-white mb-4">Top Vendors by Revenue</h3>
        {topVendors.length === 0 && <p className="text-xs text-slate-500">No booking data in this range.</p>}
        <div className="space-y-3">
          {topVendors.map((v, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-300">{i + 1}</span>
                <div>
                  <div className="font-semibold text-white">{v.name}</div>
                  <div className="text-[11px] text-slate-500">{v.category}</div>
                </div>
              </div>
              <span className="font-bold text-amber-400">₹{v.revenue.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
