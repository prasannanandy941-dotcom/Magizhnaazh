import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Vendor, openSlots, offeredSlotIds } from '../../../../packages/shared-types';

// Month-view calendar of a vendor's availability, so a customer sees at a
// glance which days are open, nearly full, booked or not offered — instead of
// a long list of date buttons when a vendor opens a whole month.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthIndex = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return y * 12 + (m - 1);
};

type DayState = 'past' | 'expired' | 'available' | 'limited' | 'booked' | 'unavailable';

export function AvailabilityCalendar({
  vendor,
  selectedDate,
  onPick,
}: {
  vendor: Vendor;
  selectedDate?: string;
  onPick: (date: string) => void;
}) {
  const todayKey = toKey(new Date());
  const available = useMemo(() => new Set(vendor.availableDates || []), [vendor.availableDates]);
  const booked = useMemo(() => new Set(vendor.bookedDates || []), [vendor.bookedDates]);

  const stateOf = (key: string): DayState => {
    // A date the vendor had opened (or that got booked) but which has now gone by.
    if (key < todayKey) return available.has(key) || booked.has(key) ? 'expired' : 'past';
    if (booked.has(key)) return 'booked';
    if (!available.has(key)) return 'unavailable';
    const open = openSlots(vendor, key).length;
    if (open === 0) return 'booked';
    return open < offeredSlotIds(vendor, key).length ? 'limited' : 'available';
  };

  // Upcoming open dates, sorted — used to pick the starting month and for
  // the "next available" shortcut.
  const upcomingOpen = useMemo(
    () => [...available].filter((d) => d >= todayKey && stateOf(d) !== 'booked').sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [available, booked, todayKey, vendor.bookedSlots, vendor.slotCapacity],
  );

  // Navigable range: this month up to the last month with any listed date.
  const allKeys = [...available, ...booked].filter((d) => d >= todayKey.slice(0, 7));
  const minMonth = monthIndex(todayKey);
  const maxMonth = Math.max(minMonth, ...allKeys.map(monthIndex));
  const [month, setMonth] = useState(() => (upcomingOpen[0] ? monthIndex(upcomingOpen[0]) : minMonth));

  const year = Math.floor(month / 12);
  const mon = month % 12;
  const first = new Date(year, mon, 1);
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toKey(new Date(year, mon, i + 1))),
  ];
  const monthLabel = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const openThisMonth = cells.filter((k) => k && (stateOf(k) === 'available' || stateOf(k) === 'limited')).length;
  const nextOpen = upcomingOpen.find((d) => monthIndex(d) > month);
  const expiredThisMonth = cells.filter((k) => k && stateOf(k) === 'expired').length;

  // Legend filter: tap a legend item to highlight just those days (others dim)
  // and list them across all months. Tap it again to clear.
  type LegendKey = 'available' | 'limited' | 'booked' | 'unavailable' | 'expired';
  const [filter, setFilter] = useState<LegendKey | null>(null);
  const listedKeys = [...new Set([...available, ...booked])].sort();
  const datesFor = (f: LegendKey) =>
    f === 'unavailable' ? [] : listedKeys.filter((k) => stateOf(k) === f);
  const filteredDates = filter ? datesFor(filter) : [];
  const toggleFilter = (f: LegendKey) => {
    const next = filter === f ? null : f;
    setFilter(next);
    // Jump to the first matching month if this one has none of them.
    if (next && next !== 'unavailable') {
      const matches = datesFor(next);
      if (matches.length && !matches.some((k) => monthIndex(k) === month)) {
        setMonth(Math.max(minMonth, Math.min(maxMonth, monthIndex(matches[0]))));
      }
    }
  };
  const fmt = (k: string) => new Date(`${k}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const LEGEND: { key: LegendKey; label: string; swatch: string }[] = [
    { key: 'available', label: 'Available', swatch: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
    { key: 'limited', label: 'Few slots left', swatch: 'bg-gradient-to-br from-amber-400 to-orange-500' },
    { key: 'booked', label: 'Booked', swatch: 'bg-rose-500/20 border border-rose-500/50' },
    { key: 'unavailable', label: 'Not available', swatch: 'border border-slate-700' },
    { key: 'expired', label: 'Date passed', swatch: 'bg-slate-800/60 border border-dashed border-slate-600' },
  ];
  const matchesFilter = (state: DayState) => !filter || state === filter || (filter === 'unavailable' && state === 'past');

  const cellClass: Record<DayState, string> = {
    past: 'text-slate-600 cursor-not-allowed',
    expired: 'bg-slate-800/50 border border-dashed border-slate-600 text-slate-500 line-through cursor-not-allowed',
    unavailable: 'text-slate-400 cursor-not-allowed',
    booked: 'bg-rose-500/15 border border-rose-500/40 text-rose-300 line-through decoration-2 cursor-not-allowed',
    available: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-md shadow-emerald-500/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/40 cursor-pointer',
    limited: 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/40 cursor-pointer',
  };
  const titleOf: Record<DayState, string> = {
    past: 'Past date',
    expired: 'This open date has passed',
    unavailable: 'Not available',
    booked: 'Already booked',
    available: 'Available — tap to book',
    limited: 'Few sessions left — tap to book',
  };

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl border border-amber-500/25 bg-gradient-to-b from-[#1f1233] to-[#120a1e] p-3 sm:p-5 shadow-xl shadow-amber-900/10">
      {/* Month header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMonth((m) => m - 1)}
          disabled={month <= minMonth}
          aria-label="Previous month"
          className="w-10 h-10 rounded-full border border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-300 hover:bg-amber-500/15 hover:border-amber-400/70 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="font-display font-extrabold text-xl leading-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
            {first.toLocaleDateString('en-IN', { month: 'long' })}
            <span className="ml-1.5 text-base font-bold">{year}</span>
          </p>
          <span
            className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              openThisMonth > 0 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800/70 text-slate-400 border border-slate-700'
            }`}
          >
            {openThisMonth > 0
              ? `${openThisMonth} date${openThisMonth === 1 ? '' : 's'} open`
              : expiredThisMonth > 0
                ? 'Open dates this month have passed'
                : 'No open dates this month'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMonth((m) => m + 1)}
          disabled={month >= maxMonth}
          aria-label="Next month"
          className="w-10 h-10 rounded-full border border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-300 hover:bg-amber-500/15 hover:border-amber-400/70 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday header + day grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wide py-1.5 rounded-lg bg-slate-900/50 ${
              i === 0 ? 'text-rose-300' : i === 6 ? 'text-amber-300' : 'text-slate-400'
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((key, i) => {
          if (!key) return <div key={`blank-${i}`} />;
          const state = stateOf(key);
          const clickable = state === 'available' || state === 'limited';
          const selected = key === selectedDate;
          const day = Number(key.slice(8));
          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onPick(key)}
              title={titleOf[state]}
              aria-label={`${day} ${monthLabel}: ${titleOf[state]}`}
              className={`relative aspect-square max-h-12 w-full rounded-2xl text-xs sm:text-sm flex items-center justify-center transition-all duration-200 ${
                selected
                  ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold ring-4 ring-indigo-400/30 scale-105 shadow-lg shadow-indigo-500/40'
                  : cellClass[state]
              } ${key === todayKey && !selected ? 'ring-2 ring-amber-400/80' : ''} ${
                !matchesFilter(state) ? 'opacity-20' : filter ? 'ring-2 ring-amber-400/70' : ''
              }`}
            >
              {day}
              {key === todayKey && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1 rounded bg-amber-400 text-[7px] font-extrabold uppercase leading-3 text-slate-950">Today</span>
              )}
            </button>
          );
        })}
      </div>

      {openThisMonth === 0 && nextOpen && (
        <button
          type="button"
          onClick={() => setMonth(monthIndex(nextOpen))}
          className="mt-3 w-full text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          Next available: {new Date(`${nextOpen}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} →
        </button>
      )}

      {/* Legend — each item is a filter button */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-400">
        {LEGEND.filter((l) => l.key !== 'expired' || listedKeys.some((k) => stateOf(k) === 'expired')).map((l) => {
          const active = filter === l.key;
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => toggleFilter(l.key)}
              aria-pressed={active}
              title={active ? 'Show all dates' : `Show only: ${l.label}`}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors ${
                active ? 'border-amber-400/70 bg-amber-500/10 text-amber-200 font-semibold' : 'border-transparent hover:border-slate-700'
              }`}
            >
              <span className={`w-3 h-3 rounded ${l.swatch}`} /> {l.label}
            </button>
          );
        })}
      </div>

      {/* Dates matching the chosen legend item, across all months */}
      {filter && (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[11px] font-bold uppercase text-slate-400">
              {LEGEND.find((l) => l.key === filter)?.label} {filter !== 'unavailable' && `(${filteredDates.length})`}
            </p>
            <button type="button" onClick={() => setFilter(null)} className="text-[11px] font-semibold text-amber-400 hover:text-amber-300">
              Show all
            </button>
          </div>
          {filter === 'unavailable' ? (
            <p className="text-xs text-slate-400">Every day that isn't coloured is not open for booking — they're highlighted above.</p>
          ) : filteredDates.length === 0 ? (
            <p className="text-xs text-slate-400">No dates in this group.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {filteredDates.map((k) => {
                const bookable = filter === 'available' || filter === 'limited';
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => (bookable ? onPick(k) : setMonth(Math.max(minMonth, Math.min(maxMonth, monthIndex(k)))))}
                    className={`px-2.5 py-1 rounded-lg text-xs border ${bookable ? cellClass[filter] : `${cellClass[filter]} !cursor-pointer`}`}
                    title={bookable ? 'Tap to book this date' : 'Show on the calendar'}
                  >
                    {fmt(k)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
