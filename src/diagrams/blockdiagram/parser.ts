import type {
  BlockAST,
  BlockNode,
  BlockEdge,
  SummingJunction,
  BlockRole,
} from "../../core/types";
import { IDENTIFIER_SOURCE, isIdentifier } from "../../core/identifier";
import { matchQuotedTitle } from "../../core/quotes";

const BLOCK_DECL_RE = new RegExp(
  `^(${IDENTIFIER_SOURCE})\\s*=\\s*block\\s*\\(\\s*"([^"]*)"\\s*\\)\\s*(?:\\[([^\\]]*)\\])?\\s*$`,
  "u"
);
const SUM_DECL_RE = new RegExp(
  `^(${IDENTIFIER_SOURCE})\\s*=\\s*sum\\s*\\(([^)]*)\\)\\s*$`,
  "u"
);
const SIGNAL_DECL_RE = new RegExp(
  `^(${IDENTIFIER_SOURCE})\\s*=\\s*signal\\s*\\(\\s*"([^"]*)"\\s*\\)\\s*(?:\\[([^\\]]*)\\])?\\s*$`,
  "u"
);
const BRACKETED_IDENTIFIER_RE = new RegExp(`^\\[(${IDENTIFIER_SOURCE})\\]$`, "u");

export class BlockDiagramParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number,
    public source?: string
  ) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "BlockDiagramParseError";
  }
}

const ROLE_VALUES = new Set<BlockRole>([
  "plant",
  "controller",
  "sensor",
  "actuator",
  "reference",
  "disturbance",
  "generic",
]);

interface SignalDecl {
  id: string;
  label: string;
  discrete: boolean;
}

interface ParsedAttrs {
  name?: string;
  role?: BlockRole;
  discrete?: boolean;
  label?: string;
  route?: "above" | "below";
}

function parseAttrs(s: string): ParsedAttrs {
  // Inside [ ... ] — comma-separated  key:value  or bare flags like "discrete"
  const result: ParsedAttrs = {};
  // Split at commas not inside quotes
  const parts: string[] = [];
  let cur = "";
  let inQuote = false;
  for (const ch of s) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === "," && !inQuote) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur);

  for (const raw of parts) {
    const p = raw.trim();
    if (!p) continue;
    if (p === "discrete") {
      result.discrete = true;
      continue;
    }
    if (p.startsWith('"') && p.endsWith('"')) {
      result.label = p.slice(1, -1);
      continue;
    }
    const m = p.match(/^(\w+)\s*:\s*(.+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    let val = m[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (key === "name") result.name = val;
    else if (key === "role") {
      if (ROLE_VALUES.has(val as BlockRole)) result.role = val as BlockRole;
    } else if (key === "label") result.label = val;
    else if (key === "route") {
      if (val === "above" || val === "below") result.route = val;
    }
  }
  return result;
}

export function parseBlockDiagram(text: string): BlockAST {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  let title: string | undefined;
  const blocks: BlockNode[] = [];
  const sums: SummingJunction[] = [];
  const connections: BlockEdge[] = [];
  const signals = new Map<string, SignalDecl>();

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    const lineNo = i + 1;
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;

    // Header: blockdiagram "Title"
    if (/^blockdiagram\b/i.test(line)) {
      const t = matchQuotedTitle(line);
      if (t !== undefined) title = t;
      continue;
    }

    // block:  ID = block("label") [role: X, name: "Y"]
    const blockMatch = line.match(BLOCK_DECL_RE);
    if (blockMatch) {
      const id = blockMatch[1];
      const label = blockMatch[2];
      const attrs = blockMatch[3] ? parseAttrs(blockMatch[3]) : {};
      const node: BlockNode = { id, label, role: attrs.role ?? "generic" };
      if (attrs.route) node.route = attrs.route;
      blocks.push(node);
      continue;
    }

    // sum:  ID = sum(+a, -b, ...)
    const sumMatch = line.match(SUM_DECL_RE);
    if (sumMatch) {
      const id = sumMatch[1];
      const rawInputs = sumMatch[2]
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const inputs: string[] = [];
      for (const tok of rawInputs) {
        if (tok.startsWith("+") || tok.startsWith("-")) inputs.push(tok);
        else inputs.push("+" + tok);
      }
      sums.push({ id, inputs });
      continue;
    }

    // signal:  ID = signal("label") [discrete]
    const sigMatch = line.match(SIGNAL_DECL_RE);
    if (sigMatch) {
      const id = sigMatch[1];
      const label = sigMatch[2];
      const attrs = sigMatch[3] ? parseAttrs(sigMatch[3]) : {};
      signals.set(id, { id, label, discrete: !!attrs.discrete });
      continue;
    }

    // Connection chain: `A -> B -> C [label_or_attrs]`. Inline `[id] -> [id]` (D2/Mermaid) auto-declares.
    const arrowIdx = line.indexOf("->");
    if (arrowIdx >= 0) {
      let body = line;
      let tailAttrs: ParsedAttrs = {};
      // Trailing `[...]` must be preceded by whitespace, else it's an inline endpoint.
      if (body.endsWith("]")) {
        let bracketStart = -1;
        let depth = 0;
        let inQuote = false;
        for (let i = body.length - 1; i >= 1; i--) {
          const ch = body[i];
          if (ch === '"') inQuote = !inQuote;
          else if (!inQuote && ch === "]") depth++;
          else if (!inQuote && ch === "[") {
            depth--;
            if (depth === 0) {
              if (/\s/.test(body[i - 1] ?? "")) bracketStart = i;
              break;
            }
          }
        }
        if (bracketStart >= 0) {
          const inner = body.slice(bracketStart + 1, -1).trim();
          const isBareId = isIdentifier(inner);
          if (!isBareId) {
            body = body.slice(0, bracketStart).trim();
            if (inner.startsWith('"') && inner.endsWith('"') && !inner.slice(1, -1).includes(',')) {
              tailAttrs.label = inner.slice(1, -1);
            } else {
              tailAttrs = parseAttrs(inner);
            }
          }
        }
      }
      const parts = body.split("->").map((x) => x.trim()).filter(Boolean);
      if (parts.length < 2) {
        throw new BlockDiagramParseError(`Invalid connection: ${line}`, lineNo, undefined, line);
      }
      const endpoints = parts.map((p) => {
        const m = BRACKETED_IDENTIFIER_RE.exec(p);
        return m ? m[1] : p;
      });
      for (const ep of endpoints) {
        if (!isIdentifier(ep)) continue;
        const exists =
          blocks.some((b) => b.id === ep) ||
          sums.some((s) => s.id === ep) ||
          signals.has(ep);
        if (!exists) {
          blocks.push({ id: ep, label: ep, role: "generic" });
        }
      }
      for (let i = 0; i < endpoints.length - 1; i++) {
        const from = endpoints[i];
        const to = endpoints[i + 1];
        const isLast = i === endpoints.length - 2;
        const edge: BlockEdge = { from, to };
        if (isLast && tailAttrs.label) edge.label = tailAttrs.label;
        if (isLast && tailAttrs.discrete) edge.discrete = true;
        connections.push(edge);
      }
      continue;
    }
  }

  // Post-process: if edge endpoints reference a signal id, inline the signal.
  // A signal is a pass-through label. Merge edges X->sig and sig->Y into X->Y,
  // using signal's label (unless edge already has one) and discrete flag.
  if (signals.size > 0) {
    const merged: BlockEdge[] = [];
    const bySource = new Map<string, BlockEdge[]>();
    const byTarget = new Map<string, BlockEdge[]>();
    for (const e of connections) {
      if (!bySource.has(e.from)) bySource.set(e.from, []);
      bySource.get(e.from)!.push(e);
      if (!byTarget.has(e.to)) byTarget.set(e.to, []);
      byTarget.get(e.to)!.push(e);
    }

    const consumed = new Set<BlockEdge>();
    for (const sigId of signals.keys()) {
      const sig = signals.get(sigId)!;
      const incoming = byTarget.get(sigId) ?? [];
      const outgoing = bySource.get(sigId) ?? [];

      if (incoming.length > 0 && outgoing.length > 0) {
        // Full pass-through: merge X→sig + sig→Y into X→Y
        for (const ine of incoming) {
          for (const oute of outgoing) {
            consumed.add(ine);
            consumed.add(oute);
            merged.push({
              from: ine.from,
              to: oute.to,
              label: ine.label ?? oute.label ?? sig.label,
              discrete: sig.discrete || ine.discrete || oute.discrete,
            });
          }
        }
      } else if (incoming.length > 0) {
        // Dangling output signal (no consumer): keep the incoming edge but
        // apply the signal's label so the arrowhead is annotated.
        for (const ine of incoming) {
          consumed.add(ine);
          merged.push({
            from: ine.from,
            to: sigId,
            label: ine.label ?? sig.label,
            discrete: sig.discrete || ine.discrete,
          });
        }
      } else if (outgoing.length > 0) {
        // Dangling input signal (no producer): keep the outgoing edge with label.
        for (const oute of outgoing) {
          consumed.add(oute);
          merged.push({
            from: sigId,
            to: oute.to,
            label: oute.label ?? sig.label,
            discrete: sig.discrete || oute.discrete,
          });
        }
      }
    }
    // Keep edges not consumed by any signal merge
    for (const e of connections) {
      if (!consumed.has(e)) merged.push(e);
    }
    connections.length = 0;
    connections.push(...merged);
  }

  return {
    type: "blockdiagram",
    title,
    blocks,
    sums,
    connections,
  };
}
