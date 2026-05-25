import type {
  DiagramAST,
  Individual,
  LegendOverrides,
  Relationship,
  RelationshipType,
  Condition,
  ConditionFill,
} from "../../core/types";
import { parseLegendDirective } from "../../core/legend-parser";

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

// Order matters — the parser tries these in sequence and the first match wins.
// Longer tokens MUST come first so e.g. `~/~` is not split as `~` + `/~`.
const COUPLE_OPS: Array<{ token: string; type: RelationshipType }> = [
  { token: "~/~", type: "cohabiting-ended" },
  { token: "-//", type: "separated" }, // alias for -/-
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
// Tokens whose appearance on a redeclared child indicates the link is a
// secondary "current caregiver" relationship (foster / adopted / guardian),
// not the structural biological link.
const SECONDARY_LINK_PROPS = new Set(["foster", "adopted", "guardian"]);
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
  const legendOverrides: LegendOverrides = {};
  // Track which children already have a structural (primary) parent-child rel.
  // The first one wins layout; later declarations under another couple become
  // secondary "current caregiver" links.
  const childrenWithPrimary = new Set<string>();
  // Counter for auto-generated `?` placeholder ids.
  let unknownSibCounter = 0;

  skipBlankAndComments(state);

  while (state.currentLine < state.lines.length) {
    skipBlankAndComments(state);
    if (state.currentLine >= state.lines.length) break;

    const lineText = state.lines[state.currentLine];
    const trimmed = lineText.trim();
    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("%%")) {
      state.currentLine++;
      continue;
    }

    // Legend directives (`legend: ...`, `legend.title: ...`, etc.)
    if (parseLegendDirective(trimmed, legendOverrides)) {
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
        const incoming = buildIndividual(rightId, rightProps, lineNum, lineText);
        const existing = individualsMap.get(rightKey);
        individualsMap.set(
          rightKey,
          existing
            ? mergeIndividual(existing, incoming, lineNum, lineText)
            : incoming
        );
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

        if (childTrimmed === "" || childTrimmed.startsWith("#") || childTrimmed.startsWith("//") || childTrimmed.startsWith("%%")) {
          state.currentLine++;
          continue;
        }

        const childIndent = getIndent(childLine);
        if (childIndent <= coupleIndent) break;

        // This is a child line
        const childLineNum = state.currentLine + 1;

        // `?` shorthand → synthetic placeholder id with unknown-siblings marker
        let parsedId: string;
        let parsedProps: string | null;
        if (childTrimmed === "?" || childTrimmed.startsWith("? ")) {
          parsedId = `__unknown_siblings_${++unknownSibCounter}`;
          parsedProps = "unknown, unknown-siblings";
        } else {
          const split = splitIdAndProps(childTrimmed);
          parsedId = split.id;
          parsedProps = split.propsStr;
        }
        const childKey = parsedId.toLowerCase();

        const incoming = buildIndividual(
          parsedId,
          parsedProps,
          childLineNum,
          childLine
        );

        // Check for special child properties (adopted, foster, twin)
        const tokens = parsedProps ? propsTokens(parsedProps) : [];
        for (const sp of SPECIAL_CHILD_PROPS) {
          if (tokens.includes(sp)) childSpecialProps.set(childKey, sp);
        }
        const isSecondaryDecl = tokens.some((t) => SECONDARY_LINK_PROPS.has(t));

        const existing = individualsMap.get(childKey);
        individualsMap.set(
          childKey,
          existing
            ? mergeIndividual(existing, incoming, childLineNum, childLine)
            : incoming
        );

        // parent-child relationship: from = "leftKey+rightKey"
        // IMPORTANT: derive the rel type from THIS line's tokens, not from
        // the cross-declaration `childSpecialProps` map — otherwise a child
        // declared once with `[foster]` and again as a plain bio child would
        // see the bio rel typed as "foster" too (the global map is sticky).
        const coupleKey = `${leftKey}+${rightKey}`;
        const lineChildType = tokens.find((t) =>
          SPECIAL_CHILD_PROPS.has(t)
        );
        const relType: RelationshipType =
          lineChildType === "adopted" || lineChildType === "foster"
            ? (lineChildType as RelationshipType)
            : "parent-child";

        // Dual-parent handling: if this child already has a primary
        // structural rel, demote this one to secondary so it doesn't
        // compete for layout. Otherwise this becomes the primary.
        const isSecondary =
          isSecondaryDecl && childrenWithPrimary.has(childKey);
        const rel: Relationship = {
          type: relType,
          from: coupleKey,
          to: childKey,
        };
        if (isSecondary) rel.secondary = true;
        relationships.push(rel);
        if (!isSecondary) childrenWithPrimary.add(childKey);

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
        individualsMap.set(
          key,
          mergeIndividual(existing, individual, lineNum, lineText)
        );
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

  // Order-insensitive primary/secondary normalization for dual-parent cases.
  // If a child has multiple parent-child rels, prefer the bio one as primary
  // (`type: "parent-child"`); otherwise keep the first declared as primary.
  // All other parent-child rels for that child become `secondary: true`. This
  // protects against the LLM emitting foster-parents-first / bio-parents-second
  // (which would otherwise leave both rels primary and break layout).
  normalizePrimaryParentRels(relationships);

  const hasLegendOverrides =
    Object.keys(legendOverrides).length > 0 &&
    Object.values(legendOverrides).some((v) => v !== undefined);

  return {
    type: "genogram",
    individuals: Array.from(individualsMap.values()),
    relationships,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    legendOverrides: hasLegendOverrides ? legendOverrides : undefined,
  };
}

function normalizePrimaryParentRels(relationships: Relationship[]): void {
  const PARENT_CHILD_TYPES = new Set<RelationshipType>([
    "parent-child",
    "adopted",
    "foster",
  ]);
  // Group indices by child id
  const byChild = new Map<string, number[]>();
  for (let i = 0; i < relationships.length; i++) {
    const r = relationships[i];
    if (!PARENT_CHILD_TYPES.has(r.type)) continue;
    const arr = byChild.get(r.to) ?? [];
    arr.push(i);
    byChild.set(r.to, arr);
  }
  for (const indices of byChild.values()) {
    if (indices.length < 2) continue;
    // Prefer "parent-child" (bio) as primary; else first declared.
    let primaryIdx = indices.find((i) => relationships[i].type === "parent-child");
    if (primaryIdx === undefined) primaryIdx = indices[0];
    for (const i of indices) {
      if (i === primaryIdx) {
        delete relationships[i].secondary;
      } else {
        relationships[i].secondary = true;
      }
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────

function currentLineText(state: ParserState): string | undefined {
  return state.lines[state.currentLine];
}

function skipBlankAndComments(state: ParserState): void {
  while (state.currentLine < state.lines.length) {
    const t = state.lines[state.currentLine].trim();
    if (t === "" || t.startsWith("#") || t.startsWith("//") || t.startsWith("%%")) {
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

function unquote(value: string): string {
  return value.replace(/^["'“「『]|["'”」』]$/g, "").trim();
}

/** Extract a 4-digit year from an ISO-ish date string (`1940-03-12` → 1940). */
function yearOf(value: string): number | undefined {
  const m = value.match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : undefined;
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
    } else if (tokenLower === "unknown-siblings") {
      if (!individual.markers) individual.markers = [];
      individual.markers.push("unknown-siblings");
      if (!individual.label || individual.label === id) individual.label = "?";
    } else if (SPECIAL_CHILD_PROPS.has(tokenLower) || tokenLower === "guardian") {
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
      } else if (key === "dob") {
        const v = unquote(value);
        individual.dob = v;
        const yr = yearOf(v);
        if (yr !== undefined && individual.birthYear === undefined) {
          individual.birthYear = yr;
        }
      } else if (key === "dod") {
        const v = unquote(value);
        individual.dod = v;
        const yr = yearOf(v);
        if (yr !== undefined && individual.deathYear === undefined) {
          individual.deathYear = yr;
        }
        if (individual.status === "alive") individual.status = "deceased";
      } else if (key === "note") {
        individual.note = unquote(value);
      } else if (key === "birth") {
        const v = value.trim().toLowerCase();
        if (v === "out-of-wedlock" || v === "adopted" || v === "legitimate") {
          individual.birthStatus = v;
        } else {
          throw new ParseError(
            `Invalid birth status '${value}'. Valid: legitimate, out-of-wedlock, adopted`,
            lineNum, 1, lineText
          );
        }
      } else if (key === "label") {
        individual.label = value.replace(/^"|"$/g, "");
      } else if (key === "sibling-of") {
        individual.siblingOf = value.toLowerCase();
      } else if (key === "shape") {
        const v = value.toLowerCase();
        if (
          v === "square" || v === "circle" || v === "diamond" ||
          v === "triangle" || v === "triangle-down"
        ) {
          individual.shape = v;
        } else {
          throw new ParseError(
            `Invalid shape '${value}'. Valid: square, circle, diamond, triangle, triangle-down`,
            lineNum, 1, lineText
          );
        }
      } else {
        if (!individual.properties) individual.properties = {};
        individual.properties[key] = value;
      }
    } else {
      throw new ParseError(
        `Unknown property '${token}'. Valid: male, female, unknown, deceased, stillborn, miscarriage, abortion, adopted, foster, guardian, twin-identical, twin-fraternal, index, unknown-siblings, a 4-digit year, conditions:..., age:N, death:YYYY, dob:"YYYY-MM-DD", dod:"YYYY-MM-DD", note:"...", birth:out-of-wedlock|adopted, label:"...", sibling-of:ID, or key:value`,
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

/**
 * Merge a redeclaration into an existing individual.
 *
 * Rule: defaults (`sex: "unknown"`, `status: "alive"`, label === id) yield to
 * any non-default value from the other side. Two conflicting non-default
 * values (e.g. sex declared as both `male` and `female`) raise ParseError —
 * silent data loss is the bug we're fixing here.
 */
function mergeIndividual(
  existing: Individual,
  incoming: Individual,
  lineNum: number,
  lineText: string
): Individual {
  // Sex conflict detection (defaults pass through silently)
  let mergedSex = existing.sex;
  if (incoming.sex !== "unknown") {
    if (existing.sex !== "unknown" && existing.sex !== incoming.sex) {
      throw new ParseError(
        `Conflicting sex for '${existing.id}': previously '${existing.sex}', now '${incoming.sex}'`,
        lineNum,
        1,
        lineText
      );
    }
    mergedSex = incoming.sex;
  }

  let mergedStatus = existing.status;
  if (incoming.status !== "alive") {
    if (existing.status !== "alive" && existing.status !== incoming.status) {
      throw new ParseError(
        `Conflicting status for '${existing.id}': previously '${existing.status}', now '${incoming.status}'`,
        lineNum,
        1,
        lineText
      );
    }
    mergedStatus = incoming.status;
  }

  if (
    incoming.birthYear !== undefined &&
    existing.birthYear !== undefined &&
    incoming.birthYear !== existing.birthYear
  ) {
    throw new ParseError(
      `Conflicting birth year for '${existing.id}': previously ${existing.birthYear}, now ${incoming.birthYear}`,
      lineNum,
      1,
      lineText
    );
  }
  if (
    incoming.deathYear !== undefined &&
    existing.deathYear !== undefined &&
    incoming.deathYear !== existing.deathYear
  ) {
    throw new ParseError(
      `Conflicting death year for '${existing.id}': previously ${existing.deathYear}, now ${incoming.deathYear}`,
      lineNum,
      1,
      lineText
    );
  }

  // Label: incoming overrides only if it's not the default (id-derived)
  const incomingHasExplicitLabel =
    incoming.label !== incoming.id && incoming.label !== "";
  const existingHasExplicitLabel =
    existing.label !== existing.id && existing.label !== "";
  const mergedLabel = incomingHasExplicitLabel
    ? incoming.label
    : existingHasExplicitLabel
    ? existing.label
    : existing.label;

  // Markers: union (preserve set semantics)
  const mergedMarkers = mergeArrayUnique(existing.markers, incoming.markers);

  return {
    ...existing,
    sex: mergedSex,
    status: mergedStatus,
    label: mergedLabel,
    birthYear: incoming.birthYear ?? existing.birthYear,
    deathYear: incoming.deathYear ?? existing.deathYear,
    dob: incoming.dob ?? existing.dob,
    dod: incoming.dod ?? existing.dod,
    note: incoming.note ?? existing.note,
    birthStatus: incoming.birthStatus ?? existing.birthStatus,
    age: incoming.age ?? existing.age,
    conditions: incoming.conditions ?? existing.conditions,
    heritage: incoming.heritage ?? existing.heritage,
    siblingOf: incoming.siblingOf ?? existing.siblingOf,
    markers: mergedMarkers,
    properties: {
      ...existing.properties,
      ...incoming.properties,
    },
  };
}

function mergeArrayUnique<T>(
  a: T[] | undefined,
  b: T[] | undefined
): T[] | undefined {
  if (!a && !b) return undefined;
  const seen = new Set<T>();
  const out: T[] = [];
  for (const v of [...(a ?? []), ...(b ?? [])]) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out.length ? out : undefined;
}
