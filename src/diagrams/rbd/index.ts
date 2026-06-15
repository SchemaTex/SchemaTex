import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseRbd } from "./parser";
import { renderRbd } from "./renderer";

export const rbd: DiagramPlugin = {
  type: "rbd" as DiagramPlugin["type"],
  detect(text) {
    return /^\s*(rbd|reliability(?:blockdiagram)?|reliability-block-diagram)\b/i.test(text);
  },
  parse: parseRbd,
  render(text, config?: RenderConfig) {
    return renderRbd(text, config);
  },
};

export { parseRbd, RbdParseError } from "./parser";
export { analyseRbd } from "./analysis";
export { layoutRbd, RBD_CONST, blockWidth } from "./layout";
export { renderRbd, renderRbdLayout } from "./renderer";
export type * from "./types";
