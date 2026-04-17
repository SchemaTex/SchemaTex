import type { DiagramPlugin } from "../../core/types";
import { parsePedigree, PedigreeParseError } from "./parser";
import { layoutPedigree } from "./layout";
import { renderPedigree } from "./renderer";

let _lastAst: ReturnType<typeof parsePedigree> | null = null;

export const pedigree: DiagramPlugin = {
  type: "pedigree",

  detect(text: string): boolean {
    const firstLine = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return firstLine === "pedigree" || firstLine.startsWith("pedigree ");
  },

  parse(text: string) {
    const ast = parsePedigree(text);
    _lastAst = ast;
    return ast;
  },

  layout(ast, config) {
    return layoutPedigree(ast, config);
  },

  render(layout, config) {
    const svg = renderPedigree(layout, config, _lastAst ?? undefined);
    _lastAst = null;
    return svg;
  },
};

export { parsePedigree, PedigreeParseError, layoutPedigree, renderPedigree };
