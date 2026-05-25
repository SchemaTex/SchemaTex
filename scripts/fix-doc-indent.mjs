import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// MDX strips 2 leading spaces from every line AFTER the first of a multiline
// JSX-attribute template literal (clamped at 0), which collapses parent/child
// levels in indentation-strict DSLs. Pre-compensate: start the literal with a
// newline (so the type-decl line is also a continuation line) and indent the
// whole body by 2 — MDX's -2 then restores the exact 0-based indentation.
const FILES = ['decisiontree.mdx', 'fbd.mdx', 'sfc.mdx', 'prisma.mdx'];
const DOCS = join(process.cwd(), 'website/content/docs');

for (const file of FILES) {
  const path = join(DOCS, file);
  const src = readFileSync(path, 'utf8');
  let count = 0;
  const out = src.replace(/initial=\{`([\s\S]*?)`\}/g, (_m, body) => {
    // Already fixed? (starts with a newline) — leave as-is for idempotency.
    if (body.startsWith('\n')) return `initial={\`${body}\`}`;
    count++;
    const indented = body
      .split('\n')
      .map((l) => (l.length ? '  ' + l : l))
      .join('\n');
    return `initial={\`\n${indented}\`}`;
  });
  writeFileSync(path, out);
  console.log(`${file}: transformed ${count} Playground(s)`);
}
