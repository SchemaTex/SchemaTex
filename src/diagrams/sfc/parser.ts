/**
 * SFC parser — IEC 61131-3 §6.5.
 *
 * Indent-sensitive grammar for steps, transitions, and branch blocks
 * (`alt`/`sim`). Conditions are stored as opaque strings.
 *
 * v0.1 scope: linear sequences, alt, sim, jumps, action qualifiers
 * (N/S/R/L/D/P/P0/P1/SD/DS/SL). Defers nested-of-nested branches and the
 * full ST condition parser; condition text passes through verbatim.
 */

import type {
  SfcAltBranch,
  SfcAst,
  SfcAction,
  SfcActionQualifier,
  SfcNode,
  SfcSimBranch,
  SfcStep,
  SfcStepKind,
  SfcTransition,
  SfcVarDecl,
  SfcVarType,
} from "../../core/types";
import { IDENTIFIER_SOURCE } from "../../core/identifier";
import { matchQuotedTitle } from "../../core/quotes";

const VAR_DECL_RE = new RegExp(
  `^var\\s+(${IDENTIFIER_SOURCE})\\s*:\\s*(${IDENTIFIER_SOURCE})\\s*(?:=\\s*(.+))?$`,
  "iu"
);
const STEP_HEAD_RE = new RegExp(
  `^step\\s+(${IDENTIFIER_SOURCE})\\s*(\\[[^\\]]*\\])?\\s*$`,
  "u"
);
const TRANSITION_RE = new RegExp(
  `^transition(?:\\s+(${IDENTIFIER_SOURCE}))?\\s+from\\s*:\\s*(${IDENTIFIER_SOURCE})\\s+to\\s*:\\s*(${IDENTIFIER_SOURCE})\\s*:\\s*(.+)$`,
  "u"
);
const ALT_HEAD_RE = new RegExp(
  `^alt\\s+from\\s*:\\s*(${IDENTIFIER_SOURCE})\\s*:\\s*$`,
  "u"
);
const MERGE_RE = new RegExp(`^merge_to\\s*:\\s*(${IDENTIFIER_SOURCE})\\s*$`, "u");
const SIM_HEAD_RE = new RegExp(
  `^sim\\s+from\\s*:\\s*(${IDENTIFIER_SOURCE})\\s*:\\s*(.+)$`,
  "u"
);
const SIM_MERGE_RE = new RegExp(
  `^merge_to\\s*:\\s*(${IDENTIFIER_SOURCE})\\s*:\\s*(.+)$`,
  "u"
);
const JUMP_RE = new RegExp(
  `^jump\\s+from\\s*:\\s*(${IDENTIFIER_SOURCE})\\s+to\\s*:\\s*(${IDENTIFIER_SOURCE})\\s*$`,
  "u"
);

export class SfcParseError extends Error {
  line?: number;
  source?: string;
  constructor(message: string, line?: number, source?: string) {
    super(message);
    this.name = "SfcParseError";
    if (line !== undefined) this.line = line;
    if (source !== undefined) this.source = source;
  }
}

const QUALIFIERS: SfcActionQualifier[] = [
  "N", "S", "R", "L", "D", "P", "P0", "P1", "SD", "DS", "SL",
];

const PRIM_TYPES = new Set(["bool", "int", "real", "time", "timer", "counter"]);

interface RawLine {
  text: string;
  indent: number;
  lineNo: number;
}

function tokenizeLines(text: string): RawLine[] {
  const out: RawLine[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/\r$/, "");
    // Strip `#` line comment but keep `#` inside time literals (T#...) and strings.
    let stripped = "";
    let inStr = false;
    for (let j = 0; j < raw.length; j++) {
      const ch = raw[j];
      if (ch === '"') inStr = !inStr;
      if (!inStr && ch === "#") {
        const prev = raw[j - 1];
        // Treat as comment only when preceded by whitespace or at line start.
        if (prev === undefined || /\s/.test(prev)) break;
      }
      stripped += ch;
    }
    if (!stripped.trim()) continue;
    let indent = 0;
    while (indent < stripped.length && (stripped[indent] === " " || stripped[indent] === "\t")) {
      indent += stripped[indent] === "\t" ? 4 : 1;
    }
    out.push({ text: stripped.trim(), indent, lineNo: i + 1 });
  }
  return out;
}

function parseVarDecl(line: RawLine): SfcVarDecl | null {
  const m = line.text.match(VAR_DECL_RE);
  if (!m) return null;
  const dt = m[2].toLowerCase();
  const decl: SfcVarDecl = {
    name: m[1],
    dataType: PRIM_TYPES.has(dt) ? (dt as SfcVarType) : m[2],
  };
  if (m[3] !== undefined) decl.initValue = m[3].trim();
  return decl;
}

interface ParseState {
  variables: SfcVarDecl[];
  steps: Map<string, SfcStep>;
  transitions: SfcTransition[];
  body: SfcNode[];
  /** Line cursor. */
  lines: RawLine[];
  i: number;
  /** Track first-declared step (becomes the initial step's id if none has [initial]). */
  initialId?: string;
  /** Auto-generated transition ids when not specified. */
  transitionCounter: number;
}

function parseStepHead(line: RawLine): { id: string; kind: SfcStepKind; label?: string } | null {
  const m = line.text.match(STEP_HEAD_RE);
  if (!m) return null;
  const attrs = parseAttrs(m[2]);
  let kind: SfcStepKind = "normal";
  if (attrs.has("initial")) kind = "initial";
  else if (attrs.has("final")) kind = "final";
  const result: { id: string; kind: SfcStepKind; label?: string } = { id: m[1], kind };
  const label = attrs.get("label");
  if (label) result.label = label;
  return result;
}

function parseAttrs(raw: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!raw) return out;
  const inner = raw.replace(/^\[|\]$/g, "").trim();
  for (const part of inner.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const colon = t.indexOf(":");
    if (colon < 0) {
      out.set(t.toLowerCase(), "true");
    } else {
      const k = t.slice(0, colon).trim().toLowerCase();
      const v = t.slice(colon + 1).trim().replace(/^"|"$/g, "");
      out.set(k, v);
    }
  }
  return out;
}

function parseAction(line: RawLine): SfcAction | null {
  // Format:  QUAL ActionBody [TIME_LIT]
  // Examples:  N FillValve_Open
  //            D Mixer_Run T#10s
  //            S "ST inline assignment := 5"
  const m = line.text.match(/^(N|S|R|L|D|P|P0|P1|SD|DS|SL)\s+(.+)$/);
  if (!m) return null;
  const qual = m[1] as SfcActionQualifier;
  if (!QUALIFIERS.includes(qual)) return null;
  let body = m[2].trim();
  let time: string | undefined;
  // Trailing T#... ?
  const tm = body.match(/^(.+?)\s+(T#[0-9]+(?:ms|s|m|h)(?:[0-9]+(?:ms|s|m|h))*)$/i);
  if (tm) {
    body = tm[1].trim();
    time = tm[2];
  }
  // Quoted body
  if (body.startsWith('"') && body.endsWith('"')) {
    body = body.slice(1, -1);
  }
  const action: SfcAction = { qualifier: qual, body };
  if (time !== undefined) action.time = time;
  return action;
}

function expectStep(state: ParseState, indent: number): SfcStep | null {
  if (state.i >= state.lines.length) return null;
  const ln = state.lines[state.i];
  if (ln.indent !== indent) return null;
  const head = parseStepHead(ln);
  if (!head) return null;
  state.i++;

  const step: SfcStep = {
    id: head.id,
    kind: head.kind,
    actions: [],
  };
  if (head.label !== undefined) step.label = head.label;

  // Parse following indented action lines
  while (state.i < state.lines.length) {
    const a = state.lines[state.i];
    if (a.indent <= indent) break;
    const action = parseAction(a);
    if (!action) break;
    step.actions.push(action);
    state.i++;
  }
  if (state.steps.has(step.id)) {
    throw new SfcParseError(`Duplicate step id: ${step.id}`, ln.lineNo, ln.text);
  }
  state.steps.set(step.id, step);
  if (step.kind === "initial") {
    if (state.initialId && state.initialId !== step.id) {
      throw new SfcParseError(`Multiple [initial] steps: ${state.initialId} and ${step.id}`, ln.lineNo, ln.text);
    }
    state.initialId = step.id;
  }
  return step;
}

function parseTransitionLine(line: RawLine): SfcTransition | null {
  // transition [id] from: A to: B: condition
  const m = line.text.match(TRANSITION_RE);
  if (!m) return null;
  const t: SfcTransition = {
    from: m[2],
    to: m[3],
    condition: m[4].trim(),
  };
  if (m[1] !== undefined) t.id = m[1];
  return t;
}

function parseAltBlock(state: ParseState, indent: number): SfcNode | null {
  if (state.i >= state.lines.length) return null;
  const head = state.lines[state.i];
  if (head.indent !== indent) return null;
  const m = head.text.match(ALT_HEAD_RE);
  if (!m) return null;
  state.i++;

  const branches: SfcAltBranch[] = [];
  while (state.i < state.lines.length) {
    const ln = state.lines[state.i];
    if (ln.indent <= indent) break;
    const bm = ln.text.match(/^branch\s*(\[[^\]]*\])?\s*:\s*$/);
    if (!bm) break;
    const attrs = parseAttrs(bm[1]);
    state.i++;

    // Read branch body: required entry transition, then steps, then exit transition
    const branchIndent = ln.indent;
    let entry: string | undefined;
    let exitCond: string | undefined;
    const body: SfcNode[] = [];
    while (state.i < state.lines.length) {
      const bb = state.lines[state.i];
      if (bb.indent <= branchIndent) break;
      // transition: condition
      const tm = bb.text.match(/^transition\s*:\s*(.+)$/);
      if (tm) {
        if (entry === undefined) entry = tm[1].trim();
        else exitCond = tm[1].trim();
        state.i++;
        continue;
      }
      // nested step
      const step = expectStep(state, bb.indent);
      if (step) {
        body.push({ kind: "step", stepId: step.id });
        continue;
      }
      // nested alt/sim
      const sub = parseAltBlock(state, bb.indent) ?? parseSimBlock(state, bb.indent);
      if (sub) {
        body.push(sub);
        continue;
      }
      throw new SfcParseError(`Unexpected line in alt branch: ${bb.text}`, bb.lineNo, bb.text);
    }
    const branch: SfcAltBranch = {
      entryCondition: entry ?? "TRUE",
      body,
      exitCondition: exitCond ?? "TRUE",
    };
    const prio = attrs.get("priority");
    if (prio !== undefined) branch.priority = parseInt(prio, 10);
    branches.push(branch);
  }

  // merge_to: STEP
  if (state.i >= state.lines.length) {
    throw new SfcParseError(`alt block missing merge_to clause`, head.lineNo, head.text);
  }
  const mergeLine = state.lines[state.i];
  const mm = mergeLine.text.match(MERGE_RE);
  if (!mm) {
    throw new SfcParseError(`Expected "merge_to: STEP" (got: ${mergeLine.text})`, mergeLine.lineNo, mergeLine.text);
  }
  state.i++;
  return { kind: "alt", branches, mergeTo: mm[1] };
}

function parseSimBlock(state: ParseState, indent: number): SfcNode | null {
  if (state.i >= state.lines.length) return null;
  const head = state.lines[state.i];
  if (head.indent !== indent) return null;
  const m = head.text.match(SIM_HEAD_RE);
  if (!m) return null;
  const condition = m[2].trim();
  state.i++;

  const branches: SfcSimBranch[] = [];
  while (state.i < state.lines.length) {
    const ln = state.lines[state.i];
    if (ln.indent <= indent) break;
    const bm = ln.text.match(/^branch\s*:\s*$/);
    if (!bm) break;
    state.i++;
    const branchIndent = ln.indent;
    const body: SfcNode[] = [];
    while (state.i < state.lines.length) {
      const bb = state.lines[state.i];
      if (bb.indent <= branchIndent) break;
      const step = expectStep(state, bb.indent);
      if (step) {
        body.push({ kind: "step", stepId: step.id });
        continue;
      }
      const sub = parseAltBlock(state, bb.indent) ?? parseSimBlock(state, bb.indent);
      if (sub) {
        body.push(sub);
        continue;
      }
      throw new SfcParseError(`Unexpected line in sim branch: ${bb.text}`, bb.lineNo, bb.text);
    }
    branches.push({ body });
  }

  if (state.i >= state.lines.length) {
    throw new SfcParseError(`sim block missing merge_to clause`, head.lineNo, head.text);
  }
  const mergeLine = state.lines[state.i];
  const mm = mergeLine.text.match(SIM_MERGE_RE);
  if (!mm) {
    throw new SfcParseError(`Expected "merge_to: STEP: condition" (got: ${mergeLine.text})`, mergeLine.lineNo, mergeLine.text);
  }
  state.i++;
  return {
    kind: "sim",
    condition,
    branches,
    mergeTo: mm[1],
    mergeCondition: mm[2].trim(),
  };
}

export function parseSfc(text: string): SfcAst {
  const lines = tokenizeLines(text);
  if (lines.length === 0) throw new SfcParseError("Empty SFC program");
  if (!/^sfc\b/i.test(lines[0].text)) {
    throw new SfcParseError(`First non-comment line must start with "sfc" (got: ${lines[0].text})`, lines[0].lineNo, lines[0].text);
  }
  const title = matchQuotedTitle(lines[0].text);

  const state: ParseState = {
    variables: [],
    steps: new Map(),
    transitions: [],
    body: [],
    lines,
    i: 1,
    transitionCounter: 0,
  };

  // Parse variable decls until first step / alt / sim / transition
  while (state.i < lines.length) {
    const ln = lines[state.i];
    const decl = parseVarDecl(ln);
    if (decl) {
      state.variables.push(decl);
      state.i++;
      continue;
    }
    break;
  }

  // Parse top-level body — sequence of step / alt / sim entries plus transition lines
  // We scan the file once and build state.body for `step`, alt, sim;
  // transitions go to state.transitions.
  const bodyIndent = state.i < lines.length ? lines[state.i].indent : 0;
  while (state.i < lines.length) {
    const ln = lines[state.i];
    if (ln.indent < bodyIndent) break;

    // transition
    const tline = parseTransitionLine(ln);
    if (tline) {
      if (!tline.id) {
        tline.id = `T${state.transitionCounter++}`;
      }
      state.transitions.push(tline);
      state.i++;
      continue;
    }
    // jump
    const jm = ln.text.match(JUMP_RE);
    if (jm) {
      // Treat as a transition with TRUE condition; no special node type for v0.1.
      state.transitions.push({
        id: `J${state.transitionCounter++}`,
        from: jm[1],
        to: jm[2],
        condition: "TRUE",
      });
      state.i++;
      continue;
    }

    // step
    const step = expectStep(state, ln.indent);
    if (step) {
      state.body.push({ kind: "step", stepId: step.id });
      continue;
    }
    // alt
    const altNode = parseAltBlock(state, ln.indent);
    if (altNode) {
      state.body.push(altNode);
      continue;
    }
    // sim
    const simNode = parseSimBlock(state, ln.indent);
    if (simNode) {
      state.body.push(simNode);
      continue;
    }
    throw new SfcParseError(`Unrecognized SFC line: ${ln.text}`, ln.lineNo, ln.text);
  }

  if (!state.initialId) {
    // Promote the first declared step to initial.
    const firstStep = state.steps.values().next().value as SfcStep | undefined;
    if (!firstStep) {
      throw new SfcParseError("SFC chart has no steps");
    }
    firstStep.kind = "initial";
    state.initialId = firstStep.id;
  }

  // Validate all transitions reference declared steps.
  for (const t of state.transitions) {
    if (!state.steps.has(t.from)) {
      throw new SfcParseError(`Transition references unknown step: ${t.from}`, undefined, `transition from ${t.from}`);
    }
    if (!state.steps.has(t.to)) {
      throw new SfcParseError(`Transition references unknown step: ${t.to}`, undefined, `transition to ${t.to}`);
    }
  }

  const ast: SfcAst = {
    type: "sfc",
    variables: state.variables,
    steps: state.steps,
    body: state.body,
    transitions: state.transitions,
  };
  if (title !== undefined) ast.title = title;
  return ast;
}
