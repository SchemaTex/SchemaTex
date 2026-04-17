import type {
  DiagramAST,
  Individual,
  Relationship,
  RelationshipType,
  GeneticStatus,
  IndividualMarker,
  LegendEntry,
  ConditionFill,
} from "../../core/types";

// ─── ParseError ─────────────────────────────────────────────

export class PedigreeParseError extends Error {
  constructor(message: string, public line: number) {
    super(`Line ${line}: ${message}`);
    this.name = "PedigreeParseError";
  }
}

// ─── Couple operators ───────────────────────────────────────

const COUPLE_OPS: Array<{ token: string; type: RelationshipType }> = [
  { token: "-/-", type: "separated" },
  { token: "==", type: "consanguineous" },
  { token: "--", type: "married" },
  { token: "~", type: "cohabiting" },
];

const VALID_SEX = new Set(["male", "female", "unknown", "amab", "afab", "uaab"]);
const GENETIC_STATUSES = new Set([
  "affected",
  "carrier",
  "carrier-x",
  "obligate-carrier",
  "presymptomatic",
  "unaffected",
]);
const MARKERS = new Set(["proband", "consultand", "evaluated"]);
const VALID_STATUS = new Set(["deceased", "stillborn", "pregnancy", "sab", "tab", "ectopic"]);

// ─── Public API ────────────────────────────────────────────

export function parsePedigree(text: string): DiagramAST {
  const rawLines = text.split("\n");
  let i = 0;

  while (i < rawLines.length && rawLines[i].trim() === "") i++;
  if (i >= rawLines.length) throw new PedigreeParseError("Empty input", 1);

  const headerLine = rawLines[i].trim();
  const headerMatch = headerLine.match(/^pedigree\s*(?:"([^"]*)")?$/i);
  if (!headerMatch) throw new PedigreeParseError("Expected 'pedigree' header", i + 1);

  const metadata: Record<string, string> = {};
  if (headerMatch[1]) metadata.title = headerMatch[1];
  i++;

  const legend: LegendEntry[] = [];
  const individualsMap = new Map<string, Individual>();
  const relationships: Relationship[] = [];

  while (i < rawLines.length) {
    const raw = rawLines[i];
    const trimmed = raw.trim();

    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      i++;
      continue;
    }

    // Legend definition
    const legendMatch = trimmed.match(
      /^legend:\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*"([^"]*)"\s*(?:\(\s*fill:\s*([a-zA-Z-]+)\s*\))?$/
    );
    if (legendMatch) {
      legend.push({
        id: legendMatch[1],
        label: legendMatch[2],
        fill: (legendMatch[3] as ConditionFill) ?? "full",
      });
      i++;
      continue;
    }

    // Couple line
    const coupleMatch = detectCoupleOp(trimmed);
    if (coupleMatch) {
      const { leftId, op, rightRaw } = coupleMatch;
      const lineNum = i + 1;

      const { id: rightId, propsStr: rightProps } = parseIdWithProps(rightRaw);
      const leftKey = leftId.toLowerCase();
      const rightKey = rightId.toLowerCase();

      if (!individualsMap.has(leftKey)) {
        throw new PedigreeParseError(`Unknown individual '${leftId}'`, lineNum);
      }

      if (rightProps) {
        individualsMap.set(rightKey, buildIndividual(rightId, rightProps, lineNum));
      } else if (!individualsMap.has(rightKey)) {
        throw new PedigreeParseError(`Unknown individual '${rightId}'`, lineNum);
      }

      relationships.push({ type: op.type, from: leftKey, to: rightKey });

      const coupleIndent = leadingSpaces(raw);
      i++;

      // Children (indented under couple)
      while (i < rawLines.length) {
        const childLine = rawLines[i];
        const childTrimmed = childLine.trim();

        if (childTrimmed === "" || childTrimmed.startsWith("#")) {
          i++;
          continue;
        }

        if (leadingSpaces(childLine) <= coupleIndent) break;

        const childLineNum = i + 1;
        const { id: childId, propsStr } = parseIdWithProps(childTrimmed);
        const childKey = childId.toLowerCase();

        individualsMap.set(childKey, buildIndividual(childId, propsStr, childLineNum));

        const coupleKey = `${leftKey}+${rightKey}`;
        relationships.push({ type: "parent-child", from: coupleKey, to: childKey });

        i++;
      }
      continue;
    }

    // Individual definition
    const { id, propsStr } = parseIdWithProps(trimmed);
    const key = id.toLowerCase();
    const ind = buildIndividual(id, propsStr, i + 1);
    const existing = individualsMap.get(key);
    if (existing) {
      individualsMap.set(key, mergeIndividual(existing, ind));
    } else {
      individualsMap.set(key, ind);
    }
    i++;
  }

  return {
    type: "pedigree",
    individuals: Array.from(individualsMap.values()),
    relationships,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    legend: legend.length > 0 ? legend : undefined,
  };
}

// ─── Helpers ────────────────────────────────────────────────

function leadingSpaces(line: string): number {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

function detectCoupleOp(trimmed: string): { leftId: string; op: typeof COUPLE_OPS[0]; rightRaw: string } | null {
  for (const op of COUPLE_OPS) {
    let bracketDepth = 0;
    for (let j = 0; j < trimmed.length; j++) {
      if (trimmed[j] === "[") bracketDepth++;
      if (trimmed[j] === "]") bracketDepth--;
      if (bracketDepth > 0) continue;

      if (trimmed.substring(j, j + op.token.length) === op.token) {
        const left = trimmed.substring(0, j).trim();
        const right = trimmed.substring(j + op.token.length).trim();
        if (left && right && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(left)) {
          return { leftId: left, op, rightRaw: right };
        }
      }
    }
  }
  return null;
}

function parseIdWithProps(raw: string): { id: string; propsStr: string | null } {
  const bracketIdx = raw.indexOf("[");
  if (bracketIdx === -1) return { id: raw.trim(), propsStr: null };
  const id = raw.substring(0, bracketIdx).trim();
  const endBracket = raw.lastIndexOf("]");
  const propsStr = raw.substring(bracketIdx + 1, endBracket === -1 ? raw.length : endBracket);
  return { id, propsStr };
}

function splitProps(propsStr: string): string[] {
  const result: string[] = [];
  let current = "";
  let parenDepth = 0;
  for (const ch of propsStr) {
    if (ch === "(") parenDepth++;
    if (ch === ")") parenDepth--;
    if (ch === "," && parenDepth === 0) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) result.push(current);
  return result;
}

function buildIndividual(id: string, propsStr: string | null, _lineNum: number): Individual {
  const ind: Individual = {
    id: id.toLowerCase(),
    label: id,
    sex: "unknown",
    status: "alive",
  };

  if (!propsStr) return ind;

  const tokens = splitProps(propsStr);
  for (const rawToken of tokens) {
    const token = rawToken.trim();
    const lower = token.toLowerCase();

    if (VALID_SEX.has(lower)) {
      ind.sex = lower === "amab" ? "male" : lower === "afab" ? "female" : lower === "uaab" ? "unknown" : lower as Individual["sex"];
    } else if (VALID_STATUS.has(lower)) {
      ind.status = lower as Individual["status"];
    } else if (GENETIC_STATUSES.has(lower)) {
      ind.geneticStatus = lower as GeneticStatus;
    } else if (MARKERS.has(lower)) {
      if (!ind.markers) ind.markers = [];
      ind.markers.push(lower as IndividualMarker);
    } else if (/^\d{4}$/.test(lower)) {
      ind.birthYear = parseInt(token, 10);
    } else if (lower.startsWith("affected:")) {
      ind.geneticStatus = "affected";
      const traits = token.substring("affected:".length).trim().split("+").map(t => t.trim());
      ind.conditions = traits.map(t => ({ label: t, fill: "full" as ConditionFill }));
    } else if (token.includes(":")) {
      const colonIdx = token.indexOf(":");
      const key = token.substring(0, colonIdx).trim().toLowerCase();
      const value = token.substring(colonIdx + 1).trim().replace(/^"|"$/g, "");
      if (key === "label") {
        ind.label = value;
      } else {
        if (!ind.properties) ind.properties = {};
        ind.properties[key] = value;
      }
    }
  }

  return ind;
}

function mergeIndividual(existing: Individual, incoming: Individual): Individual {
  return {
    ...existing,
    sex: incoming.sex !== "unknown" ? incoming.sex : existing.sex,
    status: incoming.status !== "alive" ? incoming.status : existing.status,
    birthYear: incoming.birthYear ?? existing.birthYear,
    geneticStatus: incoming.geneticStatus ?? existing.geneticStatus,
    markers: incoming.markers ?? existing.markers,
    conditions: incoming.conditions ?? existing.conditions,
    properties: { ...existing.properties, ...incoming.properties },
  };
}
