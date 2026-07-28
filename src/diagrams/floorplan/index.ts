import type { DiagramPlugin, RenderConfig } from "../../core/types";
import type { SchematexDiagnostic } from "../../core/diagnostics";
import { parseFloorplan } from "./parser";
import { layoutFloorplan } from "./layout";
import { renderFloorplan } from "./renderer";

function floorplanDiagnosticCode(message: string): string {
  if (/^rooms ".+" and ".+" overlap by /.test(message)) {
    return "floorplan/room-overlap";
  }
  if (/^(door|opening|window) between .+: rooms share no wall/.test(message)) {
    return "floorplan/opening-no-shared-wall";
  }
  if (/unknown (reference )?room/.test(message)) {
    return "floorplan/unknown-room";
  }
  if (/another floor|different floors/.test(message)) {
    return "floorplan/cross-floor-reference";
  }
  if (/^extend\b/.test(message)) {
    return "floorplan/invalid-extension";
  }
  return "floorplan/validation";
}

export const floorplan: DiagramPlugin = {
  type: "floorplan",
  capabilities: { scene: true, editablePosition: true },
  altTypes: ["evacuation", "stageplot"],
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("#") || t.startsWith("//")) continue;
      return /^(floorplan|evacuation|escapeplan|stageplot|stage-plot)\b/i.test(t);
    }
    return false;
  },
  parse: parseFloorplan,
  render(text: string, config?: RenderConfig): string {
    return renderFloorplan(text, config);
  },
  lint(text: string, config?: Partial<RenderConfig>): SchematexDiagnostic[] {
    try {
      const ast = parseFloorplan(text);
      const lay = layoutFloorplan(ast);
      return [
        ...lay.errors.map(
          (message): SchematexDiagnostic => ({
            severity: "error",
            code: floorplanDiagnosticCode(message),
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
        ...(ast.mode === "evacuation" && config?.theme === "monochrome"
          ? [
              {
                severity: "error" as const,
                code: "floorplan/evacuation-color-required",
                message:
                  "monochrome theme is not permitted for evacuation plans — ISO 3864 safety colours are semantic (green = escape, red = fire equipment)",
                fatal: false,
              },
            ]
          : []),
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
export {
  SAFETY_PREVIEW_SYMBOLS,
  SAFETY_SYMBOLS,
  resolveSafetySymbol,
} from "./safety-symbols";
export {
  EVACUATION_PROFILES,
  EVACUATION_SHEETS_MM,
  computeEvacuationScale,
  validateEvacuation,
} from "./evacuation";
export { buildEvacuationLegend } from "./legend";
export {
  deriveStageInputList,
  deriveStageOutputList,
  finalizeStageplotLayout,
  inferStageStand,
  renderStageplotLayout,
} from "./stageplot";
export { STAGE_SYMBOLS } from "./stage-symbols";
export { orthogonalPolyline } from "./orthogonal-routing";
export type * from "./types";
