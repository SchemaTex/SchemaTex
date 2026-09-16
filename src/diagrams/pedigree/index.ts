import type { DiagramPlugin, RenderConfig } from "../../core/types";
import type { SchematexDiagnostic } from "../../core/diagnostics";
import { firstContentLine } from "../../core/dsl-preprocess";
import { parsePedigree, PedigreeParseError } from "./parser";
import {
  findPedigreeCoupleCollisions,
  findPedigreeTopologyIssues,
  layoutPedigree,
} from "./layout";
import { renderPedigree } from "./renderer";

const PEDIGREE_LAYOUT_CONFIG = {
  nodeSpacingX: 80,
  nodeSpacingY: 100,
  nodeWidth: 40,
  nodeHeight: 40,
};

export const pedigree: DiagramPlugin = {
  type: "pedigree",

  detect(text: string): boolean {
    const firstLine = firstContentLine(text)?.toLowerCase() ?? "";
    return (
      firstLine === "pedigree" ||
      firstLine.startsWith("pedigree ") ||
      firstLine.startsWith("pedigree:")
    );
  },

  parse: parsePedigree,

  render(text: string, config?: RenderConfig): string {
    const ast = parsePedigree(text);
    const layout = layoutPedigree(ast, PEDIGREE_LAYOUT_CONFIG);
    const renderConfig: RenderConfig = {
      fontFamily: config?.fontFamily ?? "system-ui, -apple-system, sans-serif",
      fontSize: config?.fontSize ?? 12,
      theme: config?.theme ?? "default",
      padding: config?.padding ?? 20,
    };
    return renderPedigree(layout, renderConfig, ast);
  },

  lint(text: string): SchematexDiagnostic[] {
    try {
      const ast = parsePedigree(text);
      const layout = layoutPedigree(ast, PEDIGREE_LAYOUT_CONFIG);
      return [
        ...ast.individuals.filter(ind => ind.childType?.startsWith("donor-")).map(ind => ({
          severity: "warning" as const,
          code: "PEDIGREE_DONOR_LINK_UNSPECIFIED",
          message: `${ind.id}: donor-assisted birth is annotated; donor identity and genetic linkage are unspecified.`,
          hint: "An annotation does not identify the donor or establish genetic parentage.",
          fatal: false,
        })),
        ...findPedigreeCoupleCollisions(layout).map(({ edge, node }) => ({
          severity: "error" as const,
          code: "PEDIGREE_COUPLE_EDGE_NODE_COLLISION",
          message: `Couple edge ${edge.from} -- ${edge.to} intersects unrelated individual ${node.id}.`,
          hint: "Keep each couple adjacent or route the couple edge around unrelated individuals.",
          fatal: false,
        })),
        ...findPedigreeTopologyIssues(layout).map((issue) => ({
          severity: "error" as const,
          code: issue.code,
          message: issue.message,
          hint: "Keep every descent path connected to its family rail and terminating at the named child's top anchor.",
          fatal: false,
        })),
      ];
    } catch {
      return [];
    }
  },
};

export {
  parsePedigree,
  PedigreeParseError,
  layoutPedigree,
  findPedigreeCoupleCollisions,
  findPedigreeTopologyIssues,
  renderPedigree,
};
