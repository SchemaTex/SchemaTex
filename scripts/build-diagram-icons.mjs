// Generates website/lib/diagram-icons.generated.ts from the designed SVG sources
// in assets/icons/*.svg. Each diagram type's representative glyph is authored as
// a standalone SVG (24x24, currentColor, stroke 1.5); this script extracts the
// inner markup and emits a typed Record so the website renders the *same* glyph
// the designer drew — no hand-ported paths in DiagramIcon.tsx.
//
// Run: node scripts/build-diagram-icons.mjs  (also wired into website prebuild)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllDiagramTypes } from '../dist/ai/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconsDir = join(root, 'assets', 'icons');
const outFile = join(root, 'website', 'lib', 'diagram-icons.generated.ts');

// Icon filename → DiagramType, where the two differ.
const FILE_TO_TYPE = {
  block: 'blockdiagram',
  decision: 'decisiontree',
};
// Non-type files in assets/icons/ to ignore.
const SKIP = new Set(['logo-mark', 'logo-mark-outline', 'preview']);

function innerMarkup(svg) {
  const open = svg.indexOf('>', svg.indexOf('<svg'));
  const close = svg.lastIndexOf('</svg>');
  return svg
    .slice(open + 1, close)
    .replace(/\s+xmlns="[^"]*"/g, '')
    .trim()
    .replace(/\n\s*/g, '\n  ');
}

const files = readdirSync(iconsDir).filter((f) => f.endsWith('.svg'));
const markup = {};
for (const f of files) {
  const stem = basename(f, '.svg');
  if (SKIP.has(stem)) continue;
  const type = FILE_TO_TYPE[stem] ?? stem;
  markup[type] = innerMarkup(readFileSync(join(iconsDir, f), 'utf8'));
}

// Coverage check — every diagram type must have a glyph.
const allTypes = getAllDiagramTypes();
const missing = allTypes.filter((t) => !(t in markup));
if (missing.length > 0) {
  console.error(`[build-diagram-icons] missing icons for: ${missing.join(', ')}`);
  console.error(`Add assets/icons/<type>.svg for each, then re-run.`);
  process.exit(1);
}
const extra = Object.keys(markup).filter((t) => !allTypes.includes(t));
if (extra.length > 0) {
  console.warn(`[build-diagram-icons] icons with no registry type (ignored): ${extra.join(', ')}`);
  for (const t of extra) delete markup[t];
}

const entries = allTypes
  .map((t) => `  ${JSON.stringify(t)}: ${JSON.stringify(markup[t])},`)
  .join('\n');

const out = `// AUTO-GENERATED from assets/icons/*.svg by scripts/build-diagram-icons.mjs.
// Do not edit by hand — edit the SVG source and re-run the generator.
import type { DiagramType } from 'schematex/ai';

export const DIAGRAM_ICON_MARKUP: Record<DiagramType, string> = {
${entries}
};
`;

writeFileSync(outFile, out);
console.log(`[build-diagram-icons] wrote ${outFile} (${allTypes.length} icons)`);
