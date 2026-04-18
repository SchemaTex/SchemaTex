import { render } from '../dist/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '../website/lib/gallery-data.ts'), 'utf8');

// Extract `dsl: \`...\`,` blocks along with their slug
const re = /slug: '([^']+)',[\s\S]*?dsl: `([\s\S]*?)`,/g;
let m;
const items = [];
while ((m = re.exec(src)) !== null) {
  items.push({ slug: m[1], dsl: m[2] });
}

let fail = 0;
for (const { slug, dsl } of items) {
  try {
    render(dsl);
    console.log(`✓ ${slug}`);
  } catch (e) {
    fail++;
    console.log(`✗ ${slug}: ${e.message}`);
  }
}
console.log(`\n${items.length - fail}/${items.length} pass`);
