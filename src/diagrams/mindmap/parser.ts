import type { MindmapAST, MindmapNode, MindmapStyle } from "../../core/types";

/**
 * Mindmap DSL parser — markdown-heading + bullet list.
 *
 * Grammar (EBNF):
 *   document  = directive* heading (heading | bullet)*
 *   directive = "%%" key ":" value NEWLINE
 *   heading   = "#"+ SPACE text NEWLINE
 *   bullet    = INDENT ("-" | "*" | "+") SPACE text NEWLINE
 *   INDENT    = /  *\/   (2 spaces = 1 level)
 *
 * Directives: `style` (map | logic-right), `theme`.
 */

const VALID_STYLES: readonly MindmapStyle[] = ["map", "logic-right"];

interface Directives {
  style: MindmapStyle;
  themeOverride?: string;
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
  }
}

export function parseMindmap(text: string): MindmapAST {
  const lines = text.split(/\r?\n/);

  // Skip optional leading "mindmap" marker.
  if (lines[0]?.trim().toLowerCase() === "mindmap") lines.shift();

  const directives: Directives = { style: "map" };
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
      const node: MindmapNode = { id: nextId(), label, depth, children: [] };
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
      const node: MindmapNode = { id: nextId(), label, depth, children: [] };
      attach(node, depth);
      continue;
    }
  }

  if (!root) throw new Error("Mindmap: missing central topic — start with `# Title`");

  const ast: MindmapAST = {
    type: "mindmap",
    style: directives.style,
    root,
  };
  if (directives.themeOverride) ast.themeOverride = directives.themeOverride;
  return ast;
}
