import type { DiagramPlugin } from "../../core/types";
import { parseGenogram } from "./parser";
import { layoutGenogram } from "./layout";
import { renderGenogram } from "./renderer";

export { parseGenogram, ParseError } from "./parser";
export { layoutGenogram } from "./layout";
export { renderGenogram } from "./renderer";
export { renderIndividualSymbol, getRequiredDefs } from "./symbols";

export const genogram: DiagramPlugin = {
  type: "genogram",

  detect(text: string): boolean {
    const firstLine = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return firstLine === "genogram" || firstLine.startsWith("genogram ");
  },

  parse: parseGenogram,
  layout: layoutGenogram,
  render: renderGenogram,
};
