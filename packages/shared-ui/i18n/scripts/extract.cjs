// Extracts every piece of user-visible English text from the web apps into
// source-strings.json — the list that gets translated. Run:
//   node packages/shared-ui/i18n/scripts/extract.cjs
//
// It parses the real TypeScript AST (not regexes) and collects:
//   - JSX text                    <p>Book &amp; Pay</p>
//   - visible JSX attributes      placeholder / title / aria-label / alt / label …
//   - string literals that are plausibly shown to people ('Settled', 'No results.')
//   - template literals, with each ${…} turned into a {0}, {1} … placeholder
// and skips code-ish strings (class names, ids, URLs, enum keys, API paths…).
// Anything it misses is caught at runtime by the "missing string" collector
// (see runtime.ts) and can be added to extra-strings.json.

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '../../../..');
const OUT = path.resolve(__dirname, '../source-strings.json');
const EXTRA = path.resolve(__dirname, '../extra-strings.json');

const SCAN_DIRS = [
  'apps/customer-web/src',
  'apps/vendor-web/src',
  'apps/admin-web/src',
  'packages/shared-ui',
];
// Server files: only the `message: '…'` texts the apps show to people (errors, confirmations).
const SERVER_DIRS = ['services'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'scripts', 'locales']);
const SKIP_FILES = new Set(['runtime.ts', 'languages.ts']);
// Words that look like text but are code: colour names, enum keys, protocol flags…
const DENY = new Set([
  'emerald', 'indigo', 'flex', 'pill', 'icon', 'signin', 'signup', 'forgot', 'numeric',
  'noopener,noreferrer', 'sine', 'smooth', 'outline', 'film4k', 'LocalStorageProvider',
  'Passw0rd!', 'Inter', 'Outfit', 'mailto', 'fullday', 'gstin', 'pan', 'aadhaar', 'idle',
  'text', 'type', 'name', 'left', 'right', 'center', 'long', 'short', 'medium', 'light', 'dark',
  'true', 'none', 'sizes', 'hidden', 'tab.', 'blush', 'Blush', 'Anonymous',
]);
const DENY_RE = /^Bearer |^\{?\d*\}?(ms|px|s|%)$|^https?:|^[\w.+-]+@|porulontech/i;

const VISIBLE_ATTRS = new Set([
  'placeholder', 'title', 'aria-label', 'alt', 'label', 'helperText', 'description',
  'tooltip', 'subtitle', 'heading', 'emptyText', 'text', 'message', 'caption', 'hint',
]);
// Attributes that never carry display text.
const CODE_ATTRS = new Set([
  'className', 'style', 'key', 'id', 'type', 'href', 'src', 'to', 'name', 'htmlFor', 'target',
  'rel', 'role', 'value', 'accept', 'autoComplete', 'inputMode', 'pattern', 'viewBox', 'd',
  'fill', 'stroke', 'xmlns', 'transform', 'points', 'width', 'height', 'loading', 'method',
]);
// Calls whose string arguments are never shown.
const CODE_CALLEES = /^(fetch|authedFetch|require|import|getItem|setItem|removeItem|addEventListener|removeEventListener|querySelector|querySelectorAll|getElementById|getAttribute|setAttribute|postMessage|createElement|log|warn|error|info|debug|includes|startsWith|endsWith|indexOf|split|join|replace|replaceAll|match|test|RegExp|Date|parse|stringify|has|get|set|add|delete|useState|useRef|createContext|lazyNamed|classNames|clsx|cn|toLocaleDateString|toLocaleString|toLocaleTimeString|NumberFormat|DateTimeFormat|localeCompare|padStart|padEnd|charAt|append|setItemAsync|dispatchEvent|Event|CustomEvent|sendPrompt|encodeURIComponent|decodeURIComponent)$/;

const found = new Map(); // text -> { count, files:Set }

function normalize(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

// Does this string look like something a person reads?
function looksLikeDisplayText(text, fromJsx) {
  if (!/\p{L}/u.test(text)) return false;
  if (text.length > 400) return false;
  if (fromJsx) return true; // JSX text between tags is display text by definition
  if (/^(https?:|\/|\.\.?\/|#|mailto:|tel:|data:|blob:|upi:)/i.test(text)) return false;
  if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(text)) return false; // email
  if (/^#?[0-9a-f]{3,8}$/i.test(text)) return false; // hex colour
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return false; // ISO date
  if (/\.(png|jpe?g|svg|webp|gif|css|js|ts|tsx|json|pdf|mp4)$/i.test(text)) return false;
  if (/[{};]|=>|\bfunction\b/.test(text) && !/\{\d+\}/.test(text)) return false;
  if (!/\s/.test(text)) {
    // A single token: identifiers / keys are not display text…
    if (/[_\-:./\\[\]()=+*<>|@$%^~`]/.test(text) && !/^[A-Z][a-z]+[-'][A-Za-z]+$/.test(text)) return false;
    if (/^[a-z]+[A-Z]/.test(text)) return false; // camelCase
    if (/^[A-Z][A-Z0-9]+$/.test(text) && text.length > 4) return false; // ENUM_LIKE (short ones like GST, UPI, OTP stay)
    // …but a plain word ('Settled', 'pending', 'Wedding') may well be shown.
    return text.length >= 2;
  }
  // CSS: gradients, colours, and Tailwind class lists (all-lowercase tokens from the
  // class alphabet, at least one hyphenated/colon token, no sentence punctuation).
  if (/gradient\(|rgba?\(|#[0-9a-f]{3,8}\b/i.test(text)) return false;
  const tokens = text.split(' ');
  const classAlphabet = tokens.every((t) => /^[a-z0-9\-:/[\]#%.!(),_]+$/.test(t));
  if (classAlphabet && tokens.some((t) => /[-:/[\]]/.test(t)) && !/[.,!?](\s|$)/.test(text.replace(/\d\.\d/g, ''))) return false;
  return true;
}

function add(text, file, ctx) {
  const n = normalize(text);
  if (!n || DENY.has(n) || DENY_RE.test(n)) return;
  const rec = found.get(n) || { count: 0, files: new Set(), order: found.size };
  rec.count++;
  rec.files.add(path.relative(ROOT, file).replace(/\\/g, '/'));
  if (ctx && ctx !== n) (rec.ctx = rec.ctx || new Set()).add(ctx);
  found.set(n, rec);
}

function calleeName(call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return '';
}

// True when a string literal sits somewhere that is never displayed.
function isCodePosition(node) {
  const p = node.parent;
  if (!p) return false;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return true;
  if (ts.isLiteralTypeNode(p) || ts.isTypeReferenceNode(p)) return true;
  if (ts.isCaseClause(p)) return true;
  if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
  if (ts.isBinaryExpression(p) && /^(===|!==|==|!=)$/.test(p.operatorToken.getText())) return true;
  if (ts.isTypeOfExpression(p)) return true;
  if (ts.isPropertyAssignment(p) && p.name === node) return true; // object key
  if (ts.isJsxAttribute(p)) {
    const attr = p.name.getText();
    if (CODE_ATTRS.has(attr) || attr.startsWith('data-')) return true;
    return !VISIBLE_ATTRS.has(attr);
  }
  if (ts.isCallExpression(p) && p.arguments.includes(node)) {
    if (CODE_CALLEES.test(calleeName(p))) return true;
  }
  // `new Error('…')` / ApiError messages are shown to people; other constructors are code.
  if (ts.isNewExpression(p)) return !/^(Error|ApiError|TypeError)$/.test(p.expression.getText());
  // `x === cond ? 'a' : 'b'` etc. are fine (display); but { key: 'x' } for a few known non-display keys:
  if (ts.isPropertyAssignment(p)) {
    const key = p.name.getText().replace(/['"]/g, '');
    if (/^(id|key|type|kind|status|role|slot|value|icon|color|tone|variant|size|method|url|href|src|path|route|tab|mode|category|field|sort|order|name|action|event|code|currency|unit|lang|font|bg|border|text|className|class|cls)$/.test(key)) {
      // `text`/`name` can be display strings; keep them only when they contain a space/capital sentence-ness
      if (/^(text|name)$/.test(key)) return false;
      return true;
    }
  }
  return false;
}

// The whole sentence a JSX text fragment belongs to, with inline elements /
// expressions shown as <tag>…</tag> / {…}. Only when the parent mixes text with
// other children — that is where splitting a sentence into pieces matters.
function fragmentContext(node) {
  const parent = node.parent;
  if (!parent || !parent.children || parent.children.length < 2) return undefined;
  const kids = parent.children;
  if (!kids.some((k) => !ts.isJsxText(k))) return undefined;
  const parts = kids.map((k) => {
    if (ts.isJsxText(k)) return normalize(decodeEntities(k.getText()));
    if (ts.isJsxExpression(k)) {
      const e = k.expression;
      return e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) ? e.text : '{…}';
    }
    if (ts.isJsxElement(k)) {
      const tag = k.openingElement.tagName.getText();
      const inner = k.children.map((c) => (ts.isJsxText(c) ? normalize(decodeEntities(c.getText())) : '{…}')).join(' ').trim();
      return '<' + tag + '>' + inner + '</' + tag + '>';
    }
    return '<' + (k.tagName ? k.tagName.getText() : 'x') + ' />';
  });
  // Icons / inputs (self-closing tags) don't split a sentence; text, inline
  // elements with text, and dynamic {…} values do.
  const bearing = parts.filter((p) => (/\p{L}/u.test(p.replace(/<[^>]*>/g, (m) => (m.startsWith('</') ? '' : ''))) || p === '{…}') && !/^<[A-Za-z.]+ \/>$/.test(p));
  if (bearing.length < 2) return undefined;
  const ctx = normalize(parts.join(' '));
  return ctx.slice(0, 400);
}

function visit(node, file) {
  if (ts.isJsxText(node)) {
    const t = normalize(decodeEntities(node.getText()));
    if (t && looksLikeDisplayText(t, true)) add(t, file, fragmentContext(node));
  } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    if (!isCodePosition(node)) {
      const t = normalize(decodeEntities(node.text));
      if (t && looksLikeDisplayText(t, false)) add(t, file);
    }
  } else if (ts.isTemplateExpression(node)) {
    if (!isCodePosition(node) && !(node.parent && ts.isJsxAttribute(node.parent) && !VISIBLE_ATTRS.has(node.parent.name.getText()))) {
      let i = 0;
      let text = node.head.text;
      for (const span of node.templateSpans) {
        text += `{${i++}}` + span.literal.text;
      }
      const t = normalize(text);
      // needs real words around the placeholders
      const words = t.replace(/\{\d+\}/g, ' ').match(/\p{L}{2,}/gu) || [];
      if (words.length >= 1 && looksLikeDisplayText(t.replace(/\{\d+\}/g, 'x'), false) && !/^[\s{}\d,.:;\-/()₹%]*$/.test(t)) {
        add(t, file);
      }
    }
  }
  ts.forEachChild(node, (c) => visit(c, file));
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
    } else if (/\.tsx?$/.test(entry.name) && !/\.d\.ts$/.test(entry.name) && !SKIP_FILES.has(entry.name)) {
      const file = path.join(dir, entry.name);
      const src = fs.readFileSync(file, 'utf8');
      const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      visit(sf, file);
    }
  }
}

for (const d of SCAN_DIRS) walk(path.join(ROOT, d));

// Server messages: string values of `message` properties.
function visitServer(node, file) {
  if (ts.isPropertyAssignment(node) && node.name.getText().replace(/['"]/g, '') === 'message') {
    const v = node.initializer;
    if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) {
      const t = normalize(v.text);
      if (looksLikeDisplayText(t, false)) add(t, file);
    } else if (ts.isTemplateExpression(v)) {
      let i = 0;
      let text = v.head.text;
      for (const span of v.templateSpans) text += '{' + i++ + '}' + span.literal.text;
      const t = normalize(text);
      if ((t.replace(/\{\d+\}/g, ' ').match(/\p{L}{2,}/gu) || []).length >= 1) add(t, file);
    }
  }
  ts.forEachChild(node, (c) => visitServer(c, file));
}
function walkServer(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && entry.name !== 'scripts') walkServer(path.join(dir, entry.name));
    } else if (/\.ts$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      const file = path.join(dir, entry.name);
      const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      visitServer(sf, file);
    }
  }
}
for (const d of SERVER_DIRS) walkServer(path.join(ROOT, d));

// Strings added by hand or found by the runtime collector.
if (fs.existsSync(EXTRA)) {
  for (const s of JSON.parse(fs.readFileSync(EXTRA, 'utf8'))) add(s, EXTRA);
}

const list = [...found.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([text, rec]) => ({ text, count: rec.count, order: rec.order, files: [...rec.files].slice(0, 3), ...(rec.ctx ? { ctx: [...rec.ctx].slice(0, 2) } : {}) }));

fs.writeFileSync(OUT, JSON.stringify(list, null, 1));
const totalChars = list.reduce((s, r) => s + r.text.length, 0);
console.log(`Extracted ${list.length} unique strings (${totalChars} characters) -> ${path.relative(ROOT, OUT)}`);
