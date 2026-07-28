import type { DiagramPlugin, RenderConfig } from "../../core/types";
import type { SchematexDiagnostic } from "../../core/diagnostics";
import { firstContentLine } from "../../core/dsl-preprocess";
import { parsePedigree, PedigreeParseError } from "./parser";
import {
  findPedigreeCoupleCollisions,
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
      return findPedigreeCoupleCollisions(layout).map(({ edge, node }) => ({
        severity: "error",
        code: "PEDIGREE_COUPLE_EDGE_NODE_COLLISION",
        message: `Couple edge ${edge.from} -- ${edge.to} intersects unrelated individual ${node.id}.`,
        hint: "Keep each couple adjacent or route the couple edge around unrelated individuals.",
        fatal: false,
      }));
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
  renderPedigree,
};
