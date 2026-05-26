import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '../dist/index.js';

const DOCS = join(process.cwd(), 'website/content/docs');
const files = readdirSync(DOCS).filter((f) => f.endsWith('.mdx'));

let total = 0;
let failed = 0;
const failures = [];

for (const file of files) {
  const src = readFileSync(join(DOCS, file), 'utf8');
  // Match <Playground ... initial={`...`} ...>  — capture the template literal body.
  const re = /initial=\{`([\s\S]*?)`\}/g;
  let m;
  let idx = 0;
  while ((m = re.exec(src)) !== null) {
    idx++;
    total++;
    const dsl = m[1];
    const firstLine = dsl.trim().split('\n')[0];
    try {
      const svg = render(dsl);
      if (!svg || !svg.includes('<svg')) {
        failed++;
        failures.push({ file, idx, firstLine, err: 'no <svg> output' });
      }
    } catch (e) {
      failed++;
      failures.push({ file, idx, firstLine, err: e instanceof Error ? e.message : String(e) });
    }
  }
}

console.log(`Checked ${total} Playground DSLs across ${files.length} docs.`);
console.log(`Failures: ${failed}\n`);
for (const f of failures) {
  console.log(`✗ ${f.file} [#${f.idx}]  "${f.firstLine}"`);
  console.log(`    ${f.err.split('\n')[0]}`);
}
