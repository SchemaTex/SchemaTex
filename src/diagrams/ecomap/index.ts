import type { DiagramPlugin } from "../../core/types";
import { parseEcomap } from "./parser";
import { layoutEcomap } from "./layout";
import { renderEcomap } from "./renderer";

export { parseEcomap, EcomapParseError } from "./parser";
export { layoutEcomap } from "./layout";
export { renderEcomap } from "./renderer";

export const ecomap: DiagramPlugin = {
  type: "ecomap",

  detect(text: string): boolean {
    const firstLine = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return firstLine === "ecomap" || firstLine.startsWith("ecomap ");
  },

  parse(text: string) {
    return parseEcomap(text);
  },

  layout(ast, config) {
    return layoutEcomap(ast, config);
  },

  render(layout, config) {
    return renderEcomap(layout, config);
  },
};
