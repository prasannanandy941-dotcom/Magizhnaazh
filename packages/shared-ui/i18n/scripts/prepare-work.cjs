// Splits source-strings.json into numbered chunks for translation:
//   node packages/shared-ui/i18n/scripts/prepare-work.cjs [chunkSize]
//
// Case variants ("Pending" / "pending" / "PENDING") share one translation, so
// each lowercase key appears once, shown in its most-capitalised form.
// Ids are STABLE: the first run assigns them in discovery order (text from the
// same screen stays together); later runs keep every existing id and only
// write chunks (add-NN.txt) for strings that are new since.
//   work/index.json           id -> { text, variants:[…] }
//   work/chunks/NN.txt        "id | English"  (+ "  ⟦context⟧" for split sentences)
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..');
const list = JSON.parse(fs.readFileSync(path.join(DIR, 'source-strings.json'), 'utf8'));
const size = Number(process.argv[2]) || 180;
const indexPath = path.join(DIR, 'work', 'index.json');
const chunksDir = path.join(DIR, 'work', 'chunks');
const caps = (s) => (s.match(/[A-Z]/g) || []).length;

const byLower = new Map();
for (const r of list.sort((a, b) => a.order - b.order)) {
  const k = r.text.toLowerCase();
  const cur = byLower.get(k);
  if (!cur) byLower.set(k, { text: r.text, variants: [r.text], ctx: r.ctx || [] });
  else {
    cur.variants.push(r.text);
    if (caps(r.text) > caps(cur.text)) cur.text = r.text;
    for (const c of r.ctx || []) if (!cur.ctx.includes(c)) cur.ctx.push(c);
  }
}

const existing = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : null;
const index = existing || {};
const idByLower = new Map();
let maxId = 0;
for (const [id, e] of Object.entries(index)) {
  for (const v of e.variants) idByLower.set(v.toLowerCase(), Number(id));
  maxId = Math.max(maxId, Number(id));
}

const fresh = [];
for (const e of byLower.values()) {
  const id = idByLower.get(e.text.toLowerCase());
  if (id) {
    // known string: just pick up any new case variants
    const rec = index[id];
    for (const v of e.variants) if (!rec.variants.includes(v)) rec.variants.push(v);
  } else {
    fresh.push(e);
  }
}
fresh.forEach((e) => { index[++maxId] = { text: e.text, variants: [...new Set(e.variants)] }; e.id = maxId; });

fs.mkdirSync(chunksDir, { recursive: true });
const prefix = existing ? `add-${Date.now().toString(36)}-` : '';
if (!existing) fs.rmSync(chunksDir, { recursive: true, force: true }), fs.mkdirSync(chunksDir, { recursive: true });
let n = 0;
for (let i = 0; i < fresh.length; i += size) {
  const lines = fresh.slice(i, i + size).map((e) => `${e.id} | ${e.text}${e.ctx[0] ? `   ⟦${e.ctx[0].slice(0, 220)}⟧` : ''}`);
  n++;
  fs.writeFileSync(path.join(chunksDir, prefix + String(n).padStart(2, '0') + '.txt'), lines.join('\n') + '\n');
}
fs.writeFileSync(indexPath, JSON.stringify(index));
console.log(`${Object.keys(index).length} strings total, ${fresh.length} new -> ${n} chunk(s) in work/chunks/`);
