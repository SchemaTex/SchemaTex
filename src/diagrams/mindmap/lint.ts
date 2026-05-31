import type { SchematexDiagnostic } from "../../core/diagnostics";
import type { MindmapAST } from "../../core/types";
import { parseMindmap } from "./parser";

/**
 * Mindmap recoverable-input lint.
 *
 * The parser no longer throws when a central `# Title` is missing — it recovers
 * a root and keeps drawing. This surfaces that recovery as a warning so the
 * render reports `partial` and the upstream author (often an LLM) can learn to
 * add the explicit heading, without ever blanking a renderable diagram.
 */
export function lintMindmap(text: string): SchematexDiagnostic[] {
  let ast: MindmapAST;
  try {
    ast = parseMindmap(text);
  } catch {
    // Hard parse failures are reported by the normal error path.
    return [];
  }
  const out: SchematexDiagnostic[] = [];

  if (ast.rootInferred === "line") {
    out.push({
      severity: "warning",
      code: "MINDMAP_SYNTHESIZED_ROOT",
      message: `no \`# Title\` heading found; adopted the first line "${ast.root.label}" as the central topic`,
      hint: "Mark the central topic explicitly with a single leading `# Title` line, e.g. `# My Topic`.",
      fatal: false,
    });
  } else if (ast.rootInferred === "placeholder") {
    out.push({
      severity: "warning",
      code: "MINDMAP_SYNTHESIZED_ROOT",
      message:
        "no central topic found; inserted a placeholder root over the top-level branches",
      hint: 'Start the mindmap with a single `# Title` line to name the center, e.g. `# My Topic`, with branches as `- item` bullets below it.',
      fatal: false,
    });
  }

  return out;
}
