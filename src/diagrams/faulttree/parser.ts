/**
 * Fault Tree (faulttree) parser — flat declaration + reference DSL.
 * Per docs/reference/37-FAULT-TREE-STANDARD.md §4.
 *
 * The DSL is flat (declare each event/gate on its own line, wire by id) — like
 * `petri`/`logic` — because fault trees are DAGs (repeated events) and a flat
 * form expresses sharing without ambiguity, and is the most reliable shape for
 * LLM generation.
 *
 * Zero runtime deps. No regex generators.
 */

import type {
  FaultTreeAst,
  FaultTreeDirection,
  FaultTreeEvent,
  FaultTreeGate,
  FaultTreeGateKind,
  FaultTreeProbMethod,
} from "./types";

export class FaultTreeParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = "FaultTreeParseError";
  }
}

// ─── Public entry ─────────────────────────────────────────────

export function parseFaultTree(text: string): FaultTreeAst {
  const ast: FaultTreeAst = {
    type: "faulttree",
    direction: "tb",
    probMethod: "rare",
    gateStyle: "ansi",
    analysis: { cutsets: true, probability: true, pathsets: false },
    events: [],
    transfers: [],
    namedSubtrees: {},
    warnings: [],
  };

  const rawLines = text.split(/\r?\n/);
  let i = 0;
  let analysisSeen = false;

  // ── Header ──
  let headerSeen = false;
  while (i < rawLines.length) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") { i++; continue; }
    const h = /^(faulttree|fta)\b(.*)$/i.exec(t);
    if (h) {
      const after = h[2]!.trim();
      const q = matchQuoted(after);
      if (q) ast.title = q.value;
      headerSeen = true;
      i++;
      break;
    }
    headerSeen = true; // implicit header — start parsing body at i
    break;
  }
  if (!headerSeen) return ast;

  // ── Body ──
  for (; i < rawLines.length; i++) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") continue;
    const lineNo = i + 1;

    // Directives.
    if (/^analysis\s*:/i.test(t)) {
      const items = afterColon(t).split(",").map((s) => s.trim().toLowerCase());
      ast.analysis = {
        cutsets: items.includes("cutsets"),
        probability: items.includes("probability"),
        pathsets: items.includes("pathsets"),
      };
      if (items.includes("none")) ast.analysis = { cutsets: false, probability: false, pathsets: false };
      analysisSeen = true;
      continue;
    }
    if (/^prob\s*:/i.test(t) && !/^prob\s*:\s*[\d.]/.test(t)) {
      const v = afterColon(t).toLowerCase();
      if (v === "rare" || v === "mcub" || v === "exact") ast.probMethod = v as FaultTreeProbMethod;
      continue;
    }
    if (/^layout\s*:/i.test(t)) {
      const v = afterColon(t).toLowerCase();
      if (v === "tb" || v === "bt") ast.direction = v as FaultTreeDirection;
      continue;
    }
    if (/^style\s*:/i.test(t)) {
      const v = afterColon(t).toLowerCase();
      if (v === "ansi" || v === "iec") ast.gateStyle = v;
      continue;
    }

    // Transfer.
    if (/^transfer\b/i.test(t)) {
      parseTransfer(ast, t.replace(/^transfer\b/i, "").trim(), lineNo);
      continue;
    }

    // Events.
    const kw = /^(top|gate|basic|undeveloped|house|condition)\b/i.exec(t);
    if (kw) {
      parseEventLine(ast, kw[1]!.toLowerCase(), t.slice(kw[0].length).trim(), lineNo);
      continue;
    }

    ast.warnings.push(`Line ${lineNo}: unrecognised line: "${truncate(t, 80)}"`);
  }

  if (!analysisSeen) {
    // Default: compute everything when nothing was specified.
    ast.analysis = { cutsets: true, probability: true, pathsets: false };
  }

  // ── Validation ──
  validate(ast);
  return ast;
}

// ─── Event / gate line parsing ────────────────────────────────

function parseEventLine(ast: FaultTreeAst, kw: string, rest: string, lineNo: number): void {
  if (kw === "top" || kw === "gate") {
    const eqIdx = topLevelEq(rest);
    if (eqIdx < 0) throw new FaultTreeParseError(`${kw} declaration needs a gate expression after '='`, lineNo);
    const head = rest.slice(0, eqIdx).trim();
    const exprStr = rest.slice(eqIdx + 1).trim();
    const { id, label } = parseIdAndLabel(head, lineNo);
    const gate = parseGateExpr(exprStr, lineNo);
    upsertEvent(ast, {
      id,
      kind: kw === "top" ? "top" : "intermediate",
      ...(label ? { label } : {}),
      gate,
    });
    return;
  }

  // Leaf events: basic / undeveloped / house / condition.
  const { id, label, remainder } = parseIdAndLabel(rest, lineNo);
  const ev: FaultTreeEvent = {
    id,
    kind: kw as FaultTreeEvent["kind"],
    ...(label ? { label } : {}),
  };

  if (kw === "house") {
    const m = /\bstate\s*:\s*([01])\b/i.exec(remainder);
    ev.state = m ? (Number(m[1]) as 0 | 1) : 1;
  } else {
    const p = parseProb(remainder, lineNo);
    if (p !== undefined) ev.prob = p;
  }
  upsertEvent(ast, ev);
}

function parseGateExpr(s: string, lineNo: number): FaultTreeGate {
  const m = /^(AND|OR|XOR|VOTING|INHIBIT|PAND)\s*\(/i.exec(s);
  if (!m) {
    // Pass-through: a bare reference.
    const ref = s.trim();
    if (!isId(ref)) throw new FaultTreeParseError(`expected a gate expression or a single event reference, got "${truncate(s, 40)}"`, lineNo);
    return { kind: "or", inputs: [ref] }; // single-child OR == pass-through
  }
  const kind = m[1]!.toLowerCase() as FaultTreeGateKind;
  const openIdx = m[0].length - 1;
  const closeIdx = matchParen(s, openIdx);
  if (closeIdx < 0) throw new FaultTreeParseError(`unbalanced '(' in ${kind.toUpperCase()} gate`, lineNo);
  const inner = s.slice(openIdx + 1, closeIdx).trim();
  const tail = s.slice(closeIdx + 1).trim();

  if (kind === "voting") {
    const semi = inner.indexOf(";");
    if (semi < 0) throw new FaultTreeParseError(`VOTING needs "k/n; inputs" — missing ';'`, lineNo);
    const kn = inner.slice(0, semi).trim();
    const km = /^(\d+)\s*\/\s*(\d+)$/.exec(kn);
    if (!km) throw new FaultTreeParseError(`VOTING threshold must be "k/n", got "${kn}"`, lineNo);
    const inputs = splitRefs(inner.slice(semi + 1), lineNo);
    return { kind, inputs, k: Number(km[1]), n: Number(km[2]) };
  }

  if (kind === "inhibit") {
    const inputs = splitRefs(inner, lineNo);
    if (inputs.length !== 1) throw new FaultTreeParseError(`INHIBIT takes exactly one input event, got ${inputs.length}`, lineNo);
    const cm = /^if\s+(.+)$/i.exec(tail);
    if (!cm) throw new FaultTreeParseError(`INHIBIT needs an "if <condition>" clause`, lineNo);
    const condRaw = cm[1]!.trim();
    const cq = matchQuoted(condRaw);
    return { kind, inputs, condition: cq ? cq.value : condRaw };
  }

  if (kind === "pand") {
    const inputs = splitRefs(inner, lineNo);
    const om = /^order\s*:\s*(.+)$/i.exec(tail);
    const gate: FaultTreeGate = { kind, inputs };
    if (om) gate.order = splitRefs(om[1]!, lineNo);
    return gate;
  }

  // AND / OR / XOR
  return { kind, inputs: splitRefs(inner, lineNo) };
}

// ─── Transfer ─────────────────────────────────────────────────

function parseTransfer(ast: FaultTreeAst, rest: string, lineNo: number): void {
  // transfer-out:  ID -> "name"
  const out = /^([A-Za-z_]\w*)\s*->\s*(.+)$/.exec(rest);
  if (out) {
    const q = matchQuoted(out[2]!.trim());
    const name = q ? q.value : out[2]!.trim();
    ast.transfers.push({ id: out[1]!, name });
    return;
  }
  // transfer-in:  "name" = gate_expr
  const q = matchQuoted(rest);
  if (q) {
    const after = rest.slice(q.length).trim();
    const eq = topLevelEq(after);
    if (eq >= 0) {
      ast.namedSubtrees[q.value] = parseGateExpr(after.slice(eq + 1).trim(), lineNo);
      return;
    }
  }
  ast.warnings.push(`Line ${lineNo}: malformed transfer: "${truncate(rest, 60)}"`);
}

// ─── Validation ───────────────────────────────────────────────

function validate(ast: FaultTreeAst): void {
  // Splice transfer-out → named subtree (in-document development).
  for (const tr of ast.transfers) {
    const ev = ast.events.find((e) => e.id === tr.id);
    const sub = ast.namedSubtrees[tr.name];
    if (ev && sub && !ev.gate) {
      ev.gate = sub;
      if (ev.kind === "basic") ev.kind = "intermediate";
    }
  }

  // Exactly one top.
  const tops = ast.events.filter((e) => e.kind === "top");
  if (tops.length === 0) {
    throw new FaultTreeParseError(`a fault tree must declare exactly one 'top' event — found none`);
  }
  if (tops.length > 1) {
    throw new FaultTreeParseError(
      `a fault tree must have exactly one 'top' event — found ${tops.length}: ${tops.map((t) => t.id).join(", ")}`
    );
  }
  ast.topId = tops[0]!.id;

  const byId = new Map(ast.events.map((e) => [e.id, e] as const));

  // Auto-create referenced-but-undeclared ids? No — undefined ref is a readable error.
  for (const e of ast.events) {
    if (!e.gate) continue;
    const refs = [...e.gate.inputs];
    if (e.gate.condition && isId(e.gate.condition)) refs.push(e.gate.condition);
    for (const r of refs) {
      if (!byId.has(r)) {
        throw new FaultTreeParseError(`gate ${e.id} references undefined event '${r}'`);
      }
    }
    // VOTING bounds.
    if (e.gate.kind === "voting") {
      const { k, n, inputs } = e.gate;
      if (k! < 1 || k! > n!) throw new FaultTreeParseError(`VOTING ${k}/${n} on ${e.id}: need 1 ≤ k ≤ n`);
      if (n !== inputs.length) {
        throw new FaultTreeParseError(`VOTING ${k}/${n} on ${e.id}: n (${n}) must equal the number of inputs (${inputs.length})`);
      }
    }
    // Conditioning placement.
    if (e.gate.condition && e.gate.kind !== "inhibit" && e.gate.kind !== "pand") {
      throw new FaultTreeParseError(`conditioning event on ${e.id} is only allowed on INHIBIT or PRIORITY-AND gates`);
    }
  }

  // Probability range.
  for (const e of ast.events) {
    if (e.prob !== undefined && (e.prob < 0 || e.prob > 1)) {
      throw new FaultTreeParseError(`event ${e.id} has probability ${e.prob} outside [0, 1]`);
    }
  }

  // Cycle detection (DAG check) from the top via gate inputs.
  const WHITE = 0, GREY = 1, BLACK = 2;
  const colour = new Map<string, number>();
  const stack: string[] = [];
  const dfs = (id: string): void => {
    const ev = byId.get(id);
    colour.set(id, GREY);
    stack.push(id);
    if (ev?.gate) {
      for (const child of ev.gate.inputs) {
        const c = colour.get(child) ?? WHITE;
        if (c === GREY) {
          const from = stack.indexOf(child);
          const cyc = [...stack.slice(from), child].join(" → ");
          throw new FaultTreeParseError(`cycle detected: ${cyc} — a fault tree must be acyclic`);
        }
        if (c === WHITE) dfs(child);
      }
    }
    stack.pop();
    colour.set(id, BLACK);
  };
  dfs(ast.topId);
}

// ─── Helpers ──────────────────────────────────────────────────

function upsertEvent(ast: FaultTreeAst, ev: FaultTreeEvent): void {
  const existing = ast.events.find((e) => e.id === ev.id);
  if (!existing) { ast.events.push(ev); return; }
  if (existing.autoCreated) Object.assign(existing, ev, { autoCreated: false });
  else ast.warnings.push(`Event "${ev.id}" redeclared — keeping first declaration.`);
}

function parseIdAndLabel(s: string, lineNo: number): { id: string; label?: string; remainder: string } {
  const m = /^([A-Za-z_]\w*)/.exec(s.trim());
  if (!m) throw new FaultTreeParseError(`expected an event id, got "${truncate(s, 40)}"`, lineNo);
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
  const n = Number(m[1]);
  if (Number.isNaN(n)) throw new FaultTreeParseError(`invalid probability "${m[1]}"`, lineNo);
  return n;
}

function splitRefs(s: string, lineNo: number): string[] {
  const refs = s.split(",").map((r) => r.trim()).filter(Boolean);
  for (const r of refs) {
    if (!isId(r)) throw new FaultTreeParseError(`invalid event reference "${r}"`, lineNo);
  }
  if (refs.length === 0) throw new FaultTreeParseError(`empty input list`, lineNo);
  return refs;
}

function isId(s: string): boolean {
  return /^[A-Za-z_]\w*$/.test(s);
}

/** Index of a top-level `=` (not inside parens or quotes), or -1. */
function topLevelEq(s: string): number {
  let depth = 0, inQ = false, qc = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inQ) { if (ch === qc) inQ = false; continue; }
    if (ch === '"' || ch === "「" || ch === "“") { inQ = true; qc = closingQuote(ch); continue; }
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "=" && depth === 0) return i;
  }
  return -1;
}

function matchParen(s: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") { depth--; if (depth === 0) return i; }
  }
  return -1;
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
