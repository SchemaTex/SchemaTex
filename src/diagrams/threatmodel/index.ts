import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseThreatModel } from "./parser";
import { renderThreatModel } from "./renderer";

export const threatmodel: DiagramPlugin = {
  // `threatmodel` is not yet a member of the shared DiagramType union; the cast
  // keeps the engine folder-isolated (no edit to src/core/types.ts) while still
  // shipping a conforming plugin. Registration in api.ts is a separate step.
  type: "threatmodel" as DiagramPlugin["type"],
  detect(text) {
    return /^\s*(threatmodel|stride)\b/i.test(text);
  },
  parse: parseThreatModel,
  render(text, config?: RenderConfig) {
    return renderThreatModel(text, config);
  },
};

export { parseThreatModel, ThreatModelParseError } from "./parser";
export {
  analyseThreatModel,
  strideForNode,
  isLogStore,
} from "./analysis";
export { layoutThreatModel, TM_CONST } from "./layout";
export { renderThreatModel, renderThreatModelLayout } from "./renderer";
export { STRIDE_NAMES } from "./types";
export type * from "./types";
