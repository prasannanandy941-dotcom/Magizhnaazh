import React, { useMemo } from 'react';

// A lightweight animated backdrop of tiny gold particles that twinkle and
// drift upward — used behind the vendor detail modal + booking panel to give
// them a festive, auspicious shimmer. Pure CSS transforms (GPU-friendly), no
// canvas/JS loop. Sits absolutely inside a `relative` parent; pointer-events
// are disabled so it never blocks clicks.
export function GoldSparkles({ count = 26 }: { count?: number }) {
  // Randomize each particle once so they don't all pulse in sync.
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const size = 1 + Math.random() * 2; // 1–3px (tiny)
        return {
          id: i,
          left: Math.random() * 100, // %
          top: Math.random() * 100, // %
          size,
          duration: 4 + Math.random() * 6, // 4–10s
          delay: Math.random() * 6, // 0–6s
          bright: Math.random() > 0.6,
        };
      }),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="animate-sparkle-drift absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.bright
              ? 'radial-gradient(circle, #fff7e0 0%, #fbbf24 55%, rgba(251,191,36,0) 100%)'
              : 'radial-gradient(circle, #fde68a 0%, rgba(245,158,11,0.55) 60%, rgba(245,158,11,0) 100%)',
            boxShadow: p.bright ? '0 0 3px 0.5px rgba(251,191,36,0.6)' : '0 0 2px 0 rgba(245,158,11,0.4)',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
