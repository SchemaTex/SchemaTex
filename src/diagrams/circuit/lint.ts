import type { SchematexDiagnostic } from "../../core/diagnostics";
import type { CircuitAST } from "../../core/types";
import { parseCircuit } from "./parser";

/**
 * Circuit recoverable-input lint.
 *
 * The netlist parser no longer throws when a multi-terminal component is given
 * fewer nets than it has pins — it binds the missing pins to floating
 * no-connect nets and draws the part anyway. This surfaces that recovery as a
 * warning so the render reports `partial` and the author can wire the open
 * terminals, without ever blanking a schematic that is otherwise complete.
 */
export function lintCircuit(text: string): SchematexDiagnostic[] {
  let ast: CircuitAST;
  try {
    ast = parseCircuit(text);
  } catch {
    return [];
  }
  const out: SchematexDiagnostic[] = [];
  for (const u of ast.recovered?.underspecified ?? []) {
    out.push({
      severity: "warning",
      code: "CIRCUIT_PIN_UNDERSPECIFIED",
      message: `component ${u.id} (${u.type}) needs ${u.expected} nets but got ${u.got}; the missing terminal(s) were left floating`,
      hint: `Give ${u.id} all ${u.expected} net connections (e.g. a transformer is \`${u.id} p1 p2 s1 s2 type=transformer\`). Unconnected pins are drawn but not wired.`,
      fatal: false,
    });
  }
  return out;
}
