import type {
  DiagramAST,
  Individual,
  Relationship,
  RelationshipType,
  Sex,
} from "../../core/types";

// ─── Error ─────────────────────────────────────────────────

export class EcomapParseError extends Error {
  constructor(message: string, public line: number) {
    super(`Line ${line}: ${message}`);
    this.name = "EcomapParseError";
  }
}

// ─── Connection operator table ─────────────────────────────

interface ConnectionOpInfo {
  relType: RelationshipType;
  energyFlow?: "from" | "to" | "mutual";
}

const CONNECTION_OPS: Record<string, ConnectionOpInfo> = {
  "===": { relType: "strong" },
  "==": { relType: "moderate" },
  "---": { relType: "normal" },
  "- -": { relType: "weak" },
  "~~~": { relType: "stressful" },
  "~=~": { relType: "stressful-strong" },
  "~x~": { relType: "conflictual" },
  "-/-": { relType: "broken" },
  "===>": { relType: "strong", energyFlow: "from" },
  "<===": { relType: "strong", energyFlow: "to" },
  "<=>": { relType: "moderate", energyFlow: "mutual" },
  "==>": { relType: "moderate", energyFlow: "from" },
  "<==": { relType: "moderate", energyFlow: "to" },
  "-->": { relType: "normal", energyFlow: "from" },
  "<--": { relType: "normal", energyFlow: "to" },
  "<->": { relType: "normal", energyFlow: "mutual" },
};

const OP_PATTERN =
  "===>|<===|===|<=>|==>|<==|<->|-->|<--|~=~|~x~|~~~|-\\/-|---|==|- -";
const CONNECTION_RE = new RegExp(
  `^([a-zA-Z][a-zA-Z0-9_-]*)\\s+(${OP_PATTERN})\\s+([a-zA-Z][a-zA-Z0-9_-]*)(.*)$`
);

// ─── Public API ────────────────────────────────────────────

export function parseEcomap(text: string): DiagramAST {
  const lines = text.split("\n");
  const individuals: Individual[] = [];
  const knownIds = new Set<string>();
  const relationships: Relationship[] = [];
  const metadata: Record<string, string> = {};
  let centerId: string | null = null;

  let i = 0;

  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) throw new EcomapParseError("Empty input", 1);

  const header = lines[i].trim();
  const headerMatch = header.match(/^ecomap\s*(?:"([^"]*)")?$/i);
  if (!headerMatch)
    throw new EcomapParseError("Expected 'ecomap' header", i + 1);
  if (headerMatch[1]) metadata.title = headerMatch[1];
  i++;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (
      trimmed === "" ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("//")
    ) {
      i++;
      continue;
    }

    // Center definition
    const centerMatch = trimmed.match(
      /^center:\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*(\[.*\])?\s*$/
    );
    if (centerMatch) {
      const id = centerMatch[1].toLowerCase();
      centerId = id;
      const props = centerMatch[2] ? parseProps(centerMatch[2]) : {};
      individuals.push(buildIndividual(id, props, true));
      knownIds.add(id);
      i++;
      // Skip indented family content under center
      const baseIndent = leadingSpaces(raw);
      while (i < lines.length) {
        if (lines[i].trim() === "") {
          i++;
          continue;
        }
        if (leadingSpaces(lines[i]) > baseIndent + 2) {
          i++;
        } else {
          break;
        }
      }
      continue;
    }

    // Connection
    const connMatch = trimmed.match(CONNECTION_RE);
    if (connMatch) {
      const fromRaw = connMatch[1].toLowerCase();
      const op = connMatch[2];
      const toRaw = connMatch[3].toLowerCase();
      const rest = connMatch[4]?.trim() ?? "";

      const opInfo = CONNECTION_OPS[op];
      if (!opInfo)
        throw new EcomapParseError(`Unknown operator '${op}'`, i + 1);

      let label: string | undefined;
      const lblMatch = rest.match(/\[\s*label:\s*"([^"]*)"\s*\]/);
      if (lblMatch) label = lblMatch[1];

      let from = fromRaw;
      let to = toRaw;
      let flow = opInfo.energyFlow;

      if (to === centerId && from !== centerId) {
        [from, to] = [to, from];
        if (flow === "from") flow = "to";
        else if (flow === "to") flow = "from";
      }

      relationships.push({
        type: opInfo.relType,
        from,
        to,
        label,
        energyFlow: flow,
      });
      i++;
      continue;
    }

    // System definition
    const sysMatch = trimmed.match(
      /^([a-zA-Z][a-zA-Z0-9_-]*)\s*(\[.*\])?\s*$/
    );
    if (sysMatch) {
      const id = sysMatch[1].toLowerCase();
      if (!knownIds.has(id)) {
        const props = sysMatch[2] ? parseProps(sysMatch[2]) : {};
        individuals.push(buildIndividual(id, props, false));
        knownIds.add(id);
      }
      i++;
      continue;
    }

    throw new EcomapParseError(`Unexpected: ${trimmed}`, i + 1);
  }

  return { type: "ecomap", individuals, relationships, metadata };
}

// ─── Helpers ───────────────────────────────────────────────

function leadingSpaces(line: string): number {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

function parseProps(bracketStr: string): Record<string, string> {
  const inner = bracketStr.slice(1, -1).trim();
  if (!inner) return {};
  const props: Record<string, string> = {};

  for (const part of splitCommas(inner)) {
    const t = part.trim();
    if (!t) continue;

    const kv = t.match(/^([\w][\w-]*)\s*:\s*(?:"([^"]*)"|(\S+))$/);
    if (kv) {
      props[kv[1]] = kv[2] ?? kv[3];
      continue;
    }

    if (t === "male" || t === "female" || t === "unknown") {
      props.sex = t;
      continue;
    }

    props[t] = "true";
  }
  return props;
}

function splitCommas(s: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of s) {
    if (ch === '"') {
      inQ = !inQ;
      cur += ch;
    } else if (ch === "," && !inQ) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

function parseSex(s?: string): Sex {
  switch (s) {
    case "male":
    case "female":
    case "unknown":
    case "other":
    case "nonbinary":
    case "intersex":
      return s;
    default:
      return "unknown";
  }
}

function buildIndividual(
  id: string,
  props: Record<string, string>,
  isCenter: boolean
): Individual {
  const properties: Record<string, string> = {};
  if (isCenter) properties.center = "true";
  if (props.category) properties.category = props.category;
  if (props.size) properties.size = props.size;
  if (props.importance) properties.importance = props.importance;
  if (props.sector) properties.sector = props.sector;

  return {
    id,
    label: props.label ?? id,
    sex: parseSex(props.sex),
    status: "alive",
    age: props.age ? parseInt(props.age, 10) : undefined,
    properties,
  };
}
