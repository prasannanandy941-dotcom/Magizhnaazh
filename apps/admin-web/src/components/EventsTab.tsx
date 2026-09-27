import React, { useEffect, useState } from 'react';
import { Event } from '../../../../packages/shared-types';
import { fetchEvents } from '../api';
import { useCachedList } from '../useCachedList';
import { CrudListPanel } from './CrudListPanel';

const STATUS_STYLES: Record<string, string> = {
  planning: 'bg-indigo-500/20 text-indigo-300',
  ongoing: 'bg-amber-500/20 text-amber-300',
  completed: 'bg-emerald-500/20 text-emerald-300',
  cancelled: 'bg-rose-500/20 text-rose-300',
};

export const EventsTab: React.FC<{ token: string }> = ({ token }) => {
  const { items: events, setItems: setEvents, loading, refreshing, reload: load } = useCachedList<Event>('events', async () => (await fetchEvents(token)).data?.events || []);


  return (
    <CrudListPanel
      itemLabel="events"
      title="Platform Events"
      subtitle="All events created across every customer account."
      items={events}
      loading={loading}
      refreshing={refreshing}
      rowKey={(e) => e.id}
      columns={[
        { label: 'Title', render: (e) => <span className="font-bold text-white">{e.title}</span> },
        { label: 'Type', render: (e) => e.eventType },
        { label: 'Date', render: (e) => e.date },
        { label: 'Guests', render: (e) => e.guestCount },
        { label: 'Budget', render: (e) => <span className="text-amber-400 font-bold">₹{e.totalBudget.toLocaleString('en-IN')}</span> },
        { label: 'Status', render: (e) => <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${STATUS_STYLES[e.status] || ''}`}>{e.status}</span> },
      ]}
      emptyText="No events created yet."
    />
  );
};
