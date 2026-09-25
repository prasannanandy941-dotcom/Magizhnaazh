import React from 'react';

// Light-theme backdrop with an auspicious Indian celebration feel: a marigold +
// mango-leaf toran swagged across the top, hanging marigold strings down the
// sides, faint gold rangoli mandalas in the corners and a soft kolam dot
// pattern over warm ivory. Rendered next to each app's dark FloralGoldBackground
// and only shown under html[data-theme="light"] (see light-theme.css).
// Colours are inline SVG fills on purpose — Tailwind colour classes here would
// be remapped by the generated light theme.

const GOLD = '#c9a13b';

function Mandala({ size }: { size: number }) {
  const petals = (count: number, r: number, len: number, w: number) =>
    Array.from({ length: count }, (_, i) => (
      <ellipse key={i} cx={0} cy={-r} rx={w} ry={len} transform={`rotate(${(360 / count) * i})`} />
    ));
  const dots = (count: number, r: number, d: number) =>
    Array.from({ length: count }, (_, i) => (
      <circle key={i} cx={0} cy={-r} r={d} transform={`rotate(${(360 / count) * i + 180 / count})`} />
    ));
  return (
    <svg width={size} height={size} viewBox="-200 -200 400 400" aria-hidden="true">
      <g fill="none" stroke={GOLD} strokeWidth={1.4}>
        <circle r={30} />
        <circle r={62} />
        <circle r={118} strokeDasharray="2 6" />
        <circle r={150} />
        <circle r={190} strokeDasharray="1 8" />
        {petals(8, 46, 16, 7)}
        {petals(16, 90, 26, 9)}
        {petals(24, 134, 14, 5)}
        {petals(32, 170, 18, 6)}
      </g>
      <g fill={GOLD}>
        {dots(16, 62, 2.4)}
        {dots(24, 118, 2)}
        {dots(32, 150, 2.2)}
        <circle r={8} />
      </g>
    </svg>
  );
}

export function AuspiciousBackground() {
  return (
    <div className="auspicious-bg absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Warm ivory base with saffron and rose glows */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(251, 191, 36, 0.16), transparent 70%),' +
            'radial-gradient(ellipse 60% 50% at 100% 100%, rgba(232, 93, 138, 0.10), transparent 70%),' +
            'radial-gradient(ellipse 55% 45% at 0% 70%, rgba(249, 115, 22, 0.08), transparent 70%),' +
            'linear-gradient(180deg, #fffaf1 0%, #fdf6f3 55%, #fbf1f5 100%)',
        }}
      />

      {/* Kolam dot pattern */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.35 }}>
        <defs>
          <pattern id="ausp-kolam" width="56" height="56" patternUnits="userSpaceOnUse">
            <circle cx="28" cy="28" r="1.6" fill={GOLD} />
            <circle cx="0" cy="0" r="1.2" fill={GOLD} />
            <circle cx="56" cy="0" r="1.2" fill={GOLD} />
            <circle cx="0" cy="56" r="1.2" fill={GOLD} />
            <circle cx="56" cy="56" r="1.2" fill={GOLD} />
            <path d="M28 20 L36 28 L28 36 L20 28 Z" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ausp-kolam)" />
      </svg>

      {/* Corner rangoli mandalas */}
      <div className="absolute -top-40 -right-40" style={{ opacity: 0.22 }}>
        <Mandala size={520} />
      </div>
      <div className="absolute -bottom-48 -left-44" style={{ opacity: 0.2 }}>
        <Mandala size={560} />
      </div>

      {/* Marigold + mango-leaf toran across the top */}
      {/* Hung just below the navbars (h-16 to h-20) so it isn't hidden behind them. */}
      <svg className="absolute left-0 w-full" height="150" style={{ top: 80 }}>
        <defs>
          <g id="ausp-marigold">
            <circle r="9" fill="#f59e0b" />
            {Array.from({ length: 10 }, (_, i) => (
              <circle key={i} cx={0} cy={-6.5} r={3.6} fill={i % 2 ? '#fb923c' : '#f97316'} transform={`rotate(${i * 36})`} />
            ))}
            <circle r="3.4" fill="#fcd34d" />
          </g>
          <g id="ausp-leaf">
            <path d="M0 0 C 7 8, 7 22, 0 32 C -7 22, -7 8, 0 0 Z" fill="#5b8a1f" />
            <path d="M0 2 L0 30" stroke="#3f6212" strokeWidth="0.9" />
          </g>
          <pattern id="ausp-toran" width="132" height="150" patternUnits="userSpaceOnUse">
            <path d="M0 8 Q 66 58 132 8" fill="none" stroke="#b45309" strokeWidth="1.4" />
            {/* Mango leaves and a dangling marigold at the bottom of the swag */}
            <g transform="translate(66 34)">
              <use href="#ausp-leaf" transform="rotate(22)" />
              <use href="#ausp-leaf" transform="rotate(-22)" />
              <use href="#ausp-leaf" />
            </g>
            <path d="M66 36 L66 74" stroke="#b45309" strokeWidth="0.8" />
            <g transform="translate(66 82)"><use href="#ausp-marigold" /></g>
            {/* Marigolds strung along the swag curve: y = 8 + 100·t·(1−t) */}
            {[0, 0.16, 0.32, 0.5, 0.68, 0.84, 1].map((t, i) => (
              <g key={i} transform={`translate(${132 * t} ${8 + 100 * t * (1 - t)}) scale(${t === 0.5 ? 1 : 0.78})`}>
                <use href="#ausp-marigold" />
              </g>
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="150" fill="url(#ausp-toran)" />
      </svg>

      {/* Hanging marigold strings down the sides (tablet/desktop) */}
      {(['left', 'right'] as const).map((side) => (
        <svg
          key={side}
          className="absolute top-24 bottom-0 hidden md:block"
          width="30"
          style={{ [side]: 18, height: 'calc(100% - 6rem)', opacity: 0.75 } as React.CSSProperties}
        >
          <defs>
            <pattern id={`ausp-lari-${side}`} width="30" height="34" patternUnits="userSpaceOnUse">
              <line x1="15" y1="0" x2="15" y2="34" stroke="#b45309" strokeWidth="0.8" />
              <circle cx="15" cy="17" r="8" fill="#f59e0b" />
              {Array.from({ length: 8 }, (_, i) => (
                <circle key={i} cx={15} cy={11} r={3.2} fill={i % 2 ? '#fdba74' : '#fb923c'} transform={`rotate(${i * 45} 15 17)`} />
              ))}
              <circle cx="15" cy="17" r="3" fill="#fde68a" />
            </pattern>
          </defs>
          <rect width="30" height="100%" fill={`url(#ausp-lari-${side})`} />
        </svg>
      ))}
    </div>
  );
}
