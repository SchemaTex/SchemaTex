/**
 * Threat Model (DFD + STRIDE) parser — hand-written, zero deps.
 *
 * Header keyword `threatmodel` or `stride`. Body grammar (a STRIDE-flavoured
 * subset of the DFD DSL, docs/reference/31-DFD-STANDARD.md §6):
 *
 *   threatmodel "Title"            # or:  stride
 *   title: "..."                   # optional alternative to inline title
 *
 *   external: User                 # external entity (rectangle)
 *   external Admin: Administrator  # explicit id + label
 *   process 1.1: Web Server        # process (circle)
 *   process Auth: Auth Service     # process id may be any token
 *   datastore D1: User DB          # data store (two parallel lines)
 *   datastore D2: Audit Log        # name matches log/audit → R auto-enabled
 *   datastore D3: Cache  log        # explicit `log` hint → R enabled
 *
 *   User -> 1.1 : "HTTPS Request"  # labelled data flow
 *   1.1 <-> Auth : Credentials     # bidirectional shorthand → two flows
 *
 *   boundary "Internet" { User }   # trust boundary (group of ids)
 *   boundary "DMZ" { 1.1, Auth }
 *
 * Validation (typed ThreatModelParseError, AI-readable messages):
 *  - every flow must carry a label
 *  - no store→store and no external→external flows (DFD semantics)
 *  - flow endpoints must be declared elements
 *  - duplicate ids rejected
 *  - boundary members must be declared; an element belongs to ≤1 boundary
 *
 * CJK quotes are normalised before parsing (LLM-friendly).
 */

import { QUOTE_PAIRS } from "../../core/quotes";
import type {
  DfdNode,
  DfdNodeKind,
  DfdFlow,
  ThreatModelAst,
  TrustBoundary,
} from "./types";

export class ThreatModelParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = "ThreatModelParseError";
  }
}

// ─── small helpers ────────────────────────────────────────────

/**
 * Fold all accepted Unicode quote pairs to ASCII `"` so the rest of the parser
 * only needs to reason about straight double quotes (LLM-friendly; CJK quotes).
 */
const QUOTE_FOLD = new Map<string, string>();
for (const [open, close] of Object.entries(QUOTE_PAIRS)) {
  if (open !== "'" && open !== '"') {
    QUOTE_FOLD.set(open, '"');
    QUOTE_FOLD.set(close, '"');
  }
}
function normalizeQuotes(text: string): string {
  let out = "";
  for (const ch of text) out += QUOTE_FOLD.get(ch) ?? ch;
  return out;
}

function stripComment(line: string): string {
  // `#` starts a comment unless inside quotes.
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuote = !inQuote;
    else if (ch === "#" && !inQuote) return line.slice(0, i);
  }
  return line;
}

/** Strip a single layer of wrapping double quotes, if present. */
function unquote(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).trim();
  }
  return t;
}

/** Slug for label-derived external ids (stable, ascii-ish). */
function slug(label: string): string {
  return (
    label
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "") || "node"
  );
}

// ─── public entry ─────────────────────────────────────────────

export function parseThreatModel(text: string): ThreatModelAst {
  const ast: ThreatModelAst = {
    type: "threatmodel",
    nodes: [],
    flows: [],
    boundaries: [],
  };

  const rawLines = normalizeQuotes(text).split(/\r?\n/);
  const byId = new Map<string, { node: DfdNode }>();

  const declareNode = (
    id: string,
    kind: DfdNodeKind,
    label: string,
    lineNo: number,
    logStore?: boolean
  ): void => {
    if (byId.has(id)) {
      const first = byId.get(id)!.node;
      throw new ThreatModelParseError(
        `Duplicate id "${id}" declared on line ${lineNo} (first declared on line ${first.line}).`,
        lineNo
      );
    }
    const node: DfdNode = { id, kind, label, line: lineNo };
    if (logStore) node.logStore = true;
    ast.nodes.push(node);
    byId.set(id, { node });
  };

  let i = 0;
  let headerSeen = false;

  // ── Header: `threatmodel`/`stride` (optional inline title) ──
  for (; i < rawLines.length; i++) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") continue;
    const h = /^(threatmodel|stride)\b(.*)$/i.exec(t);
    if (h) {
      const rest = h[2]!.trim();
      if (rest) ast.title = unquote(rest);
      headerSeen = true;
      i++;
    }
    break;
  }
  if (!headerSeen) {
    throw new ThreatModelParseError(
      'A threat model must start with "threatmodel" or "stride".',
      1
    );
  }

  // ── Body ──
  for (; i < rawLines.length; i++) {
    const lineNo = i + 1;
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") continue;

    // title: "..."
    const titleM = /^title\s*:\s*(.+)$/i.exec(t);
    if (titleM) {
      ast.title = unquote(titleM[1]!);
      continue;
    }

    // external [id]: Label   |   external: Label
    const extM = /^external\b\s*(?:([^:\s][^:]*?)\s*)?:\s*(.+)$/i.exec(t);
    if (extM) {
      const label = unquote(extM[2]!);
      if (!label) {
        throw new ThreatModelParseError(
          "External entity declaration has no label.",
          lineNo
        );
      }
      const id = extM[1] ? extM[1].trim() : slug(label);
      declareNode(id, "external", label, lineNo);
      continue;
    }

    // process <id>: Label
    const procM = /^process\b\s+([^:\s]+)\s*:\s*(.+)$/i.exec(t);
    if (procM) {
      const id = procM[1]!.trim();
      const label = unquote(procM[2]!);
      if (!label) {
        throw new ThreatModelParseError(
          `Process "${id}" has no label.`,
          lineNo
        );
      }
      declareNode(id, "process", label, lineNo);
      continue;
    }

    // datastore <id>: Label [log]
    const dsM = /^(?:datastore|store)\b\s+([^:\s]+)\s*:\s*(.+)$/i.exec(t);
    if (dsM) {
      const id = dsM[1]!.trim();
      let label = unquote(dsM[2]!);
      // Trailing `log`/`audit` hint after the label enables conditional R.
      let logHint = false;
      const hintM = /\s+(log|audit|journal)\s*$/i.exec(label);
      if (hintM) {
        logHint = true;
        label = label.slice(0, hintM.index).trim();
      }
      if (!label) {
        throw new ThreatModelParseError(
          `Data store "${id}" has no label.`,
          lineNo
        );
      }
      declareNode(id, "store", label, lineNo, logHint || undefined);
      continue;
    }

    // boundary "Name" { id, id, ... }
    const bM = /^boundary\b\s*(.+?)\s*\{\s*(.*?)\s*\}\s*$/i.exec(t);
    if (bM) {
      const name = unquote(bM[1]!);
      const members = bM[2]!
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (!name) {
        throw new ThreatModelParseError("Trust boundary has no name.", lineNo);
      }
      const boundary: TrustBoundary = { name, members, line: lineNo };
      ast.boundaries.push(boundary);
      continue;
    }

    // flow:  A -> B : label   |   A <-> B : label
    const flowM = /^(.+?)\s*(<->|->)\s*(.+?)\s*:\s*(.*)$/.exec(t);
    if (flowM) {
      const source = flowM[1]!.trim();
      const arrow = flowM[2]!;
      const target = flowM[3]!.trim();
      const label = unquote(flowM[4]!);
      if (!label) {
        throw new ThreatModelParseError(
          `Data flow on line ${lineNo} has no label. In DFD semantics every flow represents a named data packet.`,
          lineNo
        );
      }
      const flow: DfdFlow = { source, target, label, line: lineNo };
      ast.flows.push(flow);
      if (arrow === "<->") {
        ast.flows.push({ source: target, target: source, label, line: lineNo });
      }
      continue;
    }

    // A flow with arrow but missing the `: label`?
    if (/(<->|->)/.test(t)) {
      throw new ThreatModelParseError(
        `Data flow on line ${lineNo} has no label. Use "A -> B : label".`,
        lineNo
      );
    }

    throw new ThreatModelParseError(
      `Unrecognised line: "${t}". Expected external/process/datastore/boundary/flow.`,
      lineNo
    );
  }

  resolveEndpoints(ast, byId);
  validate(ast, byId);
  return ast;
}

/**
 * Authors (and LLMs) often reference an external by its human label rather than
 * its slug id (`Mobile App -> P` for an external slugged `Mobile_App`). Rewrite
 * flow + boundary endpoints to the canonical id when an exact-label or slug
 * match exists. Endpoints already matching a declared id are left untouched.
 */
function resolveEndpoints(
  ast: ThreatModelAst,
  byId: Map<string, { node: DfdNode }>
): void {
  const byLabel = new Map<string, string>();
  const bySlug = new Map<string, string>();
  for (const n of ast.nodes) {
    if (!byLabel.has(n.label)) byLabel.set(n.label, n.id);
    const sl = slug(n.label);
    if (!bySlug.has(sl)) bySlug.set(sl, n.id);
  }
  const canon = (ref: string): string => {
    if (byId.has(ref)) return ref;
    return byLabel.get(ref) ?? bySlug.get(slug(ref)) ?? ref;
  };
  for (const f of ast.flows) {
    f.source = canon(f.source);
    f.target = canon(f.target);
  }
  for (const b of ast.boundaries) {
    b.members = b.members.map(canon);
  }
}

// ─── validation (DFD well-formedness, AI-readable) ────────────

function validate(
  ast: ThreatModelAst,
  byId: Map<string, { node: DfdNode }>
): void {
  // Flow endpoints declared; no store↔store; no external↔external.
  for (const f of ast.flows) {
    const s = byId.get(f.source)?.node;
    const tg = byId.get(f.target)?.node;
    if (!s) {
      throw new ThreatModelParseError(
        `Flow on line ${f.line} references unknown element "${f.source}".`,
        f.line
      );
    }
    if (!tg) {
      throw new ThreatModelParseError(
        `Flow on line ${f.line} references unknown element "${f.target}".`,
        f.line
      );
    }
    if (s.kind === "store" && tg.kind === "store") {
      throw new ThreatModelParseError(
        `Flow on line ${f.line} connects data store ${s.id} directly to data store ${tg.id}. In DFD semantics, data stores cannot exchange data without a process in between.`,
        f.line
      );
    }
    if (s.kind === "external" && tg.kind === "external") {
      throw new ThreatModelParseError(
        `Flow on line ${f.line} connects external entity ${s.id} directly to external entity ${tg.id}. Externals can only communicate via a process.`,
        f.line
      );
    }
  }

  // Boundary members declared; each element in ≤1 boundary.
  const seen = new Map<string, string>();
  for (const b of ast.boundaries) {
    for (const m of b.members) {
      if (!byId.has(m)) {
        throw new ThreatModelParseError(
          `Boundary "${b.name}" lists unknown element "${m}".`,
          b.line
        );
      }
      const prev = seen.get(m);
      if (prev && prev !== b.name) {
        throw new ThreatModelParseError(
          `Element "${m}" appears in boundaries "${prev}" and "${b.name}". Each element may belong to at most one trust boundary.`,
          b.line
        );
      }
      seen.set(m, b.name);
    }
  }
}
