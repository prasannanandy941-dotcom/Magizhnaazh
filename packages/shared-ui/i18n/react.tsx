import React, { useEffect, useRef, useState } from 'react';
import { Globe, Check, X } from 'lucide-react';
import { LANGUAGES, LangCode } from './languages';
import { getLanguage, hasChosenLanguage, onLanguageChange, setLanguage, suggestedLanguage } from './runtime';

/** Re-renders when the language changes. */
export function useLanguage(): LangCode {
  const [lang, setLang] = useState<LangCode>(getLanguage());
  useEffect(() => onLanguageChange(setLang), []);
  return lang;
}

// Language names are always shown in their own script (that is what people look
// for), so they are marked translate="no" and never touched by the translator.
function LanguageGrid({ selected, suggested, onPick, compact }: { selected: LangCode; suggested: LangCode | null; onPick: (c: LangCode) => void; compact?: boolean }) {
  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 sm:grid-cols-3 gap-2"}>
      {LANGUAGES.map((l) => {
        const active = l.code === selected;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => onPick(l.code)}
            aria-pressed={active}
            translate="no"
            className={`relative min-w-0 text-left rounded-xl border-2 px-3 py-2.5 pr-8 transition-colors ${
              active ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-300'
            }`}
          >
            <span style={{ whiteSpace: "nowrap" }} className="block text-[15px] font-bold leading-normal text-slate-900">{l.nativeName}</span>
            <span className="block text-[11px] text-slate-500">
              {l.name}
              {!active && suggested === l.code ? ' ★' : ''}
            </span>
            {active && <Check className="absolute top-2 right-2 w-4 h-4 text-amber-600" />}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Full-screen "Choose your language" card. Picking a language switches the whole
 * app straight away (so people see the result); "Continue" confirms.
 */
export const LanguageModal: React.FC<{ onDone: () => void; onClose?: () => void }> = ({ onDone, onClose }) => {
  const [selected, setSelected] = useState<LangCode>(getLanguage());
  const suggested = suggestedLanguage();

  const pick = (code: LangCode) => {
    setSelected(code);
    void setLanguage(code);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl relative">
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-5 h-5 text-amber-600" />
          <h2 className="text-xl font-extrabold text-slate-900">Choose your language</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4">The app will appear in this language. You can change it any time from the language button.</p>
        <LanguageGrid selected={selected} suggested={suggested} onPick={pick} />
        <button
          type="button"
          onClick={() => {
            // A person who taps Continue on the default has still made a choice.
            void setLanguage(selected).then(onDone);
          }}
          className="mt-5 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

/** Shows the language chooser first until a language has been picked, then the children. */
export const LanguageGate: React.FC<{ children: React.ReactNode; onClose?: () => void }> = ({ children, onClose }) => {
  const [needed, setNeeded] = useState(() => !hasChosenLanguage());
  if (needed) return <LanguageModal onDone={() => setNeeded(false)} onClose={onClose} />;
  return <>{children}</>;
};

/** A globe button (showing the current language) that opens a small language menu. */
export const LanguageButton: React.FC<{ className?: string; buttonClassName?: string; dropUp?: boolean }> = ({
  className = '',
  buttonClassName = 'border border-slate-300 bg-white/80 text-slate-800 hover:bg-white',
  dropUp = false,
}) => {
  const lang = useLanguage();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={boxRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        title="Change language"
        className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors ${buttonClassName}`}
      >
        <Globe className="w-4 h-4" />
        <span translate="no">{current.nativeName}</span>
      </button>
      {open && (
        <div className={`absolute right-0 z-[110] w-80 max-w-[90vw] rounded-2xl bg-white border border-slate-200 shadow-2xl p-3 ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          <LanguageGrid
            compact
            selected={lang}
            suggested={null}
            onPick={(code) => {
              void setLanguage(code);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
