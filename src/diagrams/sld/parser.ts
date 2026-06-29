import type {
  SLDAST,
  SLDNode,
  SLDNodeType,
  SLDConnection,
  SLDStandard,
} from "../../core/types";
import { matchQuotedTitle } from "../../core/quotes";

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
  "rcd",
  "motor", "load", "capacitor_bank", "harmonic_filter", "vfd",
  "watthour_meter", "demand_meter",
  "consumer_unit",
]);

// IEC 60364 / BS 7671 / REBT residential vocabulary. These map onto existing
const TYPE_ALIASES: Record<string, SLDNodeType> = {
  mcb: "breaker",
  mccb: "breaker",
  miniature_circuit_breaker: "breaker",
  rcd: "rcd",
  rcbo: "rcd",
  rccb: "rcd",
  differential: "rcd",
  diferencial: "rcd",
  pia: "breaker",
  iga: "breaker",
  main_switch: "switch_load",
  isolator: "switch_load",
  disconnector: "switch_load",
  db: "consumer_unit",
  cu: "consumer_unit",
  consumer_unit: "consumer_unit",
  distribution_board: "consumer_unit",
  panel: "consumer_unit",
  panelboard: "consumer_unit",
};

function stripComment(s: string): string {
  // Strip `#`, `//`, or Mermaid `%%` comments. Quoted regions are respected
  // so `"#fff"` (a CSS color) and `"https://…"` survive.
  let out = "";
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === '"') inQuote = !inQuote;
    if (!inQuote) {
      if (ch === "#") break;
      if (ch === "/" && s[i + 1] === "/") break;
      if (ch === "%" && s[i + 1] === "%") break;
    }
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
  let standard: SLDStandard | undefined;
  const nodes: SLDNode[] = [];
  const nodeMap = new Map<string, SLDNode>();
  const connections: SLDConnection[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;

    // Header: sld "title" [standard: iec]
    if (/^sld\b/i.test(line)) {
      const t = matchQuotedTitle(line);
      if (t !== undefined) title = t;
      const bracket = line.match(/\[([^\]]*)\]/);
      if (bracket) {
        for (const [k, v] of splitAttrs(bracket[1])) {
          if (k.toLowerCase() === "standard") {
            const s = v.trim().toLowerCase();
            if (s === "ansi" || s === "iec" || s === "abnt" || s === "as-nzs") {
              standard = s;
            } else {
              throw new SLDParseError(
                `Unknown standard "${v}". Valid: ansi, iec, abnt, as-nzs`,
                i + 1,
                line
              );
            }
          }
        }
      }
      continue;
    }

    // Connection: A -> B [cable: "...", label: "..."]
    const connMatch = line.match(
      /^([A-Za-z][A-Za-z0-9_-]*)\s*->\s*([A-Za-z][A-Za-z0-9_-]*)(?:\s*\[([^\]]*)\])?\s*$/
    );
    if (connMatch) {
      const from = connMatch[1];
      const to = connMatch[2];
      const c: SLDConnection = { from, to };
      if (connMatch[3]) {
        for (const [k, v] of splitAttrs(connMatch[3])) {
          const key = k.toLowerCase();
          if (key === "cable") c.cable = v;
          else if (key === "cable_csa" || key === "csa") c.cableCsa = v;
          else if (key === "cable_length_m" || key === "length_m") c.cableLengthM = v;
          else if (key === "cable_insulation" || key === "insulation") c.cableInsulation = v;
          else if (key === "label") c.label = v;
        }
      }
      connections.push(c);
      continue;
    }

    // Node definition: ID = type [attrs]
    const nodeMatch = line.match(
      /^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\[([^\]]*)\])?\s*$/
    );
    if (nodeMatch) {
      const id = nodeMatch[1];
      const rawType = nodeMatch[2].toLowerCase();
      // Resolve REBT/IEC residential aliases (mcb → breaker, rcbo/rccb → rcd…)
      // before the canonical-type check.
      const canonical = (TYPE_ALIASES[rawType] ?? rawType) as SLDNodeType;
      if (nodeMap.has(id)) {
        throw new SLDParseError(`Duplicate node id "${id}"`, i + 1, line);
      }
      // Graceful degradation: an unrecognised type is NOT fatal. We keep the
      // node with the `unknown` sentinel and preserve the raw token so the
      // renderer can draw a visibly-flagged placeholder and the lint pass can
      // surface a warning naming the bad token + a did-you-mean suggestion.
      // Blanking the whole diagram on one bad word violates the "professionals
      // actually use" pillar — see docs/issues.
      const isKnown = NODE_TYPES.has(canonical);
      const node: SLDNode = isKnown
        ? { id, nodeType: canonical }
        : { id, nodeType: "unknown", rawType: nodeMatch[2] };
      // If the user wrote an alias (mcb/rcbo/iga…), preserve the original word
      // as the visible label unless an explicit `label:` attribute overrides
      // it below. This keeps "MCB" / "IGA" markings on the rendered SVG.
      if (isKnown && TYPE_ALIASES[rawType]) {
        node.label = rawType.toUpperCase();
      }
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

  return { type: "sld", title, standard, nodes, connections };
}
