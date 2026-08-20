import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Share2, Send, Mail } from 'lucide-react';

// Official brand glyphs (lucide has no WhatsApp/Messenger icons).
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.945c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.652a11.882 11.882 0 005.71 1.454h.005c6.585 0 11.946-5.359 11.949-11.945a11.821 11.821 0 00-3.479-8.408" />
  </svg>
);
const MessengerIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.13 3.26L19.752 8l-6.561 6.963z" />
  </svg>
);

export const ShareLinkModal: React.FC<{ url: string; title: string; onClose: () => void }> = ({
  url,
  title,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  // Prebuilt share links. WhatsApp/Telegram/Email carry the message + link;
  // Messenger opens its share deep link (works best on mobile where the app
  // is installed).
  const message = `You're invited to ${title}! RSVP here: ${url}`;
  const encodedMessage = encodeURIComponent(message);
  const encodedUrl = encodeURIComponent(url);
  const shareTargets = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodedMessage}`, Icon: WhatsAppIcon, className: 'bg-[#25D366] hover:brightness-110 text-white' },
    { label: 'Messenger', href: `https://www.facebook.com/dialog/send?link=${encodedUrl}&redirect_uri=${encodedUrl}`, Icon: MessengerIcon, className: 'bg-[#0084FF] hover:brightness-110 text-white' },
    { label: 'Telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(`You're invited to ${title}! RSVP here:`)}`, Icon: Send, className: 'bg-[#229ED9] hover:brightness-110 text-white' },
    { label: 'Email', href: `mailto:?subject=${encodeURIComponent(`Invitation: ${title}`)}&body=${encodedMessage}`, Icon: Mail, className: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700' },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API can be unavailable (insecure context, permissions) — the
      // link is still selectable/copyable by hand from the input below.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="glass-card max-w-md w-full rounded-3xl border border-slate-800 shadow-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase">
              <Share2 className="w-3.5 h-3.5" /> Share Web RSVP Link
            </span>
            <h3 className="font-display font-bold text-lg text-white mt-1">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Anyone with this link can view the invitation and RSVP — no account needed on their end.
        </p>

        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono"
          />
          <button
            onClick={handleCopy}
            className={`px-4 py-3 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors ${
              copied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Share via</p>
          <div className="grid grid-cols-4 gap-2">
            {shareTargets.map(({ label, href, Icon, className }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Share on ${label}`}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-[10px] transition-all ${className}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </a>
            ))}
          </div>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500 text-slate-200 hover:text-white font-bold text-xs transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open as a guest would see it
        </a>
      </div>
    </div>
  );
};
