import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { fetchSettings, updateSettings } from '../api';

export const SettingsTab: React.FC<{ token: string }> = ({ token }) => {
  // Stored as strings while editing so the field can be empty mid-type
  // instead of forcing a number (which is what caused the leading-zero bug).
  const [commissionPercent, setCommissionPercent] = useState('10');
  const [advancePercent, setAdvancePercent] = useState('30');
  const [gstPercent, setGstPercent] = useState('18');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetchSettings(token);
      if (res.data?.settings) {
        setCommissionPercent(String(Math.round(res.data.settings.commissionRate * 100)));
        setAdvancePercent(String(Math.round(res.data.settings.advanceDepositRate * 100)));
        if (typeof res.data.settings.gstRate === 'number') setGstPercent(String(Math.round(res.data.settings.gstRate * 100)));
      }
      setLoading(false);
    })();
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
      setNotice('Platform settings saved — new bookings will use these rates immediately.');
    } catch (err: any) {
      setNotice(err.message || 'Could not save settings.');
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(''), 5000);
    }
  };

  // Only allow digits, strip leading zeros as the user types (e.g. "0" + "5"
  // => "5", not "05"), and cap at 100 — these are percentages, and an
  // unbounded value here previously let a mistyped rate (e.g. "4555") get
  // saved as a 4555% advance deposit and silently wreck every booking's
  // advance calculation.
  const sanitizeDigits = (raw: string): string => {
    const digitsOnly = raw.replace(/[^0-9]/g, '');
    const noLeadingZeros = digitsOnly.replace(/^0+(?=\d)/, '');
    if (noLeadingZeros === '') return noLeadingZeros;
    return String(Math.min(100, Number(noLeadingZeros)));
  };

  // Clears the field on focus so typing always starts fresh
  // instead of inserting into the existing value.
  const handleFocusClear = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.value = '';
  };

  // If left empty on blur, fall back to 0 instead of staying blank.
  const handleBlurFallback = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (value === '') setter('0');
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="font-display font-bold text-2xl text-white">Platform Settings</h2>
        <p className="text-slate-400 text-sm mt-1">Commission and deposit rates applied platform-wide, live.</p>
      </div>

      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">Platform Commission Rate (%)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={commissionPercent}
            onFocus={handleFocusClear}
            onChange={(e) => setCommissionPercent(sanitizeDigits(e.target.value))}
            onBlur={() => handleBlurFallback(commissionPercent, setCommissionPercent)}
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-lg"
          />
          <p className="text-[11px] text-slate-500 mt-1">Applied to quotes and the admin revenue dashboard.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">Advance Deposit Rate (%)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={advancePercent}
            onFocus={handleFocusClear}
            onChange={(e) => setAdvancePercent(sanitizeDigits(e.target.value))}
            onBlur={() => handleBlurFallback(advancePercent, setAdvancePercent)}
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-lg"
          />
          <p className="text-[11px] text-slate-500 mt-1">Percentage collected as advance when a booking is confirmed.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">GST Rate (%)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={gstPercent}
            onFocus={handleFocusClear}
            onChange={(e) => setGstPercent(sanitizeDigits(e.target.value))}
            onBlur={() => handleBlurFallback(gstPercent, setGstPercent)}
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-lg"
          />
          <p className="text-[11px] text-slate-500 mt-1">Used to compute the GST breakup on booking invoices (prices are GST-inclusive).</p>
        </div>

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
    </div>
  );
};