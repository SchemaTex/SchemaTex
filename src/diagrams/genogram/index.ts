import type { DiagramPlugin, DiagramAST, LayoutResult, RenderConfig } from "../../core/types";
import { parseGenogram } from "./parser";
import { layoutGenogram } from "./layout";
import { renderGenogram } from "./renderer";

export { parseGenogram, ParseError } from "./parser";
export { layoutGenogram } from "./layout";
export { renderGenogram } from "./renderer";
export { renderIndividualSymbol, getRequiredDefs } from "./symbols";

let _lastAst: DiagramAST | undefined;

export const genogram: DiagramPlugin = {
  type: "genogram",

  detect(text: string): boolean {
    const firstLine = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return firstLine === "genogram" || firstLine.startsWith("genogram ");
  },

  parse(text: string): DiagramAST {
    const ast = parseGenogram(text);
    _lastAst = ast;
    return ast;
  },

  layout: layoutGenogram,

  render(layout: LayoutResult, config: RenderConfig): string {
    return renderGenogram(layout, config, _lastAst);
  },
};
