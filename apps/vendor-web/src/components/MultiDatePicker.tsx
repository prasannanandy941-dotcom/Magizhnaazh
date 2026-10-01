import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Month calendar for opening one date or many at once. Tap dates to select /
 * un-select them (any number, across months), or turn on "Range" and tap a
 * start and an end date. Weekend / whole-month shortcuts cover the common
 * cases. Nothing is added until the vendor presses the Add button.
 * Past dates and dates already added are not selectable.
 */
export const MultiDatePicker: React.FC<{
  existing: string[];
  onAdd: (dates: string[]) => void;
  compact?: boolean;
}> = ({ existing, onAdd, compact = false }) => {
  const now = new Date();
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const existingSet = useMemo(() => new Set(existing), [existing]);

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => iso(view.y, view.m, i + 1)),
  ];

  const selectable = (d: string) => d >= todayIso && !existingSet.has(d);

  const shiftMonth = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const toggle = (d: string) => {
    if (!selectable(d)) return;
    if (rangeMode) {
      if (!rangeStart) {
        setRangeStart(d);
        setSelected((prev) => new Set(prev).add(d));
        return;
      }
      const [a, b] = rangeStart <= d ? [rangeStart, d] : [d, rangeStart];
      setSelected((prev) => {
        const next = new Set(prev);
        const cur = new Date(`${a}T00:00:00`);
        const end = new Date(`${b}T00:00:00`);
        for (; cur <= end; cur.setDate(cur.getDate() + 1)) {
          const x = iso(cur.getFullYear(), cur.getMonth(), cur.getDate());
          if (selectable(x)) next.add(x);
        }
        return next;
      });
      setRangeStart(null);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  };

  const addMonthWhere = (pred: (weekday: number) => boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (let day = 1; day <= daysInMonth; day++) {
        const d = iso(view.y, view.m, day);
        if (selectable(d) && pred(new Date(view.y, view.m, day).getDay())) next.add(d);
      }
      return next;
    });
  };

  const count = selected.size;
  const chip = 'px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-200 hover:border-amber-500/60';

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/50 ${compact ? 'p-2.5' : 'p-3'} space-y-2.5`}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-amber-300 hover:bg-slate-800">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-white">
          {new Date(view.y, view.m, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-amber-300 hover:bg-slate-800">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[10px] font-bold text-slate-500 py-1">{w}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const day = Number(d.slice(8));
          const isSel = selected.has(d);
          const isExisting = existingSet.has(d);
          const ok = selectable(d);
          return (
            <button
              key={d}
              type="button"
              disabled={!ok}
              onClick={() => toggle(d)}
              title={isExisting ? 'Already added' : undefined}
              className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                isSel
                  ? 'bg-amber-500 text-slate-950 font-extrabold'
                  : isExisting
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-not-allowed'
                    : ok
                      ? 'bg-slate-950/60 text-slate-200 hover:bg-slate-800 border border-slate-800'
                      : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={chip} onClick={() => addMonthWhere((w) => w === 0 || w === 6)}>All weekends</button>
        <button type="button" className={chip} onClick={() => addMonthWhere(() => true)}>Whole month</button>
        <button
          type="button"
          className={`${chip} ${rangeMode ? '!border-amber-500 !text-amber-300' : ''}`}
          onClick={() => { setRangeMode((v) => !v); setRangeStart(null); }}
        >
          {rangeMode ? (rangeStart ? 'Range: tap end date' : 'Range: tap start date') : 'Range'}
        </button>
        {count > 0 && (
          <button type="button" className={`${chip} !text-rose-300`} onClick={() => { setSelected(new Set()); setRangeStart(null); }}>Clear</button>
        )}
      </div>
      <p className="text-[10px] text-slate-500">
        Tap one date, or many. <span className="text-emerald-300">Green</span> dates are already added.
      </p>

      <button
        type="button"
        disabled={count === 0}
        onClick={() => { onAdd([...selected].sort()); setSelected(new Set()); setRangeStart(null); }}
        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" /> {count === 0 ? 'Select dates to add' : `Add ${count} date${count === 1 ? '' : 's'}`}
      </button>
    </div>
  );
};
