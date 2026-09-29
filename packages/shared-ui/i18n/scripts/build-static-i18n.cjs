// Builds apps/customer-web/public/static-i18n.js and apps/mobile/src/staticI18nScript.ts
// from packages/shared-ui/i18n/work/static/source.json and work/static/<lang>/*.txt,
// and merges plain-text translations into packages/shared-ui/i18n/locales/<lang>.json.
const fs = require('fs');
const path = require('path');

const I18N_DIR = path.resolve(__dirname, '..');
const STATIC_DIR = path.join(I18N_DIR, 'work', 'static');
const LOCALES_DIR = path.join(I18N_DIR, 'locales');
const PUBLIC_OUT = path.resolve(I18N_DIR, '..', '..', '..', 'apps', 'customer-web', 'public', 'static-i18n.js');
const MOBILE_OUT = path.resolve(I18N_DIR, '..', '..', '..', 'apps', 'mobile', 'src', 'staticI18nScript.ts');

const source = JSON.parse(fs.readFileSync(path.join(STATIC_DIR, 'source.json'), 'utf8'));

const LANG_META = [
  { code: 'en', name: 'English', nativeName: 'English', font: '' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', font: 'Noto Sans Tamil' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', font: 'Noto Sans Devanagari' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', font: 'Noto Sans Telugu' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', font: 'Noto Sans Malayalam' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', font: 'Noto Sans Kannada' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', font: 'Noto Sans Bengali' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', font: 'Noto Sans Devanagari' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', font: 'Noto Sans Gujarati' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', font: 'Noto Sans Gurmukhi' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', font: 'Noto Sans Oriya' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', font: 'Noto Sans Bengali' },
];

const DIGIT_BLOCKS = [0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66];
const latinDigits = (s) => s.replace(/[०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯]/g, (c) => {
  const cp = c.codePointAt(0);
  const base = DIGIT_BLOCKS.find((b) => cp >= b && cp <= b + 9);
  return String(cp - base);
});

const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const dicts = {};
const langCodes = LANG_META.filter((l) => l.code !== 'en').map((l) => l.code);

for (const lang of langCodes) {
  const dir = path.join(STATIC_DIR, lang);
  const map = {};
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();
    for (const f of files) {
      const lines = fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const m = /^(\d+)\s*\|\s*(.+)$/.exec(line);
        if (m) {
          map[Number(m[1])] = latinDigits(m[2].trim());
        }
      }
    }
  }
  dicts[lang] = map;

  // Also merge plain-text entries into locales/<lang>.json so React runtime has them too
  const localePath = path.join(LOCALES_DIR, `${lang}.json`);
  if (fs.existsSync(localePath) && Object.keys(map).length > 0) {
    const localeObj = JSON.parse(fs.readFileSync(localePath, 'utf8'));
    for (const item of source) {
      const trHtml = map[item.id];
      if (!trHtml) continue;
      const plainKey = stripTags(item.key);
      const plainVal = stripTags(trHtml);
      if (plainKey && plainVal && plainKey !== plainVal) {
        localeObj[plainKey] = plainVal;
      }
    }
    fs.writeFileSync(localePath, JSON.stringify(localeObj));
  }
  console.log(`static ${lang}: ${Object.keys(map).length}/${source.length} entries`);
}

// Build runtime script
const sourceEntries = source.map((s) => ({
  id: s.id,
  k: s.key.replace(/\s+/g, ' ').trim(),
  h: s.html.replace(/\s+/g, ' ').trim(),
}));

const runtimeJs = `(function () {
  if (window.__MAGIZH_STATIC_I18N_LOADED) {
    if (typeof window.__MAGIZH_APPLY_STATIC_LANG === 'function') {
      window.__MAGIZH_APPLY_STATIC_LANG();
    }
    return;
  }
  window.__MAGIZH_STATIC_I18N_LOADED = true;

  var LANG_KEY = 'magizhnaazh_lang';
  var LANGS = ${JSON.stringify(LANG_META)};
  var SOURCE = ${JSON.stringify(sourceEntries)};
  var DICTS = ${JSON.stringify(dicts)};

  var byHtml = {};
  var byKey = {};
  var origById = {};
  for (var i = 0; i < SOURCE.length; i++) {
    var row = SOURCE[i];
    byHtml[row.h] = row.id;
    byKey[row.k] = row.id;
    origById[row.id] = row.h;
  }

  function norm(s) {
    return String(s || '').replace(/\\s+/g, ' ').trim();
  }

  function stripTags(s) {
    return String(s || '').replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();
  }

  function isValidLang(code) {
    if (!code) return false;
    for (var i = 0; i < LANGS.length; i++) {
      if (LANGS[i].code === code) return true;
    }
    return false;
  }

  function resolveInitialLang() {
    try {
      var params = new URLSearchParams(window.location.search);
      var qLang = params.get('lang');
      if (isValidLang(qLang)) {
        try { window.localStorage.setItem(LANG_KEY, qLang); } catch (e) {}
        return qLang;
      }
    } catch (e) {}
    try {
      var saved = window.localStorage.getItem(LANG_KEY);
      if (isValidLang(saved)) return saved;
    } catch (e) {}
    return 'en';
  }

  var SELECTOR = 'title, h1, h2, h3, p, li, a.back-btn, a.apply-btn, .tagline, .subtitle, .feature-title, .company-name, .detail-item, .category-badge, .post-title, .post-desc, .post-meta, .job-header, .faq-question, .support-title, .press-date, .press-title, .contact-title, footer';

  function indexDom() {
    var els = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.getAttribute('data-i18n-id')) continue;
      var h = norm(el.innerHTML);
      var k = norm(el.textContent);
      var id = byHtml[h] || byKey[k];
      if (id) {
        el.setAttribute('data-i18n-id', String(id));
      }
    }
  }

  function ensureFont(code) {
    var meta = null;
    for (var i = 0; i < LANGS.length; i++) {
      if (LANGS[i].code === code) { meta = LANGS[i]; break; }
    }
    var styleEl = document.getElementById('static-i18n-font-style');
    if (!meta || !meta.font) {
      if (styleEl) styleEl.remove();
      return;
    }
    var linkId = 'static-i18n-font-' + meta.font.replace(/\\s+/g, '-');
    if (!document.getElementById(linkId)) {
      var link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=' + meta.font.replace(/\\s+/g, '+') + ':wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'static-i18n-font-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent =
      'html[lang="' + code + '"] body { font-family: "' + meta.font + '", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; line-height: 1.72 !important; }' +
      'html[lang="' + code + '"] h1, html[lang="' + code + '"] h2, html[lang="' + code + '"] h3 { line-height: 1.45 !important; letter-spacing: normal !important; }';
  }

  var currentLang = 'en';

  function applyLang(code) {
    if (!isValidLang(code)) code = 'en';
    currentLang = code;
    indexDom();
    document.documentElement.lang = code;
    ensureFont(code);

    var dict = code === 'en' ? null : (DICTS[code] || null);
    var els = document.querySelectorAll('[data-i18n-id]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var id = Number(el.getAttribute('data-i18n-id'));
      var nextHtml = (dict && dict[id]) ? dict[id] : origById[id];
      if (!nextHtml) continue;
      if (el.tagName === 'TITLE') {
        document.title = stripTags(nextHtml);
      } else {
        el.innerHTML = nextHtml;
      }
    }

    // Update header links so returning to Magizhnaazh preserves language
    var backLinks = document.querySelectorAll('a.back-btn, a.logo-group');
    for (var j = 0; j < backLinks.length; j++) {
      var a = backLinks[j];
      a.setAttribute('href', code === 'en' ? './' : './?lang=' + encodeURIComponent(code));
      if (!a.getAttribute('data-back-bound')) {
        a.setAttribute('data-back-bound', '1');
        a.addEventListener('click', function (ev) {
          if (window.ReactNativeWebView && window.history.length > 1) {
            ev.preventDefault();
            window.history.back();
          }
        });
      }
    }

    updateSwitcherButton(code);
  }

  function selectLanguage(code) {
    try { window.localStorage.setItem(LANG_KEY, code); } catch (e) {}
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'language', code: code }));
      }
    } catch (e) {}
    try {
      var url = new URL(window.location.href);
      if (code === 'en') url.searchParams.delete('lang');
      else url.searchParams.set('lang', code);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
    applyLang(code);
  }

  function updateSwitcherButton(code) {
    var labelEl = document.getElementById('static-i18n-btn-label');
    if (labelEl) {
      var meta = LANGS[0];
      for (var i = 0; i < LANGS.length; i++) {
        if (LANGS[i].code === code) { meta = LANGS[i]; break; }
      }
      labelEl.textContent = meta.nativeName;
    }
    var items = document.querySelectorAll('[data-static-lang-option]');
    for (var k = 0; k < items.length; k++) {
      var btn = items[k];
      var isAct = btn.getAttribute('data-static-lang-option') === code;
      btn.style.borderColor = isAct ? '#e8c874' : 'rgba(107, 33, 64, 0.6)';
      btn.style.background = isAct ? 'rgba(212, 175, 55, 0.18)' : 'rgba(38, 16, 28, 0.85)';
    }
  }

  function ensureHeaderStyles() {
    if (document.getElementById('static-header-responsive-style')) return;
    var s = document.createElement('style');
    s.id = 'static-header-responsive-style';
    s.textContent =
      '.header { position: sticky !important; top: 0 !important; z-index: 100 !important; background: rgba(26, 10, 20, 0.95) !important; backdrop-filter: blur(12px) !important; border-bottom: 1px solid rgba(107, 33, 64, 0.6) !important; box-sizing: border-box !important; width: 100% !important; }' +
      '.header-inner { max-width: 960px !important; margin: 0 auto !important; padding: 12px 20px !important; display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 8px !important; box-sizing: border-box !important; }' +
      '#static-i18n-switcher { display: flex !important; align-items: center !important; gap: 8px !important; position: relative !important; flex-shrink: 0 !important; flex-wrap: nowrap !important; }' +
      '.back-btn { display: inline-flex !important; align-items: center !important; gap: 4px !important; white-space: nowrap !important; flex-shrink: 1 !important; box-sizing: border-box !important; }' +
      '@media (max-width: 640px) {' +
      '  .header-inner { padding: 10px 12px !important; gap: 6px !important; }' +
      '  .logo-group { gap: 8px !important; flex-shrink: 0 !important; min-width: 0 !important; }' +
      '  .logo-badge { width: 32px !important; height: 32px !important; font-size: 16px !important; border-radius: 10px !important; }' +
      '  .logo-text { font-size: 16px !important; white-space: nowrap !important; }' +
      '  #static-i18n-switcher { gap: 6px !important; flex-wrap: nowrap !important; }' +
      '  .back-btn { padding: 6px 10px !important; font-size: 12px !important; white-space: nowrap !important; max-width: 130px !important; overflow: hidden !important; text-overflow: ellipsis !important; line-height: 1.2 !important; }' +
      '  #static-i18n-switcher > button { padding: 6px 10px !important; font-size: 12px !important; white-space: nowrap !important; }' +
      '}' +
      '@media (max-width: 380px) {' +
      '  .header-inner { padding: 8px 8px !important; gap: 4px !important; }' +
      '  .logo-text { font-size: 14px !important; }' +
      '  .back-btn { max-width: 95px !important; padding: 5px 8px !important; font-size: 11px !important; }' +
      '  #static-i18n-switcher > button { padding: 5px 8px !important; font-size: 11px !important; }' +
      '}';
    (document.head || document.documentElement).appendChild(s);
  }

  function mountSwitcher() {
    ensureHeaderStyles();
    var headerInner = document.querySelector('.header-inner');
    if (!headerInner || document.getElementById('static-i18n-switcher')) return;

    var rightWrap = document.createElement('div');
    rightWrap.id = 'static-i18n-switcher';
    rightWrap.style.cssText = 'display:flex;align-items:center;gap:8px;position:relative;flex-wrap:nowrap;justify-content:flex-end;flex-shrink:0;';

    var backBtn = headerInner.querySelector('.back-btn');
    if (backBtn) {
      backBtn.parentNode.removeChild(backBtn);
    }

    var langBtn = document.createElement('button');
    langBtn.type = 'button';
    langBtn.setAttribute('translate', 'no');
    langBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;color:#e8c874;font-size:13px;font-weight:700;padding:8px 13px;border-radius:10px;border:1px solid rgba(212,175,55,0.45);background:rgba(38,16,28,0.75);cursor:pointer;transition:all 0.2s;';
    langBtn.innerHTML = '<span>🌐</span><span id="static-i18n-btn-label">English</span><span style="font-size:10px;opacity:0.8;">▼</span>';

    var menu = document.createElement('div');
    menu.id = 'static-i18n-menu';
    menu.setAttribute('translate', 'no');
    menu.style.cssText = 'display:none;position:absolute;top:calc(100% + 8px);right:0;width:290px;max-width:90vw;background:#1a0a14;border:1px solid rgba(212,175,55,0.5);border-radius:16px;padding:10px;box-shadow:0 16px 40px rgba(0,0,0,0.65);z-index:999;grid-template-columns:repeat(2, 1fr);gap:6px;';

    for (var i = 0; i < LANGS.length; i++) {
      (function (l) {
        var opt = document.createElement('button');
        opt.type = 'button';
        opt.setAttribute('data-static-lang-option', l.code);
        opt.style.cssText = 'text-align:left;padding:8px 10px;border-radius:10px;border:1px solid rgba(107,33,64,0.6);background:rgba(38,16,28,0.85);color:#fdf1f5;cursor:pointer;display:flex;flex-direction:column;gap:2px;';
        opt.innerHTML = '<span style="font-size:14px;font-weight:700;color:#fdf1f5;line-height:1.3;">' + l.nativeName + '</span><span style="font-size:11px;color:#cf9bb3;">' + l.name + '</span>';
        opt.addEventListener('click', function () {
          menu.style.display = 'none';
          selectLanguage(l.code);
        });
        menu.appendChild(opt);
      })(LANGS[i]);
    }

    langBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'grid' ? 'none' : 'grid';
    });

    document.addEventListener('click', function (e) {
      if (!rightWrap.contains(e.target)) {
        menu.style.display = 'none';
      }
    });

    if (backBtn) rightWrap.appendChild(backBtn);
    rightWrap.appendChild(langBtn);
    rightWrap.appendChild(menu);
    headerInner.appendChild(rightWrap);
  }

  function boot() {
    ensureHeaderStyles();
    mountSwitcher();
    applyLang(resolveInitialLang());
  }

  window.__MAGIZH_APPLY_STATIC_LANG = function (forcedCode) {
    ensureHeaderStyles();
    mountSwitcher();
    applyLang(forcedCode || resolveInitialLang());
  };

  window.addEventListener('storage', function (e) {
    if (e.key === LANG_KEY && e.newValue && isValidLang(e.newValue)) {
      applyLang(e.newValue);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
`;

fs.mkdirSync(path.dirname(PUBLIC_OUT), { recursive: true });
fs.writeFileSync(PUBLIC_OUT, runtimeJs, 'utf8');
console.log('Wrote', PUBLIC_OUT, `(${(runtimeJs.length / 1024).toFixed(1)} KB)`);

const mobileTs = `// Auto-generated by packages/shared-ui/i18n/scripts/build-static-i18n.cjs
export const STATIC_I18N_SCRIPT = ${JSON.stringify(runtimeJs)};
`;
fs.mkdirSync(path.dirname(MOBILE_OUT), { recursive: true });
fs.writeFileSync(MOBILE_OUT, mobileTs, 'utf8');
console.log('Wrote', MOBILE_OUT);
