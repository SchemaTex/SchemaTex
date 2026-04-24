#!/usr/bin/env node
/**
 * Build-time script: compile MDX content (examples + syntax docs) into a
 * typed TypeScript module that `src/ai/*` can import without runtime fs.
 *
 * Inputs
 *   website/content/examples/*.mdx   — curated examples (frontmatter + body)
 *   website/content/docs/*.mdx       — per-diagram syntax tutorials (JSX stripped)
 *
 * Output
 *   src/ai/_generated.ts             — EXAMPLES + SYNTAX exports, typed
 *
 * Runs via `npm run build:ai` or as a prepublish step.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXAMPLES_DIR = join(ROOT, "website/content/examples");
const DOCS_DIR = join(ROOT, "website/content/docs");
const OUT_FILE = join(ROOT, "src/ai/_generated.ts");

// Known valid syntax docs — keyed by DIAGRAM_REGISTRY.syntaxKey
// (not every file in docs/ is a diagram; e.g. api.mdx, contributing.mdx)
const SYNTAX_KEYS = [
  "genogram",
  "ecomap",
  "pedigree",
  "phylo",
  "sociogram",
  "timing",
  "logic",
  "circuit",
  "block",
  "ladder",
  "sld",
  "entity",
  "fishbone",
  "venn",
  "decisiontree",
  "flowchart",
  "matrix",
  "orgchart",
  "mindmap",
  "timeline",
];

// ─── Minimal YAML-frontmatter parser ─────────────────────────────
// Handles the exact subset used in our MDX:
//   key: value
//   key: [a, b, c]
//   key: |            (literal block)
//     line 1
//     line 2
//   key:
//     sub: value      (nested object)
function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const yaml = match[1];
  const body = match[2];
  const data = {};

  const lines = yaml.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const key = m[1];
    const rest = m[2];

    if (rest === "|" || rest === "|-" || rest === "|+") {
      // Literal block — gather subsequent indented lines.
      const blockLines = [];
      i++;
      let indent = -1;
      while (i < lines.length) {
        const bl = lines[i];
        if (bl.trim() === "") {
          blockLines.push("");
          i++;
          continue;
        }
        const leading = bl.match(/^(\s+)/);
        if (!leading) break;
        if (indent === -1) indent = leading[1].length;
        if (leading[1].length < indent) break;
        blockLines.push(bl.slice(indent));
        i++;
      }
      // Strip trailing empty lines
      while (blockLines.length && blockLines[blockLines.length - 1] === "") {
        blockLines.pop();
      }
      data[key] = blockLines.join("\n");
      continue;
    }

    if (rest === "") {
      // Nested object — gather indented sub-lines
      const obj = {};
      i++;
      while (i < lines.length) {
        const sl = lines[i];
        if (!sl.trim()) {
          i++;
          continue;
        }
        if (!sl.startsWith("  ")) break;
        const sm = sl.trim().match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
        if (sm) obj[sm[1]] = parseScalar(sm[2]);
        i++;
      }
      data[key] = obj;
      continue;
    }

    data[key] = parseScalar(rest);
    i++;
  }

  return { data, body };
}

function parseScalar(v) {
  const t = v.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (/^-?\d+$/.test(t)) return Number(t);
  // Array literal: [a, b, c]
  if (t.startsWith("[") && t.endsWith("]")) {
    return t
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/^["']|["']$/g, ""));
  }
  // Quoted string
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

// ─── MDX body cleanup for getSyntax() output ────────────────────
// Convert `<Playground initial={`...`} height={...} />` → ```dsl\n...\n```
// Strip other JSX tags while preserving markdown.
function cleanSyntaxBody(body) {
  let out = body;

  // Multi-line <Playground initial={`...`} ... /> → fenced block
  out = out.replace(
    /<Playground\s+initial=\{`([\s\S]*?)`\}[^/]*\/>/g,
    (_, dsl) => `\n\`\`\`\n${dsl}\n\`\`\`\n`
  );

  // Self-closing <Callout ... /> or single-line JSX — drop
  out = out.replace(/<([A-Z][A-Za-z]*)[^>]*\/>/g, "");

  // Paired JSX blocks like <Tabs> ... </Tabs> — keep inner text, drop tags
  out = out.replace(/<\/?[A-Z][A-Za-z]*[^>]*>/g, "");

  // Collapse runs of 3+ blank lines
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

// ─── Read examples ──────────────────────────────────────────────
function readExamples() {
  const files = readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith(".mdx"));
  const examples = [];
  for (const file of files) {
    const raw = readFileSync(join(EXAMPLES_DIR, file), "utf8");
    const { data, body } = parseFrontmatter(raw);
    if (data.status && data.status !== "published") continue;
    if (!data.dsl) {
      console.warn(`[build-ai-content] ${file}: missing 'dsl' frontmatter, skipping`);
      continue;
    }
    if (!data.diagram) {
      console.warn(`[build-ai-content] ${file}: missing 'diagram' frontmatter, skipping`);
      continue;
    }
    examples.push({
      slug: basename(file, ".mdx"),
      diagram: data.diagram,
      title: data.title ?? data.slug,
      description: data.description ?? "",
      standard: data.standard ?? "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      complexity: typeof data.complexity === "number" ? data.complexity : 1,
      featured: data.featured === true,
      dsl: String(data.dsl).trimEnd(),
      notes: cleanSyntaxBody(body),
    });
  }
  return examples;
}

// ─── Trim syntax body for LLM consumption ──────────────────────
// Every docs/{type}.mdx follows the same section convention:
//   ## About {diagram}                ← history, Wikipedia links; cut
//   ## 1. Your first …                ← START (keep from here)
//   ## 2..N. <topic>                  ← core grammar / rules / examples
//   ## N. Grammar (EBNF)              ← END (keep through here)
//   ## N+1. Standard compliance       ← historical refs; cut
//   ## N+2. Related examples          ← getExamples covers this; cut
//   ## N+3. Roadmap                   ← future features; cut
//
// Keeping `## 1.` through `## N. Grammar (EBNF)` saves ~25% tokens
// per syntax doc with zero loss of grammar content.
const TRIM_END_HEADINGS = /^## \d+\. (Standard compliance|Related examples|References|See also|Roadmap)\b/m;

function trimForLlm(body) {
  // Find the "## 1." start.
  const startMatch = body.match(/^## 1\. /m);
  const start = startMatch ? startMatch.index : 0;

  // Find the first trailing low-value section after the start.
  const tail = body.slice(start);
  const endMatch = tail.match(TRIM_END_HEADINGS);
  const end = endMatch ? start + endMatch.index : body.length;

  return body.slice(start, end).trim();
}

// ─── Read syntax docs ──────────────────────────────────────────
function readSyntax() {
  const out = {};
  for (const key of SYNTAX_KEYS) {
    const path = join(DOCS_DIR, `${key}.mdx`);
    try {
      const raw = readFileSync(path, "utf8");
      const { data, body } = parseFrontmatter(raw);
      const cleaned = cleanSyntaxBody(body);
      const trimmed = trimForLlm(cleaned);
      out[key] = {
        title: data.title ?? key,
        content: trimmed,
      };
    } catch {
      console.warn(`[build-ai-content] missing docs/${key}.mdx`);
    }
  }
  return out;
}

// ─── Emit _generated.ts ─────────────────────────────────────────
function emit(examples, syntax) {
  const header = `/**
 * AUTO-GENERATED by scripts/build-ai-content.mjs — do not edit by hand.
 * Regenerate with: npm run build:ai
 *
 * Compiled content bundle for the AI tool layer. Keeps MDX content
 * available to the published npm package without runtime fs access.
 */
`;

  const examplesLit = JSON.stringify(examples, null, 2);
  const syntaxLit = JSON.stringify(syntax, null, 2);

  const body = `
export interface GeneratedExample {
  slug: string;
  diagram: string;
  title: string;
  description: string;
  standard: string;
  tags: readonly string[];
  complexity: number;
  featured: boolean;
  dsl: string;
  notes: string;
}

export interface GeneratedSyntax {
  title: string;
  content: string;
}

export const EXAMPLES: readonly GeneratedExample[] = ${examplesLit};

export const SYNTAX: Readonly<Record<string, GeneratedSyntax>> = ${syntaxLit};
`;

  writeFileSync(OUT_FILE, header + body, "utf8");
  console.log(
    `[build-ai-content] wrote ${OUT_FILE} (${examples.length} examples, ${
      Object.keys(syntax).length
    } syntax docs)`
  );
}

const examples = readExamples();
const syntax = readSyntax();
emit(examples, syntax);
