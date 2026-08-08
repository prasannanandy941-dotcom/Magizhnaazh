import React, { useState } from 'react';
import { Store, Calendar, CreditCard, Star, Upload, Package, Check, MessageSquare, IndianRupee } from 'lucide-react';
import { Vendor, Booking } from '../shared/shared-types';

interface VendorDashboardProps {
  vendor: Vendor;
  bookings: Booking[];
  onAcceptBooking: (bookingId: string) => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({ vendor, bookings, onAcceptBooking }) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'packages' | 'portfolio'>('bookings');

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const pendingQuotes = bookings.filter((b) => b.status === 'quote_requested');

  const totalEarnings = confirmedBookings.reduce((acc, b) => acc + b.advanceAmountPaid, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Vendor Management Portal</span>
          <h2 className="font-display font-bold text-3xl text-white">{vendor.businessName}</h2>
          <p className="text-slate-400 text-sm mt-1">{vendor.category} • {vendor.location.city}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl glass-card border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Earnings</span>
            <span className="font-display font-extrabold text-2xl text-emerald-400">
              ₹{totalEarnings.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Confirmed Bookings</span>
          <div className="font-display font-extrabold text-2xl text-white mt-1">{confirmedBookings.length}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-amber-400 uppercase">Pending Quote Requests</span>
          <div className="font-display font-extrabold text-2xl text-amber-400 mt-1">{pendingQuotes.length}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Vendor Rating</span>
          <div className="font-display font-extrabold text-2xl text-amber-400 mt-1 flex items-center gap-1">
            <Star className="w-5 h-5 fill-amber-400" /> {vendor.ratingAverage} ({vendor.reviewCount})
          </div>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
            activeTab === 'bookings' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Bookings & Enquiries
        </button>

        <button
          onClick={() => setActiveTab('packages')}
          className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
            activeTab === 'packages' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Service Packages ({vendor.packages.length})
        </button>
      </div>

      {/* Bookings Feed */}
      {activeTab === 'bookings' && (
        <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="font-bold text-lg text-white">Client Bookings & Quote Requests</h3>
          </div>

          <div className="divide-y divide-slate-800/80">
            {bookings.map((b) => (
              <div key={b.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{b.bookingNumber}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs">
                      {b.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1">
                    Event Date: <strong className="text-slate-200">{b.eventDate}</strong> • Package: <strong className="text-amber-400">{b.packageName || 'Custom Quote'}</strong>
                  </p>

                  {b.specialInstructions && (
                    <p className="text-xs text-slate-300 mt-2 italic">"{b.specialInstructions}"</p>
                  )}
                </div>

                <div className="text-right">
                  <span className="font-display font-extrabold text-xl text-emerald-400 block">
                    ₹{b.agreedPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Advance Paid: ₹{b.advanceAmountPaid.toLocaleString('en-IN')}
                  </span>

                  {b.status === 'quote_requested' && (
                    <button
                      onClick={() => onAcceptBooking(b.id)}
                      className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md"
                    >
                      Accept Booking Quote
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Packages */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendor.packages.map((pkg) => (
            <div key={pkg.id} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-lg">{pkg.packageName}</h4>
                <span className="font-display font-extrabold text-amber-400 text-lg">
                  ₹{pkg.price.toLocaleString('en-IN')}
                </span>
              </div>

              <p className="text-xs text-slate-400">{pkg.description}</p>

              <ul className="space-y-1.5 pt-2">
                {pkg.includedServices.map((s, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
