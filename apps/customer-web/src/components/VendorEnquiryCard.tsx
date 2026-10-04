import React, { useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { VENDOR_CATEGORIES } from '../../../../packages/shared-types';
import { createVendorEnquiry } from '../api';

/**
 * Shown when no vendor is free on the customer's event date. Instead of a dead end it lets
 * the customer say what kind of vendor they need; the team follows up as soon as one is found.
 */
export const VendorEnquiryCard: React.FC<{
  eventDate: string;
  eventDateLabel: string;
  eventTitle?: string;
  defaultCategory?: string;
  customerName?: string;
  city?: string;
  onShowAll: () => void;
  showingAll: boolean;
}> = ({ eventDate, eventDateLabel, eventTitle, defaultCategory, customerName, city, onShowAll, showingAll }) => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(defaultCategory && defaultCategory !== 'All' ? defaultCategory : '');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) { setError('Please choose the type of vendor you need.'); return; }
    setSending(true);
    setError('');
    try {
      const res = await createVendorEnquiry({ category, eventDate, eventTitle, city: city && city !== 'All' ? city : undefined, phone: phone.trim() || undefined, notes: notes.trim() || undefined, customerName });
      if (res.success === false) throw new Error(res.message || 'Could not send your request.');
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Could not send your request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 flex items-start gap-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-emerald-100">Request received - thank you!</p>
          <p className="text-xs text-emerald-200/90 mt-1">
            We'll get back to you as soon as we find a {category} vendor for <strong>{eventDateLabel}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
      <p className="text-sm font-bold text-amber-100">
        We're still looking for vendors for <span className="text-amber-300">{eventDateLabel}</span>{eventTitle ? <> ({eventTitle})</> : null}.
      </p>
      <p className="text-xs text-amber-200/80 mt-1">
        Nobody is free on this date yet. Tell us what you need and we'll find one for you and get back to you.
      </p>

      {!open ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Request a vendor
          </button>
          <button type="button" onClick={onShowAll} className="text-xs font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2">
            {showingAll ? 'Only vendors free on this date' : 'Browse all vendors instead'}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3 max-w-xl">
          <div>
            <label className="block text-[11px] font-bold uppercase text-amber-200/80 mb-1">Type of vendor you need</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            >
              <option value="">Choose a vendor type…</option>
              {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-amber-200/80 mb-1">Mobile number (optional)</label>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
              placeholder="So we can call you"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-amber-200/80 mb-1">Anything we should know? (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              placeholder="Budget, style, number of guests, location…"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            />
          </div>
          {error && <p className="text-xs font-semibold text-rose-300">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5 disabled:opacity-60"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send request
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-amber-200/80 hover:text-amber-100">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};
