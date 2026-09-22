import React, { useState, useEffect } from 'react';
import { Event, Vendor, Booking } from '../../../../packages/shared-types';
import { IndianRupee, AlertTriangle, Sparkles, CheckCircle2, TrendingUp, ChevronDown, Receipt, ArrowRight } from 'lucide-react';
import { fetchMyBookings } from '../api';

interface SmartBudgetPlannerProps {
  event: Event;
  vendors: Vendor[];
  onSelectVendor: (vendor: Vendor) => void;
  onUpdateEventBudget: (updatedBreakdown: Event['budgetBreakdown']) => void;
}

export const SmartBudgetPlanner: React.FC<SmartBudgetPlannerProps> = ({
  event,
  vendors,
  onSelectVendor,
  onUpdateEventBudget,
}) => {
  const [breakdown, setBreakdown] = useState(event.budgetBreakdown);

  const totalAllocated = breakdown.reduce((acc, curr) => acc + curr.allocatedAmount, 0);

  // "Spent" is driven by REAL vendor orders, not a stored figure. Once a vendor
  // confirms a booking (confirmed / in_progress / completed) its full agreed
  // order value counts against the budget, so the remaining amount drops by the
  // actual money committed to that order. Bookings are loaded on mount so the
  // headline Full / Spent / Remaining numbers are correct immediately.
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  useEffect(() => {
    fetchMyBookings()
      .then((res) => setMyBookings(res.data?.bookings || []))
      .catch((err) => console.error('Failed to load bookings for spend breakdown', err))
      .finally(() => setBookingsLoaded(true));
  }, []);

  // A vendor has "confirmed the order" once it reaches any of these stages.
  const CONFIRMED_STATUSES = new Set<Booking['status']>(['confirmed', 'in_progress', 'completed']);
  // "Pending" = an order placed but not yet paid/confirmed — shown in the spend
  // breakdown so the customer can see upcoming vendor spend, not only money paid.
  const PENDING_STATUSES = new Set<Booking['status']>(['pending_payment', 'negotiation', 'quote_sent']);
  const forThisEvent = myBookings.filter((b) => b.eventId === event.id);
  const activeBookings = forThisEvent.filter((b) => b.status !== 'cancelled' && b.status !== 'refunded');
  const orderedBookings = [...activeBookings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const selectedBooking = orderedBookings.find((b) => b.id === selectedBookingId) || orderedBookings[0];
  const focusedBookings = selectedBooking ? [selectedBooking] : [];
  const confirmedBookings = forThisEvent.filter((b) => CONFIRMED_STATUSES.has(b.status));
  const pendingBookings = forThisEvent.filter((b) => PENDING_STATUSES.has(b.status));

  const bookingAmount = (b: Booking) => b.agreedPrice || (b as any).price || 0;
  const bookingPaid = (b: Booking) => {
    const confirmedPayments = (b.payments || []).filter((p) => p.status === 'confirmed');
    return confirmedPayments.length > 0
      ? confirmedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      : b.advanceAmountPaid || 0;
  };

  // Once orders exist, the order totals are the customer's real budget. The
  // event's planning budget is only used before the first order is placed.
  const orderTotal = focusedBookings.reduce((acc, b) => acc + bookingAmount(b), 0);
  const totalAmount = orderTotal > 0 ? orderTotal : event.totalBudget || 0;
  const totalAdvancePaid = focusedBookings.reduce((acc, b) => acc + (b.advanceAmountPaid || 0), 0);

  // "Spent" is the money actually paid across every active order.
  const totalSpent = focusedBookings.reduce((acc, b) => acc + bookingPaid(b), 0);

  // Remaining amount owed across the customer's active orders.
  const remainingBudget = totalAmount - totalSpent;

  // Paid-so-far per category — drives each category row's Spent / Remaining /
  // over-budget state from the same real money that's actually been paid.
  const spentByCategory: Record<string, number> = {};
  const bookedByCategory: Record<string, number> = {};
  for (const b of focusedBookings) {
    spentByCategory[b.vendorCategory] = (spentByCategory[b.vendorCategory] || 0) + bookingPaid(b);
    bookedByCategory[b.vendorCategory] = (bookedByCategory[b.vendorCategory] || 0) + bookingAmount(b);
  }

  const orderBreakdown = Object.entries(bookedByCategory).map(([category, allocatedAmount]) => ({
    id: `order-${category}`,
    category,
    allocatedPercentage: totalAmount > 0 ? Math.round((allocatedAmount / totalAmount) * 100) : 0,
    allocatedAmount,
    actualSpent: spentByCategory[category] || 0,
  }));
  const displayBreakdown = focusedBookings.length > 0 ? orderBreakdown : breakdown;
  const recommendationBudget = selectedBooking
    ? bookingAmount(selectedBooking)
    : Math.max(0, event.totalBudget || 0);
  // Recommendations are budget-wide, not limited to the category already
  // booked. A customer with ₹3,008 remaining should discover any affordable
  // service, including a different category.
  const recommendationPool = vendors
    .sort((a, b) => a.startingPrice - b.startingPrice);
  const affordableVendors = recommendationPool.filter((vendor) => vendor.startingPrice <= recommendationBudget);
  const recommendedVendors = affordableVendors.length > 0
    ? affordableVendors
    : recommendationPool.slice(0, 8);
  const recommendedVendorsByCategory = recommendedVendors.reduce<Record<string, Vendor[]>>((groups, vendor) => {
    const category = vendor.category?.trim() || 'Other services';
    (groups[category] ||= []).push(vendor);
    return groups;
  }, {});

  // Which real, confirmed vendor orders make up the spend — shown when the
  // customer taps the "Actual Spent" tile to drill in.
  const [spendExpanded, setSpendExpanded] = useState(false);
  const spendByCategory = focusedBookings.reduce<
    Record<string, {
      vendorName: string;
      bookingNumber: string;
      amount: number;
      paid: number;
      remaining: number;
      items: { label: string; amount: number }[];
      pending: boolean;
    }[]>
  >((acc, b) => {
    // Per-booking money split: the agreed/quoted total, how much the customer has
    // actually paid so far (advance), and the balance still owed. remaining is
    // derived from the total minus what's paid so it always ties out even if the
    // stored remainingAmount is stale.
    const pending = PENDING_STATUSES.has(b.status);
    const amount = bookingAmount(b);
    const paid = bookingPaid(b);
    (acc[b.vendorCategory] ||= []).push({
      vendorName: b.vendorName,
      bookingNumber: b.bookingNumber,
      amount,
      paid,
      remaining: Math.max(0, amount - paid),
      // Vendor-entered itemisation of what the money was spent on, if any.
      items: b.spendItems || [],
      pending,
    });
    return acc;
  }, {});

  const handlePercentageChange = (categoryId: string, newPercentage: number) => {
    const updated = breakdown.map((item) => {
      if (item.id === categoryId) {
        const allocatedAmount = Math.round((event.totalBudget * newPercentage) / 100);
        return { ...item, allocatedPercentage: newPercentage, allocatedAmount };
      }
      return item;
    });
    setBreakdown(updated);
    onUpdateEventBudget(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Smart Percentage Allocator Engine
          </div>
          <h2 className="font-display font-bold text-3xl text-gradient-gold">Event Budget Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">{event.title} • {event.location.city}</p>
        </div>

        <div className="flex flex-col items-stretch gap-3">
          {orderedBookings.length > 0 && (
            <label className="text-xs font-bold uppercase text-slate-400">
              Budget for order
              <select
                value={selectedBooking?.id || ''}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="ml-2 max-w-[260px] rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold normal-case text-white"
              >
                {orderedBookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.bookingNumber} — {booking.vendorName} — ₹{bookingAmount(booking).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="p-4 rounded-2xl glass-card border border-indigo-500/30 flex items-center gap-4 sm:gap-6 flex-wrap">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Total Amount</span>
            <span className="font-display font-extrabold text-xl sm:text-2xl text-white">
              ₹{totalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden sm:block" />

          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Advance Paid</span>
            <span className="font-display font-extrabold text-xl sm:text-2xl text-amber-400">
              ₹{totalAdvancePaid.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden sm:block" />

          <button
            type="button"
            onClick={() => setSpendExpanded((s) => !s)}
            aria-expanded={spendExpanded}
            className="flex items-center gap-1.5 text-left hover:opacity-80 transition-opacity"
            title="Tap to see spending breakdown"
          >
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Actual Spent</span>
              <span className="font-display font-extrabold text-xl sm:text-2xl text-indigo-400">
                ₹{totalSpent.toLocaleString('en-IN')}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${spendExpanded ? 'rotate-180' : ''}`} />
          </button>

          <div className="h-8 w-px bg-slate-800 hidden sm:block" />

          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Remaining</span>
            <span className={`font-display font-extrabold text-xl sm:text-2xl ${remainingBudget < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              ₹{remainingBudget.toLocaleString('en-IN')}
            </span>
          </div>
          </div>
        </div>
      </div>

      {spendExpanded && (
        <div className="glass-card p-6 rounded-3xl border border-amber-500/30">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-amber-400" /> Where Your Money Went
          </h3>

          {!bookingsLoaded ? (
            <p className="text-xs text-slate-400">Loading your bookings...</p>
          ) : Object.keys(spendByCategory).length === 0 ? (
            <p className="text-xs text-slate-500">No vendor orders yet — once you book a vendor (or pay an advance), it shows here.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(spendByCategory).map(([category, entries]) => {
                const catPaid = entries.reduce((acc, e) => acc + e.paid, 0);
                const catBooked = entries.reduce((acc, e) => acc + e.amount, 0);
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-300 uppercase">{category}</span>
                      <span className="text-xs font-bold text-amber-400">
                        ₹{catPaid.toLocaleString('en-IN')} paid
                        <span className="text-slate-500 font-normal"> / ₹{catBooked.toLocaleString('en-IN')} booked</span>
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {entries.map((e) => (
                        <li key={e.bookingNumber} className="text-xs p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-200">
                              {e.vendorName} <span className="text-slate-500">({e.bookingNumber})</span>
                              {e.pending && <span className="ml-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">Pending payment</span>}
                            </span>
                            <span className="text-right">
                              <span className="text-[10px] text-slate-500 block leading-none">Booking total</span>
                              <span className="text-white font-semibold">₹{e.amount.toLocaleString('en-IN')}</span>
                            </span>
                          </div>

                          {/* Payment split for this booking: what's been paid vs the balance still owed. */}
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                              <span className="text-[10px] font-bold uppercase text-emerald-300/80 block">Spent (paid)</span>
                              <span className="text-emerald-300 font-bold">₹{e.paid.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <span className="text-[10px] font-bold uppercase text-amber-300/80 block">Remaining</span>
                              <span className="text-amber-300 font-bold">₹{e.remaining.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {e.items.length > 0 && (
                            <ul className="mt-2 pl-3 border-l border-slate-700/70 space-y-1">
                              {e.items.map((it, i) => (
                                <li key={i} className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400">{it.label}</span>
                                  <span className="text-slate-300">₹{it.amount.toLocaleString('en-IN')}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="glass-card p-6 rounded-3xl border border-slate-800">
        <h3 className="font-display font-bold text-xl text-white mb-6">Category Budget Breakdown & Adjustment</h3>

        <div className="space-y-4">
          {displayBreakdown.map((item) => {
            const categorySpent = spentByCategory[item.category] || 0;
            const isOverBudget = categorySpent > item.allocatedAmount;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isOverBudget
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <span className="font-bold text-sm text-white">{item.category}</span>
                    {isOverBudget && (
                      <span className="ml-3 inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        <AlertTriangle className="w-3 h-3" /> Over Budget Warning!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-xs font-semibold">
                    <div>
                      <span className="text-slate-400 block">Allocated</span>
                      <span className="text-amber-400 font-bold">₹{item.allocatedAmount.toLocaleString('en-IN')}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Spent</span>
                      <span className="text-white font-bold">₹{categorySpent.toLocaleString('en-IN')}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Remaining</span>
                      <span className="text-emerald-400 font-bold">
                        ₹{Math.max(0, item.allocatedAmount - categorySpent).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={item.allocatedPercentage}
                    onChange={(e) => handlePercentageChange(item.id, Number(e.target.value))}
                    disabled={focusedBookings.length > 0}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-300 w-12 text-right">
                    {item.allocatedPercentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl border border-indigo-500/30">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="font-display font-bold text-xl text-white">Vendors Within Your Budget</h3>
            <p className="text-xs text-slate-400 mt-1">
              {recommendationBudget > 0
                ? `All categories · vendors starting at or below ₹${recommendationBudget.toLocaleString('en-IN')}`
                : 'Affordable vendors across all categories'}
              {recommendationBudget > 0 ? ` · Up to ₹${recommendationBudget.toLocaleString('en-IN')}` : ''}
            </p>
          </div>
          {recommendationPool.length > 0 && affordableVendors.length === 0 && (
            <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
              Showing closest options across categories
            </span>
          )}
        </div>

        {recommendedVendors.length === 0 ? (
          <p className="text-sm text-slate-400">No vendors are available for this category yet.</p>
        ) : (
          <div className="space-y-7">
            {Object.entries(recommendedVendorsByCategory).map(([category, categoryVendors]) => (
              <section key={category}>
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="font-display font-bold text-base text-amber-100">{category}</h4>
                  <span className="text-[11px] text-slate-500">
                    {categoryVendors.length} {categoryVendors.length === 1 ? 'vendor' : 'vendors'}
                  </span>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categoryVendors.map((vendor) => (
                    <button
                      key={vendor.id}
                      type="button"
                      onClick={() => onSelectVendor(vendor)}
                      className="text-left rounded-2xl overflow-hidden bg-slate-900/70 border border-slate-800 hover:border-indigo-400/60 transition-colors group"
                    >
                      {vendor.galleryImages?.[0] ? (
                        <img src={vendor.galleryImages[0]} alt="" className="w-full h-28 object-cover" />
                      ) : (
                        <div className="w-full h-28 bg-gradient-to-br from-indigo-900/50 to-slate-900 flex items-center justify-center text-xs text-slate-400">
                          {vendor.category}
                        </div>
                      )}
                      <div className="p-3">
                        <p className="font-bold text-sm text-white truncate">{vendor.businessName}</p>
                        <p className="text-xs text-amber-300 mt-1">Starting ₹{vendor.startingPrice.toLocaleString('en-IN')}</p>
                        <span className="inline-flex items-center gap-1 text-[11px] text-indigo-300 mt-3 group-hover:text-indigo-200">
                          View vendor <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
