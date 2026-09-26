import React from 'react';

// Light-theme backdrop: a warm blush / peach gradient with soft glowing bokeh
// lights. Rendered inside each app's FloralGoldBackground and shown only under
// html[data-theme="light"] (the dark theme keeps its wine floral backdrop).
// Colours are inline on purpose — Tailwind colour classes here would be
// remapped by the generated light theme.

// Soft out-of-focus light circles. `edge` ones are larger and brighter, like
// the glow around the frame in the design; the rest are small and faint.
const BOKEH: { top: string; left: string; size: number; op: number; tone: string }[] = [
  { top: '4%', left: '2%', size: 120, op: 0.55, tone: '255,244,236' },
  { top: '28%', left: '-3%', size: 90, op: 0.5, tone: '255,238,228' },
  { top: '62%', left: '1%', size: 140, op: 0.45, tone: '255,240,232' },
  { top: '86%', left: '8%', size: 80, op: 0.5, tone: '255,246,240' },
  { top: '6%', left: '88%', size: 130, op: 0.5, tone: '255,242,234' },
  { top: '38%', left: '95%', size: 100, op: 0.5, tone: '255,238,230' },
  { top: '70%', left: '90%', size: 150, op: 0.45, tone: '255,244,238' },
  { top: '92%', left: '70%', size: 90, op: 0.45, tone: '255,240,232' },
  { top: '14%', left: '30%', size: 36, op: 0.35, tone: '255,250,246' },
  { top: '48%', left: '62%', size: 28, op: 0.3, tone: '255,250,246' },
  { top: '76%', left: '40%', size: 40, op: 0.3, tone: '255,248,242' },
  { top: '22%', left: '74%', size: 24, op: 0.35, tone: '255,250,246' },
];

// Micro-delicate rising Magizham-Poo (மகிழம்பூ) blossoms (10px–15px),
// luminous rising 24K gold bokeh pearls (6px–13px), and tiny 4-point sparkles.
const RISING_MAGIZHAM_PARTICLES: {
  left: string;
  top: string;
  size: number;
  dur: number;
  delay: number;
  kind: 'flower' | 'bokeh' | 'sparkle';
}[] = [
  // Micro-delicate Rising Magizham-Poo Blossoms (10px–15px)
  { left: '5%',  top: '78%', size: 12, dur: 8.6, delay: 0.0, kind: 'flower' },
  { left: '12%', top: '86%', size: 10, dur: 7.9, delay: 1.4, kind: 'flower' },
  { left: '19%', top: '64%', size: 13, dur: 9.2, delay: 0.7, kind: 'flower' },
  { left: '27%', top: '82%', size: 11, dur: 8.3, delay: 2.2, kind: 'flower' },
  { left: '35%', top: '74%', size: 12, dur: 8.9, delay: 1.1, kind: 'flower' },
  { left: '44%', top: '88%', size: 10, dur: 7.8, delay: 0.4, kind: 'flower' },
  { left: '53%', top: '79%', size: 13, dur: 9.1, delay: 1.8, kind: 'flower' },
  { left: '62%', top: '70%', size: 11, dur: 8.4, delay: 0.9, kind: 'flower' },
  { left: '71%', top: '85%', size: 12, dur: 8.7, delay: 2.4, kind: 'flower' },
  { left: '79%', top: '68%', size: 10, dur: 8.1, delay: 0.5, kind: 'flower' },
  { left: '87%', top: '80%', size: 13, dur: 9.0, delay: 1.6, kind: 'flower' },
  { left: '94%', top: '75%', size: 11, dur: 8.2, delay: 2.0, kind: 'flower' },

  // Second upper-mid tier of Micro Magizham-Poo for tall viewports
  { left: '8%',  top: '42%', size: 11, dur: 8.5, delay: 1.2, kind: 'flower' },
  { left: '24%', top: '36%', size: 10, dur: 7.7, delay: 2.5, kind: 'flower' },
  { left: '76%', top: '38%', size: 11, dur: 8.3, delay: 0.8, kind: 'flower' },
  { left: '91%', top: '44%', size: 10, dur: 7.9, delay: 1.9, kind: 'flower' },

  // Luminous Rising 24K Gold Bokeh Orbs (5px–12px glowing golden pearls)
  { left: '7%',  top: '88%', size: 9,  dur: 6.8, delay: 0.3, kind: 'bokeh' },
  { left: '11%', top: '58%', size: 6,  dur: 6.2, delay: 1.7, kind: 'bokeh' },
  { left: '16%', top: '76%', size: 11, dur: 7.5, delay: 0.9, kind: 'bokeh' },
  { left: '22%', top: '90%', size: 7,  dur: 6.5, delay: 2.3, kind: 'bokeh' },
  { left: '31%', top: '66%', size: 10, dur: 7.2, delay: 0.2, kind: 'bokeh' },
  { left: '38%', top: '86%', size: 6,  dur: 6.4, delay: 1.5, kind: 'bokeh' },
  { left: '48%', top: '78%', size: 11, dur: 7.6, delay: 0.6, kind: 'bokeh' },
  { left: '57%', top: '62%', size: 7,  dur: 6.9, delay: 2.1, kind: 'bokeh' },
  { left: '65%', top: '88%', size: 10, dur: 7.3, delay: 1.2, kind: 'bokeh' },
  { left: '74%', top: '80%', size: 8,  dur: 6.7, delay: 0.5, kind: 'bokeh' },
  { left: '83%', top: '65%', size: 11, dur: 7.4, delay: 1.7, kind: 'bokeh' },
  { left: '89%', top: '89%', size: 7,  dur: 6.3, delay: 2.6, kind: 'bokeh' },
  { left: '95%', top: '62%', size: 9,  dur: 7.0, delay: 0.9, kind: 'bokeh' },
  { left: '15%', top: '32%', size: 8,  dur: 6.6, delay: 1.1, kind: 'bokeh' },
  { left: '42%', top: '30%', size: 7,  dur: 6.4, delay: 2.0, kind: 'bokeh' },
  { left: '68%', top: '34%', size: 9,  dur: 6.9, delay: 0.4, kind: 'bokeh' },
  { left: '85%', top: '28%', size: 7,  dur: 6.5, delay: 1.4, kind: 'bokeh' },

  // Tiny 4-Point Diamond Gold Sparkles (7px–9px)
  { left: '17%', top: '48%', size: 8,  dur: 6.5, delay: 1.0, kind: 'sparkle' },
  { left: '39%', top: '44%', size: 7,  dur: 6.0, delay: 0.4, kind: 'sparkle' },
  { left: '63%', top: '46%', size: 8,  dur: 6.6, delay: 1.5, kind: 'sparkle' },
  { left: '84%', top: '50%', size: 7,  dur: 6.2, delay: 2.2, kind: 'sparkle' },
];

export function BlushBackground() {
  return (
    <div className="blush-bg absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Warm blush base: peach at the edges, soft pink-cream in the middle */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 65% at 50% 40%, #fbeff0 0%, #f8e4e2 45%, #f3d2c6 80%, #eec3b3 100%)',
        }}
      />
      {/* Gentle warm glows */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 45% 35% at 12% 10%, rgba(255, 214, 190, 0.55), transparent 70%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 45% 40% at 92% 88%, rgba(250, 200, 185, 0.5), transparent 70%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 35% at 55% 0%, rgba(255, 246, 240, 0.7), transparent 70%)' }} />

      {/* Shared SVG Symbols for Micro Magizham-Poo (மகிழம்பூ) & Tiny Gold Sparkle */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <g id="mp-magizham-micro">
            <circle cx="20" cy="20" r="15" fill="#FFE680" opacity="0.55" />
            <g fill="#FFFDF8" stroke="#D9A326" strokeWidth="1.1">
              <path d="M20,3 Q23,13 20,20 Q17,13 20,3 Z" />
              <path d="M20,37 Q23,27 20,20 Q17,27 20,37 Z" />
              <path d="M3,20 Q13,23 20,20 Q13,17 3,20 Z" />
              <path d="M37,20 Q27,23 20,20 Q27,17 37,20 Z" />
              <path d="M8,8 Q16,13 20,20 Q13,16 8,8 Z" />
              <path d="M32,32 Q24,27 20,20 Q27,24 32,32 Z" />
              <path d="M32,8 Q27,16 20,20 Q24,13 32,8 Z" />
              <path d="M8,32 Q13,24 20,20 Q16,27 8,32 Z" />
            </g>
            <g fill="#FFF0B8" stroke="#C8921E" strokeWidth="0.8" transform="rotate(22.5 20 20)">
              <path d="M20,6 Q22.5,14 20,20 Q17.5,14 20,6 Z" />
              <path d="M20,34 Q22.5,26 20,20 Q17.5,26 20,34 Z" />
              <path d="M6,20 Q14,22.5 20,20 Q14,17.5 6,20 Z" />
              <path d="M34,20 Q26,22.5 20,20 Q26,17.5 34,20 Z" />
            </g>
            <circle cx="20" cy="20" r="4.8" fill="#F59E0B" stroke="#FFFDF8" strokeWidth="1" />
            <circle cx="20" cy="20" r="1.8" fill="#7A1432" />
          </g>
          <g id="mp-gold-sparkle">
            <polygon points="10,0 12.2,7.8 20,10 12.2,12.2 10,20 7.8,12.2 0,10 7.8,7.8" fill="#FFF7BD" stroke="#D49B27" strokeWidth="0.8" />
          </g>
        </defs>
      </svg>

      {/* Soft ambient background bokeh lights */}
      {BOKEH.map((b, i) => (
        <span
          key={`bokeh-${i}`}
          className="absolute rounded-full animate-pulse"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            opacity: b.op,
            background: `radial-gradient(circle, rgba(${b.tone},0.95) 0%, rgba(${b.tone},0.35) 45%, rgba(${b.tone},0) 70%)`,
            filter: 'blur(2px)',
            animationDuration: `${6 + (i % 5)}s`,
            animationDelay: `${(i % 4) * 0.9}s`,
          }}
        />
      ))}

      {/* Rising Micro-Delicate Magizham-Poo Blossoms & Luminous 24K Gold Bokeh Orbs */}
      {RISING_MAGIZHAM_PARTICLES.map((p, idx) => {
        if (p.kind === 'bokeh') {
          return (
            <span
              key={`mp-part-${idx}`}
              className="mp-rising-bokeh absolute rounded-full"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                background:
                  'radial-gradient(circle at 35% 35%, #FFFDF0 0%, #FFE47A 45%, #E5A922 80%, rgba(229, 169, 34, 0) 100%)',
                boxShadow: '0 0 10px 2px rgba(255, 215, 70, 0.65)',
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          );
        }
        return (
          <span
            key={`mp-part-${idx}`}
            className="mp-rising-blossom absolute"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          >
            <svg
              viewBox={p.kind === 'flower' ? '0 0 40 40' : '0 0 20 20'}
              width={p.size}
              height={p.size}
            >
              <use href={p.kind === 'flower' ? '#mp-magizham-micro' : '#mp-gold-sparkle'} />
            </svg>
          </span>
        );
      })}
    </div>
  );
}

