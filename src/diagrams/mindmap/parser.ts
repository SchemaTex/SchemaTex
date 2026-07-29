import type { MindmapAST, MindmapNode, MindmapStyle, SourceRange } from "../../core/types";
import { createSourceLocator } from "../../core/source-range";
import { tokenizeInline } from "./inline";
import {
  type ExtendedMindmapMode,
  EXTENDED_MODES,
  baseStyleFor,
  setMode,
} from "./modes";

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

export class MindmapParseError extends Error {
  public code?: string;
  public hint?: string;

  constructor(
    message: string,
    public line?: number,
    public column?: number,
    public source?: string,
    code?: string,
    hint?: string
  ) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "MindmapParseError";
    this.code = code;
    this.hint = hint;
  }
}

const VALID_STYLES: readonly MindmapStyle[] = ["map", "logic-right"];
const DEFAULT_MAX_LABEL_WIDTH = 240;

interface Directives {
  style: MindmapStyle;
  /** Extended mode (futureswheel / driver) when selected; else mirrors `style`. */
  mode: ExtendedMindmapMode;
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
    out.mode = val as MindmapStyle;
  } else if (key === "style" && (EXTENDED_MODES as readonly string[]).includes(val)) {
    // Extended mode (futureswheel/driver): carried out-of-band; `style` holds
    // the base it renders on. `val` is narrowed by the `.includes` guard above,
    // so the cast to the literal union is sound (mirrors the base-style branch).
    out.mode = val as ExtendedMindmapMode;
    out.style = baseStyleFor(out.mode);
  } else if (key === "theme") {
    out.themeOverride = val;
  } else if (key === "maxlabelwidth") {
    const n = Number(val);
    if (Number.isFinite(n) && n >= 80 && n <= 1000) out.maxLabelWidth = n;
  }
}

function makeNode(
  id: string,
  label: string,
  depth: number,
  sourceRange?: SourceRange
): MindmapNode {
  return { id, label, tokens: tokenizeInline(label), depth, children: [], sourceRange };
}

export function parseMindmap(text: string): MindmapAST {
  const locator = createSourceLocator(text);
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) lineStarts.push(i + 1);
  }
  const allLines = text.split(/\r?\n/);
  // The shared wrapper pass blanks Markdown fences in place so source
  // positions remain stable. Locate the optional marker after those blank
  // lines instead of assuming it is physical line 1.
  const markerIndexes = allLines
    .map((line, index) => ({ index, value: line.trim().toLowerCase() }))
    .filter((entry) => entry.value === "mindmap")
    .map((entry) => entry.index);
  if (markerIndexes.length > 1) {
    const duplicate = markerIndexes[1]!;
    throw new MindmapParseError(
      "duplicate `mindmap` engine marker",
      duplicate + 1,
      undefined,
      allLines[duplicate],
      "DOCUMENT_DUPLICATE_ENGINE_MARKER",
      "Keep one optional `mindmap` marker before the single `# Title` root."
    );
  }
  const markerIndex = markerIndexes[0];
  const lines = allLines;

  const directives: Directives = { style: "map", mode: "map", maxLabelWidth: DEFAULT_MAX_LABEL_WIDTH };
  let root: MindmapNode | null = null;
  let rootLine: number | undefined;
  let rootInferred: "line" | "placeholder" | undefined;
  let idCounter = 0;
  const nextId = () => `n${idCounter++}`;
  const labelRange = (
    sourceLineIndex: number,
    line: string,
    captured: string,
    label: string
  ): SourceRange | undefined => {
    const capturedAt = line.lastIndexOf(captured);
    const labelAt = capturedAt < 0 ? -1 : capturedAt + captured.indexOf(label);
    const lineStart = lineStarts[sourceLineIndex];
    if (lineStart === undefined || labelAt < 0) return undefined;
    return locator.range(lineStart + labelAt, lineStart + labelAt + label.length);
  };

  // Parent stack — tracks (node, depth). Bullet depth = lastHeadingDepth + 1 + floor(indent / 2).
  const stack: { node: MindmapNode; depth: number }[] = [];
  let lastHeadingDepth = 0;

  // Recover a central topic when the DSL has none. A mindmap with one node is
  // still a meaningful diagram, so the engine degrades to a `partial` render
  // (flagged by lint) rather than throwing and blanking everything — a common
  // LLM mistake is to forget the leading `# Title`.
  const ensurePlaceholderRoot = (): MindmapNode => {
    if (root) return root;
    root = makeNode(nextId(), "Mindmap", 0);
    rootInferred = "placeholder";
    stack.length = 0;
    stack.push({ node: root, depth: 0 });
    lastHeadingDepth = 0;
    return root;
  };

  const attach = (node: MindmapNode, depth: number, _lineNo: number, _source: string) => {
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    // No parent on the stack → the DSL opened with a bullet / H2+ before any
    // root. Insert a synthetic placeholder root and hang the orphan under it.
    const parent = stack[stack.length - 1]?.node ?? ensurePlaceholderRoot();
    node.depth = parent.depth + 1;
    parent.children.push(node);
    stack.push({ node, depth });
  };

  for (let i = 0; i < lines.length; i++) {
    if (i === markerIndex) continue;
    const raw = lines[i] ?? "";
    const lineNo = i + 1;
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
      const node = makeNode(
        nextId(),
        label,
        depth,
        labelRange(i, line, heading[2], label)
      );
      if (depth === 0) {
        if (root) {
          throw new MindmapParseError(
            `multiple \`#\` center nodes not allowed (first root at line ${rootLine ?? "unknown"})`,
            lineNo,
            undefined,
            line,
            "MINDMAP_MULTIPLE_ROOTS",
            "Keep exactly one `# Title` center node; use `##` and deeper headings for branches."
          );
        }
        root = node;
        rootLine = lineNo;
        stack.length = 0;
        stack.push({ node, depth: 0 });
      } else {
        attach(node, depth, lineNo, line);
      }
      lastHeadingDepth = depth;
      continue;
    }

    const bullet = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bullet) {
      const indent = bullet[1].length;
      const depth = lastHeadingDepth + 1 + Math.floor(indent / 2);
      const label = bullet[2].trim();
      const node = makeNode(
        nextId(),
        label,
        depth,
        labelRange(i, line, bullet[2], label)
      );
      attach(node, depth, lineNo, line);
      continue;
    }

    // Plain text line with no `#` and no bullet marker. Legacy behaviour is to
    // ignore it. But if we have no central topic yet, the most common cause is
    // an LLM writing the title as a bare line (`My Topic`) instead of `# Title`
    // — adopt it as the center rather than discarding it and orphaning the rest.
    if (!root && stack.length === 0) {
      const lineStart = lineStarts[i];
      const labelAt = line.indexOf(trimmed);
      root = makeNode(
        nextId(),
        trimmed,
        0,
        lineStart === undefined || labelAt < 0
          ? undefined
          : locator.range(lineStart + labelAt, lineStart + labelAt + trimmed.length)
      );
      rootInferred = "line";
      stack.push({ node: root, depth: 0 });
      lastHeadingDepth = 0;
      continue;
    }
  }

  // Only a completely empty / directive-only document has nothing to draw.
  if (!root) throw new MindmapParseError("missing central topic — start with `# Title`");

  const ast: MindmapAST = {
    type: "mindmap",
    style: directives.style,
    root,
    maxLabelWidth: directives.maxLabelWidth,
  };
  if (rootInferred) ast.rootInferred = rootInferred;
  if (directives.themeOverride) ast.themeOverride = directives.themeOverride;
  // Carry the extended mode (futureswheel / driver) out-of-band on the AST.
  setMode(ast, directives.mode);
  return ast;
}
