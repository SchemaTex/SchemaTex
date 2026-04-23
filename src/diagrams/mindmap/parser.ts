import type { MindmapAST, MindmapNode, MindmapStyle } from "../../core/types";
import { tokenizeInline } from "./inline";

/**
 * Mindmap DSL parser — markdown-heading + bullet list with inline markdown.
 *
 * Grammar (EBNF):
 *   document  = directive* heading (heading | bullet)*
 *   directive = "%%" key ":" value NEWLINE
 *   heading   = "#"+ SPACE text NEWLINE
 *   bullet    = INDENT ("-" | "*" | "+") SPACE text NEWLINE
 *   INDENT    = /  *\/   (2 spaces = 1 level)
 *
 * `text` may contain inline markdown (bold / italic / code / link /
 * leading `[ ]` task checkbox). Tokens are parsed here and attached to
 * the node; layout & renderer consume `tokens` rather than `label`.
 *
 * Directives: `style`, `theme`, `maxLabelWidth`.
 */

const VALID_STYLES: readonly MindmapStyle[] = ["map", "logic-right"];
const DEFAULT_MAX_LABEL_WIDTH = 240;

interface Directives {
  style: MindmapStyle;
  themeOverride?: string;
  maxLabelWidth: number;
}

function parseDirective(line: string, out: Directives): void {
  const body = line.replace(/^%%\s*/, "").trim();
  const idx = body.indexOf(":");
  if (idx < 0) return;
  const key = body.slice(0, idx).trim().toLowerCase();
  const val = body.slice(idx + 1).trim();
  if (key === "style" && (VALID_STYLES as readonly string[]).includes(val)) {
    out.style = val as MindmapStyle;
  } else if (key === "theme") {
    out.themeOverride = val;
  } else if (key === "maxlabelwidth") {
    const n = Number(val);
    if (Number.isFinite(n) && n >= 80 && n <= 1000) out.maxLabelWidth = n;
  }
}

function makeNode(id: string, label: string, depth: number): MindmapNode {
  return { id, label, tokens: tokenizeInline(label), depth, children: [] };
}

export function parseMindmap(text: string): MindmapAST {
  const lines = text.split(/\r?\n/);

  // Skip optional leading "mindmap" marker.
  if (lines[0]?.trim().toLowerCase() === "mindmap") lines.shift();

  const directives: Directives = { style: "map", maxLabelWidth: DEFAULT_MAX_LABEL_WIDTH };
  let root: MindmapNode | null = null;
  let idCounter = 0;
  const nextId = () => `n${idCounter++}`;

  // Parent stack — tracks (node, depth). Bullet depth = lastHeadingDepth + 1 + floor(indent / 2).
  const stack: { node: MindmapNode; depth: number }[] = [];
  let lastHeadingDepth = 0;

  const attach = (node: MindmapNode, depth: number) => {
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1]?.node;
    if (!parent) throw new Error("Mindmap: orphan node — expected root # heading first");
    node.depth = parent.depth + 1;
    parent.children.push(node);
    stack.push({ node, depth });
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("%%")) {
      parseDirective(trimmed, directives);
      continue;
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.+)$/);
    if (heading) {
      const depth = heading[1].length - 1; // H1 → 0 (root), H2 → 1, ...
      const label = heading[2].trim();
      const node = makeNode(nextId(), label, depth);
      if (depth === 0) {
        if (root) throw new Error("Mindmap: multiple `#` center nodes not allowed");
        root = node;
        stack.length = 0;
        stack.push({ node, depth: 0 });
      } else {
        attach(node, depth);
      }
      lastHeadingDepth = depth;
      continue;
    }

    const bullet = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bullet) {
      const indent = bullet[1].length;
      const depth = lastHeadingDepth + 1 + Math.floor(indent / 2);
      const label = bullet[2].trim();
      const node = makeNode(nextId(), label, depth);
      attach(node, depth);
      continue;
    }
  }

  if (!root) throw new Error("Mindmap: missing central topic — start with `# Title`");

  const ast: MindmapAST = {
    type: "mindmap",
    style: directives.style,
    root,
    maxLabelWidth: directives.maxLabelWidth,
  };
  if (directives.themeOverride) ast.themeOverride = directives.themeOverride;
  return ast;
}
