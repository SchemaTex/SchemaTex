import type { SchematexDiagnostic } from "../../core/diagnostics";
import type { LogicGateAST } from "../../core/types";
import { didYouMean } from "../../core/dsl-suggest";
import { parseLogic } from "./parser";

// Canonical gate vocabulary for the did-you-mean suggestion on an unknown gate.
// Kept in sync with GATE_TYPES in the parser.
const KNOWN_GATES = [
  "AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR", "BUF",
  "TRISTATE_BUF", "TRISTATE_INV", "OPEN_DRAIN", "SCHMITT",
  "DFF", "JKFF", "SRFF", "TFF", "LATCH_SR", "LATCH_D",
  "MUX", "DEMUX", "DECODER", "ENCODER", "COUNTER", "SHIFT_REG",
];

export function lintLogic(text: string): SchematexDiagnostic[] {
  let ast: LogicGateAST;
  try {
    ast = parseLogic(text);
  } catch {
    // Parse failures are reported by the normal error path; lint stays silent.
    return [];
  }
  return lintLogicAst(ast);
}

export function lintLogicAst(ast: LogicGateAST): SchematexDiagnostic[] {
  const out: SchematexDiagnostic[] = [];
  // Unrecognised gate types are kept (drawn as a flagged placeholder) but
  // warned about so the partial render is analyzable and the engineer gets a
  // did-you-mean nudge. The engine never silently substitutes a real gate.
  for (const g of ast.gates) {
    if (g.gateType !== "unknown") continue;
    const raw = g.rawType ?? "";
    out.push({
      severity: "warning",
      code: "LOGIC_UNKNOWN_GATE",
      message: `gate "${g.id}" has unrecognised type "${raw}"; drawn as a flagged placeholder`,
      hint: `"${raw}" is not a known logic gate.${didYouMean(raw.toUpperCase(), KNOWN_GATES)} Valid gates include AND, OR, NOT, NAND, NOR, XOR, DFF, MUX. See docs/reference.`,
      fatal: false,
    });
  }
  return out;
}
