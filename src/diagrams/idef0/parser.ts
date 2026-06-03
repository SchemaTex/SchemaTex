/**
 * IDEF0 (idef0) parser — flat declaration DSL.
 * Per docs/reference/45-IDEF0-STANDARD.md §"DSL sketch".
 *
 * Header keyword: `idef0` (optionally followed by a quoted model title).
 *
 * Grammar (one statement per line, `#` comments):
 *
 *   idef0 "Manufacture product"
 *   node A0
 *   purpose "..."          # optional A-0 metadata
 *   viewpoint "..."        # optional A-0 metadata
 *
 *   function A1 "Plan production"     # an activity box (number auto-assigned)
 *   function A2 "Make parts"
 *
 *   # External ICOM arrows — role keyword binds the side:
 *   input     A1 "Sales orders"          # boundary → A1.left
 *   control   A1 "Production schedule"    # boundary → A1.top
 *   output    A3 "Product"                # A3.right → boundary
 *   mechanism A2 "CNC machines"           # boundary → A2.bottom
 *
 *   # Box → box arrow, landing on a named ICOM side of the target:
 *   A1 -> A2.input   "Work plan"          # A1 output → A2 input
 *   A2 -> A3.control "Spec sheet"         # A1 output → A3 control
 *   A1 -> A2 "Work plan"                  # bare target ≡ .input
 *
 * The ICOM role enforcement (output never enters the top, etc.) and the
 * box-number / node-number assignment happen in analysis.ts.
 *
 * Zero runtime deps. No parser generators.
 */

import type {
  Idef0Arrow,
  Idef0Ast,
  Idef0Box,
  Idef0Endpoint,
  IcomRole,
} from "./types";
import { ICOM_SIDE } from "./types";

export class Idef0ParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = "Idef0ParseError";
  }
}

const ROLE_KEYWORDS = new Set<IcomRole>([
  "input",
  "control",
  "output",
  "mechanism",
  "call",
]);

// ─── Public entry ─────────────────────────────────────────────

export function parseIdef0(text: string): Idef0Ast {
  const ast: Idef0Ast = {
    type: "idef0",
    node: "A0",
    boxes: [],
    arrows: [],
    warnings: [],
  };

  const rawLines = text.split(/\r?\n/);
  let i = 0;

  // ── Header ──
  let headerSeen = false;
  for (; i < rawLines.length; i++) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") continue;
    const h = /^idef0\b(.*)$/i.exec(t);
    if (h) {
      const after = h[1]!.trim();
      const q = matchQuoted(after);
      if (q) ast.title = q.value;
      headerSeen = true;
      i++;
    }
    break;
  }
  if (!headerSeen) {
    throw new Idef0ParseError(`an idef0 diagram must start with the 'idef0' keyword`);
  }

  // ── Body ──
  for (; i < rawLines.length; i++) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") continue;
    const lineNo = i + 1;

    // node A0
    const nodeM = /^node\s+(.+)$/i.exec(t);
    if (nodeM) {
      ast.node = nodeM[1]!.trim();
      continue;
    }
    // purpose / viewpoint metadata
    const metaM = /^(purpose|viewpoint)\b\s*(.*)$/i.exec(t);
    if (metaM) {
      const key = metaM[1]!.toLowerCase() as "purpose" | "viewpoint";
      const q = matchQuoted(metaM[2]!.trim());
      ast[key] = q ? q.value : metaM[2]!.trim();
      continue;
    }
    // function A1 "name"
    const fnM = /^function\s+(.+)$/i.exec(t);
    if (fnM) {
      parseFunction(ast, fnM[1]!.trim(), lineNo);
      continue;
    }
    // ICOM role arrow:  <role> <box> "label"
    const roleM = /^([a-z]+)\s+(.+)$/i.exec(t);
    if (roleM && ROLE_KEYWORDS.has(roleM[1]!.toLowerCase() as IcomRole)) {
      parseRoleArrow(ast, roleM[1]!.toLowerCase() as IcomRole, roleM[2]!.trim(), lineNo);
      continue;
    }
    // box -> box arrow
    if (/->/.test(t)) {
      parseFlowArrow(ast, t, lineNo);
      continue;
    }

    ast.warnings.push(`Line ${lineNo}: unrecognised line: "${truncate(t, 80)}"`);
  }

  return ast;
}

// ─── Function box ─────────────────────────────────────────────

function parseFunction(ast: Idef0Ast, rest: string, lineNo: number): void {
  const idM = /^([A-Za-z_]\w*)/.exec(rest);
  if (!idM) throw new Idef0ParseError(`function needs an id, got "${truncate(rest, 40)}"`, lineNo);
  const id = idM[1]!;
  let tail = rest.slice(id.length).trim();

  let name = id;
  const q = matchQuoted(tail);
  if (q) {
    name = q.value;
    tail = tail.slice(q.length).trim();
  }

  // optional explicit box number: `n:N` (a leading `#` would be eaten by the
  // comment stripper, so the keyword form is used).
  let explicitNumber: number | undefined;
  const numM = /^n\s*:\s*(-?\d+)\b/i.exec(tail);
  if (numM) explicitNumber = Number(numM[1]);

  if (ast.boxes.some((b) => b.id === id)) {
    ast.warnings.push(`Line ${lineNo}: box "${id}" redeclared — keeping first declaration.`);
    return;
  }

  const box: Idef0Box = {
    id,
    name,
    // analysis assigns the real number; explicit wins if given.
    number: explicitNumber ?? 0,
  };
  ast.boxes.push(box);
}

// ─── ICOM role arrow (one box endpoint + boundary) ────────────

function parseRoleArrow(ast: Idef0Ast, role: IcomRole, rest: string, lineNo: number): void {
  const idM = /^([A-Za-z_]\w*)/.exec(rest);
  if (!idM) throw new Idef0ParseError(`${role} needs a box id, got "${truncate(rest, 40)}"`, lineNo);
  const boxId = idM[1]!;
  let tail = rest.slice(boxId.length).trim();

  let label = "";
  const q = matchQuoted(tail);
  if (q) {
    label = q.value;
    tail = tail.slice(q.length).trim();
  } else if (tail) {
    label = tail;
    tail = "";
  }

  const tunneled = consumeTunnel(tail);

  // Output exits the box to the boundary; the other roles enter the box.
  const boxEnd: Idef0Endpoint = { kind: "box", boxId };
  const boundary: Idef0Endpoint = { kind: "boundary" };
  const arrow: Idef0Arrow = {
    from: role === "output" ? boxEnd : boundary,
    to: role === "output" ? boundary : boxEnd,
    role,
    label,
    ...(tunneled ? { tunneled: true } : {}),
    line: lineNo,
  };
  ast.arrows.push(arrow);
}

// ─── Box → box flow arrow ─────────────────────────────────────

function parseFlowArrow(ast: Idef0Ast, t: string, lineNo: number): void {
  const arrowIdx = t.indexOf("->");
  const lhs = t.slice(0, arrowIdx).trim();
  let rhs = t.slice(arrowIdx + 2).trim();

  const srcM = /^([A-Za-z_]\w*)$/.exec(lhs);
  if (!srcM) throw new Idef0ParseError(`flow arrow source must be a box id, got "${truncate(lhs, 40)}"`, lineNo);
  const srcId = srcM[1]!;

  // target:  Box  or  Box.role
  const tgtM = /^([A-Za-z_]\w*)(?:\.([a-z]+))?/i.exec(rhs);
  if (!tgtM) throw new Idef0ParseError(`flow arrow target must be a box id, got "${truncate(rhs, 40)}"`, lineNo);
  const tgtId = tgtM[1]!;
  const roleWord = tgtM[2]?.toLowerCase();

  let role: IcomRole = "input"; // default: a flow lands on the target's input
  if (roleWord) {
    if (!ROLE_KEYWORDS.has(roleWord as IcomRole)) {
      throw new Idef0ParseError(
        `unknown ICOM role ".${roleWord}" — use .input/.control/.output/.mechanism`,
        lineNo
      );
    }
    if (roleWord === "output") {
      throw new Idef0ParseError(
        `a flow arrow cannot land on the target's .output — outputs *exit* a box; use .input/.control/.mechanism`,
        lineNo
      );
    }
    role = roleWord as IcomRole;
  }

  rhs = rhs.slice(tgtM[0].length).trim();
  let label = "";
  const q = matchQuoted(rhs);
  if (q) {
    label = q.value;
    rhs = rhs.slice(q.length).trim();
  } else if (rhs && !rhs.startsWith("(")) {
    // grab up to a trailing tunnel marker
    const tIdx = rhs.indexOf("(");
    label = (tIdx >= 0 ? rhs.slice(0, tIdx) : rhs).trim();
    rhs = tIdx >= 0 ? rhs.slice(tIdx) : "";
  }

  const tunneled = consumeTunnel(rhs);

  const arrow: Idef0Arrow = {
    from: { kind: "box", boxId: srcId },
    to: { kind: "box", boxId: tgtId },
    role,
    label,
    ...(tunneled ? { tunneled: true } : {}),
    line: lineNo,
  };
  // role/side sanity (ICOM_SIDE is consulted in analysis; touch import here so
  // the side mapping stays the single source of truth).
  void ICOM_SIDE[role];
  ast.arrows.push(arrow);
}

// ─── Helpers ──────────────────────────────────────────────────

function consumeTunnel(s: string): boolean {
  return /\(\s*tunnel\s*\)/i.test(s);
}

interface Quoted {
  value: string;
  length: number;
}
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

function stripComment(line: string): string {
  let inQ = false;
  let qc = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQ) {
      if (ch === qc) inQ = false;
      continue;
    }
    if (ch === '"' || ch === "「" || ch === "“") {
      inQ = true;
      qc = closingQuote(ch);
      continue;
    }
    if (ch === "#") return line.slice(0, i);
  }
  return line;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
