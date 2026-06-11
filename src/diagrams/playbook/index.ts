import type { DiagramPlugin, RenderConfig } from "../../core/types";
import type { SchematexDiagnostic } from "../../core/diagnostics";
import { parsePlaybook } from "./parser";
import { layoutPlaybook } from "./layout";
import { renderPlaybook } from "./renderer";

export const playbook: DiagramPlugin = {
  type: "playbook",
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("#") || t.startsWith("//")) continue;
      return /^playbook\b/i.test(t);
    }
    return false;
  },
  parse: parsePlaybook,
  render(text: string, config?: RenderConfig): string {
    return renderPlaybook(text, config);
  },
  lint(text: string): SchematexDiagnostic[] {
    try {
      const lay = layoutPlaybook(parsePlaybook(text));
      return [
        ...lay.errors.map(
          (message): SchematexDiagnostic => ({
            severity: "error",
            code: "playbook/validation",
            message,
            fatal: false,
          })
        ),
        ...lay.warnings.map(
          (message): SchematexDiagnostic => ({
            severity: "warning",
            code: "playbook/warning",
            message,
            fatal: false,
          })
        ),
      ];
    } catch {
      return [];
    }
  },
};

export { parsePlaybook, PlaybookParseError } from "./parser";
export { layoutPlaybook, sportModule } from "./layout";
export { renderPlaybook, renderPlaybookLayout } from "./renderer";
export type * from "./types";
