import type {
  SLDAST,
  SLDNode,
  SLDNodeType,
  SLDConnection,
} from "../../core/types";

export class SLDParseError extends Error {
  public line?: number;
  public source?: string;
  constructor(message: string, line?: number, source?: string) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "SLDParseError";
    this.line = line;
    this.source = source;
  }
}

const NODE_TYPES = new Set<SLDNodeType>([
  "utility", "generator", "solar", "wind", "ups",
  "transformer", "transformer_dy", "transformer_yd", "transformer_yy",
  "transformer_dd", "autotransformer", "transformer_3winding",
  "bus", "bus_tie", "hub",
  "breaker", "breaker_vacuum", "switch", "switch_load", "ground_switch",
  "ats", "recloser", "sectionalizer", "fuse", "fuse_cl",
  "ct", "pt", "relay", "surge_arrester", "ground_fault",
  "motor", "load", "capacitor_bank", "harmonic_filter", "vfd",
  "watthour_meter", "demand_meter",
]);

function stripComment(s: string): string {
  // remove # comments (outside quotes)
  let out = "";
  let inQuote = false;
  for (const ch of s) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === "#" && !inQuote) break;
    out += ch;
  }
  return out;
}

function stripQuotes(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1);
  }
  return t;
}

function splitAttrs(inside: string): Array<[string, string]> {
  // split by commas (respecting quotes) → "key: value" pairs
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

  const out: Array<[string, string]> = [];
  for (const p of parts) {
    const s = p.trim();
    if (!s) continue;
    const colon = s.indexOf(":");
    if (colon < 0) {
      throw new SLDParseError(`Invalid attribute "${s}" (missing ":")`);
    }
    const k = s.slice(0, colon).trim();
    const v = stripQuotes(s.slice(colon + 1));
    out.push([k, v]);
  }
  return out;
}

function applyAttrs(node: SLDNode, attrs: Array<[string, string]>): void {
  for (const [k, v] of attrs) {
    const key = k.toLowerCase();
    if (key === "label") node.label = v;
    else if (key === "voltage") node.voltage = v;
    else if (key === "rating") node.rating = v;
    else if (key === "device") node.deviceNumber = v;
    else {
      // stash everything else as nameplate
      if (!node.nameplate) node.nameplate = {};
      node.nameplate[k] = v;
    }
  }
}

/** Join lines so that a bracketed attribute block spans a single logical line. */
function joinBrackets(lines: string[]): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  for (const raw of lines) {
    const line = stripComment(raw);
    if (!line.trim() && depth === 0) {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      out.push("");
      continue;
    }
    for (const ch of line) {
      if (ch === "[") depth++;
      else if (ch === "]") depth = Math.max(0, depth - 1);
    }
    buf = buf ? buf + " " + line.trim() : line;
    if (depth === 0) {
      out.push(buf);
      buf = "";
    }
  }
  if (buf) out.push(buf);
  return out;
}

export function parseSLDDSL(text: string): SLDAST {
  const rawLines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const lines = joinBrackets(rawLines);

  let title: string | undefined;
  const nodes: SLDNode[] = [];
  const nodeMap = new Map<string, SLDNode>();
  const connections: SLDConnection[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;

    // Header: sld "title"
    if (/^sld\b/i.test(line)) {
      const m = line.match(/"([^"]*)"/);
      if (m) title = m[1];
      continue;
    }

    // Connection: A -> B [cable: "...", label: "..."]
    const connMatch = line.match(
      /^([A-Za-z][A-Za-z0-9_\-]*)\s*->\s*([A-Za-z][A-Za-z0-9_\-]*)(?:\s*\[([^\]]*)\])?\s*$/
    );
    if (connMatch) {
      const from = connMatch[1];
      const to = connMatch[2];
      const c: SLDConnection = { from, to };
      if (connMatch[3]) {
        for (const [k, v] of splitAttrs(connMatch[3])) {
          const key = k.toLowerCase();
          if (key === "cable") c.cable = v;
          else if (key === "label") c.label = v;
        }
      }
      connections.push(c);
      continue;
    }

    // Node definition: ID = type [attrs]
    const nodeMatch = line.match(
      /^([A-Za-z][A-Za-z0-9_\-]*)\s*=\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\[([^\]]*)\])?\s*$/
    );
    if (nodeMatch) {
      const id = nodeMatch[1];
      const nodeType = nodeMatch[2] as SLDNodeType;
      if (!NODE_TYPES.has(nodeType)) {
        throw new SLDParseError(
          `Unknown node type "${nodeType}" for "${id}"`,
          i + 1,
          line
        );
      }
      if (nodeMap.has(id)) {
        throw new SLDParseError(`Duplicate node id "${id}"`, i + 1, line);
      }
      const node: SLDNode = { id, nodeType };
      if (nodeMatch[3]) {
        applyAttrs(node, splitAttrs(nodeMatch[3]));
      }
      nodes.push(node);
      nodeMap.set(id, node);
      continue;
    }

    throw new SLDParseError(`Cannot parse line`, i + 1, line);
  }

  // Validate connections
  for (const c of connections) {
    if (!nodeMap.has(c.from)) {
      throw new SLDParseError(`Connection references unknown node "${c.from}"`);
    }
    if (!nodeMap.has(c.to)) {
      throw new SLDParseError(`Connection references unknown node "${c.to}"`);
    }
  }

  if (nodes.length === 0) {
    throw new SLDParseError("SLD diagram has no nodes");
  }

  return { type: "sld", title, nodes, connections };
}
