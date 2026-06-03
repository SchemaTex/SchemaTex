// Guards the gallery use-case taxonomy against drift: every `industry:` domain
// token used across the example corpus must map to a use-case bucket in
// website/lib/use-cases.ts. A new, unmapped token would otherwise silently fall
// into the 'business' fallback bucket. Run: node scripts/check-use-cases.mjs
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Known domain tokens, parsed from the `domains: [...]` arrays in use-cases.ts.
const taxonomy = readFileSync(join(root, 'website/lib/use-cases.ts'), 'utf8');
const known = new Set(
  [...taxonomy.matchAll(/domains:\s*\[([\s\S]*?)\]/g)]
    .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((t) => t[1])),
);

// Every domain token used across example frontmatter.
const exDir = join(root, 'website/content/examples');
const used = new Map(); // token -> [slugs]
for (const file of readdirSync(exDir).filter((f) => f.endsWith('.mdx'))) {
  const src = readFileSync(join(exDir, file), 'utf8');
  const m = src.match(/^industry:\s*\[(.*)\]\s*$/m);
  if (!m) continue;
  for (const raw of m[1].split(',')) {
    const tok = raw.trim();
    if (!tok) continue;
    (used.get(tok) ?? used.set(tok, []).get(tok)).push(file.replace('.mdx', ''));
  }
}

const unmapped = [...used.keys()].filter((t) => !known.has(t)).sort();
if (unmapped.length) {
  console.error(`✗ ${unmapped.length} unmapped use-case domain token(s):\n`);
  for (const t of unmapped) {
    console.error(`  ${t}  (e.g. ${used.get(t).slice(0, 2).join(', ')})`);
  }
  console.error('\nAdd each to a bucket in website/lib/use-cases.ts.');
  process.exit(1);
}
console.log(`✓ all ${used.size} example domain tokens map to a use-case bucket`);
