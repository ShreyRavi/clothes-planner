// CI: every template file must match the template shape (eng review, CONTRIBUTING).
import { readdirSync, readFileSync } from 'node:fs';
const dir = new URL('../src/templates/', import.meta.url);
let bad = 0;
const ids = new Set();
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const t = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  const errs = [];
  for (const k of ['id', 'name', 'description']) if (typeof t[k] !== 'string' || !t[k]) errs.push(`${k} missing`);
  if (typeof t.order !== 'number') errs.push('order must be a number');
  for (const k of ['functions', 'optional']) {
    if (!Array.isArray(t[k])) { errs.push(`${k} must be an array`); continue; }
    t[k].forEach((fn, i) => {
      if (typeof fn.name !== 'string' || !fn.name) errs.push(`${k}[${i}].name missing`);
      if (typeof fn.timeOfDay !== 'string') errs.push(`${k}[${i}].timeOfDay must be a string`);
      if (typeof fn.dressCode !== 'string') errs.push(`${k}[${i}].dressCode must be a string`);
    });
  }
  if (ids.has(t.id)) errs.push(`duplicate id ${t.id}`);
  ids.add(t.id);
  if (errs.length) { bad++; console.error(`${f}:\n  ${errs.join('\n  ')}`); }
}
if (bad) process.exit(1);
console.log(`templates ok (${ids.size})`);
