import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseEventTree } from "./parser";
import { renderEventTree } from "./renderer";

export const eventtree: DiagramPlugin = {
  type: "eventtree" as DiagramPlugin["type"],
  detect(text) {
    return /^\s*(eventtree|eta)\b/i.test(text);
  },
  parse: parseEventTree,
  render(text, config?: RenderConfig) {
    return renderEventTree(text, config);
  },
};

export { parseEventTree, EventTreeParseError } from "./parser";
export { analyseEventTree } from "./analysis";
export { layoutEventTree, EVENTTREE_CONST } from "./layout";
export { renderEventTree, renderEventTreeLayout } from "./renderer";
export type * from "./types";
