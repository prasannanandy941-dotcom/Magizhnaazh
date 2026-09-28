// Assembles work/<lang>/*.txt (lines "id | translation") into locales/<lang>.json
// and validates them:
//   node packages/shared-ui/i18n/scripts/build-locales.cjs [lang ...]
//
// Checks per entry: present, non-empty, and the same {0}/{1}… placeholders as
// the English. Bad or missing entries are skipped (the app then shows English
// for that one string) and reported, so a typo can never blank or break the UI.
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(DIR, 'work', 'index.json'), 'utf8'));
const ids = Object.keys(index);
const workDir = path.join(DIR, 'work');
const langs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(workDir).filter((d) => fs.statSync(path.join(workDir, d)).isDirectory() && d !== 'chunks');

// Digits stay 0-9 in every language (rule 5): map any native-script digits back.
const DIGIT_BLOCKS = [0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66];
const latinDigits = (s) => s.replace(/[०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯]/g, (c) => {
  const cp = c.codePointAt(0);
  const base = DIGIT_BLOCKS.find((b) => cp >= b && cp <= b + 9);
  return String(cp - base);
});
const placeholders = (s) => (s.match(/\{\d+\}/g) || []).sort().join(',');
const summary = [];

for (const lang of langs) {
  const dir = path.join(workDir, lang);
  const got = new Map();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.txt')).sort()) {
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) {
      const m = /^(\d+) \| (.*)$/.exec(line);
      if (m) got.set(m[1], latinDigits(m[2].trim()));
    }
  }
  const out = {};
  const problems = [];
  let missing = 0;
  for (const id of ids) {
    const { text, variants } = index[id];
    const tr = got.get(id);
    if (!tr) { missing++; continue; }
    if (placeholders(tr) !== placeholders(text)) { problems.push(`#${id} placeholders: "${text}" -> "${tr}"`); continue; }
    if (/⟦|⟧/.test(tr)) { problems.push(`#${id} contains context marker`); continue; }
    if (tr === text) continue; // brand names, numbers… stay as is
    for (const v of variants) out[v] = tr;
  }
  fs.mkdirSync(path.join(DIR, 'locales'), { recursive: true });
  fs.writeFileSync(path.join(DIR, 'locales', `${lang}.json`), JSON.stringify(out));
  summary.push(`${lang}: ${ids.length - missing - problems.length}/${ids.length} ok, ${missing} missing, ${problems.length} rejected, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
  if (problems.length) console.log(`--- ${lang} rejected:\n` + problems.slice(0, 15).join('\n'));
}
console.log(summary.join('\n'));
