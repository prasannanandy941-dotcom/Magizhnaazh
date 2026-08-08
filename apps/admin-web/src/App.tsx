import React, { useState } from 'react';
import { ShieldCheck, Server, Users, Store, Calendar, CreditCard, Check, X, Activity, RefreshCw, LogOut } from 'lucide-react';
import { User } from '../../../packages/shared-types';
import { AuthGate } from './components/AuthGate';

interface VendorItem {
  id: string;
  name: string;
  category: string;
  city: string;
  startingPrice: number;
  rating: number;
  isVerified: boolean;
}

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('magizhnaazh_admin_user');
    return stored ? JSON.parse(stored) : null;
  });

  const handleAuthSuccess = (loggedInUser: User, token: string) => {
    localStorage.setItem('magizhnaazh_admin_user', JSON.stringify(loggedInUser));
    localStorage.setItem('magizhnaazh_admin_token', token);
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('magizhnaazh_admin_user');
    localStorage.removeItem('magizhnaazh_admin_token');
    setUser(null);
  };

  const [vendors, setVendors] = useState<VendorItem[]>([
    { id: 'vnd-1', name: 'The Leela Palace Grand Ballroom', category: 'Venue', city: 'Chennai', startingPrice: 150000, rating: 4.9, isVerified: true },
    { id: 'vnd-2', name: 'Grand Chettinad Feast Caterers', category: 'Catering', city: 'Chennai', startingPrice: 450, rating: 4.8, isVerified: true },
    { id: 'vnd-3', name: 'Candid Tales Photography & Cinema', category: 'Photography', city: 'Chennai', startingPrice: 65000, rating: 4.95, isVerified: true },
    { id: 'vnd-4', name: 'Flora Dreams Floral & Theme Decorators', category: 'Decoration', city: 'Coimbatore', startingPrice: 40000, rating: 4.7, isVerified: false },
  ]);

  const toggleVerification = (id: string) => {
    setVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isVerified: !v.isVerified } : v))
    );
  };

  const grossVolume = 400000;
  const platformCommission = Math.round(grossVolume * 0.1); // 10% commission

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

          <div className="flex items-center gap-6 text-xs font-semibold">
            <span className="hidden sm:block text-slate-400">
              <strong className="text-slate-200">{user.name}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-rose-400 font-bold text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Activity className="w-4 h-4 animate-pulse" /> All Systems Operational
            </span>
            <span className="text-slate-400">Port :3002</span>
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
            <div className="font-display font-extrabold text-2xl text-white mt-1">12 Events</div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-indigo-400 uppercase">Vendor Partners</span>
            <div className="font-display font-extrabold text-2xl text-indigo-400 mt-1">{vendors.length} Vendors</div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-emerald-400 uppercase">Total Bookings</span>
            <div className="font-display font-extrabold text-2xl text-emerald-400 mt-1">28 Bookings</div>
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { name: 'API Gateway', port: 8000 },
              { name: 'Auth Service', port: 8001 },
              { name: 'Marketplace', port: 8002 },
              { name: 'Event & Budget', port: 8003 },
              { name: 'Booking & Pay', port: 8004 },
              { name: 'Invitation', port: 8005 },
            ].map((svc) => (
              <div key={svc.port} className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse mb-1" />
                <span className="block font-bold text-xs text-white">{svc.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">Port :{svc.port}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor Partner Verification Management */}
        <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-lg text-white">Vendor Partners Verification Queue</h3>
          </div>

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
                    <td className="p-4 font-bold text-white">{v.name}</td>
                    <td className="p-4">{v.category}</td>
                    <td className="p-4">{v.city}</td>
                    <td className="p-4 font-bold text-amber-400">₹{v.startingPrice.toLocaleString('en-IN')}</td>
                    <td className="p-4 font-bold text-white">★ {v.rating}</td>
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
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                          v.isVerified
                            ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                            : 'bg-emerald-500 text-slate-950'
                        }`}
                      >
                        {v.isVerified ? 'Revoke Verification' : 'Approve Vendor'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © 2026 Magizhnaazh Super Admin Governance Portal — Port 3002
      </footer>
    </div>
  );
}
