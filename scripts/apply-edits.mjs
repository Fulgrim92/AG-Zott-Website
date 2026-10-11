#!/usr/bin/env node
// Writes text edits made in the preview's edit mode back into src/data/*.json.
//   node scripts/apply-edits.mjs edits.json
// edits.json is what "Copy edits" puts on the clipboard: [{ file, path, original, value }, ...].
// Only the edited strings change; formatting, key order and everything else in the files stay as they are.
// An edit is skipped (and reported) when the file no longer holds the original wording at that place.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) { console.error('usage: node scripts/apply-edits.mjs edits.json'); process.exit(1); }
const edits = JSON.parse(readFileSync(src, 'utf8'));
const dataDir = new URL('../src/data/', import.meta.url);
const FILES = new Set(['home', 'team', 'site']);

// every string in document order, so the n-th occurrence of a wording in the text is the n-th in the parse
const strings = (o, p = [], out = []) => {
  if (typeof o === 'string') out.push([p.join('.'), o]);
  else if (Array.isArray(o)) o.forEach((v, i) => strings(v, [...p, i], out));
  else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => strings(v, [...p, k], out));
  return out;
};
// the JSON spelling of a string as written in these files (UTF-8 kept, only quotes, backslashes and control characters escaped)
const lit = (s) => JSON.stringify(s);

let applied = 0;
const byFile = Map.groupBy ? Map.groupBy(edits, (e) => e.file) : edits.reduce((m, e) => m.set(e.file, [...(m.get(e.file) ?? []), e]), new Map());
for (const [file, list] of byFile) {
  if (!FILES.has(file)) { console.warn(`skip: unknown file ${file}`); continue; }
  const path = fileURLToPath(new URL(`${file}.json`, dataDir));
  let text = readFileSync(path, 'utf8');
  for (const e of list) {
    const all = strings(JSON.parse(text));
    const i = all.findIndex(([p]) => p === e.path);
    if (i < 0 || all[i][1] !== e.original) { console.warn(`skip: ${file}:${e.path} no longer reads "${e.original}"`); continue; }
    // which occurrence of this exact wording is it?
    const nth = all.slice(0, i).filter(([, v]) => v === e.original).length;
    const needle = lit(e.original);
    let at = -1;
    for (let k = 0; k <= nth; k++) at = text.indexOf(needle, at + 1);
    if (at < 0) { console.warn(`skip: ${file}:${e.path} not found in the file text`); continue; }
    text = text.slice(0, at) + lit(e.value) + text.slice(at + needle.length);
    applied++;
    console.log(`${file}:${e.path}\n  - ${e.original}\n  + ${e.value}`);
  }
  JSON.parse(text); // still valid
  writeFileSync(path, text);
}
console.log(`${applied} of ${edits.length} edit(s) applied.`);
