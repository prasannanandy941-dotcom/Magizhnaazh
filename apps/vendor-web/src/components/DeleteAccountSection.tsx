import React, { useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { deleteMyAccount } from '../api';

// "Danger zone" on the vendor Profile tab: permanently deletes the vendor's
// login and business listing. The same email / Google account can sign up
// again later as a brand-new vendor.
export const DeleteAccountSection: React.FC<{
  token: string;
  businessName?: string;
  isGoogleAccount: boolean;
  onDeleted: () => void;
}> = ({ token, businessName, isGoogleAccount, onDeleted }) => {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canDelete = confirmText === 'DELETE' && (isGoogleAccount || password.length > 0) && !busy;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setConfirmText('');
    setPassword('');
    setError('');
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setBusy(true);
    setError('');
    try {
      await deleteMyAccount(token, { confirm: 'DELETE', password: isGoogleAccount ? undefined : password });
      onDeleted();
    } catch (err: any) {
      setError(err?.message || 'Could not delete your account. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-rose-500/40 bg-rose-950/20 p-6 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-rose-300">Danger zone</h3>
          <p className="text-xs text-slate-400 mt-1">
            Permanently delete your vendor account{businessName ? ` and the “${businessName}” listing` : ''} — photos,
            packages, availability and your login. Customers' past booking records are kept. You can sign up again
            later with the same email, but it will start as a brand-new account.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-5 py-2.5 rounded-xl border border-rose-500/60 bg-rose-500/10 text-rose-300 font-bold text-xs hover:bg-rose-500/20 flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" /> Delete my account permanently
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="glass-card w-full max-w-md rounded-3xl border border-rose-500/40 p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 id="delete-account-title" className="font-bold text-lg text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" /> Delete account permanently?
              </h3>
              <button type="button" onClick={close} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5">
              <li>Your business listing is removed from the marketplace immediately.</li>
              <li>Your photos, packages, offers and availability are deleted.</li>
              <li>This cannot be undone.</li>
              <li>If you still have upcoming bookings, complete, cancel or refund them first.</li>
            </ul>

            {!isGoogleAccount && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="delete-password">Your password</label>
                <input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="delete-confirm">
                Type <span className="font-mono text-rose-300">DELETE</span> to confirm
              </label>
              <input
                id="delete-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-rose-500"
              />
            </div>

            {error && <p className="text-xs font-semibold text-rose-400" role="alert">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={close} disabled={busy} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800">
                Keep my account
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
