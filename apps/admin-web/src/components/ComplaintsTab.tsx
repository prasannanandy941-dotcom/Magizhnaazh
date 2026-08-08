import React, { useEffect, useState } from 'react';
import { Complaint, ComplaintStatus } from '../../../../packages/shared-types';
import { fetchComplaints, updateComplaintStatus } from '../api';
import { CrudListPanel } from './CrudListPanel';

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  open: 'bg-rose-500/20 text-rose-300',
  in_review: 'bg-amber-500/20 text-amber-300',
  resolved: 'bg-emerald-500/20 text-emerald-300',
};

export const ComplaintsTab: React.FC<{ token: string }> = ({ token }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetchComplaints(token);
    setComplaints(res.data?.complaints || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeStatus = async (id: string, status: string) => {
    setBusyId(id);
    await updateComplaintStatus(token, id, status);
    await load();
    setBusyId(null);
  };

  return (
    <CrudListPanel
      title="Guest & Customer Complaints"
      subtitle="Complaints tied to bookings/events. Submission API exists (POST /api/v1/complaints) — no dedicated submission UI yet in customer-web."
      items={complaints}
      loading={loading}
      rowKey={(c) => c.id}
      columns={[
        { label: 'Subject', render: (c) => <span className="font-bold text-white">{c.subject}</span> },
        { label: 'Description', render: (c) => <span className="text-slate-400 line-clamp-1 max-w-xs block">{c.description}</span> },
        { label: 'Booking', render: (c) => c.bookingId || '—' },
        {
          label: 'Status',
          render: (c) => (
            <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${STATUS_STYLES[c.status]}`}>
              {c.status.replace('_', ' ')}
            </span>
          ),
        },
      ]}
      rowAction={(c) => (
        <select
          value={c.status}
          disabled={busyId === c.id}
          onChange={(e) => changeStatus(c.id, e.target.value)}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs disabled:opacity-60"
        >
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
        </select>
      )}
      emptyText="No complaints submitted yet."
    />
  );
};
