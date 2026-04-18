/**
 * Venn / Euler DSL parser (hand-written recursive descent).
 *
 * Accepts four DSL modes (see 15-VENN-STANDARD §5):
 *   1. Declarative set + intersection:  `A & B : 42`
 *   2. Enumeration shorthand:           `A = { 1, 2, 3 }`
 *   3. Region-labeled:                  `region A & B : "..."`
 *   4. Euler-explicit:                  `dogs subset mammals`
 *
 * All four can be mixed within one document (except enumeration sets imply
 * automatic intersections and shouldn't be combined with explicit `A & B :`).
 */

import type {
  VennAST,
  VennConfig,
  VennEulerRelation,
  VennEulerRelationType,
  VennRegion,
  VennRegionValue,
  VennSet,
} from "../../core/types";

export class VennParseError extends Error {
  constructor(message: string, public readonly line?: number) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "VennParseError";
  }
}

const DEFAULT_CONFIG: VennConfig = {
  mode: "auto",
  proportional: false,
  palette: "default",
  blendMode: "multiply",
  showCounts: "auto",
  showPercent: false,
};

function stripComment(line: string): string {
  // Comments start at first unquoted '#'.
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuote = !inQuote;
    else if (ch === "#" && !inQuote) return line.slice(0, i);
  }
  return line;
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

function parseConfigProps(text: string): Record<string, string> {
  // Split on commas that are not inside quotes or brackets.
  const out: Record<string, string> = {};
  let depth = 0;
  let inQuote = false;
  let buf = "";
  const parts: string[] = [];
  for (const ch of text) {
    if (ch === '"') inQuote = !inQuote;
    else if (!inQuote && (ch === "[" || ch === "(" || ch === "{")) depth++;
    else if (!inQuote && (ch === "]" || ch === ")" || ch === "}")) depth--;
    if (ch === "," && depth === 0 && !inQuote) {
      parts.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf);
  for (const p of parts) {
    const idx = p.indexOf(":");
    if (idx < 0) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    out[k] = stripQuotes(v);
  }
  return out;
}

function parseTitleAndProps(rest: string): { title?: string; props: Record<string, string> } {
  // Matches:  "title" [k: v, k2: v2]   or   "title"   or   [k: v]
  const trimmed = rest.trim();
  let i = 0;
  let title: string | undefined;
  if (trimmed.startsWith('"')) {
    const end = trimmed.indexOf('"', 1);
    if (end < 0) throw new VennParseError("unterminated quoted title");
    title = trimmed.slice(1, end);
    i = end + 1;
  }
  const tail = trimmed.slice(i).trim();
  let props: Record<string, string> = {};
  if (tail.startsWith("[") && tail.endsWith("]")) {
    props = parseConfigProps(tail.slice(1, -1));
  }
  return { title, props };
}

function parseValue(raw: string): VennRegionValue {
  const t = raw.trim();
  if (!t) return { kind: "none" };
  // List: [ ... ]
  if (t.startsWith("[") && t.endsWith("]")) {
    const inner = t.slice(1, -1).trim();
    if (!inner) return { kind: "list", value: [] };
    const items = splitTopLevelCommas(inner).map((x) => stripQuotes(x.trim()));
    return { kind: "list", value: items };
  }
  // Percentage
  if (/^-?\d+(\.\d+)?%$/.test(t)) {
    return { kind: "percent", value: parseFloat(t.slice(0, -1)) };
  }
  // Integer
  if (/^-?\d+$/.test(t)) {
    return { kind: "integer", value: parseInt(t, 10) };
  }
  // Quoted string
  if (t.startsWith('"') && t.endsWith('"')) {
    return { kind: "text", value: t.slice(1, -1) };
  }
  // Bare word / text
  return { kind: "text", value: t };
}

function splitTopLevelCommas(s: string): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  let inQuote = false;
  for (const ch of s) {
    if (ch === '"') inQuote = !inQuote;
    else if (!inQuote && (ch === "{" || ch === "[" || ch === "(")) depth++;
    else if (!inQuote && (ch === "}" || ch === "]" || ch === ")")) depth--;
    if (ch === "," && depth === 0 && !inQuote) {
      out.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.length > 0) out.push(buf);
  return out;
}

const EULER_KEYWORDS: Record<string, VennEulerRelationType> = {
  subset: "subset",
  disjoint: "disjoint",
  overlap: "overlap",
};

function parseRegionKey(
  text: string,
  knownSets: Set<string>
): { sets: string[]; only: boolean } {
  const trimmed = text.trim();
  // "A only"
  const onlyMatch = /^([A-Za-z][\w-]*)\s+only$/i.exec(trimmed);
  if (onlyMatch && onlyMatch[1]) {
    const id = onlyMatch[1];
    if (!knownSets.has(id)) {
      throw new VennParseError(`unknown set id "${id}" in region key`);
    }
    return { sets: [id], only: true };
  }
  // "A & B & C"
  const parts = trimmed.split("&").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    throw new VennParseError(`empty region key: "${text}"`);
  }
  for (const p of parts) {
    if (!/^[A-Za-z][\w-]*$/.test(p)) {
      throw new VennParseError(`invalid set ref "${p}" in region key`);
    }
    if (!knownSets.has(p)) {
      throw new VennParseError(`unknown set id "${p}" in region key`);
    }
  }
  // Canonicalise by keeping declaration order (caller normalises later).
  return { sets: [...parts], only: false };
}

export function parseVennDSL(input: string): VennAST {
  const lines = input.split(/\r?\n/);
  let title: string | undefined;
  let headerSeen = false;
  const config: VennConfig = { ...DEFAULT_CONFIG };
  const sets: VennSet[] = [];
  const setsById = new Map<string, VennSet>();
  const regions: VennRegion[] = [];
  const relations: VennEulerRelation[] = [];
  const metadata: Record<string, string> = {};

  const knownSetIds = new Set<string>();

  const applyConfigProps = (props: Record<string, string>): void => {
    for (const [k, v] of Object.entries(props)) {
      applyConfig(k, v, config, metadata);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = stripComment(lines[i] ?? "").trim();
    if (!raw) continue;
    const lineNo = i + 1;

    // Header: `venn "Title"` or `venn: "Title"` (optionally with [props])
    if (!headerSeen && /^venn\b/i.test(raw)) {
      const rest = raw.replace(/^venn\s*:?\s*/i, "");
      const { title: t, props } = parseTitleAndProps(rest);
      if (t !== undefined) title = t;
      applyConfigProps(props);
      headerSeen = true;
      continue;
    }

    // config: key = value
    const configMatch = /^config\s*:\s*([a-zA-Z_]+)\s*=\s*(.+)$/.exec(raw);
    if (configMatch && configMatch[1] && configMatch[2]) {
      applyConfig(configMatch[1], configMatch[2].trim(), config, metadata);
      continue;
    }

    // layout <venn|euler|auto>
    const layoutMatch = /^layout\s+(venn|euler|auto)\s*$/i.exec(raw);
    if (layoutMatch && layoutMatch[1]) {
      config.mode = layoutMatch[1].toLowerCase() as VennConfig["mode"];
      continue;
    }

    // set <id> "label" [props?]
    const setMatch = /^set\s+([A-Za-z][\w-]*)\s+(.+)$/i.exec(raw);
    if (setMatch && setMatch[1] && setMatch[2]) {
      const id = setMatch[1];
      const rest = setMatch[2];
      const { title: label, props } = parseTitleAndProps(rest);
      if (setsById.has(id)) {
        throw new VennParseError(`duplicate set id "${id}"`, lineNo);
      }
      const color = props["color"] ?? props["fill"];
      const setObj: VennSet = { id, label: label ?? id, color };
      sets.push(setObj);
      setsById.set(id, setObj);
      knownSetIds.add(id);
      continue;
    }

    // Enumeration: ID = { ... }
    const enumMatch = /^([A-Za-z][\w-]*)\s*=\s*\{([^}]*)\}\s*$/.exec(raw);
    if (enumMatch && enumMatch[1] !== undefined && enumMatch[2] !== undefined) {
      const id = enumMatch[1];
      const items = splitTopLevelCommas(enumMatch[2])
        .map((x) => stripQuotes(x.trim()))
        .filter((x) => x.length > 0);
      let setObj = setsById.get(id);
      if (!setObj) {
        setObj = { id, label: id, elements: items };
        sets.push(setObj);
        setsById.set(id, setObj);
        knownSetIds.add(id);
      } else {
        setObj.elements = items;
      }
      continue;
    }

    // Euler relation: ID subset ID   |  ID in ID  |  ID disjoint ID  |  ID overlap ID
    const eulerMatch = /^([A-Za-z][\w-]*)\s+(subset|in|disjoint|overlap)\s+([A-Za-z][\w-]*)\s*$/i.exec(
      raw
    );
    if (eulerMatch && eulerMatch[1] && eulerMatch[2] && eulerMatch[3]) {
      const from = eulerMatch[1];
      const relRaw = eulerMatch[2].toLowerCase();
      const rel = relRaw === "in" ? "subset" : relRaw;
      const to = eulerMatch[3];
      if (!knownSetIds.has(from)) {
        throw new VennParseError(`unknown set "${from}" in relation`, lineNo);
      }
      if (!knownSetIds.has(to)) {
        throw new VennParseError(`unknown set "${to}" in relation`, lineNo);
      }
      const relType = EULER_KEYWORDS[rel];
      if (!relType) {
        throw new VennParseError(`unknown relation "${rel}"`, lineNo);
      }
      relations.push({ from, to, type: relType });
      continue;
    }

    // Region syntax:  [region ]<key> : <value> [props?]
    let regionBody = raw;
    if (/^region\s+/i.test(regionBody)) {
      regionBody = regionBody.replace(/^region\s+/i, "");
    }
    const colonIdx = regionBody.indexOf(":");
    if (colonIdx > 0) {
      const keyPart = regionBody.slice(0, colonIdx);
      const valuePart = regionBody.slice(colonIdx + 1).trim();
      try {
        const { sets: regionSets, only } = parseRegionKey(keyPart, knownSetIds);
        const value = parseValue(valuePart);
        regions.push({ sets: regionSets, only, value });
        continue;
      } catch (e) {
        if (e instanceof VennParseError) {
          throw new VennParseError(e.message, lineNo);
        }
        throw e;
      }
    }

    throw new VennParseError(`could not parse line: "${raw}"`, lineNo);
  }

  if (!headerSeen && sets.length === 0) {
    throw new VennParseError("empty or missing 'venn' header");
  }

  // Auto-derive regions for enumeration sets when no explicit regions were given.
  const hasEnumeration = sets.some((s) => s.elements !== undefined);
  if (hasEnumeration && regions.length === 0) {
    regions.push(...deriveRegionsFromEnumeration(sets));
  }

  const ast: VennAST = {
    type: "venn",
    ...(title !== undefined ? { title } : {}),
    sets,
    regions,
    relations,
    config,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
  return ast;
}

function applyConfig(
  key: string,
  rawValue: string,
  config: VennConfig,
  metadata: Record<string, string>
): void {
  const value = rawValue.trim().toLowerCase();
  switch (key) {
    case "diagram":
      if (value === "venn" || value === "euler" || value === "auto") {
        config.mode = value;
      }
      return;
    case "proportional":
      config.proportional = value === "true" || value === "yes" || value === "1";
      return;
    case "palette":
      if (value === "default" || value === "brand" || value === "monochrome") {
        config.palette = value;
      }
      return;
    case "blendMode":
    case "blendmode":
      if (value === "multiply" || value === "screen" || value === "none") {
        config.blendMode = value;
      }
      return;
    case "showCounts":
    case "showcounts":
      config.showCounts =
        value === "true" ? true : value === "false" ? false : "auto";
      return;
    case "showPercent":
    case "showpercent":
      config.showPercent = value === "true" || value === "yes";
      return;
    default:
      metadata[key] = rawValue.trim();
  }
}

/**
 * Build the full set of non-empty regions from enumeration-style sets by
 * computing every possible intersection of actual elements.
 */
function deriveRegionsFromEnumeration(sets: VennSet[]): VennRegion[] {
  const n = sets.length;
  if (n === 0) return [];
  const regions: VennRegion[] = [];
  const total = 1 << n;
  for (let mask = 1; mask < total; mask++) {
    const included: number[] = [];
    const excluded: number[] = [];
    for (let i = 0; i < n; i++) {
      if ((mask >> i) & 1) included.push(i);
      else excluded.push(i);
    }
    const firstIdx = included[0];
    if (firstIdx === undefined) continue;
    const firstSetObj = sets[firstIdx];
    if (!firstSetObj) continue;
    const firstSet = firstSetObj.elements ?? [];
    const members = firstSet.filter((el) => {
      for (const idx of included) {
        const s = sets[idx];
        const list = s?.elements ?? [];
        if (!list.includes(el)) return false;
      }
      for (const idx of excluded) {
        const s = sets[idx];
        const list = s?.elements ?? [];
        if (list.includes(el)) return false;
      }
      return true;
    });
    if (members.length === 0) continue;
    const setIds: string[] = [];
    for (const idx of included) {
      const s = sets[idx];
      if (s) setIds.push(s.id);
    }
    regions.push({
      sets: setIds,
      only: excluded.length > 0 && included.length < n,
      value: { kind: "list", value: members },
    });
  }
  return regions;
}
