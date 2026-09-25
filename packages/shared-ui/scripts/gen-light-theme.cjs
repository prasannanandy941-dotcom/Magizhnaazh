/*
 * Generates packages/shared-ui/light-theme.css — the light theme for the
 * customer, vendor and admin web apps.
 *
 * The apps are styled dark-first with Tailwind colour utilities (bg-slate-900,
 * text-white, border-[#6b2140]/60 …). Rather than hand-maintaining overrides,
 * this scans every colour utility the apps actually use and emits a light
 * equivalent under html[data-theme="light"]:
 *   - dark surfaces / borders / gradient stops  -> light tints of the same hue
 *   - light text (white, slate-300, pastel accents) -> dark readable tones
 *   - translucent white overlays (bg-white/10)  -> translucent black
 * Solid saturated surfaces (indigo buttons, gold CTAs, …) keep their colour,
 * and text on them keeps its original colour.
 *
 * Re-run after adding new colour classes:  node packages/shared-ui/scripts/gen-light-theme.cjs
 */
const fs = require('fs');
const path = require('path');
const palette = require('tailwindcss/colors');

const ROOT = path.resolve(__dirname, '../../..');
const SCAN_DIRS = ['apps/customer-web/src', 'apps/vendor-web/src', 'apps/admin-web/src', 'packages/shared-ui'];
const OUT = path.resolve(__dirname, '../light-theme.css');
const L = 'html[data-theme="light"]';

// ---- colour helpers -------------------------------------------------------
function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}
const hsl = (h, s, l, a = 1) =>
  a >= 1 ? `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)` : `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${+a.toFixed(3)})`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function resolveColor(name) {
  if (name === 'white') return '#ffffff';
  if (name === 'black') return '#000000';
  const hex = name.match(/^\[(#[0-9a-fA-F]{3,8})\]$/);
  if (hex) return hex[1];
  const m = name.match(/^([a-z]+)-(\d{2,3})$/);
  if (m && palette[m[1]] && palette[m[1]][m[2]]) return palette[m[1]][m[2]];
  return null;
}

// Role-based light mapping. Returns a CSS colour string, or null to leave as-is.
function lightSurface(h, s, l, a) {
  // Dark, dull surfaces (slate, wine) and near-black tints get lightened. Vivid
  // deep accents (emerald-600/700, teal-600, indigo-700 buttons) keep their colour.
  if (l < 38 && (s < 60 || l < 22 || a < 0.8)) {
    // Dark surface -> light tint, keeping a whisper of the hue.
    // Clean white cards/panels on the blush backdrop.
    const nl = clamp(100 - l * 0.2, 97, 100);
    return hsl(h, Math.min(s, 45) * 0.35, nl, a >= 1 ? 0.96 : a);
  }
  if (l > 85 && a <= 0.35) {
    // Faint white overlay on dark UI -> faint dark overlay on light UI.
    return hsl(h, s, 100 - l, a);
  }
  return null;
}
// Box outlines are soft wine-tinted lines in the light theme. Only clearly coloured borders
// (selected chips, active tabs, error/success states) keep their colour.
const INK_BORDER = 'rgba(160, 110, 100, 0.22)'; // soft warm outline (blush theme)
function lightBorder(h, s, l, a) {
  if (a >= 0.6 && s >= 35 && l >= 25 && l <= 75) return null;
  return INK_BORDER;
}
function lightRing(h, s, l, a) {
  if (l < 45) return hsl(h, Math.min(s, 45) * 0.6, clamp(100 - l * 0.6, 78, 93), Math.max(a, 0.6));
  if (l > 85 && a <= 0.35) return hsl(h, s, 100 - l, Math.max(a, 0.12));
  return null;
}
function lightText(h, s, l) {
  if (l < 55) return null; // already dark enough
  if (s > 30) return hsl(h, clamp(s, 40, 85), clamp(100 - l + 8, 30, 42)); // pastel accent -> deeper accent
  return hsl(h, Math.min(s, 30), clamp(100 - l, 10, 42)); // near-white neutral -> ink
}
// "Solid saturated surface" — a coloured button/badge. Text on these keeps its colour.
function isSolidAccent(h, s, l, a) {
  return a >= 1 && s >= 35 && l >= 30 && l <= 66;
}

// ---- scan -----------------------------------------------------------------
const TOKEN_RE =
  /(?<![\w-])((?:(?:sm|md|lg|xl|2xl|hover|focus|active|disabled|group-hover|focus-visible|focus-within|placeholder):)*)(bg|text|border|border-[tblrxy]|from|via|to|ring|divide|placeholder|outline|fill|stroke|decoration|caret)-(\[#[0-9a-fA-F]{3,8}\]|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}|white|black)(?:\/(\d{1,3}|\[[0-9.]+\]))?(?![\w-])/g;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !p.includes('scripts')) out.push(p);
  }
  return out;
}
const tokens = new Map();
for (const d of SCAN_DIRS) {
  for (const f of walk(path.join(ROOT, d))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(TOKEN_RE)) tokens.set(m[0], m);
  }
}

// ---- emit -----------------------------------------------------------------
const esc = (cls) => cls.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
const MEDIA = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
const PSEUDO = {
  hover: ':hover', focus: ':focus', active: ':active', disabled: ':disabled',
  'focus-visible': ':focus-visible', 'focus-within': ':focus-within',
};

const rules = [];
const solidSurfaceSel = new Set();
const lightTextTokens = new Set();

for (const [full, m] of [...tokens.entries()].sort()) {
  const variants = m[1] ? m[1].split(':').filter(Boolean) : [];
  const kind = m[2];
  const colorName = m[3];
  const opRaw = m[4];
  const hex = resolveColor(colorName);
  if (!hex) continue;
  let a = 1;
  if (opRaw) a = opRaw.startsWith('[') ? parseFloat(opRaw.slice(1, -1)) : parseInt(opRaw, 10) / 100;
  const [h, s, l] = rgbToHsl(hexToRgb(hex));

  let media = null, pseudo = '', groupHover = false, placeholder = false, unsupported = false;
  for (const v of variants) {
    if (MEDIA[v]) media = MEDIA[v];
    else if (PSEUDO[v]) pseudo += PSEUDO[v];
    else if (v === 'group-hover') groupHover = true;
    else if (v === 'placeholder') placeholder = true;
    else unsupported = true;
  }
  if (unsupported) continue;

  let sel = `.${esc(full)}${pseudo}`;
  if (groupHover) sel = `.group:hover ${sel}`;
  if (placeholder) sel += '::placeholder';

  let decl = null;
  if (kind === 'bg') {
    if (!variants.length && isSolidAccent(h, s, l, a)) solidSurfaceSel.add(`.${esc(full)}`);
    const c = lightSurface(h, s, l, a);
    if (c) decl = `background-color: ${c} !important;`;
  } else if (kind === 'from' || kind === 'via' || kind === 'to') {
    if (!variants.length && kind === 'from' && isSolidAccent(h, s, l, a)) solidSurfaceSel.add(`.${esc(full)}`);
    // See-through gradient stops are photo/scrim overlays — keep them dark.
    const c = a < 1 ? null : lightSurface(h, s, l, a);
    if (c) {
      // Full-cover overlays (absolute inset-0, usually over photos) stay dark too.
      sel = sel.replace(`.${esc(full)}`, `.${esc(full)}:not(.inset-0)`);
      if (kind === 'from') decl = `--tw-gradient-from: ${c} var(--tw-gradient-from-position) !important; --tw-gradient-to: ${hsl(h, 0, 100, 0)} var(--tw-gradient-to-position) !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;`;
      else if (kind === 'via') decl = `--tw-gradient-to: ${hsl(h, 0, 100, 0)} var(--tw-gradient-to-position) !important; --tw-gradient-stops: var(--tw-gradient-from), ${c} var(--tw-gradient-via-position), var(--tw-gradient-to) !important;`;
      else decl = `--tw-gradient-to: ${c} var(--tw-gradient-to-position) !important;`;
    }
  } else if (kind.startsWith('border') || kind === 'divide' || kind === 'outline') {
    const c = lightBorder(h, s, l, a);
    if (c) {
      if (kind === 'divide') { sel = `${sel} > :not([hidden]) ~ :not([hidden])`; decl = `border-color: ${c} !important;`; }
      else if (kind === 'outline') decl = `outline-color: ${c} !important;`;
      else decl = `border-color: ${c} !important;`;
    }
  } else if (kind === 'ring') {
    const c = lightRing(h, s, l, a);
    if (c) decl = `--tw-ring-color: ${c} !important;`;
  } else if (kind === 'text' || kind === 'placeholder' || kind === 'caret' || kind === 'decoration') {
    const c = lightText(h, s, l);
    if (c) {
      const col = a < 1 ? c.replace(/\)$/, ` / ${+a.toFixed(3)})`) : c;
      if (kind === 'placeholder') { sel = `${sel}::placeholder`; decl = `color: ${col} !important;`; }
      else if (kind === 'caret') decl = `caret-color: ${col} !important;`;
      else if (kind === 'decoration') decl = `text-decoration-color: ${col} !important;`;
      else { decl = `color: ${col} !important;`; if (!variants.length) lightTextTokens.add(`.${esc(full)}`); }
    }
  } else if (kind === 'fill' || kind === 'stroke') {
    const c = lightText(h, s, l);
    if (c) decl = `${kind}: ${c} !important;`;
  }
  if (!decl) continue;
  rules.push({ media, sel, decl, kind });
}

// Text on solid coloured surfaces (buttons, badges) keeps its original colour:
// re-assert those light-text tokens there with higher specificity.
const solid = [...solidSurfaceSel].join(',');
const keepRules = [];
if (solid && lightTextTokens.size) {
  for (const t of lightTextTokens) {
    const name = t.slice(1).replace(/\\/g, '');
    const m = name.match(/^text-(.*?)(?:\/(\d{1,3}|\[[0-9.]+\]))?$/);
    const hex = m && resolveColor(m[1]);
    if (!hex) continue;
    let a = 1;
    if (m[2]) a = m[2].startsWith('[') ? parseFloat(m[2].slice(1, -1)) : parseInt(m[2], 10) / 100;
    const [r, g, b] = hexToRgb(hex);
    const orig = a < 1 ? `rgb(${r} ${g} ${b} / ${a})` : `rgb(${r} ${g} ${b})`;
    keepRules.push(`${L} :is(${solid})${t},\n${L} :is(${solid}) ${t} { color: ${orig} !important; }`);
  }
}

let css = `/* AUTO-GENERATED by packages/shared-ui/scripts/gen-light-theme.cjs — do not edit by hand.
   Light theme for the customer, vendor and admin web apps (html[data-theme="light"]). */

${L} { color-scheme: light; }
/* Page colour on <body> only: it then paints the canvas behind the fixed
   -z-10 backdrop. A background on <html> would turn body into an opaque
   sheet covering the backdrop. */
${L} { background: transparent !important; }
${L} body, ${L} body[class] { background: #f6e3de !important; color: #3a1a2a; }
${L} input[type="date"], ${L} input[type="time"], ${L} input[type="datetime-local"], ${L} input[type="month"] { color-scheme: light; }
/* Light theme = warm blush backdrop with bokeh (packages/shared-ui/BlushBackground.tsx);
   the dark theme keeps its wine floral backdrop. */
.blush-bg { display: none; }
${L} .blush-bg { display: block; }
${L} .floral-gold-bg > :not(.blush-bg) { display: none !important; }
/* Boxes without an explicit border colour get black outlines too (zero-specificity
   element selector, so any coloured border utility still wins). */
:where(html[data-theme="light"]) :is(div, section, article, aside, header, footer, nav, main, form, fieldset, label, span, a, button, input, select, textarea, table, thead, tbody, tr, th, td, ul, ol, li, img, hr, details, summary) {
  border-color: ${INK_BORDER};
}
${L} .glass-card, ${L} .glass-card-gold {
  background: rgba(255, 255, 255, 0.94) !important;
  border-color: rgba(236, 214, 208, 0.95) !important;
  box-shadow: 0 10px 28px -14px rgba(150, 90, 80, 0.32), 0 1px 2px rgba(150, 90, 80, 0.06) !important;
}
${L} .glass-card-gold { border-color: rgba(212, 175, 55, 0.35) !important; }
/* Vendor cards (marketplace + Smart Budget): crisp outline and clean shadow
   instead of the dark theme's gold glow, which smudges on the blush backdrop. */
${L} .vendor-card, ${L} .vendor-card[class] {
  background: #ffffff !important;
  border: 1px solid rgba(205, 160, 150, 0.6) !important;
  box-shadow: 0 14px 30px -18px rgba(140, 80, 70, 0.45), 0 2px 6px -2px rgba(140, 80, 70, 0.12) !important;
}
${L} .vendor-card:hover, ${L} .vendor-card[class]:hover {
  border-color: rgba(201, 160, 72, 0.85) !important;
  box-shadow: 0 20px 38px -18px rgba(140, 80, 70, 0.5), 0 0 0 3px rgba(233, 184, 63, 0.14) !important;
}
${L} .glass-card-hover:hover, ${L} .glass-card-gold-hover:hover { background: #ffffff !important; box-shadow: 0 16px 34px -16px rgba(150, 90, 80, 0.4) !important; }
${L} input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]), ${L} select, ${L} textarea { color: #1f1a2b; }
${L} select option { background: #ffffff; color: #1f1a2b; }
${L} ::-webkit-scrollbar-track { background: #efe9f0; }
/* Vendor date fields force near-white text for dark inputs. */
${L} .date-input-amber,
${L} .date-input-amber::-webkit-datetime-edit,
${L} .date-input-amber::-webkit-datetime-edit-fields-wrapper,
${L} .date-input-amber::-webkit-datetime-edit-text,
${L} .date-input-amber::-webkit-datetime-edit-month-field,
${L} .date-input-amber::-webkit-datetime-edit-day-field,
${L} .date-input-amber::-webkit-datetime-edit-year-field { color: #1f1a2b !important; -webkit-text-fill-color: #1f1a2b !important; }
/* Gradient text (headings) is tuned for dark backgrounds — use a deep gold/wine gradient. */
${L} .bg-clip-text.text-transparent, ${L} .text-gradient-gold {
  background-image: linear-gradient(120deg, #7a5a14 0%, #a8832e 50%, #8a6a1a 100%) !important;
}

`;
let lastMedia = null;
const byMedia = new Map();
for (const r of rules) {
  const k = r.media || 0;
  if (!byMedia.has(k)) byMedia.set(k, []);
  byMedia.get(k).push(`${L} ${r.sel} { ${r.decl} }`);
}
for (const k of [...byMedia.keys()].sort((a, b) => a - b)) {
  const block = byMedia.get(k).join('\n');
  css += k ? `@media (min-width: ${k}px) {\n${block}\n}\n` : `${block}\n`;
}
css += `\n/* Text on solid coloured surfaces keeps its original colour. */\n${keepRules.join('\n')}\n`;
void lastMedia;

fs.writeFileSync(OUT, css);
console.log(`tokens scanned: ${tokens.size}, rules: ${rules.length}, solid surfaces: ${solidSurfaceSel.size}, kept-text rules: ${keepRules.length}`);
