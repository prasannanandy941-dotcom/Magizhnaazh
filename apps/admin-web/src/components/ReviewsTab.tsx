import React, { useEffect, useState } from 'react';
import { Review } from '../../../../packages/shared-types';
import { fetchReviews, deleteReview } from '../api';
import { useCachedList } from '../useCachedList';
import { CrudListPanel, DeleteButton } from './CrudListPanel';

export const ReviewsTab: React.FC<{ token: string }> = ({ token }) => {
  const { items: reviews, setItems: setReviews, loading, refreshing, reload: load } = useCachedList<Review>('reviews', async () => (await fetchReviews(token)).data?.reviews || []);
  const [busyId, setBusyId] = useState<string | null>(null);


  return (
    <CrudListPanel
      itemLabel="reviews"
      title="Vendor Reviews"
      subtitle="Verified customer reviews of vendors. Remove any that violate platform policy."
      items={reviews}
      loading={loading}
      refreshing={refreshing}
      rowKey={(r) => r.id}
      columns={[
        { label: 'Vendor', render: (r) => <span className="font-bold text-white">{r.vendorId}</span> },
        { label: 'Customer', render: (r) => r.customerName },
        { label: 'Rating', render: (r) => <span className="text-amber-400 font-bold">★ {r.overallRating}</span> },
        { label: 'Comment', render: (r) => <span className="text-slate-400 line-clamp-1 max-w-xs block">{r.comment}</span> },
      ]}
      rowAction={(r) => (
        <DeleteButton
          busy={busyId === r.id}
          onClick={async () => { setBusyId(r.id); await deleteReview(token, r.id); setReviews((prev) => prev.filter((x) => x.id !== r.id)); setBusyId(null); }}
        />
      )}
      emptyText="No reviews yet."
    />
  );
};
