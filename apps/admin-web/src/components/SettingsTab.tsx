import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { fetchSettings, updateSettings } from '../api';

export const SettingsTab: React.FC<{ token: string }> = ({ token }) => {
  const [commissionPercent, setCommissionPercent] = useState(10);
  const [advancePercent, setAdvancePercent] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetchSettings(token);
      if (res.data?.settings) {
        setCommissionPercent(Math.round(res.data.settings.commissionRate * 100));
        setAdvancePercent(Math.round(res.data.settings.advanceDepositRate * 100));
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setNotice('');
    try {
      await updateSettings(token, {
        commissionRate: commissionPercent / 100,
        advanceDepositRate: advancePercent / 100,
      });
      setNotice('Platform settings saved — new bookings will use these rates immediately.');
    } catch (err: any) {
      setNotice(err.message || 'Could not save settings.');
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(''), 5000);
    }
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
            type="number"
            min={0}
            max={100}
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(Number(e.target.value))}
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-lg"
          />
          <p className="text-[11px] text-slate-500 mt-1">Applied to quotes and the admin revenue dashboard.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">Advance Deposit Rate (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={advancePercent}
            onChange={(e) => setAdvancePercent(Number(e.target.value))}
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-lg"
          />
          <p className="text-[11px] text-slate-500 mt-1">Percentage collected as advance when a booking is confirmed.</p>
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
