import type {
  OrgchartAST,
  OrgchartDirection,
  OrgchartEdge,
  OrgchartLayoutMode,
  OrgchartNode,
  OrgchartNodeKind,
  OrgchartRoleIcon,
} from "./types";
import { matchQuotedTitle } from "../../core/quotes";
import { createSourceLocator, findFirstQuotedRange } from "../../core/source-range";

export class OrgchartParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number,
    public source?: string
  ) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "OrgchartParseError";
  }
}

const ROLE_ICONS: Record<string, OrgchartRoleIcon> = {
  ceo: "CEO",
  cto: "CTO",
  cfo: "CFO",
  coo: "COO",
  cmo: "CMO",
  cpo: "CPO",
  vp: "VP",
  engineer: "Engineer",
  engineering: "Engineer",
  designer: "Designer",
  design: "Designer",
  sales: "Sales",
  hr: "HR",
  legal: "Legal",
  ops: "Ops",
  operations: "Ops",
  marketing: "Marketing",
  product: "Product",
  data: "Data",
  advisor: "Advisor",
  intern: "Intern",
  vacant: "Vacant",
};

const NODE_KIND_KEYWORDS = new Set([
  "person",
  "role",
  "open",
  "draft",
  "tbh",
  "advisor",
  "external",
]);

function stripComment(line: string): string {
  let out = "";
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') inQuote = !inQuote;
    if ((ch === "#" || (ch === "/" && out.endsWith("/"))) && !inQuote) {
      if (ch === "/") return out.slice(0, -1);
      return out;
    }
    out += ch;
  }
  return out;
}

function stripQuotes(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

function splitTopLevelCommas(inside: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let inQuote = false;
  for (const ch of inside) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === "," && !inQuote) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function parseProps(inside: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of splitTopLevelCommas(inside)) {
    const s = p.trim();
    if (!s) continue;
    const colon = s.indexOf(":");
    if (colon < 0) {
      // bare flag like [open]
      out[s.toLowerCase()] = "true";
      continue;
    }
    const k = s.slice(0, colon).trim().toLowerCase();
    const v = s.slice(colon + 1).trim();
    out[k] = stripQuotes(v);
  }
  return out;
}

interface RawLine {
  indent: number;
  text: string;
  line: number;
  start: number;
}

function tokenizeLines(text: string): RawLine[] {
  const result: RawLine[] = [];
  const split = text.split("\n");
  let offset = 0;
  for (let i = 0; i < split.length; i++) {
    const raw = split[i] ?? "";
    const stripped = stripComment(raw.replace(/\r$/, ""));
    if (!stripped.trim()) {
      offset += raw.length + (i < split.length - 1 ? 1 : 0);
      continue;
    }
    const match = stripped.match(/^(\s*)(.*)$/);
    if (!match) {
      offset += raw.length + (i < split.length - 1 ? 1 : 0);
      continue;
    }
    const indent = match[1].replace(/\t/g, "  ").length;
    const content = match[2].trim();
    const contentStart = stripped.indexOf(content);
    result.push({ indent, text: content, line: i + 1, start: offset + contentStart });
    offset += raw.length + (i < split.length - 1 ? 1 : 0);
  }
  return result;
}

function parseNodeLine(line: string): {
  kind: OrgchartNodeKind;
  id: string;
  fields: string[];
  props: Record<string, string>;
  nameStart?: number;
  nameEnd?: number;
} | null {
  // Optional leading kind keyword
  let kind: OrgchartNodeKind = "person";
  let rest = line;
  let restStart = 0;
  const firstSp = line.indexOf(" ");
  if (firstSp > 0) {
    const first = line.slice(0, firstSp).toLowerCase();
    if (NODE_KIND_KEYWORDS.has(first)) {
      if (first === "role" || first === "open") kind = "role";
      else if (first === "draft" || first === "tbh") kind = "draft";
      else if (first === "advisor" || first === "external") kind = "advisor";
      else kind = "person";
      const afterKind = line.slice(firstSp + 1);
      const leading = afterKind.length - afterKind.trimStart().length;
      restStart = firstSp + 1 + leading;
      rest = afterKind.trim();
    }
  }

  // <id> : "<name>" | <title> | <department> [props]
  const colonIdx = rest.indexOf(":");
  if (colonIdx < 0) return null;
  const id = rest.slice(0, colonIdx).trim();
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) return null;

  const tailRaw = rest.slice(colonIdx + 1);
  const tailLeading = tailRaw.length - tailRaw.trimStart().length;
  let tail = tailRaw.trim();
  const tailStart = restStart + colonIdx + 1 + tailLeading;
  // Extract [props]
  let props: Record<string, string> = {};
  const propsMatch = tail.match(/\[([^\]]*)\]\s*$/);
  if (propsMatch) {
    props = parseProps(propsMatch[1]);
    tail = tail.slice(0, tail.length - propsMatch[0].length).trim();
  }

  // Split by pipe at top level (respecting quotes)
  const fields: string[] = [];
  let cur = "";
  let inQuote = false;
  for (const ch of tail) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === "|" && !inQuote) {
      fields.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) fields.push(cur.trim());
  const firstRaw = fields[0];
  let nameStart: number | undefined;
  let nameEnd: number | undefined;
  if (firstRaw) {
    const firstAt = tail.indexOf(firstRaw);
    if (firstAt >= 0) {
      nameStart = tailStart + firstAt;
      nameEnd = nameStart + firstRaw.length;
    }
  }
  // name field may be quoted
  if (fields.length > 0) fields[0] = stripQuotes(fields[0]);
  return { kind, id, fields, props, nameStart, nameEnd };
}

function resolveRole(raw: string | undefined): OrgchartRoleIcon | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  return ROLE_ICONS[key];
}

const EDGE_OPS: Array<{ token: string; kind: "report" | "matrix" }> = [
  { token: "-.->", kind: "matrix" },
  { token: "->", kind: "report" },
];

function findEdgeToken(line: string, token: string): number {
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuote = !inQuote;
    if (!inQuote && line.startsWith(token, i)) return i;
  }
  return -1;
}

export function parseOrgchart(text: string): OrgchartAST {
  const rawLines = tokenizeLines(text);
  const locator = createSourceLocator(text);

  let title: string | undefined;
  let titleSourceRange: OrgchartAST["titleSourceRange"];
  let direction: OrgchartDirection = "TD";
  let layout: OrgchartLayoutMode = "tree";
  const nodes: OrgchartNode[] = [];
  const nodeMap = new Map<string, OrgchartNode>();
  const edges: OrgchartEdge[] = [];

  // Indent stack for hierarchical parent resolution
  const indentStack: Array<{ indent: number; id: string }> = [];

  // Recoverable-input notes — the parser degrades rather than throwing.
  const unparseableLines: { line?: number; text: string }[] = [];
  const duplicateIds: string[] = [];
  const impliedNodes: string[] = [];

  for (const rl of rawLines) {
    const line = rl.text;

    // Header
    if (/^orgchart\b/i.test(line)) {
      const t = matchQuotedTitle(line);
      if (t !== undefined) {
        title = t;
        const token = findFirstQuotedRange(line);
        if (token) titleSourceRange = locator.range(rl.start + token.start, rl.start + token.end);
      }
      continue;
    }

    // Config
    if (/^config\b/i.test(line)) {
      const m = line.match(/^config\s*:\s*(\w+)\s*=\s*"?([^"\n]+?)"?\s*$/i);
      if (m) {
        const key = m[1].toLowerCase();
        const val = m[2].trim();
        if (key === "direction") {
          direction = val.toUpperCase() === "LR" ? "LR" : "TD";
        } else if (key === "layout") {
          const v = val.toLowerCase();
          if (v === "list" || v === "directory" || v === "compact") layout = "list";
          else layout = "tree";
        }
      }
      continue;
    }

    // Edge detection (explicit)
    let edgeHandled = false;
    for (const { token, kind } of EDGE_OPS) {
      const idx = findEdgeToken(line, token);
      if (idx < 0) continue;
      const left = line.slice(0, idx).trim();
      let rest = line.slice(idx + token.length).trim();
      if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(left)) break;
      let props: Record<string, string> = {};
      const propsMatch = rest.match(/\[([^\]]*)\]\s*$/);
      if (propsMatch) {
        props = parseProps(propsMatch[1]);
        rest = rest.slice(0, rest.length - propsMatch[0].length).trim();
      }
      const to = rest.split(/\s+/)[0];
      if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(to)) break;
      const edge: OrgchartEdge = { from: left, to, kind };
      if (props.label) edge.label = props.label;
      edges.push(edge);
      edgeHandled = true;
      break;
    }
    if (edgeHandled) continue;

    // Node line
    const parsed = parseNodeLine(line);
    if (!parsed) {
      // Skip-and-warn rather than blanking the whole chart on one bad line.
      unparseableLines.push({ line: rl.line, text: line });
      continue;
    }
    if (nodeMap.has(parsed.id)) {
      // Keep the first declaration; drop the redeclaration with a warning.
      duplicateIds.push(parsed.id);
      continue;
    }

    const node: OrgchartNode = {
      id: parsed.id,
      name: parsed.fields[0] ?? parsed.id,
      title: parsed.fields[1] || undefined,
      department: parsed.fields[2] || undefined,
      info: parsed.fields[3] || undefined,
      kind: parsed.kind,
      matrix: [],
    };
    if (parsed.nameStart !== undefined && parsed.nameEnd !== undefined) {
      node.nameSourceRange = locator.range(
        rl.start + parsed.nameStart,
        rl.start + parsed.nameEnd
      );
    }

    const p = parsed.props;
    if (p.role) node.role = resolveRole(p.role);
    if (p.icon) node.role = resolveRole(p.icon) ?? node.role;
    if (p.open === "true") {
      node.open = true;
      node.kind = "role";
    }
    if (p.draft === "true" || p.tbh === "true") {
      node.draft = true;
      node.kind = "draft";
    }
    if (p.external === "true") {
      node.external = true;
      if (node.kind === "person") node.kind = "advisor";
    }
    if (p["assistant-of"]) node.assistantOf = p["assistant-of"];
    if (p.reports) node.parent = p.reports;
    if (p.matrix) {
      node.matrix = p.matrix.split(/[\s,]+/).filter(Boolean);
    }
    if (p.department) node.department = p.department;
    if (p["avatar-color"] || p.avatarcolor) {
      node.avatarColor = p["avatar-color"] ?? p.avatarcolor;
    }
    if (p.gender) {
      const g = p.gender.toLowerCase();
      if (g === "male" || g === "m") node.gender = "male";
      else if (g === "female" || g === "f") node.gender = "female";
    }
    // info line: note / email / phone / location (first one wins if multiple)
    if (!node.info) {
      node.info = p.note ?? p.email ?? p.phone ?? p.location ?? undefined;
    }
    if (p.status) {
      const s = p.status.toLowerCase();
      if (s === "new" || s === "leaving" || s === "on-leave") node.status = s;
    }
    if (node.kind === "role" && node.open === undefined && !p.draft) node.open = true;
    if (node.kind === "role" && !node.role) node.role = "Vacant";

    // Resolve parent via indent stack (only if not explicitly set)
    while (indentStack.length > 0 && indentStack[indentStack.length - 1].indent >= rl.indent) {
      indentStack.pop();
    }
    if (!node.parent && indentStack.length > 0) {
      node.parent = indentStack[indentStack.length - 1].id;
    }
    indentStack.push({ indent: rl.indent, id: node.id });

    // Attach matrix edges
    for (const m of node.matrix) {
      edges.push({ from: m, to: node.id, kind: "matrix" });
    }

    nodes.push(node);
    nodeMap.set(node.id, node);
  }

  // Add implicit report edges from parent relationships (hierarchical)
  for (const n of nodes) {
    if (n.parent && !n.assistantOf) {
      // Skip if an explicit report edge already exists
      const exists = edges.some(
        (e) => e.kind === "report" && e.from === n.parent && e.to === n.id
      );
      if (!exists) edges.push({ from: n.parent, to: n.id, kind: "report" });
    }
  }

  // Synthesize nodes for ids referenced only by edges. This lets an edge-only
  // chart (`CEO -> CTO`, Mermaid-style shorthand) render instead of throwing —
  // the layout builds the hierarchy from report edges, so the implied nodes
  // slot straight in. Recorded as a warning so the author can declare them.
  const ensureNode = (id: string): void => {
    if (nodeMap.has(id)) return;
    const node: OrgchartNode = { id, name: id, kind: "person", matrix: [] };
    nodes.push(node);
    nodeMap.set(id, node);
    impliedNodes.push(id);
  };
  for (const e of edges) {
    ensureNode(e.from);
    ensureNode(e.to);
  }

  if (nodes.length === 0) {
    // Nothing renderable at all (empty / header-only / all-unparseable).
    throw new OrgchartParseError(
      unparseableLines.length > 0
        ? `Orgchart has no parseable nodes (${unparseableLines.length} line(s) could not be read)`
        : "Orgchart has no nodes"
    );
  }

  const ast: OrgchartAST = {
    type: "orgchart",
    title,
    titleSourceRange,
    direction,
    layout,
    nodes,
    edges,
  };
  if (unparseableLines.length || duplicateIds.length || impliedNodes.length) {
    ast.recovered = {
      ...(unparseableLines.length ? { unparseableLines } : {}),
      ...(duplicateIds.length ? { duplicateIds } : {}),
      ...(impliedNodes.length ? { impliedNodes } : {}),
    };
  }
  return ast;
}
