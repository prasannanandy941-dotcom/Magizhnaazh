import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Booking } from '../../../../packages/shared-types';
import { fetchSettings, updateSettings, fetchBookings } from '../api';

// Bookings that have real money attached (past the enquiry stage).
const LIVE_STATUSES = new Set(['confirmed', 'in_progress', 'completed']);

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const SettingsTab: React.FC<{ token: string }> = ({ token }) => {
  // Kept as strings while editing so a field can be briefly empty mid-type.
  const [commissionPercent, setCommissionPercent] = useState('10');
  const [advancePercent, setAdvancePercent] = useState('30');
  const [gstPercent, setGstPercent] = useState('18');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    (async () => {
      const [sRes, bRes] = await Promise.all([
        fetchSettings(token),
        fetchBookings(token).catch(() => null),
      ]);
      const s = sRes.data?.settings;
      if (s) {
        setCommissionPercent(String(Math.round(s.commissionRate * 100)));
        setAdvancePercent(String(Math.round(s.advanceDepositRate * 100)));
        if (typeof s.gstRate === 'number') setGstPercent(String(Math.round(s.gstRate * 100)));
      }
      setBookings(bRes?.data?.bookings || []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setNotice('');
    try {
      await updateSettings(token, {
        commissionRate: (Number(commissionPercent) || 0) / 100,
        advanceDepositRate: (Number(advancePercent) || 0) / 100,
        gstRate: (Number(gstPercent) || 0) / 100,
      });
      setNotice('Saved — new bookings use these rates immediately.');
    } catch (err: any) {
      setNotice(err.message || 'Could not save settings.');
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(''), 5000);
    }
  };

  const sanitize = (raw: string): string => {
    const digits = raw.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
    return digits === '' ? '' : String(Math.min(100, Number(digits)));
  };
  const focusClear = (e: React.FocusEvent<HTMLInputElement>) => { e.target.value = ''; };
  const blurFallback = (v: string, set: React.Dispatch<React.SetStateAction<string>>) => { if (v === '') set('0'); };

  // What each rule has actually produced across real (non-enquiry) bookings.
  const live = useMemo(() => {
    const b = bookings.filter((x) => LIVE_STATUSES.has(x.status));
    const volume = b.reduce((a, x) => a + (x.agreedPrice || 0), 0);
    const advances = b.reduce((a, x) => a + (x.advanceAmountPaid || 0), 0);
    const gst = (Number(gstPercent) || 0) / 100;
    const gstPortion = gst > 0 ? volume - volume / (1 + gst) : 0;
    return {
      count: b.length,
      vendors: new Set(b.map((x) => x.vendorId)).size,
      volume,
      commission: volume * ((Number(commissionPercent) || 0) / 100),
      advances,
      gstPortion,
    };
  }, [bookings, commissionPercent, gstPercent]);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading settings...
      </div>
    );
  }

  const Rule = ({
    label, badge, badgeClass, value, setValue, explain, result,
  }: {
    label: string;
    badge: string;
    badgeClass: string;
    value: string;
    setValue: React.Dispatch<React.SetStateAction<string>>;
    explain: string;
    result: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-bold text-slate-300">{label}</label>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>{badge}</span>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">{explain}</p>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onFocus={focusClear}
          onChange={(e) => setValue(sanitize(e.target.value))}
          onBlur={() => blurFallback(value, setValue)}
          className="w-full p-3 pr-10 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-lg"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">%</span>
      </div>
      <p className="text-[11px] text-emerald-400/90 font-semibold">{result}</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="font-display font-bold text-2xl text-white">Platform Settings</h2>
        <p className="text-slate-400 text-sm mt-1">
          Three rules only you can decide. Under each one is what it has produced across your real bookings
          ({live.count} booking{live.count === 1 ? '' : 's'}, {live.vendors} vendor{live.vendors === 1 ? '' : 's'},
          {' '}{inr(live.volume)} booked).
        </p>
      </div>

      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-7">
        <Rule
          label="Platform Commission Rate"
          badge="Charged to VENDORS"
          badgeClass="bg-sky-500/10 text-sky-300 border-sky-500/30"
          value={commissionPercent}
          setValue={setCommissionPercent}
          explain="Your cut of every booking. On a ₹1,00,000 booking the platform keeps this share and the vendor is paid the rest. This is your business model — nobody else can set it."
          result={`Earned so far: ${inr(live.commission)}`}
        />

        <div className="border-t border-slate-800/70" />

        <Rule
          label="Advance Deposit Rate"
          badge="Paid by CUSTOMERS"
          badgeClass="bg-amber-500/10 text-amber-300 border-amber-500/30"
          value={advancePercent}
          setValue={setAdvancePercent}
          explain="How much a customer pays upfront when they confirm a booking; the balance is due later. This is the default — a vendor may set their own rate for their listings."
          result={`Advances collected so far: ${inr(live.advances)}`}
        />

        <div className="border-t border-slate-800/70" />

        <Rule
          label="GST Rate"
          badge="Set by LAW"
          badgeClass="bg-slate-500/10 text-slate-300 border-slate-500/30"
          value={gstPercent}
          setValue={setGstPercent}
          explain="The government tax rate. Booking prices are treated as GST-inclusive; this is used only to print the CGST/SGST breakup on invoices."
          result={`Tax portion of booked value: ${inr(live.gstPortion)}`}
        />

        {notice && <p className="text-xs text-emerald-400 font-semibold">{notice}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md disabled:opacity-60 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>

      <p className="text-[11px] text-slate-500">
        Want the full money breakdown by vendor, city and month? See the <span className="text-slate-300 font-semibold">Analytics</span> tab.
      </p>
    </div>
  );
};
