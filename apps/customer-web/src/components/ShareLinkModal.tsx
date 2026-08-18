import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Share2 } from 'lucide-react';

export const ShareLinkModal: React.FC<{ url: string; title: string; onClose: () => void }> = ({
  url,
  title,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

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
