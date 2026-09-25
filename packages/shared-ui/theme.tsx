import React, { useEffect, useState } from 'react';

// Light/dark theme shared by the customer, vendor and admin web apps. The
// theme is applied as <html data-theme="light|dark">; the light colours live in
// ./light-theme.css. Each person's own choice (per app, per device) wins over
// any site-wide default.

export type Theme = 'light' | 'dark';
export type ThemeApp = 'customer' | 'vendor' | 'admin';

const choiceKey = (app: ThemeApp) => `magizhnaazh_theme_choice_${app}`;

export function getThemeChoice(app: ThemeApp): Theme | null {
  try {
    const v = localStorage.getItem(choiceKey(app));
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

// Apply a site-wide default only when this person hasn't picked a theme.
export function applyDefaultTheme(app: ThemeApp, fallback: Theme) {
  applyTheme(getThemeChoice(app) || fallback);
}

export function ThemeToggle({ app, className = '' }: { app: ThemeApp; className?: string }) {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  // Stay in sync if something else (e.g. a site-wide default) changes the theme.
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(currentTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(choiceKey(app), next); } catch { /* private mode */ }
    setTheme(next);
  };

  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center transition-colors ${
        theme === 'dark'
          ? 'bg-slate-900/60 border-slate-700 text-amber-300 hover:border-amber-400/60'
          : 'bg-white border-slate-300 text-indigo-600 hover:border-indigo-400'
      } ${className}`}
    >
      {theme === 'dark' ? (
        // Sun — tap for light
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Moon — tap for dark
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
