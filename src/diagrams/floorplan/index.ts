import type { DiagramPlugin, RenderConfig } from "../../core/types";
import type { SchematexDiagnostic } from "../../core/diagnostics";
import { parseFloorplan } from "./parser";
import { layoutFloorplan } from "./layout";
import { renderFloorplan } from "./renderer";

export const floorplan: DiagramPlugin = {
  type: "floorplan",
  capabilities: { scene: true, editablePosition: true },
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("#") || t.startsWith("//")) continue;
      return /^floorplan\b/i.test(t);
    }
    return false;
  },
  parse: parseFloorplan,
  render(text: string, config?: RenderConfig): string {
    return renderFloorplan(text, config);
  },
  lint(text: string): SchematexDiagnostic[] {
    try {
      const lay = layoutFloorplan(parseFloorplan(text));
      return [
        ...lay.errors.map(
          (message): SchematexDiagnostic => ({
            severity: "error",
            code: "floorplan/validation",
            message,
            fatal: false,
          })
        ),
        ...lay.warnings.map(
          (message): SchematexDiagnostic => ({
            severity: "warning",
            code: "floorplan/warning",
            message,
            fatal: false,
          })
        ),
      ];
    } catch {
      return []; // parse errors surface through parse(), not lint()
    }
  },
};

export { parseFloorplan, FloorplanParseError } from "./parser";
export { layoutFloorplan, formatLength, formatArea, FLOORPLAN_CONST } from "./layout";
export { renderFloorplan, renderFloorplanLayout } from "./renderer";
export { FLOORPLAN_SYMBOLS, FURNITURE_TYPES } from "./catalog";
export type * from "./types";
