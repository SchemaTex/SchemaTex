import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = process.cwd();
const EX = join(ROOT, 'website/content/examples');
const DOCS = join(ROOT, 'website/content/docs');

function fm(src, key) {
  const m = src.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

// Build type -> ordered slugs (featured first, then complexity asc, then slug).
const byType = new Map();
for (const f of readdirSync(EX).filter((f) => f.endsWith('.mdx'))) {
  const src = readFileSync(join(EX, f), 'utf8');
  const type = fm(src, 'diagram');
  if (!type) continue;
  const slug = basename(f, '.mdx');
  const featured = /^featured:\s*true/m.test(src);
  const cx = Number(fm(src, 'complexity') || '2');
  (byType.get(type) ?? byType.set(type, []).get(type)).push({ slug, featured, cx });
}
for (const arr of byType.values()) {
  arr.sort((a, b) => (b.featured - a.featured) || (a.cx - b.cx) || a.slug.localeCompare(b.slug));
}

let touched = 0;
for (const f of readdirSync(DOCS).filter((f) => f.endsWith('.mdx'))) {
  const type = basename(f, '.mdx');
  const slugs = byType.get(type);
  if (!slugs) continue; // not a diagram type with examples
  const path = join(DOCS, f);
  let src = readFileSync(path, 'utf8');
  if (src.includes('<RelatedExamples')) continue; // already linked
  const list = slugs.slice(0, 6).map((s) => `  '${s.slug}',`).join('\n');
  const section = `\n---\n\n## Related examples\n\nReady-to-use scenarios from the examples gallery:\n\n<RelatedExamples slugs={[\n${list}\n]} />\n`;
  src = src.replace(/\s*$/, '\n') + section;
  writeFileSync(path, src);
  touched++;
  console.log(`+ ${f} (${slugs.length} examples)`);
}
console.log(`\nAdded RelatedExamples to ${touched} docs.`);
