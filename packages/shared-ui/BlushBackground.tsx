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

      {/* Bokeh lights */}
      {BOKEH.map((b, i) => (
        <span
          key={i}
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
    </div>
  );
}
