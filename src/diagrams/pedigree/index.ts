import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parsePedigree, PedigreeParseError } from "./parser";
import { layoutPedigree } from "./layout";
import { renderPedigree } from "./renderer";

export const pedigree: DiagramPlugin = {
  type: "pedigree",

  detect(text: string): boolean {
    const firstLine = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return firstLine === "pedigree" || firstLine.startsWith("pedigree ");
  },

  render(text: string, config?: RenderConfig): string {
    const ast = parsePedigree(text);
    const layoutConfig = {
      nodeSpacingX: 80,
      nodeSpacingY: 100,
      nodeWidth: 40,
      nodeHeight: 40,
    };
    const layout = layoutPedigree(ast, layoutConfig);
    const renderConfig: RenderConfig = {
      fontFamily: config?.fontFamily ?? "system-ui, -apple-system, sans-serif",
      fontSize: config?.fontSize ?? 12,
      theme: config?.theme ?? "default",
      padding: config?.padding ?? 20,
    };
    return renderPedigree(layout, renderConfig, ast);
  },
};

export { parsePedigree, PedigreeParseError, layoutPedigree, renderPedigree };
