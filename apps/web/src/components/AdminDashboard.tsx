import React from 'react';
import { ShieldCheck, Users, Store, Calendar, CreditCard, Check, X, Server, Activity, ArrowUpRight } from 'lucide-react';
import { Vendor, Event, Booking } from '../shared/shared-types';

interface AdminDashboardProps {
  vendors: Vendor[];
  events: Event[];
  bookings: Booking[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ vendors, events, bookings }) => {
  const totalRevenue = bookings.reduce((acc, b) => acc + b.advanceAmountPaid, 0);
  const platformCommission = Math.round(totalRevenue * 0.1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> Super Admin Governance Dashboard
          </span>
          <h2 className="font-display font-bold text-3xl text-white">Platform Health & Analytics</h2>
          <p className="text-slate-400 text-sm mt-1">Magizhnaazh Microservices Ecosystem Monitoring</p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-amber-500/30 flex items-center gap-6">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Platform Commission Earned</span>
            <span className="font-display font-extrabold text-2xl text-amber-400">
              ₹{platformCommission.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Active Events</span>
          <div className="font-display font-extrabold text-2xl text-white mt-1">{events.length}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-indigo-400 uppercase">Registered Vendors</span>
          <div className="font-display font-extrabold text-2xl text-indigo-400 mt-1">{vendors.length}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-emerald-400 uppercase">Total Bookings</span>
          <div className="font-display font-extrabold text-2xl text-emerald-400 mt-1">{bookings.length}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-amber-400 uppercase">Gross Booking Volume</span>
          <div className="font-display font-extrabold text-2xl text-amber-400 mt-1">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Microservices Status Card */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800">
        <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" /> Decoupled Microservices Status
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

      {/* Vendors Verification Approval Table */}
      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-lg text-white">Vendor Partners Management</h3>
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
                        Approved Partner
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                        Pending Verification
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
