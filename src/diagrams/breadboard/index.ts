import type { DiagramPlugin, RenderConfig } from "../../core/types";
import type { SchematexDiagnostic } from "../../core/diagnostics";
import { parseBreadboard } from "./parser";
import { layoutBreadboard } from "./layout";
import { renderBreadboard } from "./renderer";

function layoutDiagnostic(error: unknown): SchematexDiagnostic {
  const message = error instanceof Error ? error.message : String(error);
  const code = /has no pin named/.test(message)
    ? "BREADBOARD_UNKNOWN_PIN"
    : /unknown part/.test(message)
      ? "BREADBOARD_UNKNOWN_PART"
      : "BREADBOARD_LAYOUT_INVALID";
  return {
    severity: "error",
    code,
    message,
    hint:
      code === "BREADBOARD_UNKNOWN_PIN"
        ? "Use the canonical pin names exposed by the breadboard part catalog."
        : undefined,
    fatal: false,
  };
}

export const breadboard: DiagramPlugin = {
  type: "breadboard",
  capabilities: { scene: true, editablePosition: true },
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (t.length === 0) continue;
      if (t.startsWith("//") || t.startsWith("#")) continue;
      const first = t.split(/\s+/)[0]?.toLowerCase() ?? "";
      return first === "breadboard";
    }
    return false;
  },
  parse: parseBreadboard,
  render(text: string, config?: RenderConfig): string {
    return renderBreadboard(text, config);
  },
  lint(text: string): SchematexDiagnostic[] {
    try {
      const ast = parseBreadboard(text);
      const diagnostics: SchematexDiagnostic[] = [];
      const hasRelay = ast.parts.some(
        (part) => part.kind === "module-relay-1ch"
      );
      const hasRtc = ast.parts.some(
        (part) => part.kind === "module-rtc-ds3231"
      );

      for (const part of ast.parts) {
        if (/relay/i.test(part.id) && part.kind !== "module-relay-1ch") {
          diagnostics.push({
            severity: "warning",
            code: "BREADBOARD_PART_ROLE_MISMATCH",
            message: `Part '${part.id}' is named like a relay but uses '${part.kind}'.`,
            hint: "Use `module relay` for a 1-channel relay module with VCC/GND/IN and COM/NO/NC pins.",
            fatal: false,
          });
        }
        if (/(^|[-_])(rtc|ds3231)([-_]|$)/i.test(part.id) && part.kind !== "module-rtc-ds3231") {
          diagnostics.push({
            severity: "warning",
            code: "BREADBOARD_PART_ROLE_MISMATCH",
            message: `Part '${part.id}' is named like an RTC but uses '${part.kind}'.`,
            hint: "Use `module ds3231` for the supported RTC module.",
            fatal: false,
          });
        }
      }

      const title = ast.title ?? "";
      if (/\brelay\b/i.test(title) && !hasRelay && !diagnostics.some((entry) => /relay/i.test(entry.message))) {
        diagnostics.push({
          severity: "warning",
          code: "BREADBOARD_REQUESTED_PART_MISSING",
          message: "The title requests a relay, but no relay module is declared.",
          hint: "Add `relay: module relay @<coord>` instead of substituting another module.",
          fatal: false,
        });
      }
      if (/\b(?:rtc|ds3231)\b/i.test(title) && !hasRtc && !diagnostics.some((entry) => /\bRTC\b/.test(entry.message))) {
        diagnostics.push({
          severity: "warning",
          code: "BREADBOARD_REQUESTED_PART_MISSING",
          message: "The title requests an RTC, but no DS3231 RTC module is declared.",
          hint: "Add `rtc: module ds3231 @<coord>` instead of using a generic DIP.",
          fatal: false,
        });
      }

      try {
        layoutBreadboard(ast);
      } catch (error) {
        diagnostics.push(layoutDiagnostic(error));
      }
      return diagnostics;
    } catch {
      return [];
    }
  },
};

export { parseBreadboard, BreadboardParseError } from "./parser";
export { renderBreadboard, renderBreadboardLayout } from "./renderer";
export { layoutBreadboard, BB_CONST } from "./layout";
export { partSpec, PART_CATALOG, HOLE_PITCH } from "./parts";
