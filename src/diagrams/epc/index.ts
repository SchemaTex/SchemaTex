import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseEpc } from "./parser";
import { renderEpc } from "./renderer";

export const epc: DiagramPlugin = {
  type: "epc" as DiagramPlugin["type"],
  detect: (t) => /^\s*epc\b/i.test(t),
  parse: parseEpc,
  render: (text: string, config?: RenderConfig) => renderEpc(text, config),
};

export { parseEpc, EpcParseError, analyseEpc } from "./parser";
export { layoutEpc, EPC_CONST } from "./layout";
export { renderEpc, renderEpcLayout } from "./renderer";
export type * from "./types";
