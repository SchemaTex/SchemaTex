import type {
  DTreeDirection,
  InfluenceArc,
  InfluenceAST,
  InfluenceNode,
  InfluenceNodeKind,
} from "./types";
import { DTreeParseError } from "./parser";

// ─── Influence-diagram parser ────────────────────────────────
//
// Grammar (one statement per line, indentation ignored — flat DAG):
//
//   decisiontree:influence "Title"?
//   direction: left-right            (optional config; left-right is the default)
//   decision <id> "Label"?           declare a decision node (rectangle)
//   chance   <id> "Label"?           declare a chance node (oval)
//   value    <id> "Label"? utility=N declare the value node (hexagon)
//   <from> -> <to> "Label"?          directed arc (influence)
//
// `node` is also accepted as a generic alias when followed by a kind:
//   node <id> kind=decision "Label"
//
// Arcs reference node ids. Arc semantics are derived from the destination kind
// (information → decision, relevance → chance, functional → value). The graph
// must be acyclic and contain at least one value node.

interface RawLine {
  text: string;
  line: number;
}

function preprocess(src: string): RawLine[] {
  const out: RawLine[] = [];
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
    out.push({ text: trimmed, line: i + 1 });
  }
  return out;
}

/** Split a line into tokens, honoring double-quoted strings. */
function tokenize(s: string, lineNum: number): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '"') {
      const end = s.indexOf('"', i + 1);
      if (end < 0) throw new DTreeParseError(`Unterminated string: ${s}`, lineNum);
      tokens.push(s.slice(i, end + 1));
      i = end + 1;
      continue;
    }
    let j = i;
    while (j < s.length && !/\s/.test(s[j]!) && s[j] !== '"') j++;
    tokens.push(s.slice(i, j));
    i = j;
  }
  return tokens;
}

function unquote(s: string): string {
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  return s;
}

function isQuoted(s: string): boolean {
  return s.startsWith('"') && s.endsWith('"') && s.length >= 2;
}

function toKind(kw: string): InfluenceNodeKind | undefined {
  if (kw === "decision" || kw === "dec") return "decision";
  if (kw === "chance" || kw === "uncertainty" || kw === "event") return "chance";
  if (kw === "value" || kw === "utility" || kw === "objective") return "value";
  return undefined;
}

const NODE_KEYWORDS = new Set([
  "decision",
  "dec",
  "chance",
  "uncertainty",
  "event",
  "value",
  "utility",
  "objective",
  "node",
]);

export function parseInfluence(src: string, title: string | undefined): InfluenceAST {
  const lines = preprocess(src);

  const nodes: InfluenceNode[] = [];
  const nodeById = new Map<string, InfluenceNode>();
  const arcDecls: Array<{ from: string; to: string; label?: string; line: number }> = [];
  let direction: DTreeDirection = "left-right";

  for (const { text, line } of lines) {
    // Config line: `key: value` (must not look like a node/arc statement).
    const cfg = text.match(/^([a-zA-Z][\w-]*)\s*:\s*(.+)$/);
    if (cfg && !text.includes("->") && !NODE_KEYWORDS.has(cfg[1]!.toLowerCase())) {
      const key = cfg[1]!.toLowerCase();
      const val = cfg[2]!.trim().toLowerCase();
      if (key === "direction") {
        direction = val === "top-down" || val === "td" ? "top-down" : "left-right";
      }
      continue;
    }

    // Arc statement: `<from> -> <to> "Label"?`
    if (text.includes("->")) {
      const arrowIdx = text.indexOf("->");
      const fromPart = text.slice(0, arrowIdx).trim();
      const afterTokens = tokenize(text.slice(arrowIdx + 2).trim(), line);
      const to = afterTokens[0];
      if (!fromPart || !to) {
        throw new DTreeParseError(`Malformed arc: "${text}"`, line);
      }
      let label: string | undefined;
      if (afterTokens[1] !== undefined && isQuoted(afterTokens[1])) {
        label = unquote(afterTokens[1]);
      }
      arcDecls.push({ from: fromPart, to: unquote(to), label, line });
      continue;
    }

    // Node declaration: `<kind> <id> "Label"? key=val...`
    const tokens = tokenize(text, line);
    const kw = tokens[0];
    if (!kw) continue;

    let kind: InfluenceNodeKind | undefined;
    let idIdx = 1;
    if (kw === "node") {
      // generic form: node <id> kind=decision "Label"
      kind = undefined; // resolved below from kind= key
    } else {
      kind = toKind(kw.toLowerCase());
      if (!kind) {
        throw new DTreeParseError(
          `Unknown influence statement "${kw}" (expected decision/chance/value or an arc "a -> b")`,
          line,
        );
      }
    }

    const id = tokens[idIdx];
    if (!id || isQuoted(id)) {
      throw new DTreeParseError(`Node declaration requires an id: "${text}"`, line);
    }
    idIdx++;

    let label = "";
    let utility: number | undefined;
    for (let k = idIdx; k < tokens.length; k++) {
      const tok = tokens[k]!;
      if (isQuoted(tok)) {
        label = unquote(tok);
      } else if (tok.includes("=")) {
        const eq = tok.indexOf("=");
        const key = tok.slice(0, eq).toLowerCase();
        const value = tok.slice(eq + 1);
        if (key === "utility" || key === "payoff" || key === "value") {
          const num = Number(value);
          if (!Number.isNaN(num)) utility = num;
        } else if (key === "kind") {
          const resolved = toKind(value.toLowerCase());
          if (!resolved) throw new DTreeParseError(`Unknown node kind "${value}"`, line);
          kind = resolved;
        }
      }
    }

    if (!kind) {
      throw new DTreeParseError(`node "${id}" is missing a kind (use kind=decision|chance|value)`, line);
    }

    if (nodeById.has(id)) {
      throw new DTreeParseError(`Duplicate node id "${id}"`, line);
    }

    const node: InfluenceNode = { id, kind, label: label || id };
    if (utility !== undefined) node.utility = utility;
    nodes.push(node);
    nodeById.set(id, node);
  }

  // ── Validation ──────────────────────────────────────────────

  if (nodes.length === 0) {
    throw new DTreeParseError("Influence diagram has no nodes");
  }

  const valueNodes = nodes.filter((n) => n.kind === "value");
  if (valueNodes.length === 0) {
    throw new DTreeParseError(
      "Influence diagram requires at least one value node (declare `value <id> \"...\"`)",
    );
  }

  // Resolve arcs against declared nodes and derive influence semantics.
  const arcs: InfluenceArc[] = [];
  for (const a of arcDecls) {
    const fromNode = nodeById.get(a.from);
    const toNode = nodeById.get(a.to);
    if (!fromNode) throw new DTreeParseError(`Arc references undefined node "${a.from}"`, a.line);
    if (!toNode) throw new DTreeParseError(`Arc references undefined node "${a.to}"`, a.line);
    if (a.from === a.to) throw new DTreeParseError(`Self-loop on node "${a.from}" is not allowed`, a.line);
    const kind: InfluenceArc["kind"] =
      toNode.kind === "decision" ? "information"
      : toNode.kind === "value" ? "functional"
      : "relevance";
    const arc: InfluenceArc = { from: a.from, to: a.to, kind };
    if (a.label !== undefined) arc.label = a.label;
    arcs.push(arc);
  }

  // Acyclicity check (Kahn's algorithm / DFS).
  detectCycle(nodes, arcs);

  return {
    type: "decisiontree",
    mode: "influence",
    title,
    direction,
    nodes,
    arcs,
  };
}

/** Throw if the directed graph contains a cycle. */
function detectCycle(nodes: InfluenceNode[], arcs: InfluenceArc[]): void {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const a of arcs) adj.get(a.from)!.push(a.to);

  // 0 = unvisited, 1 = on stack, 2 = done
  const state = new Map<string, number>();
  for (const n of nodes) state.set(n.id, 0);
  const stackPath: string[] = [];

  function visit(id: string): void {
    state.set(id, 1);
    stackPath.push(id);
    for (const next of adj.get(id) ?? []) {
      const s = state.get(next) ?? 0;
      if (s === 1) {
        const cycleStart = stackPath.indexOf(next);
        const cycle = [...stackPath.slice(cycleStart), next].join(" -> ");
        throw new DTreeParseError(`Influence diagram must be acyclic — cycle detected: ${cycle}`);
      }
      if (s === 0) visit(next);
    }
    stackPath.pop();
    state.set(id, 2);
  }

  for (const n of nodes) {
    if (state.get(n.id) === 0) visit(n.id);
  }
}
