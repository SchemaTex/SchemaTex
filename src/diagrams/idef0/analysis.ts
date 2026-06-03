/**
 * IDEF0 analysis — the structural-enforcement differentiator.
 * Per docs/reference/45-IDEF0-STANDARD.md §"Engine computation".
 *
 * This pass is what makes Schematex's IDEF0 *correct by construction* where a
 * general drawing tool is not:
 *
 *  1. ICOM placement enforcement (headline). Each arrow's role *is* the box edge
 *     it attaches to — Input→left, Control→top, Output→right, Mechanism→bottom.
 *     The role is resolved against the box's geometry side; a malformed role is
 *     rejected. (The DSL keywords already encode the side, so the enforcement
 *     here is: resolve refs, reject roles that contradict the box endpoint, and
 *     reject an output that is asked to *enter* a box.)
 *  2. Reference resolution. Every box id named by an arrow must be declared.
 *  3. Decomposition numbering. Boxes get contiguous box numbers 1..n (lower-right
 *     corner) and node numbers `<diagram-node><k>` (A0 → A1..An). Explicit
 *     `#N` numbers are validated for contiguity / range / duplicates.
 *  4. ICOM boundary codes. Boundary arrows are coded I1/C1/O1/M1… down each edge.
 *  5. Box-count guideline. <3 or >6 boxes → a warning (FIPS 183 3-to-6 rule).
 *
 * Throws Idef0ParseError on a structural violation (so callers get one error
 * channel). Returns the same ast, mutated with assigned numbers + codes.
 */

import { Idef0ParseError } from "./parser";
import type { Idef0Arrow, Idef0Ast } from "./types";
import { ICOM_LETTER, ICOM_SIDE } from "./types";

export function analyseIdef0(ast: Idef0Ast): Idef0Ast {
  const byId = new Map(ast.boxes.map((b) => [b.id, b] as const));

  // ── 2. Reference resolution + 1. ICOM placement enforcement ──
  for (const arrow of ast.arrows) {
    enforceArrow(arrow, byId);
  }

  // ── 3. Decomposition numbering ──
  assignNumbering(ast);

  // ── 4. ICOM boundary codes ──
  assignIcomCodes(ast);

  // ── 5. Box-count guideline (3..6) ──
  const n = ast.boxes.length;
  if (n === 0) {
    throw new Idef0ParseError(`an idef0 diagram must declare at least one 'function' box`);
  }
  if (n < 3) {
    ast.warnings.push(
      `Diagram has ${n} box${n === 1 ? "" : "es"} — FIPS 183 recommends 3 to 6 per diagram.`
    );
  } else if (n > 6) {
    ast.warnings.push(
      `Diagram has ${n} boxes — FIPS 183 recommends 3 to 6 per diagram (consider decomposing).`
    );
  }

  return ast;
}

// ─── 1 + 2. Per-arrow enforcement ─────────────────────────────

function enforceArrow(
  arrow: Idef0Arrow,
  byId: Map<string, Idef0Ast["boxes"][number]>
): void {
  const lineHint = arrow.line;

  // Resolve box references.
  for (const end of [arrow.from, arrow.to]) {
    if (end.kind === "box" && !byId.has(end.boxId)) {
      throw new Idef0ParseError(
        `arrow references undefined function box "${end.boxId}"`,
        lineHint
      );
    }
  }

  const side = ICOM_SIDE[arrow.role];

  // ICOM placement: the role dictates the side the arrow attaches to on its
  // box endpoint. Output *exits* a box on the right; I/C/M *enter* a box.
  if (arrow.role === "output") {
    // An output must originate at a box (it exits the right edge). It cannot be
    // asked to *enter* a box — that would be drawing an output into a box side,
    // the canonical IDEF0 mistake.
    if (arrow.from.kind !== "box") {
      throw new Idef0ParseError(
        `an 'output' arrow${arrow.label ? ` "${arrow.label}"` : ""} must exit a function box on its right edge — it has no box source`,
        lineHint
      );
    }
    // side === "right" by construction; assert the invariant.
    if (side !== "right") {
      throw new Idef0ParseError(
        `ICOM violation: output must attach to the right edge, not ${side}`,
        lineHint
      );
    }
  } else {
    // input / control / mechanism / call must *enter* a box.
    if (arrow.to.kind !== "box") {
      throw new Idef0ParseError(
        `a '${arrow.role}' arrow${arrow.label ? ` "${arrow.label}"` : ""} must enter a function box on its ${side} edge — it has no box target`,
        lineHint
      );
    }
    if (side !== expectedSide(arrow.role)) {
      throw new Idef0ParseError(
        `ICOM violation: ${arrow.role} must attach to the ${expectedSide(arrow.role)} edge`,
        lineHint
      );
    }
  }
}

/** The canonical ICOM side for a role (used to double-check the mapping). */
function expectedSide(role: Idef0Arrow["role"]): string {
  switch (role) {
    case "input":
      return "left";
    case "control":
      return "top";
    case "output":
      return "right";
    case "mechanism":
    case "call":
      return "bottom";
  }
}

// ─── 3. Decomposition numbering ───────────────────────────────

function assignNumbering(ast: Idef0Ast): void {
  const anyExplicit = ast.boxes.some((b) => b.number > 0);

  if (!anyExplicit) {
    // Auto: contiguous 1..n in declaration order.
    ast.boxes.forEach((b, idx) => {
      b.number = idx + 1;
    });
  } else {
    // Validate explicit numbers: range 0..6, no duplicates, contiguous 1..n.
    const seen = new Set<number>();
    for (const b of ast.boxes) {
      if (b.number === 0) {
        throw new Idef0ParseError(
          `box "${b.id}" has no number — either number every box explicitly with #N or none`
        );
      }
      if (b.number < 1 || b.number > 6) {
        throw new Idef0ParseError(
          `box "${b.id}" number ${b.number} out of range — FIPS 183 box numbers run 1..6`
        );
      }
      if (seen.has(b.number)) {
        throw new Idef0ParseError(`duplicate box number ${b.number} (box "${b.id}")`);
      }
      seen.add(b.number);
    }
    const sorted = [...seen].sort((a, b) => a - b);
    for (let k = 0; k < sorted.length; k++) {
      if (sorted[k] !== k + 1) {
        throw new Idef0ParseError(
          `box numbers must be contiguous starting at 1 — got [${sorted.join(", ")}] (gap at ${k + 1})`
        );
      }
    }
    // Render in numeric order when explicit.
    ast.boxes.sort((a, b) => a.number - b.number);
  }

  // Node numbers: <diagram node><box number>. A0 → A1..An.
  // (Single-level v0.1; multi-level propagation reuses this with the parent
  // node prefix — designed so it won't need a breaking change.)
  const prefix = nodePrefix(ast.node);
  for (const b of ast.boxes) {
    b.nodeNumber = `${prefix}${b.number}`;
  }
}

/** "A0" → "A", "A2" → "A2", "A-0" → "A". The decomposition prefix for children. */
function nodePrefix(node: string): string {
  const m = /^([A-Za-z]+)(-?\d+)?$/.exec(node.trim());
  if (!m) return node;
  const letters = m[1]!;
  const num = m[2];
  if (num === undefined || num === "0" || num === "-0") return letters; // A0 / A-0 → "A"
  return `${letters}${num}`; // A2 → "A2", children A21..
}

// ─── 4. ICOM boundary codes ───────────────────────────────────

function assignIcomCodes(ast: Idef0Ast): void {
  const counters: Record<"I" | "C" | "O" | "M", number> = { I: 0, C: 0, O: 0, M: 0 };
  for (const arrow of ast.arrows) {
    const touchesBoundary = arrow.from.kind === "boundary" || arrow.to.kind === "boundary";
    if (!touchesBoundary) continue;
    const letter = ICOM_LETTER[arrow.role];
    counters[letter] += 1;
    arrow.icomCode = `${letter}${counters[letter]}`;
  }
}
