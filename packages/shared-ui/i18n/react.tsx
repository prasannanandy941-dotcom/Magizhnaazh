import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
export const LanguageButton: React.FC<{ className?: string; buttonClassName?: string; dropUp?: boolean; hideLabelOnMobile?: boolean }> = ({
  className = '',
  buttonClassName = 'border border-slate-300 bg-white/80 text-slate-800 hover:bg-white',
  dropUp = false,
  hideLabelOnMobile = false,
}) => {
  const lang = useLanguage();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!boxRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const button = buttonRef.current?.getBoundingClientRect();
      const menu = menuRef.current;
      if (!button || !menu) return;

      const margin = 12;
      const gap = 8;
      const width = Math.min(320, window.innerWidth - margin * 2);
      const height = menu.getBoundingClientRect().height;
      const placeAbove = dropUp || (button.bottom + height + gap > window.innerHeight && button.top >= height + gap);
      const top = placeAbove ? button.top - height - gap : button.bottom + gap;
      const left = Math.max(margin, Math.min(button.right - width, window.innerWidth - width - margin));

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, dropUp]);

  return (
    <div ref={boxRef} className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        title="Change language"
        className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors ${buttonClassName}`}
      >
        <Globe className="w-4 h-4 shrink-0" />
        <span translate="no" className={hideLabelOnMobile ? "hidden sm:inline" : undefined}>{current.nativeName}</span>
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[110] w-80 max-w-[calc(100vw-24px)] max-h-[75vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-3"
          style={{
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            visibility: position ? 'visible' : 'hidden',
          }}
        >
          <LanguageGrid
            compact
            selected={lang}
            suggested={null}
            onPick={(code) => {
              void setLanguage(code);
              setOpen(false);
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
};
