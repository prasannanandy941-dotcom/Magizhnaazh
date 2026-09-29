/// <reference types="vite/client" />
// Runtime translation for the web apps (customer, vendor, admin).
//
// How it works
// ------------
// Every piece of UI text in the source is listed in source-strings.json and
// translated ahead of time into locales/<code>.json ({ "English text": "…" }).
// At runtime this module swaps rendered English text for the chosen language:
//
//   * it walks the DOM once and translates every text node and the visible
//     attributes (placeholder, title, aria-label, alt …), then
//   * a MutationObserver translates anything React renders or updates later.
//
// The React tree is never touched — only the text inside DOM nodes — so no app
// code needs to change and nothing can break at the component level. Original
// English is remembered per node, so switching language (or back to English)
// re-translates from the source rather than from an earlier translation.
//
// Text with variables is stored as a pattern: "Welcome, {0}!" matches
// "Welcome, Priya!" and rebuilds the translated sentence around "Priya".
// Anything without a translation simply stays English — never blank or broken.

import { DEFAULT_LANGUAGE, LANGUAGES, LangCode, isLangCode } from './languages';

export const LANG_KEY = 'magizhnaazh_lang';
type LanguageScope = 'customer' | 'vendor' | 'admin';
let languageStorageKey = LANG_KEY;

/** Give each web app an independent saved language and storage-event channel. */
export function configureLanguageScope(scope: LanguageScope): void {
  languageStorageKey = `${LANG_KEY}_${scope}`;
}

interface Pattern { re: RegExp; tpl: string }
interface Dict { exact: Map<string, string>; lower: Map<string, string>; patterns: Pattern[] }

const loaders = import.meta.glob('./locales/*.json', { import: 'default' }) as Record<string, () => Promise<Record<string, string>>>;

let current: LangCode = DEFAULT_LANGUAGE;
let dict: Dict | null = null;
let observer: MutationObserver | null = null;
let applyToken = 0;
const listeners = new Set<(l: LangCode) => void>();
const missing = new Set<string>();
const cache = new Map<string, string | null>();

// ---------------------------------------------------------------- storage

export function getStoredLanguage(): LangCode | null {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (isLangCode(q)) {
      window.localStorage.setItem(languageStorageKey, q);
      return q;
    }
    const v = window.localStorage.getItem(languageStorageKey);
    return isLangCode(v) ? v : null;
  } catch {
    return null;
  }
}

/** True once the person has picked a language (used for the first-time prompt). */
export function hasChosenLanguage(): boolean {
  return getStoredLanguage() !== null;
}

/** The device's language if we support it — used only to pre-highlight a choice. */
export function suggestedLanguage(): LangCode | null {
  const prefs = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
  for (const p of prefs) {
    const code = String(p).toLowerCase().split('-')[0];
    if (code !== 'en' && isLangCode(code)) return code;
  }
  return null;
}

export function getLanguage(): LangCode {
  return current;
}

export function onLanguageChange(fn: (l: LangCode) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------------------------------------------------------------- dictionary

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildDict(raw: Record<string, string>): Dict {
  const exact = new Map<string, string>();
  const lower = new Map<string, string>();
  const patterns: (Pattern & { weight: number })[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!value) continue;
    if (/\{\d+\}/.test(key)) {
      const parts = key.split(/\{\d+\}/);
      const re = new RegExp('^' + parts.map(escapeRe).join('(.+?)') + '$', 'i');
      patterns.push({ re, tpl: value, weight: parts.join('').length });
    } else {
      exact.set(key, value);
      const lk = key.toLowerCase();
      if (!lower.has(lk)) lower.set(lk, value);
    }
  }
  patterns.sort((a, b) => b.weight - a.weight);
  return { exact, lower, patterns };
}

async function loadDict(code: LangCode): Promise<Dict | null> {
  const loader = loaders[`./locales/${code}.json`];
  if (!loader) return null;
  try {
    return buildDict(await loader());
  } catch (err) {
    console.warn('[i18n] could not load', code, err);
    return null;
  }
}

function lookupPlain(core: string): string | undefined {
  if (!dict) return undefined;
  return dict.exact.get(core) ?? dict.lower.get(core.toLowerCase());
}

function lookup(core: string): string | null {
  if (cache.has(core)) return cache.get(core)!;
  let out: string | null = null;
  const plain = lookupPlain(core);
  if (plain !== undefined) {
    out = plain;
  } else if (dict) {
    for (const p of dict.patterns) {
      const m = p.re.exec(core);
      if (m) {
        // Captured values (a status, a category…) are translated too when known.
        out = p.tpl.replace(/\{(\d+)\}/g, (_, i) => {
          const cap = m[Number(i) + 1] ?? '';
          // English plural suffixes ("{0} star{1}" with {1} = "s") mean nothing in other languages.
          if (/^(s|es)$/.test(cap)) return '';
          return lookupPlain(cap) ?? cap;
        });
        break;
      }
    }
  }
  if (cache.size > 20000) cache.clear();
  cache.set(core, out);
  return out;
}

/** Translate one piece of text into the current language (returns it unchanged if unknown). */
export function translateText(raw: string): string {
  if (current === DEFAULT_LANGUAGE || !dict || !raw) return raw;
  const core = normalize(raw);
  if (!core || !/\p{L}/u.test(core)) return raw;
  const hit = lookup(core);
  if (hit == null) {
    if (missing.size < 5000) missing.add(core);
    return raw;
  }
  const lead = /^\s*/.exec(raw)![0];
  const trail = /\s*$/.exec(raw)![0];
  return lead + hit + trail;
}

// ---------------------------------------------------------------- DOM

const SKIP = 'script,style,noscript,textarea,code,pre,[translate="no"],.notranslate,[contenteditable="true"],[data-no-i18n]';
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'label'];
const ATTR_SELECTOR = ATTRS.map((a) => `[${a}]`).join(',') + ',input[type="button"],input[type="submit"],input[type="reset"]';

const nodeOrig = new WeakMap<Text, { orig: string; written: string }>();
const attrOrig = new WeakMap<Element, Map<string, { orig: string; written: string }>>();

function skipped(el: Element | null): boolean {
  return !!el && !!el.closest(SKIP);
}

function localizeText(node: Text) {
  const cur = node.nodeValue ?? '';
  const rec = nodeOrig.get(node);
  // If the node still holds what we wrote, re-translate from the remembered
  // English; otherwise React put fresh text there and that is the new source.
  const src = rec && rec.written === cur ? rec.orig : cur;
  if (skipped(node.parentElement)) return;
  const out = current === DEFAULT_LANGUAGE ? src : translateText(src);
  if (out !== cur) node.nodeValue = out;
  if (out !== src || rec) nodeOrig.set(node, { orig: src, written: out });
}

function localizeAttr(el: Element, attr: string) {
  const cur = el.getAttribute(attr);
  if (cur == null) return;
  let store = attrOrig.get(el);
  if (!store) attrOrig.set(el, (store = new Map()));
  const rec = store.get(attr);
  const src = rec && rec.written === cur ? rec.orig : cur;
  if (skipped(el)) return;
  const out = current === DEFAULT_LANGUAGE ? src : translateText(src);
  if (out !== cur) el.setAttribute(attr, out);
  if (out !== src || rec) store.set(attr, { orig: src, written: out });
}

function localizeElementAttrs(el: Element) {
  for (const a of ATTRS) if (el.hasAttribute(a)) localizeAttr(el, a);
  if (el instanceof HTMLInputElement && /^(button|submit|reset)$/i.test(el.type) && el.hasAttribute('value')) localizeAttr(el, 'value');
}

function localizeTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    localizeText(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) localizeText(n as Text);
  const scope = root.nodeType === Node.DOCUMENT_NODE ? (root as Document).documentElement : (root as Element);
  if (scope.matches?.(ATTR_SELECTOR)) localizeElementAttrs(scope);
  scope.querySelectorAll?.(ATTR_SELECTOR).forEach(localizeElementAttrs);
}

function onMutations(records: MutationRecord[]) {
  // Our own writes must not re-trigger us: stop watching while we work.
  observer!.disconnect();
  try {
    for (const m of records) {
      if (m.type === 'characterData') localizeText(m.target as Text);
      else if (m.type === 'attributes') localizeElementAttrs(m.target as Element);
      else m.addedNodes.forEach((n) => localizeTree(n));
    }
  } finally {
    observe();
    scheduleFit();
  }
}

function observe() {
  observer!.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS, 'value'],
  });
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(onMutations);
  observe();
}

function relocalizeAll() {
  observer?.disconnect();
  try {
    localizeTree(document);
  } finally {
    if (observer) observe();
    scheduleFit();
  }
}

// alert()/confirm()/prompt() text is not in the DOM, so wrap them.
let dialogsPatched = false;
function patchDialogs() {
  if (dialogsPatched) return;
  dialogsPatched = true;
  const w = window as any;
  for (const fn of ['alert', 'confirm', 'prompt'] as const) {
    const orig = w[fn]?.bind(window);
    if (!orig) continue;
    w[fn] = (msg?: any, ...rest: any[]) => orig(typeof msg === 'string' ? translateText(msg) : msg, ...rest);
  }
}

// ---------------------------------------------------------------- fit

// Translated words are often longer than the English they replace. Buttons and
// tabs whose text no longer fits get a slightly smaller font (never below 10px),
// so nothing is clipped and words are never broken mid-way.
let fitTimer: number | undefined;
const FIT_SELECTOR = 'button, [role="tab"]';

function runFit() {
  if (current === DEFAULT_LANGUAGE) return;
  const els = Array.from(document.querySelectorAll<HTMLElement>(FIT_SELECTOR));
  for (const el of els) if (el.dataset.i18nFit) { el.style.fontSize = ''; delete el.dataset.i18nFit; }
  const todo: Array<[HTMLElement, number]> = [];
  for (const el of els) {
    if (el.clientWidth < 24 || el.scrollWidth <= el.clientWidth + 1) continue;
    const size = parseFloat(getComputedStyle(el).fontSize) || 14;
    todo.push([el, Math.max(10, size * (el.clientWidth / el.scrollWidth) * 0.96)]);
  }
  for (const [el, size] of todo) { el.style.fontSize = size + 'px'; el.dataset.i18nFit = '1'; }
}

function scheduleFit() {
  window.clearTimeout(fitTimer);
  fitTimer = window.setTimeout(runFit, 250);
}

// ---------------------------------------------------------------- fonts

function ensureFont(code: LangCode) {
  const lang = LANGUAGES.find((l) => l.code === code);
  let style = document.getElementById('i18n-font-style') as HTMLStyleElement | null;
  if (!lang?.font) {
    style?.remove();
    return;
  }
  const id = `i18n-font-${lang.font.replace(/\s+/g, '-')}`;
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${lang.font.replace(/\s+/g, '+')}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }
  if (!style) {
    style = document.createElement('style');
    style.id = 'i18n-font-style';
    document.head.appendChild(style);
  }
  // Latin text keeps the app's own fonts; the script's glyphs come from Noto.
  // Translated words (Indic scripts especially) are often longer than the English
  // they replace; let them wrap inside tight buttons/tabs instead of being clipped.
  style.textContent =
    `html[lang="${code}"] body { font-family: 'Inter', '${lang.font}', ui-sans-serif, system-ui, sans-serif; line-height: 1.55; }` +
    `html[lang="${code}"] th, html[lang="${code}"] label { overflow-wrap: break-word; }` +
    `html[lang="${code}"] .whitespace-nowrap { white-space: normal; }` +
    // Indic scripts have tall stacked conjuncts: give headings room, drop negative
    // tracking, use the script font for display text, and cap the heaviest weights
    // (only 400-700 are loaded) and the largest sizes so headlines stay clean.
    `html[lang="${code}"] .font-display { font-family: '${lang.font}', 'Inter', sans-serif; }` +
    `html[lang="${code}"] h1, html[lang="${code}"] h2, html[lang="${code}"] h3, html[lang="${code}"] .font-display { line-height: 1.4 !important; letter-spacing: normal !important; }` +
    `html[lang="${code}"] .font-extrabold, html[lang="${code}"] .font-black { font-weight: 700; }` +
    `html[lang="${code}"] .text-4xl { font-size: 1.9rem; } html[lang="${code}"] .text-5xl { font-size: 2.3rem; }` +
    `@media (min-width: 640px) { html[lang="${code}"] .sm\\:text-6xl { font-size: 2.9rem; } html[lang="${code}"] .sm\\:text-5xl { font-size: 2.5rem; } }` +
    `@media (min-width: 1024px) { html[lang="${code}"] .lg\\:text-7xl { font-size: 3.4rem; } html[lang="${code}"] .lg\\:text-6xl { font-size: 3rem; } }`;
}

// ---------------------------------------------------------------- public API

async function applyLanguage(code: LangCode) {
  const token = ++applyToken;
  const next = code === DEFAULT_LANGUAGE ? null : await loadDict(code);
  if (token !== applyToken) return; // a newer choice superseded this one
  current = code;
  dict = next;
  cache.clear();
  missing.clear();
  document.documentElement.lang = code;
  document.documentElement.dir = 'ltr';
  ensureFont(code);
  patchDialogs();
  startObserver();
  relocalizeAll();
  listeners.forEach((fn) => fn(code));
}

/** Choose a language: applies it immediately and remembers it. */
export async function setLanguage(code: LangCode, persist = true): Promise<void> {
  if (persist) {
    try { window.localStorage.setItem(languageStorageKey, code); } catch { /* private mode */ }
    // Inside the mobile app, let the native side remember it too.
    try { (window as any).ReactNativeWebView?.postMessage(JSON.stringify({ type: 'language', code })); } catch { /* not in the app */ }
  }
  await applyLanguage(code);
}

/** Apply the saved language at startup. Await it before first render to avoid an English flash. */
export function initLanguage(): Promise<void> {
  window.addEventListener('storage', (e) => {
    if (e.key === languageStorageKey && isLangCode(e.newValue) && e.newValue !== current) void applyLanguage(e.newValue);
  });
  return applyLanguage(getStoredLanguage() ?? DEFAULT_LANGUAGE);
}

/** Startup helper: language loaded (or a timeout, so a slow network never blocks the app). */
export function initLanguageThen(render: () => void, timeoutMs = 1500) {
  let done = false;
  const go = () => { if (!done) { done = true; render(); } };
  initLanguage().then(go, go);
  setTimeout(go, timeoutMs);
}

/** Save the chosen language on the signed-in account so it follows them to other devices. */
export async function saveLanguageToAccount(apiBase: string, token: string): Promise<void> {
  try {
    await fetch(`${apiBase}/api/v1/auth/language`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ language: current }),
    });
  } catch {
    /* preference sync is best-effort */
  }
}

// Debug helper: after switching language, `__i18n.missing()` lists text that was
// shown but has no translation yet, ready to add to extra-strings.json.
(window as any).__i18n = { missing: () => [...missing].sort(), language: () => current };
