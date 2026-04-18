/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Flowchart DSL parser (M1).
 *
 * Supports a mermaid-inspired subset:
 *   flowchart TD | TB | BT | LR | RL
 *   A[Label]              rect
 *   A(Label)              round
 *   A([Label])            stadium
 *   A{Label}              diamond
 *   A[/Label/]            parallelogram
 *   A --> B               solid edge
 *   A --- B               no-arrow edge
 *   A -.-> B              dotted
 *   A ==> B               thick
 *   A <--> B              bidirectional
 *   A --x B               crossed end
 *   A --o B               round end
 *   A -->|yes| B          edge with pipe label
 *   A -- yes --> B        edge with inline label
 *   A --> B --> C         chain
 *   %% comment
 *
 * Hand-written tokenizer + recursive descent. Zero deps.
 */

import type {
  FlowchartAST,
  FlowchartDirection,
  FlowchartEdge,
  FlowchartEdgeKind,
  FlowchartNode,
  FlowchartShape,
} from "../../core/types";

export class FlowchartParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public col: number
  ) {
    super(`[line ${line}:${col}] ${message}`);
    this.name = "FlowchartParseError";
  }
}

const DIRECTIONS = new Set(["TB", "TD", "BT", "LR", "RL"]);

interface NodeRef {
  id: string;
  /** Optional shape/label declared inline on this reference */
  shape?: FlowchartShape;
  label?: string;
}

/** Try to parse a shape-suffix starting at `pos` in `line`. Returns null if none. */
function parseShapeSuffix(
  line: string,
  pos: number
): { shape: FlowchartShape; label: string; end: number } | null {
  const ch = line[pos];
  if (ch === undefined) return null;

  // Order matters: check multi-char openers first.
  // Stadium: ([ ... ])
  if (ch === "(" && line[pos + 1] === "[") {
    const end = line.indexOf("])", pos + 2);
    if (end < 0) return null;
    return {
      shape: "stadium",
      label: line.slice(pos + 2, end).trim(),
      end: end + 2,
    };
  }
  // Double-paren circle: (( ... ))
  if (ch === "(" && line[pos + 1] === "(") {
    const end = line.indexOf("))", pos + 2);
    if (end < 0) return null;
    return {
      shape: "circle",
      label: line.slice(pos + 2, end).trim(),
      end: end + 2,
    };
  }
  // Double-bracket subroutine: [[ ... ]]
  if (ch === "[" && line[pos + 1] === "[") {
    const end = line.indexOf("]]", pos + 2);
    if (end < 0) return null;
    return {
      shape: "subroutine",
      label: line.slice(pos + 2, end).trim(),
      end: end + 2,
    };
  }
  // Cylinder: [( ... )]
  if (ch === "[" && line[pos + 1] === "(") {
    const end = line.indexOf(")]", pos + 2);
    if (end < 0) return null;
    return {
      shape: "cylinder",
      label: line.slice(pos + 2, end).trim(),
      end: end + 2,
    };
  }
  // Hexagon: {{ ... }}
  if (ch === "{" && line[pos + 1] === "{") {
    const end = line.indexOf("}}", pos + 2);
    if (end < 0) return null;
    return {
      shape: "hexagon",
      label: line.slice(pos + 2, end).trim(),
      end: end + 2,
    };
  }
  // Parallelogram: [/ ... /]
  if (ch === "[" && line[pos + 1] === "/") {
    const end = line.indexOf("/]", pos + 2);
    if (end < 0) return null;
    return {
      shape: "parallelogram",
      label: line.slice(pos + 2, end).trim(),
      end: end + 2,
    };
  }
  // Parallelogram-alt: [\ ... \]
  if (ch === "[" && line[pos + 1] === "\\") {
    const end = line.indexOf("\\]", pos + 2);
    if (end < 0) return null;
    return {
      shape: "parallelogram-alt",
      label: line.slice(pos + 2, end).trim(),
      end: end + 2,
    };
  }
  // Rect: [ ... ]
  if (ch === "[") {
    const end = line.indexOf("]", pos + 1);
    if (end < 0) return null;
    return {
      shape: "rect",
      label: line.slice(pos + 1, end).trim(),
      end: end + 1,
    };
  }
  // Round: ( ... )
  if (ch === "(") {
    const end = line.indexOf(")", pos + 1);
    if (end < 0) return null;
    return {
      shape: "round",
      label: line.slice(pos + 1, end).trim(),
      end: end + 1,
    };
  }
  // Diamond: { ... }
  if (ch === "{") {
    const end = line.indexOf("}", pos + 1);
    if (end < 0) return null;
    return {
      shape: "diamond",
      label: line.slice(pos + 1, end).trim(),
      end: end + 1,
    };
  }
  return null;
}

const ID_CHAR = /[A-Za-z0-9_-]/;

/** Edge operator pattern. We greedily match the longest op beginning at pos. */
interface EdgeOp {
  kind: FlowchartEdgeKind;
  bidirectional: boolean;
  /** End of the operator (exclusive) in the original line */
  end: number;
  /** Optional inline label captured between dashes: "-- text -->" */
  inlineLabel?: string;
}

function parseEdgeOp(line: string, pos: number): EdgeOp | null {
  // Skip whitespace before operator (caller already trimmed, but be robust)
  while (pos < line.length && line[pos] === " ") pos++;

  const rest = line.slice(pos);

  // Optional leading '<' for bidirectional
  const bi = rest.startsWith("<");
  const i = bi ? 1 : 0;

  // Thick: "==..."
  if (rest[i] === "=") {
    // Find the rest of the thick operator until we hit '>' or end of op
    // Pattern: ==+[label]==> or ==+==> or ==+---?
    // Simpler: match /={2,}[^>]*={0,}>?/
    const m = /^(=+)(?:([^=<>]*)(=+))?(>)?/.exec(rest.slice(i));
    if (!m) return null;
    const full = m[0];
    const inlineLabel = m[2]?.trim();
    const hasArrow = m[4] === ">";
    return {
      kind: "thick",
      bidirectional: bi && hasArrow,
      end: pos + i + full.length,
      inlineLabel: inlineLabel && inlineLabel.length > 0 ? inlineLabel : undefined,
    };
  }

  // Dashes: "--...", "-.-..."
  if (rest[i] === "-") {
    // Dotted: "-.-" or "-.->", "-..-"  (mermaid uses -.- ... -.->)
    // We support: -.->  and  -. text .->
    const dotted = /^(-\.+)([^.\-<>]*?)(\.+->|\.+-)?/;
    const dashed = /^(-+)([^-<>|]*?)(-+>|-+x|-+o|-+)?/;

    // Check for dotted first
    const dm = /^-\.+/.exec(rest.slice(i));
    if (dm) {
      // Try with inline label: "-. text .->"
      // Simpler explicit patterns:
      //   "-.-> "           → dotted solid arrow
      //   "-.-"             → dotted no arrow
      //   "-. text .->"     → dotted with inline label + arrow
      //   "-. text .-"      → dotted with inline label, no arrow
      const mWithLabel = /^(-\.+)([^.\-<>]+)(\.+->|\.+-)/.exec(rest.slice(i));
      if (mWithLabel) {
        const full = mWithLabel[0];
        const label = mWithLabel[2]?.trim();
        const hasArrow = mWithLabel[3]!.endsWith(">");
        return {
          kind: "dotted",
          bidirectional: bi && hasArrow,
          end: pos + i + full.length,
          inlineLabel: label && label.length > 0 ? label : undefined,
        };
      }
      // No inline label
      const mPlain = /^(-\.+)(->|-)?/.exec(rest.slice(i));
      if (mPlain) {
        const full = mPlain[0];
        const hasArrow = mPlain[2] === "->";
        return {
          kind: "dotted",
          bidirectional: bi && hasArrow,
          end: pos + i + full.length,
        };
      }
      void dotted;
      return null;
    }

    // Dashes: --, ---, --->, --x, --o, with optional inline "-- text -->"
    // Try labeled form first.
    const mLabeled = /^(-{2,})([^-<>|=][^-<>|=]*?)(-{2,})(>|x|o)?/.exec(rest.slice(i));
    if (mLabeled) {
      const full = mLabeled[0];
      const label = mLabeled[2]?.trim();
      const endCh = mLabeled[4];
      const kind: FlowchartEdgeKind =
        endCh === "x" ? "crossed" : endCh === "o" ? "round-end" : endCh === ">" ? "solid" : "none";
      return {
        kind,
        bidirectional: bi && endCh === ">",
        end: pos + i + full.length,
        inlineLabel: label && label.length > 0 ? label : undefined,
      };
    }
    const mPlain = /^(-{2,})(>|x|o)?/.exec(rest.slice(i));
    if (mPlain) {
      const full = mPlain[0];
      const endCh = mPlain[2];
      const kind: FlowchartEdgeKind =
        endCh === "x" ? "crossed" : endCh === "o" ? "round-end" : endCh === ">" ? "solid" : "none";
      return {
        kind,
        bidirectional: bi && endCh === ">",
        end: pos + i + full.length,
      };
    }
    void dashed;
  }

  return null;
}

/** Parse one node reference: identifier + optional shape-suffix. */
function parseNodeRef(line: string, pos: number): { ref: NodeRef; end: number } | null {
  let i = pos;
  while (i < line.length && ID_CHAR.test(line[i]!)) i++;
  if (i === pos) return null;
  const id = line.slice(pos, i);
  const shape = parseShapeSuffix(line, i);
  if (shape) {
    return {
      ref: { id, shape: shape.shape, label: shape.label },
      end: shape.end,
    };
  }
  return { ref: { id }, end: i };
}

/** Parse pipe label segment immediately after an arrow: "|yes|" */
function parsePipeLabel(line: string, pos: number): { label: string; end: number } | null {
  if (line[pos] !== "|") return null;
  const end = line.indexOf("|", pos + 1);
  if (end < 0) return null;
  return { label: line.slice(pos + 1, end).trim(), end: end + 1 };
}

function skipSpaces(line: string, pos: number): number {
  while (pos < line.length && (line[pos] === " " || line[pos] === "\t")) pos++;
  return pos;
}

interface ParsedNodeDef {
  id: string;
  shape: FlowchartShape;
  label: string;
}

interface PendingEdge {
  from: string;
  to: string;
  kind: FlowchartEdgeKind;
  label?: string;
  bidirectional: boolean;
}

/**
 * Parse a statement line that contains node definitions and/or an edge chain.
 * Returns declared nodes (for shape/label updates) + pending edges.
 *
 * Grammar (simplified, no `&`-fanout in M1):
 *   chain        = nodeRef (edgeOp pipeLabel? nodeRef)*
 */
function parseChainStatement(line: string, lineNo: number): {
  nodes: ParsedNodeDef[];
  edges: PendingEdge[];
} {
  const nodes: ParsedNodeDef[] = [];
  const edges: PendingEdge[] = [];

  let pos = skipSpaces(line, 0);
  const first = parseNodeRef(line, pos);
  if (!first) {
    throw new FlowchartParseError(
      `expected node identifier, got ${JSON.stringify(line.slice(pos, pos + 10))}`,
      lineNo,
      pos + 1
    );
  }
  if (first.ref.shape && first.ref.label !== undefined) {
    nodes.push({ id: first.ref.id, shape: first.ref.shape, label: first.ref.label });
  } else {
    nodes.push({ id: first.ref.id, shape: "rect", label: first.ref.id });
  }

  let prev: NodeRef = first.ref;
  pos = first.end;

  while (pos < line.length) {
    pos = skipSpaces(line, pos);
    if (pos >= line.length) break;

    const op = parseEdgeOp(line, pos);
    if (!op) {
      throw new FlowchartParseError(
        `expected edge operator, got ${JSON.stringify(line.slice(pos, pos + 10))}`,
        lineNo,
        pos + 1
      );
    }
    pos = op.end;

    // Optional pipe label after arrow
    pos = skipSpaces(line, pos);
    let label = op.inlineLabel;
    const pipe = parsePipeLabel(line, pos);
    if (pipe) {
      label = pipe.label;
      pos = pipe.end;
    }

    pos = skipSpaces(line, pos);
    const target = parseNodeRef(line, pos);
    if (!target) {
      throw new FlowchartParseError(
        `expected target node after edge, got ${JSON.stringify(line.slice(pos, pos + 10))}`,
        lineNo,
        pos + 1
      );
    }
    if (target.ref.shape && target.ref.label !== undefined) {
      nodes.push({
        id: target.ref.id,
        shape: target.ref.shape,
        label: target.ref.label,
      });
    } else {
      nodes.push({ id: target.ref.id, shape: "rect", label: target.ref.id });
    }

    edges.push({
      from: prev.id,
      to: target.ref.id,
      kind: op.kind,
      label,
      bidirectional: op.bidirectional,
    });

    prev = target.ref;
    pos = target.end;
  }

  return { nodes, edges };
}

function normalizeDirection(dir: string): FlowchartDirection {
  const up = dir.toUpperCase();
  if (up === "TD") return "TB";
  if (up === "TB" || up === "BT" || up === "LR" || up === "RL") return up;
  return "TB";
}

/** Top-level parser entry. */
export function parseFlowchart(source: string): FlowchartAST {
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  const ast: FlowchartAST = {
    type: "flowchart",
    direction: "TB",
    nodes: [],
    edges: [],
    subgraphs: [],
    classDefs: [],
    linkStyles: new Map(),
  };

  const nodeMap = new Map<string, FlowchartNode>();

  // Find header line (first non-blank, non-comment line)
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]!.trim();
    if (t.length === 0 || t.startsWith("%%")) continue;
    headerIdx = i;
    break;
  }
  if (headerIdx < 0) {
    throw new FlowchartParseError("empty flowchart source", 1, 1);
  }

  const header = lines[headerIdx]!.trim();
  const headerMatch = /^(flowchart|graph)(?:\s+(\w+))?(?:\s+(.*))?$/i.exec(header);
  if (!headerMatch) {
    throw new FlowchartParseError(
      `expected 'flowchart' or 'graph' header, got ${JSON.stringify(header)}`,
      headerIdx + 1,
      1
    );
  }
  const dirTok = headerMatch[2];
  if (dirTok) {
    if (!DIRECTIONS.has(dirTok.toUpperCase())) {
      throw new FlowchartParseError(
        `unknown direction ${JSON.stringify(dirTok)}`,
        headerIdx + 1,
        1
      );
    }
    ast.direction = normalizeDirection(dirTok);
  }
  const extra = headerMatch[3]?.trim();
  if (extra) {
    // title: strip surrounding quotes
    const mQuoted = /^"([^"]*)"$/.exec(extra);
    ast.title = mQuoted ? mQuoted[1] : extra;
  }

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i]!;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith("%%")) continue;

    // `class NodeList ClassName` statement — attach semantic class(es) to nodes
    const classMatch = /^class\s+([\w,\s]+?)\s+(\w[\w-]*)\s*$/.exec(trimmed);
    if (classMatch) {
      const idList = classMatch[1]!
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const className = classMatch[2]!;
      for (const nid of idList) {
        const existing = nodeMap.get(nid);
        if (!existing) {
          const node: FlowchartNode = { id: nid, shape: "rect", label: nid, classes: [className] };
          nodeMap.set(nid, node);
          ast.nodes.push(node);
        } else {
          existing.classes = [...(existing.classes ?? []), className];
        }
      }
      continue;
    }

    // Parse chain statement
    const parsed = parseChainStatement(trimmed, i + 1);

    for (const ndef of parsed.nodes) {
      const existing = nodeMap.get(ndef.id);
      if (!existing) {
        const node: FlowchartNode = {
          id: ndef.id,
          shape: ndef.shape,
          label: ndef.label,
        };
        nodeMap.set(ndef.id, node);
        ast.nodes.push(node);
      } else {
        // Update shape/label if this declaration carries richer info
        if (ndef.label !== ndef.id) {
          existing.label = ndef.label;
        }
        if (ndef.shape !== "rect") {
          existing.shape = ndef.shape;
        }
      }
    }

    for (const e of parsed.edges) {
      const edge: FlowchartEdge = {
        from: e.from,
        to: e.to,
        kind: e.kind,
        label: e.label,
        arrowEnd:
          e.kind === "solid" || e.kind === "thick" || e.kind === "dotted" || e.kind === "bidirectional"
            ? "arrow"
            : e.kind === "crossed"
            ? "cross"
            : e.kind === "round-end"
            ? "circle"
            : "none",
        arrowStart: e.bidirectional ? "arrow" : "none",
      };
      ast.edges.push(edge);
    }
  }

  return ast;
}
