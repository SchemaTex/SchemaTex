import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseResult } from '../dist/index.js';
import { DIAGRAM_REGISTRY, resolveDiagramType } from '../dist/ai/index.js';

const WEBSITE_DOCS = join(process.cwd(), 'website/content/docs');
const REFERENCE_DOCS = join(process.cwd(), 'docs/reference');
const websiteFiles = readdirSync(WEBSITE_DOCS).filter((file) => file.endsWith('.mdx'));
const referenceFiles = readdirSync(REFERENCE_DOCS).filter((file) => file.endsWith('.md'));
const knownKeywords = new Set(
  DIAGRAM_REGISTRY.flatMap((entry) => [entry.type, entry.syntaxKey]).map((word) => word.toLowerCase())
);

let total = 0;
let failed = 0;
const failures = [];
const skipped = {
  total: 0,
  elision: 0,
  placeholder: 0,
  alternation: 0,
};

/**
 * Reproduce what the MDX compiler hands the component. A `<Playground>` written
 * with its DSL indented for readability reaches React with the common leading
 * margin already stripped and relative nesting intact — so reading the raw
 * source and rendering it verbatim checks a string the site never renders.
 */
function dedent(body) {
  const lines = body.split('\n');
  const widths = lines.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length);
  if (!widths.length) return body;
  const base = Math.min(...widths);
  return base === 0 ? body : lines.map((line) => (line.trim() ? line.slice(base) : line)).join('\n');
}

function firstLineOf(dsl) {
  return dsl.split(/\r?\n/).find((line) => line.trim())?.trim() ?? '';
}

/**
 * Classify a block as illustrative-by-design (elided example, placeholder
 * template, grammar alternation) rather than executable DSL.
 *
 * This is applied ONLY to blocks that already failed. Using it as a pre-filter
 * loses real coverage: 12 reference examples parse cleanly yet contain a `...`
 * elision line, and pre-filtering silently stopped checking all of them. A
 * block that passes has no false failure to suppress, so it is always checked.
 */
function illustrativeRule(dsl) {
  const lines = dsl.split(/\r?\n/);
  if (lines.some((line) => /^(?:\.{3}|…)$|^(?:#|\/\/|%%)\s*\.{3}/.test(line.trim()))) return 'elision';
  if (/(?:^|[^=])<[A-Za-z][A-Za-z0-9 _-]*>/.test(dsl)) return 'placeholder';
  if (firstLineOf(dsl).includes('|')) return 'alternation';
  return null;
}

function startsWithKnownKeyword(dsl) {
  const token = /^([A-Za-z][A-Za-z0-9_-]*)/.exec(firstLineOf(dsl))?.[1]?.toLowerCase();
  return token !== undefined && (knownKeywords.has(token) || resolveDiagramType(token) !== undefined);
}

function semanticTokens(dsl) {
  const tokens = new Set();
  const bracketPattern = /\[([^\]]*)\]/g;
  let match;
  while ((match = bracketPattern.exec(dsl)) !== null) {
    for (const part of (match[1] ?? '').split(',')) {
      const token = part.trim();
      if (!token || token.includes(':')) continue;
      if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)%?$/.test(token)) continue;
      if (/^(?:"[\s\S]*"|'[\s\S]*'|“[\s\S]*”|‘[\s\S]*’|「[\s\S]*」|『[\s\S]*』)$/.test(token)) continue;
      if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(token)) tokens.add(token);
    }
  }
  return [...tokens];
}

/**
 * Serialize an AST for token tracing. Plain `JSON.stringify` renders a `Map` or
 * `Set` as `{}` / `{}`, which silently erases every token an engine stores that
 * way — SFC keeps its steps in a Map, so ALL of its attributes looked untraceable
 * and the check reported nine false "documentation lies". Expand both first.
 */
function serializeAst(ast) {
  return JSON.stringify(ast, (_key, value) => {
    if (value instanceof Map) return Object.fromEntries(value);
    if (value instanceof Set) return [...value];
    return value;
  });
}

function checkBlock(file, index, dsl) {
  total++;
  const firstLine = firstLineOf(dsl);
  const found = [];
  const result = parseResult(dsl);

  if (!result.ok) {
    found.push(result.diagnostics[0]?.message ?? 'parseResult returned invalid');
  } else {
    const serializedAst = serializeAst(result.ast).toLowerCase();
    for (const token of semanticTokens(dsl)) {
      if (serializedAst.includes(token.toLowerCase())) continue;
      found.push(`semantic token "${token}" leaves no trace in the parsed AST`);
    }
  }

  if (found.length === 0) return;

  // Only a FAILING block can be excused as illustrative. A passing one stays checked.
  const rule = illustrativeRule(dsl);
  if (rule) {
    skipped.total++;
    skipped[rule]++;
    return;
  }

  for (const error of found) {
    failed++;
    failures.push({ file, index, firstLine, error });
  }
}

for (const file of websiteFiles) {
  const source = readFileSync(join(WEBSITE_DOCS, file), 'utf8');
  const playgroundPattern = /initial=\{`([\s\S]*?)`\}/g;
  let match;
  let index = 0;
  while ((match = playgroundPattern.exec(source)) !== null) {
    index++;
    checkBlock(`website/content/docs/${file}`, index, dedent(match[1] ?? ''));
  }
}

for (const file of referenceFiles) {
  const source = readFileSync(join(REFERENCE_DOCS, file), 'utf8');
  const fencePattern = /^```([^\n`]*)\r?\n([\s\S]*?)^```\s*$/gm;
  let match;
  let index = 0;
  while ((match = fencePattern.exec(source)) !== null) {
    const language = (match[1] ?? '').trim().toLowerCase();
    const dsl = match[2] ?? '';
    if (language !== 'dsl' && (language !== '' || !startsWithKnownKeyword(dsl))) continue;
    index++;
    checkBlock(`docs/reference/${file}`, index, dsl);
  }
}

console.log(
  `Checked ${total} DSL blocks across ${websiteFiles.length} website docs and ${referenceFiles.length} reference docs.`
);
console.log(
  `Skipped ${skipped.total} illustrative blocks (rule matches — elision: ${skipped.elision}, placeholder: ${skipped.placeholder}, alternation: ${skipped.alternation}; categories may overlap).`
);
console.log(`Failures: ${failed}\n`);
for (const failure of failures) {
  console.log(`✗ ${failure.file} [#${failure.index}]  "${failure.firstLine}"`);
  console.log(`    ${failure.error.split('\n')[0]}`);
}

if (failed > 0) process.exitCode = 1;
