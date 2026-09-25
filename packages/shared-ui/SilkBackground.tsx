import React from 'react';

// Light-theme backdrop: flowing pastel silk (lavender, blush, cream, mint), raised
// white botanical line-art and soft gold sparkles. Rendered inside each app's
// FloralGoldBackground and shown only under html[data-theme="light"] (the dark
// theme keeps its wine/floral backdrop). Colours are inline on purpose — Tailwind
// colour classes here would be remapped by the generated light theme.

// Raised ("embossed") line-art: each path is drawn twice — a soft shadow
// offset down-right, then a bright white highlight on top.
function Emboss({ d, width = 1.6 }: { d: string; width?: number }) {
  return (
    <>
      <path d={d} fill="none" stroke="rgba(120, 88, 80, 0.22)" strokeWidth={width + 0.6} strokeLinecap="round" transform="translate(1.2 1.4)" />
      <path d={d} fill="none" stroke="rgba(255, 255, 255, 0.95)" strokeWidth={width} strokeLinecap="round" />
    </>
  );
}

// A leaf shape at (x, y), pointing along `angle` degrees, with a centre vein.
function leaf(x: number, y: number, angle: number, len: number, w: number): string[] {
  const rad = (angle * Math.PI) / 180;
  const tx = x + Math.cos(rad) * len;
  const ty = y + Math.sin(rad) * len;
  const nx = -Math.sin(rad) * w;
  const ny = Math.cos(rad) * w;
  const mx = (x + tx) / 2;
  const my = (y + ty) / 2;
  return [
    `M${x},${y} Q${mx + nx},${my + ny} ${tx},${ty} Q${mx - nx},${my - ny} ${x},${y}`,
    `M${x},${y} L${(x + tx * 3) / 4},${(y + ty * 3) / 4}`,
  ];
}

// A five-petal blossom centred at (cx, cy).
function blossom(cx: number, cy: number, r: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = ((i * 72 - 90) * Math.PI) / 180;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    const lx = cx + Math.cos(a - 0.5) * r * 0.55;
    const ly = cy + Math.sin(a - 0.5) * r * 0.55;
    const rx = cx + Math.cos(a + 0.5) * r * 0.55;
    const ry = cy + Math.sin(a + 0.5) * r * 0.55;
    out.push(`M${cx},${cy} Q${lx},${ly} ${px},${py} Q${rx},${ry} ${cx},${cy}`);
  }
  out.push(`M${cx - 2},${cy} a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0`);
  return out;
}

// A curving branch with leaves along it and a couple of blossoms.
function branchPaths(): string[] {
  const paths: string[] = ['M20,380 C 90,300 150,250 230,210 S 360,140 400,60'];
  const pts: [number, number, number][] = [
    [60, 336, -150], [60, 336, -40], [110, 285, -160], [110, 285, -30], [165, 245, -140],
    [165, 245, -20], [230, 210, -120], [230, 210, 10], [290, 175, -140], [300, 170, -15],
    [350, 125, -110], [355, 120, 0],
  ];
  for (const [x, y, a] of pts) paths.push(...leaf(x, y, a, 62, 17));
  // tendril curls
  paths.push('M140,262 C 120,230 150,215 160,232 C 168,246 150,252 146,242');
  paths.push('M320,150 C 330,118 362,122 356,142 C 352,154 338,150 340,142');
  paths.push(...blossom(400, 60, 26), ...blossom(250, 118, 18), ...blossom(95, 250, 17));
  return paths;
}

const BRANCH = branchPaths();

const SPARKLES: { top: string; left: string; size: number; op: number }[] = [
  { top: '12%', left: '16%', size: 14, op: 0.7 }, { top: '9%', left: '58%', size: 10, op: 0.6 },
  { top: '22%', left: '86%', size: 16, op: 0.75 }, { top: '34%', left: '9%', size: 9, op: 0.55 },
  { top: '41%', left: '72%', size: 12, op: 0.6 }, { top: '55%', left: '35%', size: 10, op: 0.5 },
  { top: '63%', left: '90%', size: 13, op: 0.65 }, { top: '72%', left: '12%', size: 12, op: 0.6 },
  { top: '80%', left: '52%', size: 9, op: 0.5 }, { top: '88%', left: '78%', size: 14, op: 0.6 },
  { top: '18%', left: '38%', size: 8, op: 0.5 }, { top: '48%', left: '55%', size: 7, op: 0.45 },
];

export function SilkBackground() {
  return (
    <div className="silk-bg absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Flowing silk waves */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="silk-cream" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbf4ec" />
            <stop offset="1" stopColor="#f6ede3" />
          </linearGradient>
          <linearGradient id="silk-lav" x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0" stopColor="#cfc0e3" />
            <stop offset="1" stopColor="#e7dcef" />
          </linearGradient>
          <linearGradient id="silk-pink" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e7b3c1" />
            <stop offset="0.55" stopColor="#f0cdd3" />
            <stop offset="1" stopColor="#f6dfd9" />
          </linearGradient>
          <linearGradient id="silk-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f5e3c4" />
            <stop offset="1" stopColor="#fbf1e2" />
          </linearGradient>
          <linearGradient id="silk-mint" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#d9e8dc" />
            <stop offset="1" stopColor="#c7ddcd" />
          </linearGradient>
          <filter id="silk-soft" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="silk-sheen" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
        </defs>
        <rect width="1440" height="900" fill="url(#silk-cream)" />
        <g filter="url(#silk-soft)">
          <path d="M0,0 H760 C 620,110 420,150 0,250 Z" fill="url(#silk-lav)" />
          <path d="M0,150 C 280,60 520,250 820,165 C 1080,90 1260,140 1440,70 V 330 C 1210,300 1010,430 730,400 C 470,370 260,280 0,350 Z" fill="url(#silk-pink)" opacity="0.9" />
          <path d="M0,350 C 260,280 470,370 730,400 C 1010,430 1210,300 1440,330 V 520 C 1180,470 980,600 700,580 C 420,560 240,470 0,520 Z" fill="url(#silk-gold)" opacity="0.85" />
          <path d="M620,900 C 900,720 1150,560 1440,470 V 900 Z" fill="url(#silk-mint)" />
          <path d="M0,640 C 230,590 430,760 720,900 H 0 Z" fill="#efd5d9" opacity="0.8" />
          <path d="M1440,0 H 1100 C 1250,60 1330,120 1440,180 Z" fill="#efe2d6" opacity="0.8" />
        </g>
        {/* Silk sheen highlights along the folds */}
        <g filter="url(#silk-sheen)" fill="none" stroke="#ffffff" strokeLinecap="round">
          <path d="M0,245 C 300,140 520,300 820,200 C 1080,120 1260,170 1440,100" strokeWidth="46" opacity="0.55" />
          <path d="M0,440 C 280,360 480,470 740,490 C 1010,510 1200,390 1440,410" strokeWidth="36" opacity="0.45" />
          <path d="M700,900 C 950,740 1180,610 1440,540" strokeWidth="34" opacity="0.5" />
        </g>
      </svg>

      {/* Raised botanical line-art — bottom left and right side */}
      <svg className="absolute -bottom-10 -left-10 w-72 sm:w-[30rem]" viewBox="-20 -20 460 440" aria-hidden="true">
        {BRANCH.map((d, i) => <Emboss key={i} d={d} width={i === 0 ? 2.8 : 2} />)}
      </svg>
      {/* Right branch only on wider screens, hugging the edge so it never sits under content. */}
      <svg className="absolute top-[42%] -right-24 w-[26rem] -scale-x-100 hidden md:block" viewBox="-20 -20 460 440" aria-hidden="true">
        {BRANCH.map((d, i) => <Emboss key={i} d={d} width={i === 0 ? 2.8 : 2} />)}
      </svg>

      {/* Soft gold sparkles */}
      {SPARKLES.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute animate-twinkle"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.op, animationDuration: `${4 + (i % 4)}s`, animationDelay: `${(i % 5) * 0.7}s` }}
        >
          <path d="M12 0 L13.8 10.2 L24 12 L13.8 13.8 L12 24 L10.2 13.8 L0 12 L10.2 10.2 Z" fill="#cfae5c" />
        </svg>
      ))}
    </div>
  );
}
