import type {
  LadderAST,
  LadderRung,
  LadderElement,
  LadderBranch,
  LadderContact,
  LadderCoil,
  LadderFunctionBlock,
  LadderContactType,
  LadderCoilType,
  LadderFBType,
} from "../../core/types";
import { matchQuotedTitle } from "../../core/quotes";
import { didYouMean } from "../../core/dsl-suggest";

export class LadderParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number,
    public source?: string
  ) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "LadderParseError";
  }
}

const CONTACT_TYPES = new Set<LadderContactType>(["XIC", "XIO", "ONS", "OSF"]);
// IEC 61131-3 §6.7 coil types + Rockwell/Allen-Bradley extensions.
//   OTE/OTL/OTU/OTN — output energize / latch / unlatch / not (IEC + AB)
//   RES             — counter / timer reset (AB convention; IEC writes `R` on
//                     a reset rung). Visually a coil with `R` inscribed.
const COIL_TYPES = new Set<LadderCoilType>(["OTE", "OTL", "OTU", "OTN", "RES"]);
const FB_TYPES = new Set<LadderFBType>([
  "TON", "TOFF", "TP",
  "CTU", "CTD", "CTUD",
  "ADD", "SUB", "MUL", "DIV",
  "MOV",
  "EQU", "NEQ", "GRT", "LES", "GEQ", "LEQ",
]);

const ALL_ELEMENT_TYPES: string[] = [
  ...CONTACT_TYPES,
  ...COIL_TYPES,
  ...FB_TYPES,
];

/** Split comma-separated args respecting quoted strings. */
function splitArgs(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (const ch of s) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === "," && !inQuote) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function stripQuotes(v: string): string {
  const t = v.trim();
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

/**
 * Split an element line into op + inner-arg-string, walking paren depth and
 * respecting double-quoted regions. Replaces the old `^OP\s*\(([^)]*)\)\s*$`
 * regex which broke on quoted names that themselves contained parens — e.g.
 * `XIC(SENSOR, name="الحساس (صغير)")` would terminate at the inner `)`.
 */
function splitOpAndArgs(line: string): { op: string; inside: string } | null {
  const opMatch = line.match(/^([A-Z][A-Z0-9_]*)\s*\(/);
  if (!opMatch) return null;
  const op = opMatch[1]!;
  const start = opMatch[0]!.length;
  let depth = 1;
  let inQuote = false;
  let end = -1;
  for (let i = start; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"' && line[i - 1] !== "\\") {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  // Trailing chars after the closing `)` are only allowed if blank.
  if (line.slice(end + 1).trim() !== "") return null;
  return { op, inside: line.slice(start, end) };
}

/** Parse one element line, e.g. XIC(START), TON(T1, PT=5000), OTE(MOTOR). */
function parseElement(line: string, lineNo: number): LadderElement {
  const m = splitOpAndArgs(line);
  if (!m) {
    throw new LadderParseError(`invalid element syntax: ${line}`, lineNo, undefined, line);
  }
  const op = m.op;
  const args = splitArgs(m.inside);
  if (args.length === 0 || !args[0]) {
    throw new LadderParseError(`element missing tag: ${line}`, lineNo, undefined, line);
  }
  const tag = args[0];

  if (CONTACT_TYPES.has(op as LadderContactType)) {
    const contact: LadderContact = {
      elementType: "contact",
      contactType: op as LadderContactType,
      tag,
    };
    // optional address as second positional or address=...
    for (let i = 1; i < args.length; i++) {
      const a = args[i];
      const kv = a.match(/^(\w+)\s*=\s*(.+)$/);
      if (kv) {
        const key = kv[1].toLowerCase();
        if (key === "address") contact.address = stripQuotes(kv[2]);
        else if (key === "name") contact.name = stripQuotes(kv[2]);
      } else {
        contact.address = stripQuotes(a);
      }
    }
    return contact;
  }

  if (COIL_TYPES.has(op as LadderCoilType)) {
    const coil: LadderCoil = {
      elementType: "coil",
      coilType: op as LadderCoilType,
      tag,
    };
    for (let i = 1; i < args.length; i++) {
      const a = args[i];
      const kv = a.match(/^(\w+)\s*=\s*(.+)$/);
      if (kv) {
        const key = kv[1].toLowerCase();
        if (key === "address") coil.address = stripQuotes(kv[2]);
        else if (key === "name") coil.name = stripQuotes(kv[2]);
      } else {
        coil.address = stripQuotes(a);
      }
    }
    return coil;
  }

  if (FB_TYPES.has(op as LadderFBType)) {
    const params: Record<string, string | number> = {};
    for (let i = 1; i < args.length; i++) {
      const a = args[i];
      const kv = a.match(/^(\w+)\s*=\s*(.+)$/);
      if (kv) {
        const v = stripQuotes(kv[2]);
        const n = Number(v);
        params[kv[1]] = Number.isFinite(n) && v !== "" && /^-?\d+(\.\d+)?$/.test(v) ? n : v;
      }
    }
    const fb: LadderFunctionBlock = {
      elementType: "function_block",
      fbType: op as LadderFBType,
      tag,
      params,
    };
    return fb;
  }

  throw new LadderParseError(
    `unknown element type "${op}"${didYouMean(op, ALL_ELEMENT_TYPES)}`,
    lineNo,
    undefined,
    line
  );
}

export function parseLadderDSL(text: string): LadderAST {
  const rawLines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  let title: string | undefined;
  const rungs: LadderRung[] = [];

  let currentRung: LadderRung | null = null;
  let currentParallel: LadderBranch[] | null = null;
  let currentBranch: LadderBranch | null = null;
  let parallelIndent = -1;
  let branchIndent = -1;

  function finishParallel() {
    if (currentRung && currentParallel) {
      currentRung.elements.push({ parallel: currentParallel });
    }
    currentParallel = null;
    currentBranch = null;
    parallelIndent = -1;
    branchIndent = -1;
  }

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const lineNo = i + 1;
    // Strip `#`, `//`, or Mermaid `%%` line comments. Quote-awareness is
    // overkill here: ladder lines don't carry URL-shaped attributes, and
    // a literal `#` inside a quoted PLC tag is exceedingly rare.
    const stripped = raw.replace(/(#|\/\/|%%).*$/, "");
    if (!stripped.trim()) continue;

    // indentation = count of leading spaces/tabs (tab = 2)
    let indent = 0;
    for (const ch of stripped) {
      if (ch === " ") indent++;
      else if (ch === "\t") indent += 2;
      else break;
    }
    const line = stripped.trim();

    // Header: ladder "title"
    if (/^ladder\b/i.test(line)) {
      const t = matchQuotedTitle(line);
      if (t !== undefined) title = t;
      continue;
    }

    // Rung: `rung N "comment":` — the trailing colon is optional, since LLMs
    // routinely emit `rung 1` without it (Mermaid never uses a colon here, so
    // it's not in the training data). The optional quoted comment is unchanged.
    const rungMatch = line.match(/^rung\s+(\d+)(?:\s+"([^"]*)")?\s*:?\s*$/i);
    if (rungMatch) {
      finishParallel();
      if (currentRung) {
        if (currentRung.elements.length === 0) {
          throw new LadderParseError(`Rung ${currentRung.number}: empty rung`);
        }
        rungs.push(currentRung);
      }
      currentRung = {
        number: Number(rungMatch[1]),
        comment: rungMatch[2],
        elements: [],
      };
      continue;
    }

    if (!currentRung) {
      throw new LadderParseError(`element outside of rung: ${line}`, lineNo, undefined, line);
    }

    // parallel:
    if (/^parallel\s*:\s*$/i.test(line)) {
      finishParallel();
      currentParallel = [];
      parallelIndent = indent;
      continue;
    }

    // branch:
    if (/^branch\s*:\s*$/i.test(line)) {
      if (!currentParallel) {
        throw new LadderParseError(`branch: without parallel:`, lineNo, undefined, line);
      }
      currentBranch = { elements: [] };
      currentParallel.push(currentBranch);
      branchIndent = indent;
      continue;
    }

    // If we're in a parallel block but indent fell back, close it.
    if (currentParallel && indent <= parallelIndent) {
      finishParallel();
    }

    const element = parseElement(line, lineNo);

    if (currentParallel && currentBranch && indent > branchIndent) {
      currentBranch.elements.push(element);
    } else {
      if (currentParallel) finishParallel();
      currentRung.elements.push(element);
    }
  }

  finishParallel();
  if (currentRung) {
    if (currentRung.elements.length === 0) {
      throw new LadderParseError(`Rung ${currentRung.number}: empty rung`);
    }
    rungs.push(currentRung);
  }

  if (rungs.length === 0) {
    throw new LadderParseError("Ladder diagram has no rungs");
  }

  return { type: "ladder", title, rungs };
}
