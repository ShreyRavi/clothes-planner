// CI: tokens.css must match the color tokens in DESIGN.md front matter (DR14).
import { readFileSync } from 'node:fs';
const design = readFileSync(new URL('../DESIGN.md', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const front = design.split('---')[1];
const section = (name) => front.split(`  ${name}:`)[1].split(/\n  \w+:|\nspacing/)[0];
const pairs = (text) => [...text.matchAll(/^\s+([\w-]+): "(#[0-9A-Fa-f]{6})"/gm)].map((m) => [m[1], m[2].toUpperCase()]);
const cssBlock = (selector) => css.split(selector)[1].split('}')[0];
let bad = 0;
for (const [mode, selector] of [['light', ':root {'], ['dark', ":root[data-theme='dark'] {"]]) {
  const block = cssBlock(selector);
  for (const [name, hex] of pairs(section(mode))) {
    const m = new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(block);
    if (!m || m[1].toUpperCase() !== hex) {
      bad++;
      console.error(`${mode} --${name}: DESIGN.md ${hex}, tokens.css ${m?.[1] ?? 'missing'}`);
    }
  }
}
if (bad) process.exit(1);
console.log('tokens match DESIGN.md');
