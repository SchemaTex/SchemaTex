/**
 * Event Tree (eventtree / eta) parser — flat declaration DSL.
 * Per docs/reference/39-EVENT-TREE-STANDARD.md §"DSL sketch".
 *
 * Shape (chosen from the doc's Form 1 — the s/f/* outcome-pattern grammar):
 *
 *   eventtree "Loss of coolant accident"
 *     initiating LOCA "Large LOCA" freq: 1e-4
 *     function A "ECCS injects"          p: 0.001
 *     function B "Containment spray"     p: 0.01
 *     function C "Containment integrity" p: 0.005
 *     outcome s s s -> "OK"
 *     outcome s s f -> "Late release"
 *     outcome s f * -> "Early release"     # C not queried once B fails (pruned)
 *     outcome f * * -> "Core damage"       # A fails → sequence terminates early
 *
 * The outcome pattern reads left→right over the declared `function` columns:
 *   s = success leg (upper), f = failure leg (lower), * = pruned / not queried
 *   (the path runs flat to its leaf — this is how the tree avoids being a full
 *   balanced 2ⁿ tree). Each `outcome` row is exactly one realised leaf.
 *
 * Zero runtime deps. No regex generators. CJK quotes accepted.
 */

import type {
  EventTreeAst,
  EventTreeFunction,
  EventTreeOutcome,
  EventTreePatternToken,
} from "./types";

export class EventTreeParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = "EventTreeParseError";
  }
}

// ─── Public entry ─────────────────────────────────────────────

export function parseEventTree(text: string): EventTreeAst {
  const ast: EventTreeAst = {
    type: "eventtree",
    direction: "lr",
    initiating: { id: "", freq: 0 },
    functions: [],
    outcomes: [],
    warnings: [],
  };

  const rawLines = text.split(/\r?\n/);
  let i = 0;

  // ── Header ──
  let headerSeen = false;
  while (i < rawLines.length) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") { i++; continue; }
    const h = /^(eventtree|eta)\b(.*)$/i.exec(t);
    if (h) {
      const after = h[2]!.trim();
      const q = matchQuoted(after);
      if (q) ast.title = q.value;
      headerSeen = true;
      i++;
    }
    break;
  }
  if (!headerSeen) {
    throw new EventTreeParseError(`an event tree must start with the 'eventtree' (or 'eta') keyword`, 1);
  }

  let initiatingSeen = false;

  // ── Body ──
  for (; i < rawLines.length; i++) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") continue;
    const lineNo = i + 1;

    // Directives.
    if (/^layout\s*:/i.test(t)) {
      // v0.1 is left→right only; accept and ignore other values with a warning.
      const v = afterColon(t).toLowerCase();
      if (v !== "lr") ast.warnings.push(`Line ${lineNo}: layout "${v}" not supported (event trees are left→right); using lr.`);
      continue;
    }

    if (/^initiating\b/i.test(t)) {
      parseInitiating(ast, t.replace(/^initiating\b/i, "").trim(), lineNo);
      initiatingSeen = true;
      continue;
    }

    if (/^function\b/i.test(t)) {
      ast.functions.push(parseFunction(t.replace(/^function\b/i, "").trim(), lineNo));
      continue;
    }

    if (/^outcome\b/i.test(t)) {
      ast.outcomes.push(parseOutcome(t.replace(/^outcome\b/i, "").trim(), lineNo));
      continue;
    }

    ast.warnings.push(`Line ${lineNo}: unrecognised line: "${truncate(t, 80)}"`);
  }

  if (!initiatingSeen) {
    throw new EventTreeParseError(`an event tree must declare exactly one 'initiating' event`);
  }

  validate(ast);
  return ast;
}

// ─── Line parsers ─────────────────────────────────────────────

function parseInitiating(ast: EventTreeAst, rest: string, lineNo: number): void {
  if (ast.initiating.id) {
    throw new EventTreeParseError(`only one 'initiating' event is allowed (already declared "${ast.initiating.id}")`, lineNo);
  }
  const { id, label, remainder } = parseIdAndLabel(rest, lineNo);
  const freq = parseFreq(remainder, lineNo);
  if (freq === undefined) {
    throw new EventTreeParseError(`initiating event "${id}" needs a frequency, e.g. freq: 1e-4`, lineNo);
  }
  ast.initiating = { id, ...(label ? { label } : {}), freq };
}

function parseFunction(rest: string, lineNo: number): EventTreeFunction {
  const { id, label, remainder } = parseIdAndLabel(rest, lineNo);
  const p = parseProb(remainder, lineNo);
  if (p === undefined) {
    throw new EventTreeParseError(`function "${id}" needs a failure probability, e.g. p: 0.01`, lineNo);
  }
  return { id, ...(label ? { label } : {}), p };
}

function parseOutcome(rest: string, lineNo: number): EventTreeOutcome {
  const arrow = rest.indexOf("->");
  if (arrow < 0) {
    throw new EventTreeParseError(`outcome needs a "-> <label>" clause, e.g. outcome s s f -> "Late release"`, lineNo);
  }
  const patStr = rest.slice(0, arrow).trim();
  const labelStr = rest.slice(arrow + 2).trim();

  const tokens = patStr.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    throw new EventTreeParseError(`outcome needs a success/failure pattern before "->"`, lineNo);
  }
  const pattern: EventTreePatternToken[] = [];
  for (const tk of tokens) {
    const lc = tk.toLowerCase();
    if (lc === "s" || lc === "f" || lc === "*") pattern.push(lc as EventTreePatternToken);
    else throw new EventTreeParseError(`invalid outcome token "${tk}" — expected s, f or * (one per function column)`, lineNo);
  }

  const q = matchQuoted(labelStr);
  const label = q ? q.value : labelStr;
  if (label === "") {
    throw new EventTreeParseError(`outcome is missing its end-state label after "->"`, lineNo);
  }

  return { pattern, label, line: lineNo };
}

// ─── Validation ───────────────────────────────────────────────

function validate(ast: EventTreeAst): void {
  if (ast.functions.length === 0) {
    throw new EventTreeParseError(`an event tree must declare at least one 'function' (safety function / header column)`);
  }

  // Duplicate ids.
  const seen = new Set<string>();
  if (seen.has(ast.initiating.id)) { /* unreachable */ }
  seen.add(ast.initiating.id);
  for (const f of ast.functions) {
    if (seen.has(f.id)) throw new EventTreeParseError(`duplicate id "${f.id}" — initiating event and functions must have unique ids`);
    seen.add(f.id);
  }

  // Probability ranges.
  if (ast.initiating.freq < 0) {
    throw new EventTreeParseError(`initiating frequency ${ast.initiating.freq} must be ≥ 0`);
  }
  for (const f of ast.functions) {
    if (f.p < 0 || f.p > 1) {
      throw new EventTreeParseError(`function "${f.id}" has failure probability ${f.p} outside [0, 1]`);
    }
  }

  if (ast.outcomes.length === 0) {
    throw new EventTreeParseError(`an event tree must declare at least one 'outcome' (terminal sequence)`);
  }

  const n = ast.functions.length;
  for (const o of ast.outcomes) {
    // Pad/truncate guard: a pattern must not be longer than the column count, and
    // every column before the first `*` must be queried (s/f).
    if (o.pattern.length > n) {
      throw new EventTreeParseError(
        `outcome on line ${o.line} has ${o.pattern.length} tokens but only ${n} function column${n === 1 ? "" : "s"} are declared`,
        o.line
      );
    }
    // Once a column is pruned (*), every later column must also be * (the path has
    // terminated — it cannot resume querying). This is the early-termination rule.
    let pruned = false;
    for (const tk of o.pattern) {
      if (tk === "*") pruned = true;
      else if (pruned) {
        throw new EventTreeParseError(
          `outcome on line ${o.line} queries a function after a pruned (*) column — once a path is pruned it must stay pruned (run flat to its leaf)`,
          o.line
        );
      }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function parseIdAndLabel(s: string, lineNo: number): { id: string; label?: string; remainder: string } {
  const m = /^([A-Za-z_]\w*)/.exec(s.trim());
  if (!m) throw new EventTreeParseError(`expected an id, got "${truncate(s, 40)}"`, lineNo);
  const id = m[1]!;
  let rest = s.trim().slice(id.length).trim();
  const q = matchQuoted(rest);
  let label: string | undefined;
  if (q) { label = q.value; rest = rest.slice(q.length).trim(); }
  return { id, ...(label ? { label } : {}), remainder: rest };
}

function parseProb(s: string, lineNo: number): number | undefined {
  const m = /\b(?:p|prob)\s*:\s*([0-9.]+(?:e-?\d+)?)/i.exec(s);
  if (!m) return undefined;
  const v = Number(m[1]);
  if (Number.isNaN(v)) throw new EventTreeParseError(`invalid probability "${m[1]}"`, lineNo);
  return v;
}

function parseFreq(s: string, lineNo: number): number | undefined {
  const m = /\b(?:freq|frequency|f0|f)\s*:\s*([0-9.]+(?:e[-+]?\d+)?)/i.exec(s);
  if (!m) return undefined;
  const v = Number(m[1]);
  if (Number.isNaN(v)) throw new EventTreeParseError(`invalid frequency "${m[1]}"`, lineNo);
  return v;
}

interface Quoted { value: string; length: number }
function matchQuoted(s: string): Quoted | undefined {
  if (!s) return undefined;
  const open = s[0]!;
  if (open !== '"' && open !== "「" && open !== "“") return undefined;
  const close = closingQuote(open);
  const end = s.indexOf(close, 1);
  if (end < 0) return undefined;
  return { value: s.slice(1, end), length: end + 1 };
}

function closingQuote(open: string): string {
  return open === "「" ? "」" : open === "“" ? "”" : '"';
}

function afterColon(s: string): string {
  const i = s.indexOf(":");
  return i < 0 ? "" : s.slice(i + 1).trim();
}

function stripComment(line: string): string {
  let inQ = false, qc = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQ) { if (ch === qc) inQ = false; continue; }
    if (ch === '"' || ch === "「" || ch === "“") { inQ = true; qc = closingQuote(ch); continue; }
    if (ch === "#") return line.slice(0, i);
    if (ch === "/" && line[i + 1] === "/") return line.slice(0, i);
  }
  return line;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
