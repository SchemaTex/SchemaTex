import type { DiagramPlugin, DiagramAST, LayoutResult } from "../../core/types";
import { parsePhylo, PhyloParseError } from "./parser";
import { layoutPhylo } from "./layout";
import type { PhyloLayoutResult } from "./layout";
import { renderPhylo } from "./renderer";

let _lastLayout: PhyloLayoutResult | null = null;

export const phylo: DiagramPlugin = {
  type: "phylo",

  detect(text: string): boolean {
    const firstLine = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return firstLine === "phylo" || firstLine.startsWith("phylo ");
  },

  parse(text: string): DiagramAST {
    parsePhylo(text);
    return { type: "phylo", individuals: [], relationships: [] };
  },

  layout(_ast: DiagramAST, _config) {
    return { width: 0, height: 0, nodes: [], edges: [] };
  },

  render(_layout: LayoutResult, _config) {
    if (_lastLayout) {
      const svg = renderPhylo(_lastLayout);
      _lastLayout = null;
      return svg;
    }
    return "";
  },
};

export function renderPhyloDiagram(text: string): string {
  const ast = parsePhylo(text);
  const layout = layoutPhylo(ast);
  return renderPhylo(layout);
}

export { parsePhylo, PhyloParseError, layoutPhylo, renderPhylo };
