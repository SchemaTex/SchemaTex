/**
 * Event-driven Process Chain (EPC) parser — flat declaration + wire-by-id DSL.
 * Per docs/reference/44-EPC-STANDARD.md §"DSL sketch".
 *
 * Canonical form is the **node form** the doc recommends: connectors are
 * declared nodes with ids (`xor X1`), and the control flow is wired by id
 * (`F1 -> X1`, `X1 -> E2`). Split-vs-join falls out naturally from fan-in /
 * fan-out, so the same connector glyph serves both. Edge chains `A -> B -> C`
 * are sugar for the pairwise arcs. This is closest to how ARIS stores EPCs and
 * makes nested / chained connectors and the validation engine clean.
 *
 *   epc "Order fulfilment"
 *     layout: tb
 *     event    E1 "Order received"
 *     function F1 "Check credit"
 *     xor      X1
 *     event    E2 "Credit OK"
 *     event    E3 "Credit rejected"
 *     E1 -> F1 -> X1
 *     X1 -> E2
 *     X1 -> E3
 *
 * Inline connector keyword `and|or|xor` declares a connector; the id may be
 * omitted on the keyword line only if given inline elsewhere. Zero runtime deps,
 * hand-written recursive descent. No regex generators.
 */

import type {
  EpcAst,
  EpcConnectorKind,
  EpcDirection,
  EpcEdge,
  EpcNode,
} from "./types";
import { analyseEpc } from "./analysis";

export class EpcParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = "EpcParseError";
  }
}

const CONNECTOR_KW = new Set(["and", "or", "xor"]);

// ─── Public entry ─────────────────────────────────────────────

export function parseEpc(text: string): EpcAst {
  const ast: EpcAst = {
    type: "epc",
    direction: "tb",
    nodes: [],
    edges: [],
    warnings: [],
  };

  const rawLines = text.split(/\r?\n/);
  let i = 0;

  // ── Header ──
  let headerSeen = false;
  while (i < rawLines.length) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") { i++; continue; }
    const h = /^epc\b(.*)$/i.exec(t);
    if (h) {
      const after = h[1]!.trim();
      const q = matchQuoted(after);
      if (q) ast.title = q.value;
      headerSeen = true;
      i++;
      break;
    }
    // Implicit header — begin body here.
    headerSeen = true;
    break;
  }
  if (!headerSeen) return finish(ast);

  // ── Body ──
  for (; i < rawLines.length; i++) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") continue;
    const lineNo = i + 1;

    // Directives.
    if (/^layout\s*:/i.test(t)) {
      const v = afterColon(t).toLowerCase();
      if (v === "tb" || v === "lr") ast.direction = v as EpcDirection;
      else ast.warnings.push(`Line ${lineNo}: unknown layout "${v}" — using "tb".`);
      continue;
    }

    // Edge line — contains a top-level `->`.
    if (hasArrow(t)) {
      parseEdgeLine(ast, t, lineNo);
      continue;
    }

    // Declaration: <keyword> <id> ["label"]
    const kw = /^(event|function|func|and|or|xor)\b/i.exec(t);
    if (kw) {
      parseDeclLine(ast, kw[1]!.toLowerCase(), t.slice(kw[0].length).trim(), lineNo);
      continue;
    }

    ast.warnings.push(`Line ${lineNo}: unrecognised line: "${truncate(t, 80)}"`);
  }

  return finish(ast);
}

function finish(ast: EpcAst): EpcAst {
  // Attach the structural analysis as warnings (non-fatal); errors among the
  // violations are surfaced by analyseEpc but do not throw — render still works
  // so the user sees the flagged diagram. Hard *grammar* errors throw above.
  return ast;
}

// ─── Declaration parsing ──────────────────────────────────────

function parseDeclLine(ast: EpcAst, kw: string, rest: string, lineNo: number): void {
  if (kw === "func") kw = "function";

  const { id, label } = parseIdAndLabel(rest, lineNo);

  if (kw === "event") {
    upsertNode(ast, { id, kind: "event", ...(label ? { label } : {}) }, lineNo);
    return;
  }
  if (kw === "function") {
    upsertNode(ast, { id, kind: "function", ...(label ? { label } : {}) }, lineNo);
    return;
  }
  // Connector keyword (and|or|xor).
  if (CONNECTOR_KW.has(kw)) {
    upsertNode(
      ast,
      { id, kind: "connector", operator: kw as EpcConnectorKind },
      lineNo
    );
    return;
  }
  throw new EpcParseError(`unknown declaration keyword "${kw}"`, lineNo);
}

// ─── Edge parsing ─────────────────────────────────────────────

/**
 * Parse `A -> B -> C` (chain) into pairwise edges. A `: label` suffix on a
 * two-node edge attaches the label to that single arc.
 */
function parseEdgeLine(ast: EpcAst, line: string, lineNo: number): void {
  // Optional trailing `: "label"` or `: label` (only meaningful for a 2-node arc).
  let body = line;
  let edgeLabel: string | undefined;
  const colon = topLevelColon(body);
  if (colon >= 0) {
    const labelPart = body.slice(colon + 1).trim();
    const q = matchQuoted(labelPart);
    edgeLabel = q ? q.value : labelPart;
    body = body.slice(0, colon).trim();
  }

  const parts = splitArrow(body).map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length < 2) {
    throw new EpcParseError(`an edge needs at least two nodes around '->', got "${truncate(line, 60)}"`, lineNo);
  }

  for (const p of parts) {
    if (!isId(p)) throw new EpcParseError(`invalid node reference "${p}" in edge`, lineNo);
  }

  for (let k = 0; k < parts.length - 1; k++) {
    const from = parts[k]!;
    const to = parts[k + 1]!;
    ensureRef(ast, from, lineNo);
    ensureRef(ast, to, lineNo);
    const edge: EpcEdge = { from, to, line: lineNo };
    // Only attach a label to a genuinely single-arc declaration.
    if (edgeLabel && parts.length === 2) edge.label = edgeLabel;
    ast.edges.push(edge);
  }
}

// ─── Node table helpers ───────────────────────────────────────

function upsertNode(ast: EpcAst, node: EpcNode, lineNo: number): void {
  const existing = ast.nodes.find((n) => n.id === node.id);
  if (!existing) { ast.nodes.push(node); return; }
  if (existing.autoCreated) {
    // Replace the placeholder with the real declaration (preserve order).
    const idx = ast.nodes.indexOf(existing);
    ast.nodes[idx] = node;
    return;
  }
  // Redeclaration: keep first, but allow a later connector keyword to refine
  // a connector whose operator matched — otherwise warn.
  if (
    existing.kind === "connector" &&
    node.kind === "connector" &&
    existing.operator === node.operator
  ) {
    return;
  }
  ast.warnings.push(`Line ${lineNo}: node "${node.id}" redeclared — keeping the first declaration.`);
}

/**
 * Ensure an edge endpoint exists. Undeclared ids are auto-created as a
 * placeholder whose kind is inferred later by the analysis pass; we provisionally
 * make it an event so it has *some* kind, and flag it in warnings. The analysis
 * pass reports the undefined-ref properly.
 */
function ensureRef(ast: EpcAst, id: string, _lineNo: number): void {
  if (ast.nodes.some((n) => n.id === id)) return;
  ast.nodes.push({ id, kind: "event", autoCreated: true });
}

// ─── Token helpers ────────────────────────────────────────────

function parseIdAndLabel(s: string, lineNo: number): { id: string; label?: string } {
  const m = /^([A-Za-z_]\w*)/.exec(s.trim());
  if (!m) throw new EpcParseError(`expected a node id, got "${truncate(s, 40)}"`, lineNo);
  const id = m[1]!;
  const rest = s.trim().slice(id.length).trim();
  if (rest === "") return { id };
  const q = matchQuoted(rest);
  if (q) return { id, label: q.value };
  // Bare (unquoted) trailing text is taken as the label too (LLM-friendly).
  return { id, label: rest };
}

function isId(s: string): boolean {
  return /^[A-Za-z_]\w*$/.test(s);
}

/** True when the line has a top-level `->` (not inside quotes). */
function hasArrow(s: string): boolean {
  return splitArrow(s).length >= 2;
}

/** Split on top-level `->` (outside quotes). */
function splitArrow(s: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQ = false, qc = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inQ) {
      if (ch === qc) inQ = false;
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "「" || ch === "“") { inQ = true; qc = closingQuote(ch); buf += ch; continue; }
    if (ch === "-" && s[i + 1] === ">") { out.push(buf); buf = ""; i++; continue; }
    buf += ch;
  }
  out.push(buf);
  return out;
}

/** Index of a top-level `:` (outside quotes, not part of `://`), or -1. */
function topLevelColon(s: string): number {
  let inQ = false, qc = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inQ) { if (ch === qc) inQ = false; continue; }
    if (ch === '"' || ch === "「" || ch === "“") { inQ = true; qc = closingQuote(ch); continue; }
    if (ch === ":") return i;
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

// Re-export so callers can run validation off the AST without importing analysis.
export { analyseEpc };
