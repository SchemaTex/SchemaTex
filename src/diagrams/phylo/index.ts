import type { DiagramPlugin } from "../../core/types";
import { parsePhylo, PhyloParseError } from "./parser";
import { layoutPhylo } from "./layout";
import type { PhyloLayoutResult } from "./layout";
import { renderPhylo } from "./renderer";

export const phylo: DiagramPlugin = {
  type: "phylo",

  detect(text: string): boolean {
    const firstLine = text.split("\n").map(line => line.trim())
      .find(line => line && !line.startsWith("#"))?.toLowerCase() ?? "";
    return firstLine === "phylo" || firstLine.startsWith("phylo ");
  },

  parse: parsePhylo,

  render(text: string): string {
    const ast = parsePhylo(text);
    const layout = layoutPhylo(ast);
    return renderPhylo(layout);
  },
};

export { parsePhylo, PhyloParseError, layoutPhylo, renderPhylo };
export type { PhyloLayoutResult };
