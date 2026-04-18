import type { DiagramPlugin } from "../../core/types";
import { parseSLDDSL } from "./parser";
import { renderSLD } from "./renderer";

export const sld: DiagramPlugin = {
  type: "sld",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("sld");
  },
  render(text: string, config): string {
    const ast = parseSLDDSL(text);
    return renderSLD(ast, config);
  },
};

export { parseSLDDSL } from "./parser";
export { renderSLD } from "./renderer";
export { layoutSLD } from "./layout";
