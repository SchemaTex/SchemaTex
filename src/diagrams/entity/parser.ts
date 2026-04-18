import type {
  EntityAST,
  EntityNode,
  EntityType,
  EntityEdge,
  EntityEdgeOp,
  JurisdictionDef,
  ClusterDef,
} from "../../core/types";

export class EntityParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntityParseError";
  }
}

const ENTITY_TYPE_ALIAS: Record<string, EntityType> = {
  corp: "corp",
  corporation: "corp",
  inc: "corp",
  llc: "llc",
  llp: "llc",
  gmbh: "llc",
  bv: "llc",
  lp: "lp",
  lllp: "lp",
  fund: "lp",
  trust: "trust",
  individual: "individual",
  person: "individual",
  foundation: "foundation",
  npo: "foundation",
  disregarded: "disregarded",
  branch: "disregarded",
  pool: "pool",
  placeholder: "placeholder",
  tbf: "placeholder",
};

function stripComment(s: string): string {
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
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

/** Split by top-level commas (respecting quotes and bracket nesting) */
function splitTopLevelCommas(inside: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let inQuote = false;
  let depth = 0;
  for (const ch of inside) {
    if (ch === '"') inQuote = !inQuote;
    if (!inQuote) {
      if (ch === "[") depth++;
      else if (ch === "]") depth--;
    }
    if (ch === "," && !inQuote && depth === 0) {
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
    if (colon < 0) throw new EntityParseError(`Invalid property "${s}" (missing ":")`);
    const k = s.slice(0, colon).trim().toLowerCase();
    const v = s.slice(colon + 1).trim();
    out[k] = v;
  }
  return out;
}

function parseIdList(v: string): string[] {
  const t = v.trim();
  const inner = t.startsWith("[") && t.endsWith("]") ? t.slice(1, -1) : t;
  return inner
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

const EDGE_OPS: Array<{ token: string; op: EntityEdgeOp }> = [
  // Order matters: longer tokens first
  { token: "==>", op: "voting" },
  { token: "-.->", op: "pool" },
  { token: "-~->", op: "license" },
  { token: "-->", op: "distribution" },
  { token: "->", op: "ownership" },
];

function matchEdgeOp(line: string): { op: EntityEdgeOp; idx: number; len: number } | null {
  for (const { token, op } of EDGE_OPS) {
    // Find an instance flanked by non-alphanum (so "->" inside quoted label is skipped later)
    const idx = findEdgeToken(line, token);
    if (idx >= 0) return { op, idx, len: token.length };
  }
  return null;
}

function findEdgeToken(line: string, token: string): number {
  let inQuote = false;
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuote = !inQuote;
    if (!inQuote) {
      if (ch === "[") depth++;
      else if (ch === "]") depth = Math.max(0, depth - 1);
    }
    if (!inQuote && depth === 0 && line.startsWith(token, i)) {
      return i;
    }
  }
  return -1;
}

export function parseEntityDSL(text: string): EntityAST {
  const rawLines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const lines = joinBrackets(rawLines);

  let title: string | undefined;
  const entities: EntityNode[] = [];
  const entityMap = new Map<string, EntityNode>();
  const edges: EntityEdge[] = [];
  const jurisdictions: JurisdictionDef[] = [];
  const jurisdictionMap = new Map<string, JurisdictionDef>();
  const clusters: ClusterDef[] = [];

  let clusterCounter = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Header: entity-structure "title"  or  entity-structure: "title"
    if (/^entity-structure\b/i.test(line)) {
      const m = line.match(/"([^"]*)"/);
      if (m) title = m[1];
      continue;
    }

    // jurisdiction CODE "name" [color: "..."]
    const jurMatch = line.match(
      /^jurisdiction\s+([A-Za-z]{2,3})\s+"([^"]*)"(?:\s*\[([^\]]*)\])?\s*$/i
    );
    if (jurMatch) {
      const code = jurMatch[1].toUpperCase();
      const name = jurMatch[2];
      const props = jurMatch[3] ? parseProps(jurMatch[3]) : {};
      const def: JurisdictionDef = { code, name };
      if (props.color) def.color = stripQuotes(props.color);
      jurisdictions.push(def);
      jurisdictionMap.set(code, def);
      continue;
    }

    // cluster "name" [members: [ids], color: "..."]
    const clusterMatch = line.match(/^cluster\s+"([^"]*)"(?:\s*\[([^\]]*)\])?\s*$/i);
    if (clusterMatch) {
      const label = clusterMatch[1];
      const props = clusterMatch[2] ? parseProps(clusterMatch[2]) : {};
      const def: ClusterDef = {
        id: `cluster-${++clusterCounter}`,
        label,
        members: props.members ? parseIdList(props.members) : [],
      };
      if (props.color) def.color = stripQuotes(props.color);
      clusters.push(def);
      continue;
    }

    // entity id "Name" type[@jurisdiction] [props]
    const entityMatch = line.match(
      /^entity\s+([A-Za-z][A-Za-z0-9_-]*)\s+"([^"]*)"\s+([a-zA-Z]+)(?:@([A-Za-z]{2,3}))?(?:\s*\[([^\]]*)\])?\s*$/
    );
    if (entityMatch) {
      const id = entityMatch[1];
      const name = entityMatch[2];
      const typeStr = entityMatch[3].toLowerCase();
      const jurisdictionCode = entityMatch[4]?.toUpperCase();
      const propsStr = entityMatch[5];
      const entityType = ENTITY_TYPE_ALIAS[typeStr];
      if (!entityType) {
        throw new EntityParseError(`Unknown entity type "${typeStr}" for "${id}"`);
      }
      if (entityMap.has(id)) {
        throw new EntityParseError(`Duplicate entity id "${id}"`);
      }
      const node: EntityNode = { id, name, entityType };
      if (jurisdictionCode) node.jurisdiction = jurisdictionCode;
      if (propsStr) {
        const props = parseProps(propsStr);
        if (props.status) node.status = stripQuotes(props.status) as EntityNode["status"];
        if (props.tax) node.taxClass = stripQuotes(props.tax);
        if (props.role) node.role = stripQuotes(props.role);
        if (props.note) node.note = stripQuotes(props.note);
        if (props.est) node.formationDate = stripQuotes(props.est);
        // Any other keys → properties
        const reserved = new Set(["status", "tax", "role", "note", "est"]);
        const extras: Record<string, string> = {};
        for (const k of Object.keys(props)) {
          if (!reserved.has(k)) extras[k] = stripQuotes(props[k]);
        }
        if (Object.keys(extras).length) node.properties = extras;
      }
      entities.push(node);
      entityMap.set(id, node);
      continue;
    }

    // edge: from <op> to [ : percentage ] [props]
    const edgeInfo = matchEdgeOp(line);
    if (edgeInfo) {
      const left = line.slice(0, edgeInfo.idx).trim();
      const rest = line.slice(edgeInfo.idx + edgeInfo.len).trim();
      if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(left)) {
        throw new EntityParseError(`Invalid edge source on line: ${line}`);
      }
      // rest: "target [: pct] [props]" OR "target [props]"
      const restMatch = rest.match(
        /^([A-Za-z][A-Za-z0-9_-]*)(?:\s*:\s*([^\[]+?))?(?:\s*\[([^\]]*)\])?\s*$/
      );
      if (!restMatch) {
        throw new EntityParseError(`Cannot parse edge: ${line}`);
      }
      const to = restMatch[1];
      const pct = restMatch[2]?.trim();
      const propsStr = restMatch[3];
      const edge: EntityEdge = { from: left, to, op: edgeInfo.op };
      if (pct) edge.percentage = pct;
      if (propsStr) {
        const props = parseProps(propsStr);
        if (props.class) edge.shareClass = stripQuotes(props.class);
        if (props.label) edge.label = stripQuotes(props.label);
      }
      edges.push(edge);
      continue;
    }

    throw new EntityParseError(`Cannot parse line: ${line}`);
  }

  // Validate edges reference known entities
  for (const e of edges) {
    if (!entityMap.has(e.from)) {
      throw new EntityParseError(`Edge references unknown entity "${e.from}"`);
    }
    if (!entityMap.has(e.to)) {
      throw new EntityParseError(`Edge references unknown entity "${e.to}"`);
    }
  }

  if (entities.length === 0) {
    throw new EntityParseError("Entity structure diagram has no entities");
  }

  return {
    type: "entity",
    title,
    entities,
    edges,
    jurisdictions,
    clusters,
  };
}
