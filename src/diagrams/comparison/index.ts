import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseComparison } from "./parser";
import { renderComparison } from "./renderer";

export const comparison: DiagramPlugin = {
  type: "comparison" as DiagramPlugin["type"],
  detect(text) {
    return /^\s*(comparison|compare|vs|tchart|t-chart|pugh|decision-matrix|decisionmatrix)\b/i.test(text);
  },
  parse: parseComparison,
  render(text, config?: RenderConfig) {
    return renderComparison(text, config);
  },
};

export { parseComparison, ComparisonParseError } from "./parser";
export { layoutComparison, COMPARISON_CONST, measureText, wrapToWidth } from "./layout";
export { computeDecision, decisionCaption } from "./compute";
export { renderComparison, renderComparisonLayout } from "./renderer";
export type * from "./types";
