// GitHub Pages: skip Jekyll so files starting with _ are served as-is.
import { writeFileSync } from 'node:fs';
writeFileSync(new URL('../dist/.nojekyll', import.meta.url), '');
console.log('postbuild: wrote dist/.nojekyll');
