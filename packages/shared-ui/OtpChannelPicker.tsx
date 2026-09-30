import React from 'react';

export type OtpChannel = 'email' | 'whatsapp' | 'sms';

const OPTIONS: { id: OtpChannel; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'sms', label: 'SMS' },
];

/**
 * "Send the code via" chooser shown under the email field on sign-up / forgot
 * password. Picking WhatsApp or SMS on sign-up reveals a mobile-number field that
 * must be filled before the code is sent to that number. For password reset the
 * code always goes to the number saved on the account, so no number is asked.
 */
export const OtpChannelPicker: React.FC<{
  channel: OtpChannel;
  onChannel: (c: OtpChannel) => void;
  phone: string;
  onPhone: (v: string) => void;
  askPhone: boolean;
  tone?: 'light' | 'dark';
}> = ({ channel, onChannel, phone, onPhone, askPhone, tone = 'light' }) => {
  const dark = tone === 'dark';
  const label = dark ? 'text-slate-300' : 'text-slate-800';
  const idle = dark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700';
  const active = dark ? 'bg-amber-500 border-amber-500 text-slate-950' : 'bg-indigo-600 border-indigo-600 text-white';
  const input = dark
    ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500'
    : 'bg-white border-slate-800 text-slate-900 placeholder:text-slate-500 focus:border-indigo-500';
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
      {channel !== 'email' && askPhone && (
        <div className="mt-2">
          <label className={`block text-xs font-bold mb-1.5 ${label}`}>
            Mobile number {channel === 'whatsapp' ? '(on WhatsApp)' : '(for SMS)'}
          </label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => onPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
            placeholder="98765 43210"
            className={`w-full p-3 rounded-xl border-2 text-sm focus:outline-none ${input}`}
          />
          <p className={`text-[10px] mt-1 ${hint}`}>We'll send the code to this number. 10-digit numbers are treated as +91.</p>
        </div>
      )}
      {channel !== 'email' && !askPhone && (
        <p className={`text-[10px] mt-1 ${hint}`}>The code goes to the mobile number saved on your account.</p>
      )}
    </div>
  );
};
