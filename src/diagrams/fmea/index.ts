import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseFmea } from "./parser";
import { renderFmea } from "./renderer";

export const fmea: DiagramPlugin = {
  type: "fmea" as DiagramPlugin["type"],
  detect: (t: string) => /^\s*fmea\b/i.test(t),
  parse: parseFmea,
  render(text: string, config?: RenderConfig) {
    return renderFmea(text, config);
  },
};

export { parseFmea, FmeaParseError } from "./parser";
export { analyseFmea, actionPriority, rpn, apObligation } from "./analysis";
export { layoutFmea, wrapText, FMEA_CONST } from "./layout";
export { renderFmea, renderFmeaLayout } from "./renderer";
export type * from "./types";
