import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '../dist/index.js';

const DOCS = join(process.cwd(), 'website/content/docs');
const files = readdirSync(DOCS).filter((f) => f.endsWith('.mdx'));

let total = 0;
let failed = 0;
const failures = [];

/**
 * Reproduce what the MDX compiler hands the component. A `<Playground>` written
 * with its DSL indented for readability reaches React with the common leading
 * margin already stripped and relative nesting intact — so reading the raw
 * source and rendering it verbatim checks a string the site never renders.
 */
function dedent(body) {
  const lines = body.split('\n');
  const widths = lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length);
  if (!widths.length) return body;
  const base = Math.min(...widths);
  return base === 0 ? body : lines.map((l) => (l.trim() ? l.slice(base) : l)).join('\n');
}

for (const file of files) {
  const src = readFileSync(join(DOCS, file), 'utf8');
  // Match <Playground ... initial={`...`} ...>  — capture the template literal body.
  const re = /initial=\{`([\s\S]*?)`\}/g;
  let m;
  let idx = 0;
  while ((m = re.exec(src)) !== null) {
    idx++;
    total++;
    const dsl = dedent(m[1]);
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
