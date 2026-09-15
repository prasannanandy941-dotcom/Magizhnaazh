import React, { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, Loader2, CheckCircle2, Circle, IndianRupee, LogIn, Star, Send, FileText, Wallet, XCircle } from 'lucide-react';
import { Booking, Review, slotLabelWithTime } from '../../../../packages/shared-types';
import { fetchMyBookings, fetchMyReviews, submitReview, recordBalancePayment, fetchBookingInvoice, cancelBooking } from '../api';
import { openInvoicePrintWindow } from './invoice';

// Work-progress stages a confirmed booking moves through — mirrors the
// vendor-side tracker in vendor-web/App.tsx. Applies to every vendor
// category since it's driven by the existing BookingStatus field, not
// anything catering-specific.
const ORDER_STEPS: { key: string; label: string }[] = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_LABEL: Record<string, string> = {
  enquiry: 'Enquiry',
  quote_requested: 'Quote Requested',
  quote_received: 'Quote Received',
  quote_sent: 'Vendor Sent a Counter',
  negotiation: 'Negotiating',
  pending_payment: 'Awaiting Vendor Confirmation',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

// Statuses the customer can still back out of themselves — anything up to and
// including "confirmed" but before the vendor has actually started the work.
// This is the safety net for a vendor who never confirms a claimed advance
// (stuck on pending_payment) or never responds to a quote at all.
const CANCELLABLE_STATUSES = new Set([
  'enquiry',
  'quote_requested',
  'quote_received',
  'quote_sent',
  'negotiation',
  'pending_payment',
  'confirmed',
]);

// True once money has actually changed hands (or the customer claims it has)
// against a booking — cancelling then is a refund request, not a plain cancel.
function bookingHasMoneyAtStake(b: Booking): boolean {
  return (b.advanceAmountPaid || 0) > 0 || (b.payments || []).some((p) => p.status === 'claimed');
}

export const MyOrders: React.FC<{ isAuthenticated: boolean; onSignIn: () => void }> = ({ isAuthenticated, onSignIn }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchMyBookings().catch((err) => {
        console.error('Failed to load bookings', err);
        return null;
      }),
      fetchMyReviews().catch(() => null),
    ])
      .then(([bookingsRes, reviewsRes]) => {
        setBookings(bookingsRes?.data?.bookings || []);
        const map: Record<string, Review> = {};
        for (const r of reviewsRes?.data?.reviews || []) map[r.bookingId] = r;
        setReviews(map);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAuthenticated) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <ClipboardList className="w-10 h-10 text-slate-600 mx-auto" />
        <h2 className="font-display font-bold text-xl text-white">Sign in to see your orders</h2>
        <p className="text-slate-400 text-sm">Every booking you've made and its live progress lives here once you're signed in.</p>
        <button
          onClick={onSignIn}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md"
        >
          <LogIn className="w-4 h-4" /> Sign In
        </button>
      </div>
    );
  }

  const sorted = [...bookings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-3xl text-gradient-gold flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-amber-400" /> My Orders
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Every vendor booking you've made, with live progress once the vendor confirms it.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500/50 text-slate-200 font-bold text-xs transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {loading && bookings.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your orders...
        </div>
      ) : sorted.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-slate-800 text-center text-sm text-slate-400">
          No bookings yet — head to the Marketplace to book a vendor.
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((b) => {
            const currentStepIdx = ORDER_STEPS.findIndex((s) => s.key === b.status);
            const isTrackable = b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'completed';
            const isOffPath = b.status === 'cancelled' || b.status === 'refunded';
            return (
              <div key={b.id} className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-base">{b.bookingNumber}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[11px]">
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong className="text-slate-200">{b.vendorName}</strong> · {b.vendorCategory} · Event date: <strong className="text-amber-400">{b.eventDate}</strong>
                      {b.timeSlot && <> · <span className="text-indigo-300">{slotLabelWithTime(b.timeSlot)}</span></>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-display font-extrabold text-lg text-emerald-400 flex items-center gap-0.5 justify-end">
                      <IndianRupee className="w-4 h-4" />{b.agreedPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-slate-400 block">Advance paid: ₹{b.advanceAmountPaid.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {b.selectedOptions && b.selectedOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {b.selectedOptions.map((opt) => (
                      <span key={opt} className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-[11px] font-semibold">
                        {opt}
                      </span>
                    ))}
                  </div>
                )}

                {b.specialInstructions && (
                  <p className="text-xs text-slate-300 italic">"{b.specialInstructions}"</p>
                )}

                {isTrackable ? (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Order Status</p>
                    <div className="flex items-center">
                      {ORDER_STEPS.map((step, i) => {
                        const done = i <= currentStepIdx;
                        const isLast = i === ORDER_STEPS.length - 1;
                        return (
                          <React.Fragment key={step.key}>
                            <div className="flex flex-col items-center gap-1">
                              {done ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-700" />
                              )}
                              <span className={`text-[10px] font-semibold text-center w-20 ${done ? 'text-emerald-300' : 'text-slate-500'}`}>
                                {step.label}
                              </span>
                            </div>
                            {!isLast && (
                              <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentStepIdx ? 'bg-emerald-500/60' : 'bg-slate-800'}`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ) : isOffPath ? (
                  <div className={`text-xs font-semibold ${b.status === 'cancelled' ? 'text-rose-400' : 'text-sky-400'}`}>
                    <p>This booking was {(STATUS_LABEL[b.status] || b.status).toLowerCase()}.</p>
                    {b.cancelReason && <p className="text-[11px] font-normal text-slate-400 mt-0.5">Reason: {b.cancelReason}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Tracking starts once the vendor confirms this booking.</p>
                )}

                {isTrackable && (
                  <PaymentBlock booking={b} onUpdated={(nb) => setBookings((prev) => prev.map((x) => (x.id === nb.id ? nb : x)))} />
                )}

                {CANCELLABLE_STATUSES.has(b.status) && (
                  <CancelBlock booking={b} onUpdated={(nb) => setBookings((prev) => prev.map((x) => (x.id === nb.id ? nb : x)))} />
                )}

                {b.status === 'completed' && (
                  <ReviewBlock
                    booking={b}
                    existing={reviews[b.id]}
                    onSubmitted={(rev) => setReviews((prev) => ({ ...prev, [b.id]: rev }))}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Balance-payment + invoice controls for a confirmed booking. The customer
// records that they've paid the balance (manual UPI); the vendor confirms it.
const PaymentBlock: React.FC<{ booking: Booking; onUpdated: (b: Booking) => void }> = ({ booking, onUpdated }) => {
  const [paying, setPaying] = useState(false);
  const [reference, setReference] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  const remaining = booking.remainingAmount;
  const paidInFull = booking.paidInFull || remaining <= 0;
  // A balance the customer has recorded but the vendor hasn't confirmed yet.
  const pendingClaim = (booking.payments || []).some((p) => p.type === 'balance' && p.status === 'claimed');

  const submitPayment = async () => {
    setBusy(true);
    setNotice('');
    try {
      const res = await recordBalancePayment(booking.id, remaining, reference.trim() || undefined);
      if (res.data?.booking) onUpdated(res.data.booking);
      setOpen(false);
      setPaying(false);
    } catch (err: any) {
      setNotice(err?.message || 'Could not record the payment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const viewInvoice = async () => {
    setInvoiceBusy(true);
    try {
      const res = await fetchBookingInvoice(booking.id);
      if (res.data?.invoice) openInvoicePrintWindow(res.data.invoice);
    } catch (err: any) {
      setNotice(err?.message || 'Could not load the invoice.');
    } finally {
      setInvoiceBusy(false);
    }
  };

  return (
    <div className="pt-3 border-t border-slate-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs">
          {paidInFull ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Paid in full</span>
          ) : (
            <span className="text-slate-300">Balance due: <strong className="text-amber-400">₹{remaining.toLocaleString('en-IN')}</strong></span>
          )}
          {pendingClaim && !paidInFull && <span className="block text-[11px] text-sky-400 mt-0.5">Balance payment recorded — awaiting vendor confirmation.</span>}
        </div>
        <div className="flex items-center gap-2">
          {!paidInFull && !pendingClaim && (
            <button onClick={() => { setPaying(true); setOpen(true); }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Pay balance
            </button>
          )}
          <button onClick={viewInvoice} disabled={invoiceBusy}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center gap-1.5 disabled:opacity-60">
            {invoiceBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} Invoice
          </button>
        </div>
      </div>

      {paying && open && !paidInFull && (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <p className="text-[11px] text-slate-400">
            Pay the vendor <strong className="text-amber-400">₹{remaining.toLocaleString('en-IN')}</strong> via their UPI (shown on their page or your confirmation), then record it here. The vendor confirms receipt.
          </p>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI reference / txn note (optional)"
            className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs" />
          {notice && <p className="text-[11px] text-rose-400">{notice}</p>}
          <div className="flex items-center gap-2">
            <button onClick={submitPayment} disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] disabled:opacity-60 flex items-center gap-1.5">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} I've paid the balance
            </button>
            <button onClick={() => { setOpen(false); setPaying(false); }} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold text-[11px]">Cancel</button>
          </div>
        </div>
      )}
      {notice && !open && <p className="text-[11px] text-rose-400">{notice}</p>}
    </div>
  );
};

// Lets the customer back out of a booking themselves at any point before the
// vendor has started the work — including the "vendor never confirms" case
// (pending_payment) shown in the vendor's "Advance Claimed — Confirm" screen.
// If money has already been claimed/paid, this is framed as a refund request
// instead of a plain cancel.
const CancelBlock: React.FC<{ booking: Booking; onUpdated: (b: Booking) => void }> = ({ booking, onUpdated }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const isRefund = bookingHasMoneyAtStake(booking);

  const submit = async () => {
    setBusy(true);
    setNotice('');
    try {
      const res = await cancelBooking(booking.id, reason.trim() || undefined);
      if (res.data?.booking) onUpdated(res.data.booking);
      setOpen(false);
    } catch (err: any) {
      setNotice(err?.message || 'Could not cancel this booking. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-3 border-t border-slate-800 space-y-2">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 font-bold text-[11px]"
        >
          <XCircle className="w-3.5 h-3.5" /> {isRefund ? 'Request Refund' : 'Cancel Booking'}
        </button>
      ) : (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-rose-500/30 space-y-2">
          <p className="text-[11px] text-slate-300">
            {isRefund
              ? "This will cancel the booking and mark it as a refund request — use this if the vendor isn't accepting or confirming your booking. You'll need to follow up with the vendor (or support) to get your money back via the same UPI/method you paid with."
              : "This will cancel the booking. No payment has been made yet, so nothing needs to be refunded."}
          </p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional) — e.g. vendor not responding"
            className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
          />
          {notice && <p className="text-[11px] text-rose-400">{notice}</p>}
          <div className="flex items-center gap-2">
            <button onClick={submit} disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-bold text-[11px] disabled:opacity-60 flex items-center gap-1.5">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {isRefund ? 'Yes, cancel & request refund' : 'Yes, cancel booking'}
            </button>
            <button onClick={() => { setOpen(false); setNotice(''); }} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold text-[11px]">Never mind</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Interactive 1-5 star selector. When `readOnly`, it just renders the score.
const StarInput: React.FC<{ value: number; onChange?: (v: number) => void; readOnly?: boolean }> = ({ value, onChange, readOnly }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          className={readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star className={`w-5 h-5 ${n <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
        </button>
      ))}
    </div>
  );
};

// Per-order review & feedback: shows the submitted review if one exists, else an
// inline form. Only rendered for completed bookings (the backend rejects reviews
// on anything not completed).
const ReviewBlock: React.FC<{ booking: Booking; existing?: Review; onSubmitted: (r: Review) => void }> = ({ booking, existing, onSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (existing) {
    return (
      <div className="mt-2 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/25">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Your review
          </span>
          <StarInput value={existing.overallRating} readOnly />
        </div>
        {existing.comment && <p className="text-xs text-slate-300 italic">"{existing.comment}"</p>}
        <p className="text-[10px] text-slate-500 mt-1">Shared with {booking.vendorName} · {new Date(existing.createdAt).toLocaleDateString()}</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a star rating first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await submitReview({
        vendorId: booking.vendorId,
        bookingId: booking.id,
        overallRating: rating,
        comment: comment.trim(),
      });
      if (res.success && res.data) onSubmitted(res.data.review);
      else setError(res.message || 'Could not submit review.');
    } catch (e: any) {
      setError(e.message || 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 p-4 rounded-2xl bg-[#26101c]/60 border border-[#6b2140]/50">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <span className="text-xs font-bold text-[#e8c874]">Rate &amp; review {booking.vendorName}</span>
        <StarInput value={rating} onChange={setRating} />
      </div>
      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share feedback about this vendor — the vendor will see it."
        className="w-full p-2.5 rounded-xl bg-[#1a0a14] border border-[#6b2140]/60 text-[#fdf1f5] text-xs focus:outline-none focus:border-[#d4af37]/50"
      />
      {error && <p className="text-[11px] text-rose-400 mt-1.5 font-semibold">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#c9a648] to-[#b8860b] text-[#1a0a14] font-bold text-xs shadow-md disabled:opacity-60"
      >
        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        Submit Review
      </button>
    </div>
  );
};
