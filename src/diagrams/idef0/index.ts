import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseIdef0 } from "./parser";
import { renderIdef0 } from "./renderer";

export const idef0: DiagramPlugin = {
  type: "idef0" as DiagramPlugin["type"],
  detect: (t) => /^\s*idef0\b/i.test(t),
  parse: parseIdef0,
  render(text, config?: RenderConfig) {
    return renderIdef0(text, config);
  },
};

export { parseIdef0, Idef0ParseError } from "./parser";
export { analyseIdef0 } from "./analysis";
export { layoutIdef0, IDEF0_CONST } from "./layout";
export { renderIdef0, renderIdef0Layout } from "./renderer";
export type * from "./types";
