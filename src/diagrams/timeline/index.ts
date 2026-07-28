import type { DiagramPlugin, RenderConfig } from "../../core/types";
import type { SchematexDiagnostic } from "../../core/diagnostics";
import { parseTimeline } from "./parser";
import { renderTimeline } from "./renderer";

export const timeline: DiagramPlugin = {
  type: "timeline" as DiagramPlugin["type"],
  capabilities: { scene: true, editablePosition: true },
  detect(text) {
    return /^\s*timeline\b/i.test(text);
  },
  parse: parseTimeline,
  render(text, config?: RenderConfig) {
    return renderTimeline(text, config);
  },
  lint(text: string): SchematexDiagnostic[] {
    try {
      return (parseTimeline(text).warnings ?? []).map((warning) => ({
        severity: "warning",
        code: "timeline/undated-entry",
        message: warning.message,
        line: warning.line,
        hint: `Add a date before the colon, or keep the entry undated.`,
        fatal: false,
      }));
    } catch {
      return [];
    }
  },
};

export { parseTimeline, TimelineParseError } from "./parser";
export { layoutTimeline } from "./layout";
export { renderTimeline } from "./renderer";
export type * from "./types";
