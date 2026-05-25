import type { DiagramPlugin } from "../../core/types";
import { firstContentLine } from "../../core/dsl-preprocess";
import { parseSLDDSL } from "./parser";
import { renderSLD } from "./renderer";
import { lintSLD } from "./lint";

export const sld: DiagramPlugin = {
  type: "sld",
  detect(text: string): boolean {
    const first = firstContentLine(text)?.toLowerCase() ?? "";
    return first.startsWith("sld");
  },
  parse: parseSLDDSL,
  lint: lintSLD,

  render(text: string, config): string {
    const ast = parseSLDDSL(text);
    return renderSLD(ast, config);
  },
};

export { lintSLD, lintSLDAst } from "./lint";
export { parseSLDDSL } from "./parser";
export { renderSLD } from "./renderer";
export { layoutSLD } from "./layout";
