import type {
  DiagramAST,
  Individual,
  Relationship,
  RelationshipType,
  Condition,
  ConditionFill,
} from "../../core/types";

// ─── ParseError ─────────────────────────────────────────────

export class ParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
    public source: string
  ) {
    super(`Line ${line}, col ${column}: ${message}\n  → ${source}`);
    this.name = "ParseError";
  }
}

// ─── Couple operators ───────────────────────────────────────

const COUPLE_OPS: Array<{ token: string; type: RelationshipType }> = [
  { token: "-x-", type: "divorced" },
  { token: "-/-", type: "separated" },
  { token: "-o-", type: "engaged" },
  { token: "==", type: "consanguineous" as RelationshipType },
  { token: "--", type: "married" },
  { token: "~", type: "cohabiting" },
];

const VALID_SEX = new Set(["male", "female", "unknown", "other"]);
const VALID_STATUS = new Set([
  "deceased",
  "stillborn",
  "miscarriage",
  "abortion",
]);
const SPECIAL_CHILD_PROPS = new Set([
  "adopted",
  "foster",
  "twin-identical",
  "twin-fraternal",
]);
const VALID_FILLS = new Set([
  "full",
  "half-left",
  "half-right",
  "half-top",
  "half-bottom",
  "quad-tl",
  "quad-tr",
  "quad-bl",
  "quad-br",
  "quarter",
  "striped",
  "dotted",
]);

const EMOTIONAL_TYPES = new Set([
  "harmony", "close", "bestfriends", "love", "inlove", "friendship",
  "hostile", "conflict", "enmity", "distant-hostile", "cutoff",
  "close-hostile", "fused", "fused-hostile",
  "distant", "normal", "nevermet",
  "abuse", "physical-abuse", "emotional-abuse", "sexual-abuse", "neglect",
  "manipulative", "controlling", "jealous",
  "focused", "focused-neg", "distrust", "admirer", "limerence",
]);


// ─── Parser state ───────────────────────────────────────────

interface ParserState {
  lines: string[];
  currentLine: number;
}

// ─── Main entry point ───────────────────────────────────────

export function parseGenogram(text: string): DiagramAST {
  const rawLines = text.split("\n");
  const state: ParserState = { lines: rawLines, currentLine: 0 };

  skipBlankAndComments(state);

  // Parse header
  const metadata: Record<string, string> = {};
  const headerLine = currentLineText(state);
  if (headerLine === undefined) {
    throw new ParseError("Empty input", 1, 1, "");
  }
  const headerTrimmed = headerLine.trim();
  if (!headerTrimmed.toLowerCase().startsWith("genogram")) {
    throw new ParseError(
      'Expected "genogram" header',
      state.currentLine + 1,
      1,
      headerLine
    );
  }
  const titleMatch = headerTrimmed.match(/^genogram\s+"([^"]*)"$/i);
  if (titleMatch) {
    metadata.title = titleMatch[1];
  }
  state.currentLine++;

  // Collect individuals and relationships
  const individualsMap = new Map<string, Individual>();
  const relationships: Relationship[] = [];
  const childSpecialProps = new Map<string, string>();

  skipBlankAndComments(state);

  while (state.currentLine < state.lines.length) {
    skipBlankAndComments(state);
    if (state.currentLine >= state.lines.length) break;

    const lineText = state.lines[state.currentLine];
    const trimmed = lineText.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      state.currentLine++;
      continue;
    }

    // Check for emotional relationship line: `A -TYPE- B` or `A -TYPE-> B`
    const emotionalMatch = detectEmotionalOp(trimmed);
    if (emotionalMatch) {
      const { leftId, emotionalType, rightId: emRightId, directional, label: emLabel } = emotionalMatch;
      const lineNum = state.currentLine + 1;
      const leftKey = leftId.toLowerCase();
      const rightKey = emRightId.toLowerCase();

      if (!individualsMap.has(leftKey)) {
        throw new ParseError(`Unknown individual '${leftId}'`, lineNum, 1, lineText);
      }
      if (!individualsMap.has(rightKey)) {
        throw new ParseError(`Unknown individual '${emRightId}'`, lineNum, 1, lineText);
      }

      const rel: Relationship = {
        type: emotionalType as RelationshipType,
        from: leftKey,
        to: rightKey,
      };
      if (directional) rel.directional = true;
      if (emLabel) rel.label = emLabel;
      relationships.push(rel);
      state.currentLine++;
      continue;
    }

    const coupleMatch = detectCoupleOp(trimmed);
    if (coupleMatch) {
      const { leftId, op, rightRaw } = coupleMatch;
      const lineNum = state.currentLine + 1;

      // Extract optional relationship label: quoted string at the end
      const { cleaned: rightCleaned, label: relLabel } = extractRelLabel(rightRaw);

      // Parse right side — may have inline props
      const { id: rightId, props: rightProps } = parseIdWithOptionalProps(rightCleaned);

      // Ensure left individual exists
      const leftKey = leftId.toLowerCase();
      if (!individualsMap.has(leftKey)) {
        throw new ParseError(
          `Unknown individual '${leftId}'`,
          lineNum,
          1,
          lineText
        );
      }

      // Register right individual if it has inline props or doesn't exist yet
      const rightKey = rightId.toLowerCase();
      if (rightProps) {
        const rightIndividual = buildIndividual(rightId, rightProps, lineNum, lineText);
        individualsMap.set(rightKey, rightIndividual);
      } else if (!individualsMap.has(rightKey)) {
        throw new ParseError(
          `Unknown individual '${rightId}'`,
          lineNum,
          1,
          lineText
        );
      }

      const rel: Relationship = { type: op.type, from: leftKey, to: rightKey };
      if (relLabel) rel.label = relLabel;
      relationships.push(rel);

      const coupleIndent = getIndent(lineText);
      state.currentLine++;

      // Check for children (indented lines below couple)
      while (state.currentLine < state.lines.length) {
        const childLine = state.lines[state.currentLine];
        const childTrimmed = childLine.trim();

        if (childTrimmed === "" || childTrimmed.startsWith("#")) {
          state.currentLine++;
          continue;
        }

        const childIndent = getIndent(childLine);
        if (childIndent <= coupleIndent) break;

        // This is a child line
        const childLineNum = state.currentLine + 1;
        const { id: childId, propsStr } = splitIdAndProps(childTrimmed);
        const childKey = childId.toLowerCase();

        const individual = buildIndividual(
          childId,
          propsStr,
          childLineNum,
          childLine
        );

        // Check for special child properties (adopted, foster, twin)
        if (propsStr) {
          for (const sp of SPECIAL_CHILD_PROPS) {
            if (propsTokens(propsStr).includes(sp)) {
              childSpecialProps.set(childKey, sp);
            }
          }
        }

        individualsMap.set(childKey, individual);

        // parent-child relationship: from = "leftKey+rightKey"
        const coupleKey = `${leftKey}+${rightKey}`;
        const pcType = childSpecialProps.get(childKey);
        const relType: RelationshipType =
          pcType && (pcType === "adopted" || pcType === "foster")
            ? pcType
            : "parent-child";
        relationships.push({ type: relType, from: coupleKey, to: childKey });

        state.currentLine++;
      }
    } else {
      // Individual definition line
      const lineNum = state.currentLine + 1;
      const { id, propsStr } = splitIdAndProps(trimmed);
      const key = id.toLowerCase();

      const individual = buildIndividual(id, propsStr, lineNum, lineText);

      const existing = individualsMap.get(key);
      if (existing) {
        individualsMap.set(key, mergeIndividual(existing, individual));
      } else {
        individualsMap.set(key, individual);
      }

      state.currentLine++;
    }
  }

  // Build twin relationships
  const twinGroups = new Map<string, string[]>();
  for (const [childKey, prop] of childSpecialProps) {
    if (prop === "twin-identical" || prop === "twin-fraternal") {
      // Find which couple this child belongs to
      const pcRel = relationships.find(
        (r) =>
          r.to === childKey &&
          (r.type === "parent-child" ||
            r.type === "adopted" ||
            r.type === "foster")
      );
      if (pcRel) {
        const groupKey = `${pcRel.from}:${prop}`;
        const group = twinGroups.get(groupKey) ?? [];
        group.push(childKey);
        twinGroups.set(groupKey, group);
      }
    }
  }
  for (const [groupKey, members] of twinGroups) {
    const twinType = groupKey.split(":")[1] as RelationshipType;
    for (let i = 0; i < members.length - 1; i++) {
      relationships.push({
        type: twinType,
        from: members[i],
        to: members[i + 1],
      });
    }
  }

  return {
    type: "genogram",
    individuals: Array.from(individualsMap.values()),
    relationships,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

// ─── Helpers ────────────────────────────────────────────────

function currentLineText(state: ParserState): string | undefined {
  return state.lines[state.currentLine];
}

function skipBlankAndComments(state: ParserState): void {
  while (state.currentLine < state.lines.length) {
    const t = state.lines[state.currentLine].trim();
    if (t === "" || t.startsWith("#")) {
      state.currentLine++;
    } else {
      break;
    }
  }
}

function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

interface CoupleMatch {
  leftId: string;
  op: { token: string; type: RelationshipType };
  rightRaw: string;
}

interface EmotionalMatch {
  leftId: string;
  emotionalType: string;
  rightId: string;
  directional: boolean;
  label: string | null;
}

function detectEmotionalOp(trimmed: string): EmotionalMatch | null {
  // Pattern: ID -TYPE- ID or ID -TYPE-> ID, optionally followed by "label"
  const match = trimmed.match(
    /^([a-zA-Z][a-zA-Z0-9_-]*)\s+-([\w-]+)->(.*)|^([a-zA-Z][a-zA-Z0-9_-]*)\s+-([\w-]+)-\s+(.*)/
  );
  if (!match) return null;

  const directional = !!match[1];
  const leftId = directional ? match[1] : match[4];
  const emotionalType = directional ? match[2] : match[5];
  const rest = (directional ? match[3] : match[6]).trim();

  if (!EMOTIONAL_TYPES.has(emotionalType)) return null;

  // Extract right ID and optional quoted label
  const { id: rightId, label } = extractIdAndLabel(rest);
  if (!rightId || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(rightId)) return null;

  return { leftId, emotionalType, rightId, directional, label };
}

function extractIdAndLabel(raw: string): { id: string; label: string | null } {
  // ID possibly followed by "label text"
  const labelMatch = raw.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\s+"([^"]*)"$/);
  if (labelMatch) return { id: labelMatch[1], label: labelMatch[2] };
  const idOnly = raw.match(/^([a-zA-Z][a-zA-Z0-9_-]*)$/);
  if (idOnly) return { id: idOnly[1], label: null };
  return { id: raw.trim(), label: null };
}

function extractRelLabel(rightRaw: string): { cleaned: string; label: string | null } {
  // Check for trailing "label text" after the individual definition
  const match = rightRaw.match(/^(.*?)\s+"([^"]*)"$/);
  if (match) return { cleaned: match[1].trim(), label: match[2] };
  return { cleaned: rightRaw, label: null };
}

function detectCoupleOp(trimmed: string): CoupleMatch | null {
  for (const op of COUPLE_OPS) {
    const parts = splitByOperator(trimmed, op.token);
    if (parts) {
      return { leftId: parts.left.trim(), op, rightRaw: parts.right.trim() };
    }
  }
  return null;
}

function splitByOperator(
  line: string,
  op: string
): { left: string; right: string } | null {
  // Find operator surrounded by spaces or at word boundaries, outside brackets
  let bracketDepth = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "[") bracketDepth++;
    if (line[i] === "]") bracketDepth--;
    if (bracketDepth > 0) continue;

    if (line.substring(i, i + op.length) === op) {
      const left = line.substring(0, i).trim();
      const right = line.substring(i + op.length).trim();
      if (left && right) {
        // Verify left is a valid ID (no brackets — it's just a reference)
        const leftId = left.match(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
        if (leftId) return { left, right };
      }
    }
  }
  return null;
}

function parseIdWithOptionalProps(raw: string): {
  id: string;
  props: string | null;
} {
  const bracketIdx = raw.indexOf("[");
  if (bracketIdx === -1) {
    return { id: raw.trim(), props: null };
  }
  const id = raw.substring(0, bracketIdx).trim();
  const endBracket = raw.lastIndexOf("]");
  const propsStr = raw.substring(bracketIdx + 1, endBracket === -1 ? raw.length : endBracket);
  return { id, props: propsStr };
}

function splitIdAndProps(trimmed: string): { id: string; propsStr: string | null } {
  const bracketIdx = trimmed.indexOf("[");
  if (bracketIdx === -1) {
    return { id: trimmed.trim(), propsStr: null };
  }
  const id = trimmed.substring(0, bracketIdx).trim();
  const endBracket = trimmed.lastIndexOf("]");
  const propsStr = trimmed.substring(
    bracketIdx + 1,
    endBracket === -1 ? trimmed.length : endBracket
  );
  return { id, propsStr };
}

function propsTokens(propsStr: string): string[] {
  return splitProps(propsStr).map((t) => t.trim().toLowerCase());
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

function buildIndividual(
  id: string,
  propsStr: string | null,
  lineNum: number,
  lineText: string
): Individual {
  const individual: Individual = {
    id: id.toLowerCase(),
    label: id,
    sex: "unknown",
    status: "alive",
  };

  if (!propsStr) return individual;

  const tokens = splitProps(propsStr);

  for (const rawToken of tokens) {
    const token = rawToken.trim();
    const tokenLower = token.toLowerCase();

    if (VALID_SEX.has(tokenLower)) {
      individual.sex = tokenLower as Individual["sex"];
    } else if (VALID_STATUS.has(tokenLower)) {
      individual.status = tokenLower as Individual["status"];
    } else if (tokenLower === "index") {
      if (!individual.markers) individual.markers = [];
      individual.markers.push("index-person");
    } else if (SPECIAL_CHILD_PROPS.has(tokenLower)) {
      // Handled at caller level for relationships
      continue;
    } else if (/^\d{4}$/.test(tokenLower)) {
      if (individual.birthYear !== undefined) {
        individual.deathYear = parseInt(token, 10);
      } else {
        individual.birthYear = parseInt(token, 10);
      }
    } else if (tokenLower.startsWith("conditions:")) {
      individual.conditions = parseConditions(
        token.substring("conditions:".length).trim(),
        lineNum,
        lineText
      );
    } else if (token.includes(":")) {
      const colonIdx = token.indexOf(":");
      const key = token.substring(0, colonIdx).trim().toLowerCase();
      const value = token.substring(colonIdx + 1).trim();
      if (key === "age") {
        const ageNum = parseInt(value, 10);
        if (!isNaN(ageNum)) individual.age = ageNum;
      } else if (key === "death") {
        const deathNum = parseInt(value, 10);
        if (!isNaN(deathNum)) individual.deathYear = deathNum;
      } else if (key === "label") {
        individual.label = value.replace(/^"|"$/g, "");
      } else {
        if (!individual.properties) individual.properties = {};
        individual.properties[key] = value;
      }
    } else {
      throw new ParseError(
        `Unknown property '${token}'. Valid: male, female, unknown, deceased, stillborn, miscarriage, abortion, adopted, foster, twin-identical, twin-fraternal, index, a 4-digit year, conditions:..., age:N, death:YYYY, or key:value`,
        lineNum,
        1,
        lineText
      );
    }
  }

  return individual;
}

function parseConditions(
  raw: string,
  lineNum: number,
  lineText: string
): Condition[] {
  const parts = raw.split("+").map((s) => s.trim());
  const conditions: Condition[] = [];

  for (const part of parts) {
    const match = part.match(/^([a-zA-Z0-9_-]+)\(([^)]+)\)$/);
    if (!match) {
      throw new ParseError(
        `Invalid condition format '${part}'. Expected: name(fill) or name(fill, #color)`,
        lineNum,
        1,
        lineText
      );
    }
    const [, label, innerRaw] = match;
    const innerParts = innerRaw.split(",").map((s) => s.trim());
    const fill = innerParts[0];
    const color = innerParts[1]; // optional

    if (!VALID_FILLS.has(fill)) {
      throw new ParseError(
        `Invalid fill pattern '${fill}'. Valid: full, half-left, half-right, half-top, half-bottom, quad-tl, quad-tr, quad-bl, quad-br, quarter, striped, dotted`,
        lineNum,
        1,
        lineText
      );
    }
    const cond: Condition = { label, fill: fill as ConditionFill };
    if (color) cond.color = color;
    conditions.push(cond);
  }

  return conditions;
}

function mergeIndividual(
  existing: Individual,
  incoming: Individual
): Individual {
  return {
    ...existing,
    sex: incoming.sex !== "unknown" ? incoming.sex : existing.sex,
    status: incoming.status !== "alive" ? incoming.status : existing.status,
    birthYear: incoming.birthYear ?? existing.birthYear,
    deathYear: incoming.deathYear ?? existing.deathYear,
    conditions: incoming.conditions ?? existing.conditions,
    properties: {
      ...existing.properties,
      ...incoming.properties,
    },
  };
}
