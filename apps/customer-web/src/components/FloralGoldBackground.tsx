import React from 'react';

/**
 * FloralGoldBackground
 * Reusable decorative backdrop — deep wine/burgundy base with shimmering
 * rose-gold floral corner ornaments, twinkling star sparkles, drifting
 * hearts, falling confetti, and soft bokeh glow. Drop this as the first
 * child of any `relative overflow-hidden` section.
 */
export const FloralGoldBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Base deep wine/burgundy gradient wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, #5c1030 0%, #2a0a1c 45%, #1a0a14 75%, #12060b 100%)',
        }}
      />

      {/* Soft rose-gold glow, top center */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-[#d4af37]/[0.16] blur-[130px] rounded-full" />

      {/* Soft rose glow, lower right */}
      <div className="absolute bottom-0 right-[8%] w-[500px] h-[300px] bg-[#e85d8a]/[0.18] blur-[120px] rounded-full" />

      {/* Soft wine glow, lower left */}
      <div className="absolute bottom-0 left-[4%] w-[380px] h-[260px] bg-[#b8336a]/[0.18] blur-[110px] rounded-full" />

      {/* Extra rose-gold glow, mid-right — keeps the sparkle layer from reading flat on tall pages */}
      <div className="absolute top-1/3 right-0 w-[420px] h-[420px] bg-[#f0c869]/[0.08] blur-[140px] rounded-full" />

      {/* Corner floral ornament — top left */}
      <svg
        className="absolute -top-6 -left-6 w-40 h-40 sm:w-56 sm:h-56 opacity-[0.26]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <FloralMotif />
      </svg>

      {/* Corner floral ornament — top right (mirrored) */}
      <svg
        className="absolute -top-6 -right-6 w-40 h-40 sm:w-56 sm:h-56 opacity-[0.26] -scale-x-100"
        viewBox="0 0 200 200"
        fill="none"
      >
        <FloralMotif />
      </svg>

      {/* Corner floral ornament — bottom left (flipped) */}
      <svg
        className="absolute -bottom-10 -left-6 w-36 h-36 sm:w-52 sm:h-52 opacity-[0.18] -scale-y-100"
        viewBox="0 0 200 200"
        fill="none"
      >
        <FloralMotif />
      </svg>

      {/* Corner floral ornament — bottom right (flipped + mirrored) */}
      <svg
        className="absolute -bottom-10 -right-6 w-36 h-36 sm:w-52 sm:h-52 opacity-[0.18] -scale-x-100 -scale-y-100"
        viewBox="0 0 200 200"
        fill="none"
      >
        <FloralMotif />
      </svg>

      {/* Drifting hearts — a light, explicit romance cue */}
      <div className="absolute inset-0">
        {HEARTS.map((h, i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className="absolute animate-float-slow"
            style={{
              top: h.top,
              left: h.left,
              width: h.size,
              height: h.size,
              opacity: h.opacity,
              animationDuration: h.duration,
              animationDelay: h.delay,
            }}
          >
            <path
              d="M12 21s-7.5-4.6-10-9.1C.5 8.4 2.3 5 5.8 5c2 0 3.6 1.1 4.2 2.6C10.6 6.1 12.2 5 14.2 5c3.5 0 5.3 3.4 3.8 6.9C19.5 16.4 12 21 12 21z"
              fill={h.tone}
            />
          </svg>
        ))}
      </div>

      {/* Twinkling star sparkles — crisp glints layered over the soft bokeh glow below */}
      <div className="absolute inset-0">
        {STARS.map((s, i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className="absolute animate-twinkle"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animationDuration: s.duration,
              animationDelay: s.delay,
            }}
          >
            <path
              d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z"
              fill={s.tone}
            />
          </svg>
        ))}
      </div>

      {/* Scattered rose-gold bokeh sparkles */}
      <div className="absolute inset-0">
        {BOKEH_DOTS.map((dot, i) => (
          <span
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
              background:
                dot.tone === 'gold'
                  ? 'radial-gradient(circle, #f0c869 0%, transparent 70%)'
                  : 'radial-gradient(circle, #e85d8a 0%, transparent 70%)',
              opacity: dot.opacity,
              animationDuration: dot.duration,
              animationDelay: dot.delay,
              filter: 'blur(1px)',
            }}
          />
        ))}
      </div>

      {/* Falling confetti flecks — the "celebration" layer */}
      <div className="absolute inset-0">
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className={`absolute animate-confetti-fall ${c.round ? 'rounded-full' : 'rounded-[1px]'}`}
            style={{
              top: c.top,
              left: c.left,
              width: c.w,
              height: c.h,
              background: c.tone,
              opacity: c.opacity,
              animationDuration: c.duration,
              animationDelay: c.delay,
            }}
          />
        ))}
      </div>

      {/* Subtle bottom vine line */}
      <svg
        className="absolute bottom-0 left-0 w-full h-16 opacity-[0.18]"
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0,40 Q150,10 300,35 T600,30 T900,38 T1200,25"
          stroke="#c9a648"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};

const BOKEH_DOTS = [
  { top: '12%', left: '8%', size: '6px', tone: 'gold', opacity: 0.55, duration: '4s', delay: '0s' },
  { top: '22%', left: '88%', size: '5px', tone: 'rose', opacity: 0.45, duration: '5s', delay: '0.5s' },
  { top: '38%', left: '15%', size: '4px', tone: 'gold', opacity: 0.5, duration: '3.5s', delay: '1s' },
  { top: '55%', left: '92%', size: '7px', tone: 'gold', opacity: 0.45, duration: '4.5s', delay: '0.2s' },
  { top: '68%', left: '6%', size: '5px', tone: 'rose', opacity: 0.4, duration: '5.5s', delay: '1.5s' },
  { top: '80%', left: '78%', size: '4px', tone: 'gold', opacity: 0.55, duration: '4s', delay: '0.8s' },
  { top: '10%', left: '50%', size: '4px', tone: 'rose', opacity: 0.35, duration: '6s', delay: '2s' },
  { top: '90%', left: '40%', size: '5px', tone: 'gold', opacity: 0.45, duration: '4.2s', delay: '1.2s' },
  { top: '30%', left: '35%', size: '5px', tone: 'gold', opacity: 0.4, duration: '4.8s', delay: '0.3s' },
  { top: '46%', left: '60%', size: '4px', tone: 'rose', opacity: 0.4, duration: '5.2s', delay: '1.8s' },
  { top: '18%', left: '70%', size: '6px', tone: 'gold', opacity: 0.5, duration: '3.8s', delay: '0.6s' },
  { top: '72%', left: '52%', size: '5px', tone: 'rose', opacity: 0.4, duration: '5.8s', delay: '2.4s' },
  { top: '85%', left: '20%', size: '4px', tone: 'gold', opacity: 0.45, duration: '4.6s', delay: '1s' },
  { top: '5%', left: '25%', size: '5px', tone: 'rose', opacity: 0.4, duration: '5s', delay: '0.9s' },
] as const;

const STARS = [
  { top: '14%', left: '30%', size: '10px', tone: '#f0c869', duration: '2.6s', delay: '0s' },
  { top: '26%', left: '75%', size: '8px', tone: '#e85d8a', duration: '3.2s', delay: '0.8s' },
  { top: '50%', left: '10%', size: '9px', tone: '#f0c869', duration: '2.8s', delay: '1.4s' },
  { top: '62%', left: '90%', size: '11px', tone: '#f2a6c4', duration: '3s', delay: '0.4s' },
  { top: '76%', left: '35%', size: '8px', tone: '#f0c869', duration: '2.4s', delay: '2s' },
  { top: '8%', left: '58%', size: '9px', tone: '#e85d8a', duration: '3.4s', delay: '1.1s' },
  { top: '40%', left: '48%', size: '7px', tone: '#f0c869', duration: '2.6s', delay: '1.8s' },
  { top: '90%', left: '65%', size: '10px', tone: '#f2a6c4', duration: '3.1s', delay: '0.2s' },
] as const;

const HEARTS = [
  { top: '16%', left: '18%', size: '14px', tone: '#f2a6c4', opacity: 0.28, duration: '9s', delay: '0s' },
  { top: '64%', left: '84%', size: '18px', tone: '#e85d8a', opacity: 0.22, duration: '11s', delay: '1.5s' },
  { top: '46%', left: '6%', size: '12px', tone: '#f0c869', opacity: 0.25, duration: '8s', delay: '3s' },
  { top: '30%', left: '70%', size: '10px', tone: '#f2a6c4', opacity: 0.3, duration: '10s', delay: '2s' },
  { top: '82%', left: '28%', size: '13px', tone: '#e85d8a', opacity: 0.24, duration: '9.5s', delay: '4s' },
  { top: '8%', left: '45%', size: '11px', tone: '#f2a6c4', opacity: 0.26, duration: '10.5s', delay: '1s' },
  { top: '56%', left: '38%', size: '9px', tone: '#f0c869', opacity: 0.22, duration: '8.5s', delay: '2.6s' },
] as const;

const CONFETTI = [
  { top: '5%', left: '25%', w: '6px', h: '3px', tone: '#f0c869', opacity: 0.4, duration: '12s', delay: '0s', round: false },
  { top: '8%', left: '60%', w: '5px', h: '5px', tone: '#e85d8a', opacity: 0.35, duration: '14s', delay: '2s', round: true },
  { top: '2%', left: '80%', w: '6px', h: '3px', tone: '#d4af37', opacity: 0.35, duration: '13s', delay: '4s', round: false },
  { top: '6%', left: '10%', w: '4px', h: '4px', tone: '#f2a6c4', opacity: 0.4, duration: '15s', delay: '1s', round: true },
  { top: '10%', left: '45%', w: '5px', h: '3px', tone: '#f0c869', opacity: 0.32, duration: '11s', delay: '3s', round: false },
  { top: '3%', left: '35%', w: '5px', h: '5px', tone: '#e85d8a', opacity: 0.3, duration: '16s', delay: '5s', round: true },
  { top: '7%', left: '90%', w: '6px', h: '3px', tone: '#c9a648', opacity: 0.35, duration: '12.5s', delay: '2.5s', round: false },
  { top: '1%', left: '55%', w: '4px', h: '4px', tone: '#f2a6c4', opacity: 0.35, duration: '17s', delay: '6s', round: true },
  { top: '9%', left: '15%', w: '5px', h: '3px', tone: '#d4af37', opacity: 0.3, duration: '13.5s', delay: '3.5s', round: false },
  { top: '4%', left: '70%', w: '5px', h: '5px', tone: '#f0c869', opacity: 0.35, duration: '14.5s', delay: '1.2s', round: true },
] as const;

/** Hand-drawn-style rose bloom with curling vine + leaves, used at each corner */
const FloralMotif: React.FC = () => (
  <g>
    {/* Vine stem */}
    <path
      d="M10,190 C40,160 30,120 55,95 C75,75 60,45 85,20"
      stroke="#c9a648"
      strokeWidth="2"
      fill="none"
    />
    {/* Leaves along vine */}
    <path d="M35,150 C50,145 55,160 45,172 C32,168 28,158 35,150 Z" fill="#8f2352" />
    <path d="M55,100 C72,98 75,115 62,125 C50,120 48,108 55,100 Z" fill="#b8336a" />
    <path d="M70,55 C86,50 92,65 80,78 C68,74 64,62 70,55 Z" fill="#8f2352" />

    {/* Rose bloom at vine tip — rose-pink petals, gold heart */}
    <g transform="translate(85,20)">
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="0"
          cy="-13"
          rx="6"
          ry="11"
          fill="#e85d8a"
          fillOpacity="0.8"
          transform={`rotate(${angle})`}
        />
      ))}
      <circle r="6" fill="#d4af37" />
    </g>

    {/* Secondary smaller gold flower mid-vine */}
    <g transform="translate(45,130)">
      <circle r="4" fill="#c9a648" />
      {[0, 90, 180, 270].map((angle) => (
        <ellipse
          key={angle}
          cx="0"
          cy="-8"
          rx="4"
          ry="7"
          fill="#d4af37"
          fillOpacity="0.7"
          transform={`rotate(${angle})`}
        />
      ))}
    </g>
  </g>
);
