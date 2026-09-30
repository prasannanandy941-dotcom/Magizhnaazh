import React from 'react';
import { Loader2 } from 'lucide-react';

export type OtpChannel = 'email' | 'whatsapp' | 'sms';

const OPTIONS: { id: OtpChannel; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'whatsapp', label: 'WhatsApp' },
];

/**
 * "Send OTP via" chooser + the Send OTP button, shown once under the contact
 * fields on sign-up / forgot password. WhatsApp and SMS send the code to the
 * mobile number field above it (sign-up) or to the number saved on the account
 * (password reset) - so this component never asks for a number itself.
 */
export const OtpChannelPicker: React.FC<{
  channel: OtpChannel;
  onChannel: (c: OtpChannel) => void;
  onSend: () => void;
  sending: boolean;
  note?: string;
  notice?: string;
  errorText?: string;
  onSignIn?: () => void;
  tone?: 'light' | 'dark';
}> = ({ channel, onChannel, onSend, sending, note, notice, errorText, onSignIn, tone = 'light' }) => {
  const dark = tone === 'dark';
  const label = dark ? 'text-slate-300' : 'text-slate-800';
  const idle = dark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700';
  const active = dark ? 'bg-amber-500 border-amber-500 text-slate-950' : 'bg-indigo-600 border-indigo-600 text-white';
  const send = dark
    ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
    : 'bg-slate-100 hover:bg-slate-200 text-amber-600 border-slate-300';
  const hint = dark ? 'text-slate-400' : 'text-slate-500';
  return (
    <div>
      <label className={`block text-xs font-bold mb-1.5 ${label}`}>Send OTP via</label>
      <div className="flex gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChannel(o.id)}
            aria-pressed={channel === o.id}
            className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-colors ${channel === o.id ? active : idle}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {note && <p className={`text-[10px] mt-1 ${hint}`}>{note}</p>}
      <button
        type="button"
        onClick={onSend}
        disabled={sending}
        className={`mt-2 w-full py-2.5 rounded-xl border font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${send}`}
      >
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        {sending ? 'Sending...' : `Send OTP${channel === 'whatsapp' ? ' on WhatsApp' : channel === 'sms' ? ' by SMS' : ' to Email'}`}
      </button>
      {notice && !errorText && (
        <p className={`mt-2 text-xs font-semibold rounded-lg px-3 py-2 border ${dark ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>{notice}</p>
      )}
      {errorText && (
        <p className={`mt-2 text-xs font-semibold rounded-lg px-3 py-2 border ${dark ? 'text-rose-300 bg-rose-500/10 border-rose-500/30' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
          {errorText}
          {onSignIn && (
            <>
              {' '}
              <button type="button" onClick={onSignIn} className="underline font-bold">Sign in instead</button>
            </>
          )}
        </p>
      )}
    </div>
  );
};
