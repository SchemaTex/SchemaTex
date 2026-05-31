import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseFaultTree } from "./parser";
import { renderFaultTree } from "./renderer";

export const faulttree: DiagramPlugin = {
  type: "faulttree" as DiagramPlugin["type"],
  detect(text) {
    return /^\s*(faulttree|fta)\b/i.test(text);
  },
  parse: parseFaultTree,
  render(text, config?: RenderConfig) {
    return renderFaultTree(text, config);
  },
};

export { parseFaultTree, FaultTreeParseError } from "./parser";
export { analyseFaultTree } from "./analysis";
export { layoutFaultTree, FAULTTREE_CONST } from "./layout";
export { renderFaultTree, renderFaultTreeLayout } from "./renderer";
export type * from "./types";
