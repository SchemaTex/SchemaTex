import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseDecisionTree } from "./parser";
import { renderDecisionTree } from "./renderer";

export const decisiontree: DiagramPlugin = {
  type: "decisiontree" as DiagramPlugin["type"],
  detect(text) {
    return /^\s*decisiontree\b/i.test(text);
  },
  parse: parseDecisionTree,

  render(text, config?: RenderConfig) {
    const ast = parseDecisionTree(text);
    return renderDecisionTree(ast, config);
  },
};

export { parseDecisionTree, DTreeParseError } from "./parser";
export { renderDecisionTree } from "./renderer";
export { layoutDecisionTree } from "./layout";
export type * from "./types";
