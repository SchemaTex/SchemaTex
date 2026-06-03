import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseWelding } from "./parser";
import { renderWelding } from "./renderer";

export const welding: DiagramPlugin = {
  type: "welding" as DiagramPlugin["type"],
  detect: (t: string) => /^\s*welding\b/i.test(t),
  parse: parseWelding,
  render(text: string, config?: RenderConfig) {
    return renderWelding(text, config);
  },
};

export { parseWelding } from "./parser";
export { layoutWelding } from "./layout";
export { renderWelding, renderWeldingAST } from "./renderer";
export { weldGlyph, contourGlyph } from "./symbols";
export { validateWelding, WELD_TYPE_NAMES } from "./types";
export type * from "./types";
