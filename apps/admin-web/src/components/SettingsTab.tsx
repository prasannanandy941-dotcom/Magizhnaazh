import React, { useEffect, useState } from 'react';
import { Loader2, Save, Percent, Wallet, Receipt } from 'lucide-react';
import { fetchSettings, updateSettings } from '../api';

// Values are kept as strings while editing so a field can be briefly empty
// mid-type instead of snapping to a number (which caused a leading-zero bug).
export const SettingsTab: React.FC<{ token: string }> = ({ token }) => {
  const [commissionPercent, setCommissionPercent] = useState('10');
  const [gstPercent, setGstPercent] = useState('18');
  const [advancePercent, setAdvancePercent] = useState('30');
  const [advanceMinPercent, setAdvanceMinPercent] = useState('0');
  const [advanceMaxPercent, setAdvanceMaxPercent] = useState('100');
  const [payoutHoldDays, setPayoutHoldDays] = useState('0');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetchSettings(token);
      const s = res.data?.settings;
      if (s) {
        setCommissionPercent(String(Math.round(s.commissionRate * 100)));
        setAdvancePercent(String(Math.round(s.advanceDepositRate * 100)));
        if (typeof s.gstRate === 'number') setGstPercent(String(Math.round(s.gstRate * 100)));
        if (typeof s.advanceDepositMinRate === 'number') setAdvanceMinPercent(String(Math.round(s.advanceDepositMinRate * 100)));
        if (typeof s.advanceDepositMaxRate === 'number') setAdvanceMaxPercent(String(Math.round(s.advanceDepositMaxRate * 100)));
        if (typeof s.vendorPayoutHoldDays === 'number') setPayoutHoldDays(String(s.vendorPayoutHoldDays));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setNotice('');
    setError('');
    const min = Number(advanceMinPercent) || 0;
    const max = Number(advanceMaxPercent) || 0;
    if (min > max) {
      setError('Minimum advance cannot be greater than maximum advance.');
      setSaving(false);
      return;
    }
    try {
      await updateSettings(token, {
        commissionRate: (Number(commissionPercent) || 0) / 100,
        gstRate: (Number(gstPercent) || 0) / 100,
        advanceDepositRate: (Number(advancePercent) || 0) / 100,
        advanceDepositMinRate: min / 100,
        advanceDepositMaxRate: max / 100,
        vendorPayoutHoldDays: Number(payoutHoldDays) || 0,
      });
      setNotice('Settings saved — new bookings and payouts use these values immediately.');
    } catch (err: any) {
      setError(err.message || 'Could not save settings.');
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(''), 5000);
    }
  };

  // Digits only, no leading zeros, capped at `max`.
  const clampDigits = (raw: string, max: number): string => {
    const digits = raw.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
    if (digits === '') return '';
    return String(Math.min(max, Number(digits)));
  };
  const handleFocusClear = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.value = '';
  };
  const blurFallback = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    if (value === '') setter('0');
  };

  const field = (
    label: string,
    hint: string,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    max: number,
    suffix: string
  ) => (
    <div>
      <label className="block text-xs font-bold text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onFocus={handleFocusClear}
          onChange={(e) => setter(clampDigits(e.target.value, max))}
          onBlur={() => blurFallback(value, setter)}
          className="w-full p-3 pr-12 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-lg"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">{suffix}</span>
      </div>
      <p className="text-[11px] text-slate-500 mt-1">{hint}</p>
    </div>
  );

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
        <p className="text-slate-400 text-sm mt-1">
          Money rules the backend applies live to every booking. Grouped by who they affect.
        </p>
      </div>

      {/* Commission & Tax */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Receipt className="w-4 h-4 text-indigo-400" /> Commission &amp; Tax
        </h3>
        {field(
          'Platform Commission Rate',
          "The platform's cut of each booking. Drives the revenue dashboard and the vendor payout (vendor is paid the total minus this).",
          commissionPercent,
          setCommissionPercent,
          100,
          '%'
        )}
        {field(
          'GST Rate',
          'Prices are GST-inclusive; this is used to print the CGST/SGST breakup on booking invoices.',
          gstPercent,
          setGstPercent,
          100,
          '%'
        )}
      </div>

      {/* Customer advance */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Percent className="w-4 h-4 text-amber-400" /> Customer Advance
        </h3>
        {field(
          'Default Advance Deposit Rate',
          'How much the customer pays upfront when a booking is confirmed. A vendor can set their own rate; it is clamped to the min/max below.',
          advancePercent,
          setAdvancePercent,
          100,
          '%'
        )}
        <div className="grid grid-cols-2 gap-4">
          {field('Minimum Advance', 'Floor for any vendor override.', advanceMinPercent, setAdvanceMinPercent, 100, '%')}
          {field('Maximum Advance', 'Ceiling for any vendor override.', advanceMaxPercent, setAdvanceMaxPercent, 100, '%')}
        </div>
      </div>

      {/* Vendor payouts */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" /> Vendor Payouts
        </h3>
        {field(
          'Payout Hold Period',
          "Days after the event date before a vendor's payout can be marked settled in the Settlements register. 0 = settle any time.",
          payoutHoldDays,
          setPayoutHoldDays,
          365,
          'days'
        )}
      </div>

      {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}
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
  );
};
