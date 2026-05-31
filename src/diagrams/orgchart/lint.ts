import type { SchematexDiagnostic } from "../../core/diagnostics";
import type { OrgchartAST } from "./types";
import { parseOrgchart } from "./parser";

/**
 * Orgchart recoverable-input lint.
 *
 * The parser degrades instead of throwing: unparseable lines are skipped,
 * duplicate ids dropped, and ids referenced only by edges are synthesized into
 * nodes. Each recovery is surfaced here as a warning so the render reports
 * `partial` and the author learns what was repaired — without ever blanking a
 * chart that has at least one node.
 */
export function lintOrgchart(text: string): SchematexDiagnostic[] {
  let ast: OrgchartAST;
  try {
    ast = parseOrgchart(text);
  } catch {
    return [];
  }
  const out: SchematexDiagnostic[] = [];
  const rec = ast.recovered;
  if (!rec) return out;

  for (const { line, text: src } of rec.unparseableLines ?? []) {
    out.push({
      severity: "warning",
      code: "ORGCHART_UNPARSEABLE_LINE",
      message: `skipped a line that is neither a node nor an edge: "${src}"`,
      line,
      source: src,
      hint: 'A node is `id : "Name" | Title | Dept`; an edge is `parent -> child`. Check for a missing colon or a stray line.',
      fatal: false,
    });
  }

  if (rec.duplicateIds?.length) {
    out.push({
      severity: "warning",
      code: "ORGCHART_DUPLICATE_ID",
      message: `kept the first declaration of duplicate node id(s): ${rec.duplicateIds
        .map((id) => `"${id}"`)
        .join(", ")}`,
      hint: "Give each person/role a unique id; later redeclarations are dropped.",
      fatal: false,
    });
  }

  if (rec.impliedNodes?.length) {
    out.push({
      severity: "warning",
      code: "ORGCHART_IMPLIED_NODE",
      message: `created node(s) from edges that were never declared: ${rec.impliedNodes
        .map((id) => `"${id}"`)
        .join(", ")}`,
      hint: 'Declare each person/role explicitly (`id : "Name"`) so labels and roles render; bare ids fall back to the id as the name.',
      fatal: false,
    });
  }

  return out;
}
