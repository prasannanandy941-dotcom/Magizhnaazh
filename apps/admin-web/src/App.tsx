import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, Activity, RefreshCw, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import { User, Vendor } from '../../../packages/shared-types';
import { AuthGate } from './components/AuthGate';
import {
  fetchVendors,
  toggleVendorVerification,
  fetchAdminMetrics,
  fetchEvents,
  pingAllServices,
  AdminMetrics,
  ServiceHealth,
} from './api';

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('magizhnaazh_admin_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('magizhnaazh_admin_token'));

  const handleAuthSuccess = (loggedInUser: User, newToken: string) => {
    localStorage.setItem('magizhnaazh_admin_user', JSON.stringify(loggedInUser));
    localStorage.setItem('magizhnaazh_admin_token', newToken);
    setUser(loggedInUser);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('magizhnaazh_admin_user');
    localStorage.removeItem('magizhnaazh_admin_token');
    setUser(null);
    setToken(null);
  };

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyBusyId, setVerifyBusyId] = useState<string | null>(null);

  const loadDashboard = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const [vendorsRes, metricsRes, eventsRes, health] = await Promise.all([
        fetchVendors(),
        fetchAdminMetrics(token),
        fetchEvents(token),
        pingAllServices(),
      ]);
      setVendors(vendorsRes.data?.vendors || []);
      setMetrics(metricsRes.data || null);
      setEventCount(eventsRes.data?.events.length ?? 0);
      setServiceHealth(health);
    } finally {
      setVendorsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const toggleVerification = async (id: string) => {
    if (!token) return;
    setVerifyBusyId(id);
    try {
      const res = await toggleVendorVerification(token, id);
      if (res.data?.vendor) {
        setVendors((prev) => prev.map((v) => (v.id === id ? res.data.vendor : v)));
      }
    } finally {
      setVerifyBusyId(null);
    }
  };

  const grossVolume = metrics?.grossBookingVolume ?? 0;
  const platformCommission = metrics?.platformCommissionEarned ?? 0;
  const allServicesUp = serviceHealth.length > 0 && serviceHealth.every((s) => s.up);
  const downCount = serviceHealth.filter((s) => !s.up).length;

  if (!user) {
    return <AuthGate onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-extrabold text-xl text-white">Magizhnaazh Super Admin</span>
              <span className="block text-[10px] text-rose-400 font-bold uppercase tracking-wider">Governance & Microservices Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="hidden sm:block text-slate-400">
              <strong className="text-slate-200">{user.name}</strong>
            </span>
            <button
              onClick={loadDashboard}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-300 font-bold text-xs transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-rose-400 font-bold text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
            {allServicesUp ? (
              <span className="hidden md:flex items-center gap-1.5 text-emerald-400">
                <Activity className="w-4 h-4 animate-pulse" /> All Systems Operational
              </span>
            ) : (
              <span className="hidden md:flex items-center gap-1.5 text-rose-400">
                <AlertTriangle className="w-4 h-4" /> {downCount} Service{downCount === 1 ? '' : 's'} Down
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full space-y-8">

        {/* Top Summary Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl text-white">Platform Health & Analytics</h1>
            <p className="text-slate-400 text-sm mt-1">Super Governance Dashboard for Magizhnaazh Microservices</p>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-rose-500/30 flex items-center gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Platform Commission (10%)</span>
              <span className="font-display font-extrabold text-2xl text-amber-400">
                ₹{platformCommission.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase">Active Events</span>
            <div className="font-display font-extrabold text-2xl text-white mt-1">
              {eventCount === null ? <Loader2 className="w-5 h-5 animate-spin" /> : `${eventCount} Events`}
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-indigo-400 uppercase">Vendor Partners</span>
            <div className="font-display font-extrabold text-2xl text-indigo-400 mt-1">{vendors.length} Vendors</div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-emerald-400 uppercase">Total Bookings</span>
            <div className="font-display font-extrabold text-2xl text-emerald-400 mt-1">
              {metrics === null ? <Loader2 className="w-5 h-5 animate-spin" /> : `${metrics.totalBookings} Bookings`}
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-amber-400 uppercase">Gross Booking Volume</span>
            <div className="font-display font-extrabold text-2xl text-amber-400 mt-1">
              ₹{grossVolume.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Microservices Health Monitor */}
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
                <span className={`block text-[9px] font-bold uppercase mt-0.5 ${svc.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {svc.up ? 'Up' : 'Down'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor Partner Verification Management */}
        <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-lg text-white">Vendor Partners Verification Queue</h3>
          </div>

          {vendorsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading vendors...
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase">
                  <th className="p-4">Business Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Starting Price</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Verification Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-900/40">
                    <td className="p-4 font-bold text-white">{v.businessName}</td>
                    <td className="p-4">{v.category}</td>
                    <td className="p-4">{v.location.city}</td>
                    <td className="p-4 font-bold text-amber-400">₹{v.startingPrice.toLocaleString('en-IN')}</td>
                    <td className="p-4 font-bold text-white">★ {v.ratingAverage}</td>
                    <td className="p-4">
                      {v.isVerified ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                          Verified Partner
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                          Pending Approval
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleVerification(v.id)}
                        disabled={verifyBusyId === v.id}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-60 inline-flex items-center gap-1.5 ${
                          v.isVerified
                            ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                            : 'bg-emerald-500 text-slate-950'
                        }`}
                      >
                        {verifyBusyId === v.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        {v.isVerified ? 'Revoke Verification' : 'Approve Vendor'}
                      </button>
                    </td>
                  </tr>
                ))}
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">No vendors registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>

      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © 2026 Magizhnaazh Super Admin Governance Portal — Port 3002
      </footer>
    </div>
  );
}
