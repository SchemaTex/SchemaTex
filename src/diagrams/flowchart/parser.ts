/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Flowchart DSL parser.
 *
 * Supports a mermaid-inspired subset:
 *   flowchart TD | TB | BT | LR | RL
 *   A[Label]              rect
 *   A(Label)              round
 *   A([Label])            stadium
 *   A{Label}              diamond
 *   A[/Label/]            parallelogram
 *   A[\Label\]            parallelogram-alt
 *   A[/Label\]            trapezoid
 *   A[\Label/]            trapezoid-alt
 *   A[[Label]]            subroutine
 *   A[(Label)]            cylinder
 *   A((Label))            circle
 *   A(((Label)))          double-circle
 *   A{{Label}}            hexagon
 *   A>Label]              asymmetric
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
 *   A & B --> C & D       fan-out (cross-product edges)
 *   subgraph "Title"      cluster grouping
 *     ...
 *   end
 *   class A,B className   semantic class assignment
 *   style A fill:#f9f,... per-node style
 *   classDef name ...     class definition (stored, applied in renderer)
 *   %% comment
 *
 * Hand-written tokenizer + recursive descent. Zero deps.
 */

import type {
  FlowchartAST,
  FlowchartClassDef,
  FlowchartDirection,
  FlowchartEdge,
  FlowchartEdgeKind,
  FlowchartNode,
  FlowchartShape,
  FlowchartSubgraph,
} from "../../core/types";

export class FlowchartParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
    public source?: string
  ) {
    super(`[line ${line}:${column}] ${message}`);
    this.name = "FlowchartParseError";
  }
}

const DIRECTIONS = new Set(["TB", "TD", "BT", "LR", "RL"]);

interface NodeRef {
  id: string;
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

  // Asymmetric: >label]
  if (ch === ">") {
    const end = line.indexOf("]", pos + 1);
    if (end < 0) return null;
    return { shape: "asymmetric", label: line.slice(pos + 1, end).trim(), end: end + 1 };
  }

  // Triple paren double-circle: ((( ... )))
  if (ch === "(" && line[pos + 1] === "(" && line[pos + 2] === "(") {
    const end = line.indexOf(")))", pos + 3);
    if (end < 0) return null;
    return { shape: "double-circle", label: line.slice(pos + 3, end).trim(), end: end + 3 };
  }

  // Stadium: ([ ... ])
  if (ch === "(" && line[pos + 1] === "[") {
    const end = line.indexOf("])", pos + 2);
    if (end < 0) return null;
    return { shape: "stadium", label: line.slice(pos + 2, end).trim(), end: end + 2 };
  }

  // Double-paren circle: (( ... ))
  if (ch === "(" && line[pos + 1] === "(") {
    const end = line.indexOf("))", pos + 2);
    if (end < 0) return null;
    return { shape: "circle", label: line.slice(pos + 2, end).trim(), end: end + 2 };
  }

  // Double-bracket subroutine: [[ ... ]]
  if (ch === "[" && line[pos + 1] === "[") {
    const end = line.indexOf("]]", pos + 2);
    if (end < 0) return null;
    return { shape: "subroutine", label: line.slice(pos + 2, end).trim(), end: end + 2 };
  }

  // Cylinder: [( ... )]
  if (ch === "[" && line[pos + 1] === "(") {
    const end = line.indexOf(")]", pos + 2);
    if (end < 0) return null;
    return { shape: "cylinder", label: line.slice(pos + 2, end).trim(), end: end + 2 };
  }

  // Hexagon: {{ ... }}
  if (ch === "{" && line[pos + 1] === "{") {
    const end = line.indexOf("}}", pos + 2);
    if (end < 0) return null;
    return { shape: "hexagon", label: line.slice(pos + 2, end).trim(), end: end + 2 };
  }

  // Trapezoid: [/ ... \]  (wider at top)
  if (ch === "[" && line[pos + 1] === "/") {
    const endSlash = line.indexOf("\\]", pos + 2);
    if (endSlash >= 0) {
      return { shape: "trapezoid", label: line.slice(pos + 2, endSlash).trim(), end: endSlash + 2 };
    }
    // Fall through to plain parallelogram [/ /]
    const end = line.indexOf("/]", pos + 2);
    if (end < 0) return null;
    return { shape: "parallelogram", label: line.slice(pos + 2, end).trim(), end: end + 2 };
  }

  // Trapezoid-alt: [\ ... /]  (wider at bottom)
  if (ch === "[" && line[pos + 1] === "\\") {
    const endFwd = line.indexOf("/]", pos + 2);
    if (endFwd >= 0) {
      return { shape: "trapezoid-alt", label: line.slice(pos + 2, endFwd).trim(), end: endFwd + 2 };
    }
    // Parallelogram-alt: [\ \]
    const end = line.indexOf("\\]", pos + 2);
    if (end < 0) return null;
    return { shape: "parallelogram-alt", label: line.slice(pos + 2, end).trim(), end: end + 2 };
  }

  // Rect: [ ... ]
  if (ch === "[") {
    const end = line.indexOf("]", pos + 1);
    if (end < 0) return null;
    return { shape: "rect", label: line.slice(pos + 1, end).trim(), end: end + 1 };
  }

  // Round: ( ... )
  if (ch === "(") {
    const end = line.indexOf(")", pos + 1);
    if (end < 0) return null;
    return { shape: "round", label: line.slice(pos + 1, end).trim(), end: end + 1 };
  }

  // Diamond: { ... }
  if (ch === "{") {
    const end = line.indexOf("}", pos + 1);
    if (end < 0) return null;
    return { shape: "diamond", label: line.slice(pos + 1, end).trim(), end: end + 1 };
  }

  return null;
}

const ID_CHAR = /[A-Za-z0-9_-]/;

interface EdgeOp {
  kind: FlowchartEdgeKind;
  bidirectional: boolean;
  end: number;
  inlineLabel?: string;
}

function parseEdgeOp(line: string, pos: number): EdgeOp | null {
  while (pos < line.length && line[pos] === " ") pos++;

  const rest = line.slice(pos);

  const bi = rest.startsWith("<");
  const i = bi ? 1 : 0;

  // Thick: "==..."
  if (rest[i] === "=") {
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
    const dm = /^-\.+/.exec(rest.slice(i));
    if (dm) {
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
      const mPlain = /^(-\.+)(->|-)?/.exec(rest.slice(i));
      if (mPlain) {
        const full = mPlain[0];
        const hasArrow = mPlain[2] === "->";
        return { kind: "dotted", bidirectional: bi && hasArrow, end: pos + i + full.length };
      }
      return null;
    }

    // Dashes with inline label: "-- text -->" or "-- text ---"
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
      return { kind, bidirectional: bi && endCh === ">", end: pos + i + full.length };
    }
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
    return { ref: { id, shape: shape.shape, label: shape.label }, end: shape.end };
  }
  return { ref: { id }, end: i };
}

/** Parse pipe label segment: "|yes|" */
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

/** Register a NodeRef into the nodes accumulator. */
function registerNode(ref: NodeRef, nodes: ParsedNodeDef[]): void {
  if (ref.shape && ref.label !== undefined) {
    nodes.push({ id: ref.id, shape: ref.shape, label: ref.label });
  } else {
    nodes.push({ id: ref.id, shape: "rect", label: ref.id });
  }
}

/**
 * Parse a node group: one or more node refs joined by `&`.
 * Returns the list of parsed refs and the position after the group.
 *
 * e.g. `A & B[Label] & C` → [{id:"A"}, {id:"B",label:"Label"}, {id:"C"}]
 */
function parseNodeGroup(
  line: string,
  startPos: number,
  lineNo: number,
  nodes: ParsedNodeDef[]
): { refs: NodeRef[]; end: number } {
  let pos = skipSpaces(line, startPos);
  const first = parseNodeRef(line, pos);
  if (!first) {
    throw new FlowchartParseError(
      `expected node identifier, got ${JSON.stringify(line.slice(pos, pos + 10))}`,
      lineNo,
      pos + 1
    );
  }
  registerNode(first.ref, nodes);
  const refs: NodeRef[] = [first.ref];
  pos = first.end;

  // Consume additional `& nodeRef` segments
  while (true) {
    const p2 = skipSpaces(line, pos);
    if (line[p2] !== "&") break;
    const p3 = skipSpaces(line, p2 + 1);
    const next = parseNodeRef(line, p3);
    if (!next) break;
    registerNode(next.ref, nodes);
    refs.push(next.ref);
    pos = next.end;
  }

  return { refs, end: pos };
}

/**
 * Parse a statement line containing node definitions and/or an edge chain.
 *
 * Grammar:
 *   chain = nodeGroup (edgeOp pipeLabel? nodeGroup)*
 *   nodeGroup = nodeRef ("&" nodeRef)*
 *
 * Fan-out: A & B --> C & D generates 4 edges (cross-product).
 */
function parseChainStatement(line: string, lineNo: number): {
  nodes: ParsedNodeDef[];
  edges: PendingEdge[];
} {
  const nodes: ParsedNodeDef[] = [];
  const edges: PendingEdge[] = [];

  let pos = skipSpaces(line, 0);
  const firstGroup = parseNodeGroup(line, pos, lineNo, nodes);
  let prevGroup = firstGroup.refs;
  pos = firstGroup.end;

  while (pos < line.length) {
    pos = skipSpaces(line, pos);
    if (pos >= line.length) break;

    const op = parseEdgeOp(line, pos);
    if (!op) {
      // Trailing content that's not an edge op — only an error if non-trivial
      const tail = line.slice(pos).trim();
      if (tail.length > 0) {
        throw new FlowchartParseError(
          `expected edge operator, got ${JSON.stringify(tail.slice(0, 10))}`,
          lineNo,
          pos + 1
        );
      }
      break;
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
    const targetGroup = parseNodeGroup(line, pos, lineNo, nodes);
    pos = targetGroup.end;

    // Cross-product edges: each source → each target
    for (const from of prevGroup) {
      for (const to of targetGroup.refs) {
        edges.push({
          from: from.id,
          to: to.id,
          kind: op.kind,
          label,
          bidirectional: op.bidirectional,
        });
      }
    }

    prevGroup = targetGroup.refs;
  }

  return { nodes, edges };
}

/** Parse a subgraph header line (the part after `subgraph`). */
function parseSubgraphHeader(rest: string, idx: number): FlowchartSubgraph {
  const defaultId = `sg_${idx}`;
  const s = rest.trim();
  if (!s) return { id: defaultId, label: defaultId, children: [], subgraphs: [] };

  // id [label]  — Mermaid: `subgraph ide1 [one]`
  const idBracket = /^(\w[\w-]*)\s+\[([^\]]*)\]$/.exec(s);
  if (idBracket) return { id: idBracket[1]!, label: idBracket[2]!, children: [], subgraphs: [] };

  // id "label"
  const idQuoted = /^(\w[\w-]*)\s+"([^"]*)"$/.exec(s);
  if (idQuoted) return { id: idQuoted[1]!, label: idQuoted[2]!, children: [], subgraphs: [] };

  // "label"  (no explicit id)
  const quotedOnly = /^"([^"]*)"$/.exec(s);
  if (quotedOnly) return { id: defaultId, label: quotedOnly[1]!, children: [], subgraphs: [] };

  // plain id (use as both id and label)
  const plainId = s.split(/\s/)[0]!;
  return { id: plainId, label: plainId, children: [], subgraphs: [] };
}

function normalizeDirection(dir: string): FlowchartDirection {
  const up = dir.toUpperCase();
  if (up === "TD") return "TB";
  if (up === "TB" || up === "BT" || up === "LR" || up === "RL") return up;
  return "TB";
}

/** Parse simple CSS-ish props: `fill:#f9f,stroke:#333,stroke-width:4px` */
function parseCssProps(s: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const part of s.split(",")) {
    const colon = part.indexOf(":");
    if (colon < 0) continue;
    const key = part.slice(0, colon).trim();
    const val = part.slice(colon + 1).trim();
    if (key) props[key] = val;
  }
  return props;
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

  // ── Find header ──────────────────────────────────────────────
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]!.trim();
    if (t.length === 0 || t.startsWith("%%")) continue;
    headerIdx = i;
    break;
  }
  if (headerIdx < 0) throw new FlowchartParseError("empty flowchart source", 1, 1);

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
      throw new FlowchartParseError(`unknown direction ${JSON.stringify(dirTok)}`, headerIdx + 1, 1);
    }
    ast.direction = normalizeDirection(dirTok);
  }
  const extra = headerMatch[3]?.trim();
  if (extra) {
    const mQuoted = /^"([^"]*)"$/.exec(extra);
    ast.title = mQuoted ? mQuoted[1] : extra;
  }

  // ── Subgraph stack for tracking current scope ────────────────
  const subgraphStack: Array<FlowchartSubgraph> = [];

  // ── Statement loop ───────────────────────────────────────────
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i]!;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith("%%")) continue;

    // ── subgraph open ────────────────────────────────────────
    const sgMatch = /^subgraph(?:\s+(.*))?$/.exec(trimmed);
    if (sgMatch) {
      const sg = parseSubgraphHeader(sgMatch[1] ?? "", ast.subgraphs.length);
      // Avoid duplicate ids (can happen with repeated `subgraph` without id)
      let finalId = sg.id;
      let collision = 0;
      while (ast.subgraphs.some((s) => s.id === finalId)) {
        finalId = `${sg.id}_${++collision}`;
      }
      sg.id = finalId;
      ast.subgraphs.push(sg);
      if (subgraphStack.length > 0) {
        const parent = subgraphStack[subgraphStack.length - 1]!;
        if (!parent.subgraphs.includes(sg.id)) parent.subgraphs.push(sg.id);
      }
      subgraphStack.push(sg);
      continue;
    }

    // ── direction override inside subgraph ───────────────────
    const dirMatch = /^direction\s+(TB|TD|BT|LR|RL)$/i.exec(trimmed);
    if (dirMatch && subgraphStack.length > 0) {
      subgraphStack[subgraphStack.length - 1]!.direction = normalizeDirection(dirMatch[1]!);
      continue;
    }

    // ── end (close subgraph) ─────────────────────────────────
    if (trimmed === "end" && subgraphStack.length > 0) {
      subgraphStack.pop();
      continue;
    }

    // ── class statement: `class A,B className` ───────────────
    const classMatch = /^class\s+([\w,\s]+?)\s+(\w[\w-]*)\s*$/.exec(trimmed);
    if (classMatch) {
      const idList = classMatch[1]!.split(/[,\s]+/).map((s) => s.trim()).filter((s) => s.length > 0);
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

    // ── classDef: store for future renderer use ──────────────
    const classDefMatch = /^classDef\s+(\w[\w-]*)\s+(.+)$/.exec(trimmed);
    if (classDefMatch) {
      const cdef: FlowchartClassDef = {
        id: classDefMatch[1]!,
        props: parseCssProps(classDefMatch[2]!),
      };
      // Replace if already defined
      const existIdx = ast.classDefs.findIndex((c) => c.id === cdef.id);
      if (existIdx >= 0) ast.classDefs[existIdx] = cdef;
      else ast.classDefs.push(cdef);
      continue;
    }

    // ── style statement: `style nodeId fill:#f9f,...` ────────
    const styleMatch = /^style\s+(\w[\w-]*)\s+(.+)$/.exec(trimmed);
    if (styleMatch) {
      const nid = styleMatch[1]!;
      const props = parseCssProps(styleMatch[2]!);
      const existing = nodeMap.get(nid);
      if (existing) {
        existing.style = { ...(existing.style ?? {}), ...props };
      } else {
        const node: FlowchartNode = { id: nid, shape: "rect", label: nid, style: props };
        nodeMap.set(nid, node);
        ast.nodes.push(node);
      }
      continue;
    }

    // ── linkStyle: parse but skip rendering for now ──────────
    if (/^linkStyle\s/.test(trimmed)) continue;

    // ── edge / node chain statement ──────────────────────────
    let parsed: { nodes: ParsedNodeDef[]; edges: PendingEdge[] };
    try {
      parsed = parseChainStatement(trimmed, i + 1);
    } catch (e) {
      if (e instanceof FlowchartParseError) throw e;
      // Swallow unknown lines silently (e.g. `%%{init}%%` blocks)
      continue;
    }

    const currentSg = subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1]! : null;

    for (const ndef of parsed.nodes) {
      const existing = nodeMap.get(ndef.id);
      if (!existing) {
        const node: FlowchartNode = {
          id: ndef.id,
          shape: ndef.shape,
          label: ndef.label,
          parent: currentSg?.id,
        };
        nodeMap.set(ndef.id, node);
        ast.nodes.push(node);
        if (currentSg && !currentSg.children.includes(ndef.id)) {
          currentSg.children.push(ndef.id);
        }
      } else {
        // Update shape/label only when this declaration carries richer info
        if (ndef.label !== ndef.id) existing.label = ndef.label;
        if (ndef.shape !== "rect") existing.shape = ndef.shape;
        // Assign parent if first time inside a subgraph
        if (currentSg && !existing.parent) {
          existing.parent = currentSg.id;
          if (!currentSg.children.includes(existing.id)) currentSg.children.push(existing.id);
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
