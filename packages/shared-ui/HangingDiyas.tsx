import React from 'react';

// Auspicious hanging decor for the light theme: brass-threaded clay diyas with a
// flickering flame and small temple bells, hanging from the top edge down both
// sides of the page and gently swaying. Only the customer and vendor apps use it
// (not admin). Shown only under html[data-theme="light"] — see .hanging-diyas in
// light-theme.css, which also holds the sway/flicker animations.
// Colours are inline on purpose — Tailwind colour classes here would be
// remapped by the generated light theme.

// True when the site is running inside the Magizhnaazh customer or vendor
// mobile app (a WebView), where the hanging decor is not shown. New app builds
// set a marker before the page loads; builds already installed are recognised
// by the fixed Chrome user-agent string both apps send.
const APP_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';
export function isInsideMobileApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.__MAGIZH_NATIVE_AUTH || w.__MAGIZH_VENDOR_APP) || navigator.userAgent === APP_USER_AGENT;
}

type Item = { kind: 'diya' | 'bell'; length: number; offset: number; delay: number; mobile: boolean };

// Per side: a long diya, a short bell and a medium diya. On phones only the
// small bell shows in each top corner — the long diya threads would run behind
// the hero badge and look tangled.
const ITEMS: Item[] = [
  { kind: 'diya', length: 230, offset: 14, delay: 0, mobile: false },
  { kind: 'bell', length: 140, offset: 44, delay: 0.8, mobile: true },
  { kind: 'diya', length: 330, offset: 74, delay: 1.6, mobile: false },
];

function Diya() {
  return (
    <g>
      {/* flame glow + flickering flame */}
      <circle cx="0" cy="-6" r="16" fill="url(#hd-glow)" className="hd-glow" />
      <path className="hd-flame" d="M0,-16 C 4,-10 5,-5 0,0 C -5,-5 -4,-10 0,-16 Z" fill="url(#hd-flame)" />
      {/* clay lamp with gold rim */}
      <path d="M-15,0 Q0,3 15,0 Q12,11 0,12 Q-12,11 -15,0 Z" fill="#c47a3c" />
      <path d="M-15,0 Q0,3 15,0" fill="none" stroke="#e2b454" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M-9,5 Q0,8 9,5" fill="none" stroke="#a45f2a" strokeWidth="1" opacity=".7" />
      <path d="M-4,12 L4,12 L3,16 L-3,16 Z" fill="#b8923a" />
    </g>
  );
}

function Bell() {
  return (
    <g>
      <circle cx="0" cy="-3" r="2.6" fill="none" stroke="#a8812e" strokeWidth="1.3" />
      <path d="M-9,12 Q-9,0 0,0 Q9,0 9,12 L11,15 L-11,15 Z" fill="url(#hd-brass)" stroke="#9a7428" strokeWidth=".8" />
      <path d="M-11,15 L11,15" stroke="#9a7428" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M-4,4 Q-5,9 -5,12" stroke="#fff3c9" strokeWidth="1.2" fill="none" opacity=".7" strokeLinecap="round" />
      <circle cx="0" cy="18" r="2.2" fill="#9a7428" />
    </g>
  );
}

function Hanging({ item, side }: { item: Item; side: 'left' | 'right' }) {
  const height = item.length + 40;
  return (
    <svg
      className={`hd-item absolute top-0 ${item.mobile ? '' : 'hidden md:block'}`}
      width="40"
      height={height}
      viewBox={`-20 0 40 ${height}`}
      style={{ [side]: item.offset, animationDelay: `${item.delay}s` } as React.CSSProperties}
      aria-hidden="true"
    >
      {/* brass thread with tiny beads */}
      <line x1="0" y1="0" x2="0" y2={item.length - 16} stroke="#b08a34" strokeWidth="1" />
      {[0.35, 0.6, 0.82].map((t) => (
        <circle key={t} cx="0" cy={(item.length - 16) * t} r="2" fill="#d4a53f" />
      ))}
      <g transform={`translate(0 ${item.kind === 'diya' ? item.length : item.length - 14})`}>
        {item.kind === 'diya' ? <Diya /> : <Bell />}
      </g>
    </svg>
  );
}

export function HangingDiyas() {
  return (
    <div className="hanging-diyas absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      <svg width="0" height="0" className="absolute">
        <defs>
          <radialGradient id="hd-glow">
            <stop offset="0" stopColor="#ffd98a" stopOpacity=".85" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hd-flame" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#f07a1a" />
            <stop offset=".55" stopColor="#f9b233" />
            <stop offset="1" stopColor="#fff1b8" />
          </linearGradient>
          <linearGradient id="hd-brass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#b8923a" />
            <stop offset=".45" stopColor="#e6c46a" />
            <stop offset="1" stopColor="#a8812e" />
          </linearGradient>
        </defs>
      </svg>
      {ITEMS.map((item, i) => <Hanging key={`l${i}`} item={item} side="left" />)}
      {ITEMS.map((item, i) => <Hanging key={`r${i}`} item={{ ...item, delay: item.delay + 0.4 }} side="right" />)}
    </div>
  );
}
