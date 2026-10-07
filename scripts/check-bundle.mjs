// CI budget (eng review D11): the initial route's JS and CSS, gzipped, must stay
// under 200 KB. Lazy chunks (share renderer, backup, codec UI) are excluded.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const LIMIT = 200 * 1024;
const dist = new URL('../dist/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('.vite/manifest.json', dist), 'utf8'));
const seen = new Set();
let total = 0;
const rows = [];
function add(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const size = gzipSync(readFileSync(new URL(file, dist))).length;
  total += size;
  rows.push([file, size]);
}
function walk(key) {
  const entry = manifest[key];
  if (!entry) return;
  add(entry.file);
  for (const css of entry.css ?? []) add(css);
  for (const imp of entry.imports ?? []) walk(imp);
}
walk('index.html');
for (const [f, s] of rows) console.log(`${(s / 1024).toFixed(1).padStart(7)} KB  ${f}`);
console.log(`initial route total: ${(total / 1024).toFixed(1)} KB gzip (limit ${LIMIT / 1024} KB)`);
if (total > LIMIT) {
  console.error('Bundle budget exceeded');
  process.exit(1);
}
