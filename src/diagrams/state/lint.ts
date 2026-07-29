import type { SchematexDiagnostic } from "../../core/diagnostics";
import { layoutStateDiagram } from "./layout";
import { parseStateDiagram } from "./parser";

/**
 * State-specific readability diagnostics.
 *
 * Explicit direction remains authoritative. When an authored LR direction
 * creates an extreme strip, surface the tradeoff instead of silently changing
 * semantics or calling the result clean.
 */
export function lintStateDiagram(text: string): SchematexDiagnostic[] {
  try {
    const ast = parseStateDiagram(text);
    if (ast.direction !== "LR" || ast.directionSource !== "explicit") return [];

    // This policy is intentionally narrow: it diagnoses the production failure
    // mode of a long *linear* strip. Branched/composite statecharts may be wide
    // for semantic reasons, so aspect ratio alone is not evidence of a defect.
    const simpleIds = new Set(
      ast.states
        .filter((state) => state.kind === "simple")
        .map((state) => state.id)
    );
    if (
      ast.states.some((state) => state.kind === "composite") ||
      simpleIds.size < 4
    ) {
      return [];
    }
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();
    for (const transition of ast.transitions) {
      if (simpleIds.has(transition.from) && simpleIds.has(transition.to)) {
        outgoing.set(
          transition.from,
          (outgoing.get(transition.from) ?? 0) + 1
        );
        incoming.set(
          transition.to,
          (incoming.get(transition.to) ?? 0) + 1
        );
      }
    }
    if (
      [...simpleIds].some(
        (id) => (incoming.get(id) ?? 0) > 1 || (outgoing.get(id) ?? 0) > 1
      )
    ) {
      return [];
    }

    const layout = layoutStateDiagram(ast);
    const ratio = layout.height > 0 ? layout.width / layout.height : 0;
    if (ratio < 5) return [];
    return [
      {
        severity: "warning",
        code: "STATE_EXTREME_ASPECT_RATIO",
        message: `explicit LR layout produces an extreme ${ratio.toFixed(1)}:1 aspect ratio`,
        hint:
          "Use `direction TB` for a downward sequence, or `direction auto` to let label size and chain length choose the axis.",
        fatal: false,
      },
    ];
  } catch {
    return [];
  }
}
