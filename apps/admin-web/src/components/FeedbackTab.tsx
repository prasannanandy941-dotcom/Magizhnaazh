import React, { useEffect, useState } from 'react';
import { EventFeedback } from '../../../../packages/shared-types';
import { fetchFeedback, deleteFeedback } from '../api';
import { CrudListPanel, DeleteButton } from './CrudListPanel';

export const FeedbackTab: React.FC<{ token: string }> = ({ token }) => {
  const [feedback, setFeedback] = useState<EventFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetchFeedback(token);
    setFeedback(res.data?.feedback || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <CrudListPanel
      title="Guest Event Feedback"
      subtitle="Anonymous feedback submitted by event guests."
      items={feedback}
      loading={loading}
      rowKey={(f) => f.id}
      columns={[
        { label: 'Event', render: (f) => f.eventId },
        { label: 'Guest', render: (f) => f.guestName || 'Anonymous' },
        { label: 'Overall', render: (f) => <span className="text-amber-400 font-bold">★ {f.overallRating}</span> },
        { label: 'Comments', render: (f) => <span className="text-slate-400 line-clamp-1 max-w-xs block">{f.comments}</span> },
      ]}
      rowAction={(f) => (
        <DeleteButton
          busy={busyId === f.id}
          onClick={async () => { setBusyId(f.id); await deleteFeedback(token, f.id); await load(); setBusyId(null); }}
        />
      )}
      emptyText="No feedback submitted yet."
    />
  );
};
