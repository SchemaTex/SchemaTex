import type { DiagramPlugin } from "../../core/types";
import { parsePhylo, PhyloParseError } from "./parser";
import { layoutPhylo } from "./layout";
import type { PhyloLayoutResult } from "./layout";
import { renderPhylo } from "./renderer";

export const phylo: DiagramPlugin = {
  type: "phylo",

  detect(text: string): boolean {
    const firstLine = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return firstLine === "phylo" || firstLine.startsWith("phylo ");
  },

  render(text: string): string {
    const ast = parsePhylo(text);
    const layout = layoutPhylo(ast);
    return renderPhylo(layout);
  },
};

export { parsePhylo, PhyloParseError, layoutPhylo, renderPhylo };
export type { PhyloLayoutResult };
