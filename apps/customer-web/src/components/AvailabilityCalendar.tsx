import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Vendor, openSlots, offeredSlotIds, nextOpenDates } from '../../../../packages/shared-types';

// Month-view calendar of a vendor's availability. Vendors are open every upcoming day by
// default, so the calendar highlights what is NOT available (days the vendor closed, and days
// that are fully booked) while open days stay selectable.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthIndex = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return y * 12 + (m - 1);
};

type DayState = 'past' | 'available' | 'limited' | 'booked' | 'unavailable';

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
  const blocked = useMemo(() => new Set(vendor.unavailableDates || []), [vendor.unavailableDates]);
  const booked = useMemo(() => new Set(vendor.bookedDates || []), [vendor.bookedDates]);

  const stateOf = (key: string): DayState => {
    if (key < todayKey) return 'past';
    if (blocked.has(key)) return 'unavailable';
    if (booked.has(key)) return 'booked';
    const open = openSlots(vendor, key).length;
    if (open === 0) return 'booked';
    return open < offeredSlotIds(vendor, key).length ? 'limited' : 'available';
  };

  // Upcoming open dates, in order — used to pick the starting month and for the
  // "next available" shortcut.
  const upcomingOpen = useMemo(
    () => nextOpenDates(vendor, 400),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vendor.unavailableDates, vendor.bookedDates, vendor.bookedSlots, vendor.slotCapacity, vendor.availableSlots, todayKey],
  );

  // Navigable range: this month through the next 2 years (or further if the
  // vendor has closed dates beyond that), so customers can plan any month.
  const allKeys = [...blocked, ...booked].filter((d) => d >= todayKey.slice(0, 7));
  const minMonth = monthIndex(todayKey);
  const maxMonth = Math.max(minMonth + 23, ...allKeys.map(monthIndex));
  const [showMonthPicker, setShowMonthPicker] = useState(false);
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
  // Days a customer cannot book this month: closed by the vendor or fully booked.
  const closedThisMonth = cells.filter((k) => k && (stateOf(k) === 'unavailable' || stateOf(k) === 'booked')).length;

  // Legend filter: tap a legend item to highlight just those days in the
  // calendar (others dim). Tap it again to clear.
  type LegendKey = 'available' | 'limited' | 'booked' | 'unavailable';
  const [filter, setFilter] = useState<LegendKey | null>(null);
  const listedKeys = [...new Set([...blocked, ...booked])].filter((k) => k >= todayKey).sort();
  // Dates matching a legend item, within the month on screen.
  const monthDatesFor = (f: LegendKey) => cells.filter((k): k is string => !!k && stateOf(k) === f);
  const filteredDates = filter ? monthDatesFor(filter) : [];
  const toggleFilter = (f: LegendKey) => {
    const next = filter === f ? null : f;
    setFilter(next);
    // Jump to the first month that has a closed/booked day if this one has none.
    if (next === 'unavailable' || next === 'booked') {
      const matches = listedKeys.filter((k) => stateOf(k) === next);
      if (matches.length && !matches.some((k) => monthIndex(k) === month)) {
        setMonth(Math.max(minMonth, Math.min(maxMonth, monthIndex(matches[0]))));
      }
    }
  };
  const LEGEND: { key: LegendKey; label: string; swatch: string }[] = [
    { key: 'available', label: 'Available', swatch: 'bg-emerald-500/20 border border-emerald-500/60' },
    { key: 'limited', label: 'Few slots left', swatch: 'bg-gradient-to-br from-amber-400 to-orange-500' },
    { key: 'booked', label: 'Booked', swatch: 'bg-rose-500/20 border border-rose-500/50' },
    { key: 'unavailable', label: 'Unavailable', swatch: 'bg-rose-600' },
  ];
  const matchesFilter = (state: DayState) => !filter || state === filter;

  const cellClass: Record<DayState, string> = {
    past: 'text-slate-600 cursor-not-allowed',
    // Days the vendor closed stand out strongly - they are the exception.
    unavailable: 'bg-rose-600 text-white font-bold line-through decoration-2 cursor-not-allowed shadow-md shadow-rose-600/30',
    booked: 'bg-rose-500/15 border border-rose-500/40 text-rose-300 line-through decoration-2 cursor-not-allowed',
    available: 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 font-semibold hover:bg-emerald-500/25 hover:-translate-y-0.5 cursor-pointer',
    limited: 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/40 cursor-pointer',
  };
  const titleOf: Record<DayState, string> = {
    past: 'Past date',
    unavailable: 'Unavailable — the vendor is not taking bookings this day',
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
        <div className="text-center flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowMonthPicker((v) => !v)}
            aria-expanded={showMonthPicker}
            title="Jump to a month"
            className="font-display font-extrabold text-xl leading-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent inline-flex items-center gap-1"
          >
            {first.toLocaleDateString('en-IN', { month: 'long' })}
            <span className="text-base font-bold">{year}</span>
            <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${showMonthPicker ? 'rotate-180' : ''}`} />
          </button>
          <span
            className={`inline-block mt-2 px-4 py-1.5 rounded-full text-sm font-extrabold text-center leading-snug shadow-sm ${
              openThisMonth === 0 || closedThisMonth > 0 ? 'bg-rose-500/15 text-rose-500 border border-rose-500/60' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/60'
            }`}
          >
            {filter
              ? filteredDates.length > 0
                ? `Showing ${LEGEND.find((l) => l.key === filter)?.label.toLowerCase()} (${filteredDates.length})`
                : `No ${LEGEND.find((l) => l.key === filter)?.label.toLowerCase()} dates this month`
              : openThisMonth === 0
                ? 'No open dates this month'
                : closedThisMonth > 0
                  ? `${closedThisMonth} date${closedThisMonth === 1 ? '' : 's'} unavailable`
                  : 'Open all month'}
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

      {/* Quick month picker: every month in range, with open-date counts */}
      {showMonthPicker && (
        <div className="mb-4 grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-60 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/40 p-2">
          {Array.from({ length: maxMonth - minMonth + 1 }, (_, i) => minMonth + i).map((mi) => {
            const d = new Date(Math.floor(mi / 12), mi % 12, 1);
            const openCount = listedKeys.filter((k) => monthIndex(k) === mi).length;
            const current = mi === month;
            return (
              <button
                key={mi}
                type="button"
                onClick={() => { setMonth(mi); setShowMonthPicker(false); }}
                className={`relative px-2 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  current
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-indigo-500'
                    : 'border-slate-800 text-slate-300 hover:border-amber-400/60'
                }`}
              >
                {d.toLocaleDateString('en-IN', { month: 'short' })} {String(d.getFullYear()).slice(2)}
                {openCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center" title="Unavailable dates">{openCount}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

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
        {LEGEND.map((l) => {
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

    </div>
  );
}
