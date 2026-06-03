/**
 * Markov chain DSL parser — hand-written, line-based recursive descent.
 *
 * Spec: docs/reference/42-MARKOV-CHAIN-STANDARD.md §"DSL sketch"
 *
 * Grammar (informal):
 *   markov | markovchain  ["Title"]
 *   layout: ring | layered
 *   normalize: true | false
 *   analysis: stationary, classify, absorbing, period
 *   state <id> ["Label"] [absorbing]
 *   <from> -> <to> : <prob>          # transition; self when from === to
 *
 * States may be auto-created from a first arc mention (like petri's auto-places),
 * so `state` declarations are optional — used to attach labels / the `absorbing`
 * assertion. CJK / guillemet quotes are accepted for labels and the title.
 */

import type {
  MarkovAnalysisSelection,
  MarkovAst,
  MarkovLayoutMode,
  MarkovState,
  MarkovTransition,
} from "./types";

export class MarkovParseError extends Error {
  line?: number;
  constructor(message: string, line?: number) {
    super(line !== undefined ? `${message} (line ${line})` : message);
    this.name = "MarkovParseError";
    this.line = line;
  }
}

// ─── Tokenizer ───────────────────────────────────────────────────

const OPENERS = ['"', "“", "「", "『", "«"]; // " " 「 『 «
const CLOSERS = ['"', "”", "」", "』", "»"]; // " " 」 』 »

interface Tok {
  text: string;
  quoted: boolean;
}

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    const oi = OPENERS.indexOf(c);
    if (oi >= 0) {
      const close = CLOSERS[oi]!;
      let j = i + 1;
      let buf = "";
      while (j < s.length && s[j] !== close && s[j] !== '"') {
        buf += s[j];
        j++;
      }
      out.push({ text: buf, quoted: true });
      i = j + 1;
      continue;
    }
    let j = i;
    let buf = "";
    while (j < s.length && s[j] !== " " && s[j] !== "\t") {
      buf += s[j];
      j++;
    }
    out.push({ text: buf, quoted: false });
    i = j;
  }
  return out;
}

/** Glue `key: 0.3` / `key : 0.3` into `key:0.3` so the tokenizer yields one token. */
function normalizeKeyNums(line: string): string {
  return line.replace(/([A-Za-z]+)\s*:\s*(-?\d+(?:\.\d+)?)/g, "$1:$2");
}

/**
 * `from -> to : prob` — the `to` id is everything up to the `:` (or trailing
 * whitespace before a bare numeral). Two accepted forms:
 *   `A -> B : 0.5`   (colon-separated, canonical)
 *   `A -> B 0.5`     (space-separated probability)
 */
const ARC_RE = /^(\S+?)\s*->\s*([^:\s]+)\s*(?::\s*(.*)|\s+(.*))?$/;

function parseProb(raw: string, what: string, line: number): number {
  const s = raw.trim();
  if (!/^\d+(?:\.\d+)?$|^\.\d+$/.test(s)) {
    throw new MarkovParseError(`${what} must be a number in [0,1], got "${raw}"`, line);
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new MarkovParseError(`${what} must be in [0,1], got ${n}`, line);
  }
  return n;
}

// ─── Parser ──────────────────────────────────────────────────────

export function parseMarkov(text: string): MarkovAst {
  const rawLines = text.split(/\r?\n/);
  const analysis: MarkovAnalysisSelection = {
    stationary: true,
    classify: true,
    absorbing: true,
    period: false,
  };
  const ast: MarkovAst = {
    type: "markov",
    layout: "ring",
    normalize: false,
    analysis,
    states: [],
    transitions: [],
    warnings: [],
  };

  const stateById = new Map<string, MarkovState>();
  let sawHeader = false;
  let sawAnalysisDirective = false;

  const ensureState = (id: string, line: number): MarkovState => {
    let st = stateById.get(id);
    if (!st) {
      st = { id, declaredAbsorbing: false, line };
      stateById.set(id, st);
      ast.states.push(st);
    }
    return st;
  };

  for (let ln = 0; ln < rawLines.length; ln++) {
    const rawLine = rawLines[ln]!;
    const lineNo = ln + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) continue;

    // ── header ──
    if (!sawHeader && /^(markov|markovchain)\b/i.test(trimmed)) {
      sawHeader = true;
      const toks = tokenize(trimmed);
      const titleTok = toks.find((t, idx) => idx > 0 && t.quoted);
      if (titleTok) ast.title = titleTok.text;
      else if (toks[1] && !toks[1].quoted) ast.title = toks.slice(1).map((t) => t.text).join(" ");
      continue;
    }

    const lower = trimmed.toLowerCase();

    // ── directives ──
    if (lower.startsWith("layout:")) {
      const v = trimmed.slice(trimmed.indexOf(":") + 1).trim().toLowerCase();
      // Cast: guarded by the literal check above, so v is a valid MarkovLayoutMode.
      if (v === "ring" || v === "layered") ast.layout = v as MarkovLayoutMode;
      else ast.warnings.push(`Unknown layout "${v}" (line ${lineNo}); using ring.`);
      continue;
    }
    if (lower.startsWith("normalize:")) {
      const v = trimmed.slice(trimmed.indexOf(":") + 1).trim().toLowerCase();
      if (v === "true" || v === "yes" || v === "on") ast.normalize = true;
      else if (v === "false" || v === "no" || v === "off") ast.normalize = false;
      else ast.warnings.push(`Unknown normalize "${v}" (line ${lineNo}); expected true/false.`);
      continue;
    }
    if (lower.startsWith("analysis:")) {
      const body = trimmed.slice(trimmed.indexOf(":") + 1);
      const picks = body.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (!sawAnalysisDirective) {
        // An explicit directive replaces the defaults (opt-in selection).
        analysis.stationary = false;
        analysis.classify = false;
        analysis.absorbing = false;
        analysis.period = false;
        sawAnalysisDirective = true;
      }
      for (const p of picks) {
        if (p === "stationary") analysis.stationary = true;
        else if (p === "classify") analysis.classify = true;
        else if (p === "absorbing") analysis.absorbing = true;
        else if (p === "period") analysis.period = true;
        else if (p === "all") {
          analysis.stationary = analysis.classify = analysis.absorbing = analysis.period = true;
        } else ast.warnings.push(`Unknown analysis "${p}" (line ${lineNo}); ignored.`);
      }
      continue;
    }

    // ── state declaration ──
    if (/^state\b/i.test(trimmed)) {
      parseStateDecl(trimmed, lineNo, ensureState);
      continue;
    }

    // ── transition arc ──
    const arcM = ARC_RE.exec(trimmed);
    if (arcM && trimmed.includes("->")) {
      ast.transitions.push(parseArc(arcM, lineNo, ensureState));
      continue;
    }

    ast.warnings.push(`Unrecognized line ${lineNo}: "${trimmed}"`);
  }

  if (ast.states.length === 0) {
    throw new MarkovParseError("empty Markov chain — declare at least one state or transition");
  }

  return ast;
}

function parseStateDecl(
  line: string,
  lineNo: number,
  ensureState: (id: string, line: number) => MarkovState,
): void {
  const toks = tokenize(normalizeKeyNums(line));
  // toks[0] === "state"
  const idTok = toks[1];
  if (!idTok || idTok.quoted) throw new MarkovParseError(`state is missing an id`, lineNo);
  const id = idTok.text;
  const st = ensureState(id, lineNo);

  const labelParts: string[] = [];
  for (let i = 2; i < toks.length; i++) {
    const t = toks[i]!;
    if (t.quoted) {
      labelParts.push(t.text);
      continue;
    }
    const low = t.text.toLowerCase();
    if (low === "absorbing") st.declaredAbsorbing = true;
    else labelParts.push(t.text);
  }
  if (labelParts.length) st.label = labelParts.join(" ");
}

function parseArc(
  m: RegExpExecArray,
  lineNo: number,
  ensureState: (id: string, line: number) => MarkovState,
): MarkovTransition {
  const from = m[1]!;
  const to = m[2]!;
  // Group 3 = colon-separated tail; group 4 = space-separated tail.
  const tail = (m[3] ?? m[4] ?? "").trim();
  if (!tail) {
    throw new MarkovParseError(`transition ${from} -> ${to} is missing a probability (e.g. "${from} -> ${to} : 0.5")`, lineNo);
  }
  // The tail may contain a stray label after the number; take the first numeral.
  const numMatch = /^(\d+(?:\.\d+)?|\.\d+)/.exec(tail);
  if (!numMatch) {
    throw new MarkovParseError(`transition ${from} -> ${to}: expected a probability, got "${tail}"`, lineNo);
  }
  const probability = parseProb(numMatch[1]!, "probability", lineNo);

  ensureState(from, lineNo);
  ensureState(to, lineNo);
  return { from, to, probability, self: from === to, line: lineNo };
}
