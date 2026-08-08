import React, { useEffect, useState } from 'react';
import { Server, Loader2 } from 'lucide-react';
import { fetchVendors, fetchAdminMetrics, fetchEvents, pingAllServices, AdminMetrics, ServiceHealth } from '../api';

export const DashboardTab: React.FC<{ token: string }> = ({ token }) => {
  const [vendorCount, setVendorCount] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>([]);

  useEffect(() => {
    (async () => {
      const [vendorsRes, metricsRes, eventsRes, health] = await Promise.all([
        fetchVendors(),
        fetchAdminMetrics(token),
        fetchEvents(token),
        pingAllServices(),
      ]);
      setVendorCount(vendorsRes.data?.vendors.length ?? 0);
      setMetrics(metricsRes.data || null);
      setEventCount(eventsRes.data?.events.length ?? 0);
      setServiceHealth(health);
    })();
  }, []);

  const grossVolume = metrics?.grossBookingVolume ?? 0;
  const platformCommission = metrics?.platformCommissionEarned ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-white">Platform Health & Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Super Governance Dashboard for Magizhnaazh Microservices</p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-rose-500/30 flex items-center gap-6">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Platform Commission</span>
            <span className="font-display font-extrabold text-2xl text-amber-400">₹{platformCommission.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Active Events</span>
          <div className="font-display font-extrabold text-2xl text-white mt-1">
            {eventCount === null ? <Loader2 className="w-5 h-5 animate-spin" /> : `${eventCount} Events`}
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-indigo-400 uppercase">Vendor Partners</span>
          <div className="font-display font-extrabold text-2xl text-indigo-400 mt-1">
            {vendorCount === null ? <Loader2 className="w-5 h-5 animate-spin" /> : `${vendorCount} Vendors`}
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-emerald-400 uppercase">Total Bookings</span>
          <div className="font-display font-extrabold text-2xl text-emerald-400 mt-1">
            {metrics === null ? <Loader2 className="w-5 h-5 animate-spin" /> : `${metrics.totalBookings} Bookings`}
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-amber-400 uppercase">Gross Booking Volume</span>
          <div className="font-display font-extrabold text-2xl text-amber-400 mt-1">₹{grossVolume.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl border border-slate-800">
        <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" /> Decoupled Microservices Ecosystem Monitor
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {serviceHealth.length === 0 && (
            <div className="col-span-full text-center text-xs text-slate-500 py-4 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Pinging services...
            </div>
          )}
          {serviceHealth.map((svc) => (
            <div key={svc.port} className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <span className={`w-2.5 h-2.5 rounded-full inline-block mb-1 ${svc.up ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="block font-bold text-xs text-white">{svc.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">Port :{svc.port}</span>
              <span className={`block text-[9px] font-bold uppercase mt-0.5 ${svc.up ? 'text-emerald-400' : 'text-rose-400'}`}>{svc.up ? 'Up' : 'Down'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
