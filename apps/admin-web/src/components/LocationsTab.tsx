import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, RefreshCw, Database, Sparkles } from 'lucide-react';
import { Booking, City, Event } from '../../../../packages/shared-types';
import { fetchLocations, fetchBookings, fetchEvents } from '../api';
import { INDIA_STATES_AND_CITIES } from '../../../../packages/shared-utils';

// Bookings that represent real, committed demand (past the enquiry stage).
const ACTIVE_STATUSES = new Set(['confirmed', 'in_progress', 'completed']);

type StateRow = {
  state: string;
  bookings: number;
  active: number;
  value: number;
  cities: Set<string>;
};

export const LocationsTab: React.FC<{ token: string }> = ({ token }) => {
  const [locations, setLocations] = useState<City[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [locRes, bookRes, evRes] = await Promise.all([
        fetchLocations().catch(() => null),
        fetchBookings(token).catch(() => null),
        fetchEvents(token).catch(() => null),
      ]);
      setLocations(locRes?.data?.locations || []);
      setBookings(bookRes?.data?.bookings || []);
      setEvents(evRes?.data?.events || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // city (lower-case) -> state. DB locations win; the India master list fills gaps.
  const cityToState = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [state, cities] of Object.entries(INDIA_STATES_AND_CITIES)) {
      for (const c of cities) map[c.toLowerCase()] = state;
    }
    for (const loc of locations) {
      if (loc.name && loc.state) map[loc.name.toLowerCase()] = loc.state;
    }
    return map;
  }, [locations]);

  const eventCityById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ev of events) map[ev.id] = ev.location?.city || '';
    return map;
  }, [events]);

  // Group every booking by the state of its customer event.
  const rows = useMemo(() => {
    const byState: Record<string, StateRow> = {};
    for (const b of bookings) {
      const city = eventCityById[b.eventId] || '';
      const state = (city && cityToState[city.toLowerCase()]) || 'Unknown';
      const row =
        byState[state] || (byState[state] = { state, bookings: 0, active: 0, value: 0, cities: new Set() });
      row.bookings += 1;
      if (ACTIVE_STATUSES.has(b.status)) row.active += 1;
      row.value += b.agreedPrice || 0;
      if (city) row.cities.add(city);
    }
    return Object.values(byState).sort((a, b) => b.bookings - a.bookings);
  }, [bookings, eventCityById, cityToState]);

  const totalBookings = bookings.length;
  const statesWithActivity = rows.filter((r) => r.state !== 'Unknown').length;
  const citiesWithActivity = new Set(rows.flatMap((r) => [...r.cities])).size;
  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-indigo-400" />
            Bookings by State
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Where customer bookings are actually happening — grouped by the state of each event.
          </p>
        </div>

        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs px-3.5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-4 bg-slate-900/40">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Bookings</span>
            <span className="text-2xl font-extrabold text-white">{totalBookings}</span>
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-4 bg-slate-900/40">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">States with Bookings</span>
            <span className="text-2xl font-extrabold text-white">{statesWithActivity}</span>
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-4 bg-slate-900/40">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cities with Bookings</span>
            <span className="text-2xl font-extrabold text-white">{citiesWithActivity}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No bookings yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800/60">
                  <th className="text-left font-bold px-4 py-3">State</th>
                  <th className="text-right font-bold px-4 py-3">Bookings</th>
                  <th className="text-right font-bold px-4 py-3">Active</th>
                  <th className="text-right font-bold px-4 py-3">Value</th>
                  <th className="text-left font-bold px-4 py-3">Cities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.map((r) => (
                  <tr key={r.state} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-bold text-white">{r.state}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{r.bookings}</td>
                    <td className="px-4 py-3 text-right text-emerald-300">{r.active}</td>
                    <td className="px-4 py-3 text-right text-amber-300 font-semibold">{inr(r.value)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {[...r.cities].sort().join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
