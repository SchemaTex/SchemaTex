import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseCausalLoop } from "./parser";
import { renderCausalLoop } from "./renderer";

export const causalloop: DiagramPlugin = {
  type: "causalloop" as DiagramPlugin["type"],
  detect: (t) => /^\s*(causalloop|cld)\b/i.test(t),
  parse: parseCausalLoop,
  render: (text, config?: RenderConfig) => renderCausalLoop(text, config),
};

export { parseCausalLoop, CausalLoopParseError } from "./parser";
export { analyseCausalLoop } from "./analysis";
export { layoutCausalLoop, CAUSALLOOP_CONST } from "./layout";
export { renderCausalLoop, renderCausalLoopLayout } from "./renderer";
export type * from "./types";
