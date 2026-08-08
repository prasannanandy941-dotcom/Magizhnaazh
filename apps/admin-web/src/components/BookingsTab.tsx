import React, { useEffect, useState } from 'react';
import { Booking } from '../../../../packages/shared-types';
import { fetchBookings } from '../api';
import { CrudListPanel } from './CrudListPanel';

const STATUS_STYLES: Record<string, string> = {
  enquiry: 'bg-slate-500/20 text-slate-300',
  quote_requested: 'bg-amber-500/20 text-amber-300',
  quote_received: 'bg-amber-500/20 text-amber-300',
  negotiation: 'bg-amber-500/20 text-amber-300',
  pending_payment: 'bg-orange-500/20 text-orange-300',
  confirmed: 'bg-indigo-500/20 text-indigo-300',
  in_progress: 'bg-indigo-500/20 text-indigo-300',
  completed: 'bg-emerald-500/20 text-emerald-300',
  cancelled: 'bg-rose-500/20 text-rose-300',
  refunded: 'bg-rose-500/20 text-rose-300',
};

export const BookingsTab: React.FC<{ token: string }> = ({ token }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetchBookings(token);
      setBookings(res.data?.bookings || []);
      setLoading(false);
    })();
  }, []);

  return (
    <CrudListPanel
      title="Platform Bookings"
      subtitle="All vendor bookings across every event."
      items={bookings}
      loading={loading}
      rowKey={(b) => b.id}
      columns={[
        { label: 'Booking #', render: (b) => <span className="font-bold text-white font-mono">{b.bookingNumber}</span> },
        { label: 'Vendor', render: (b) => b.vendorName },
        { label: 'Package', render: (b) => b.packageName || '—' },
        { label: 'Amount', render: (b) => <span className="text-amber-400 font-bold">₹{b.agreedPrice.toLocaleString('en-IN')}</span> },
        { label: 'Advance Paid', render: (b) => `₹${b.advanceAmountPaid.toLocaleString('en-IN')}` },
        { label: 'Status', render: (b) => <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${STATUS_STYLES[b.status] || ''}`}>{b.status.replace('_', ' ')}</span> },
      ]}
      emptyText="No bookings yet."
    />
  );
};
