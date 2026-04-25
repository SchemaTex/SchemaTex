import type { DiagramPlugin, RenderConfig } from "../../core/types";
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

  parse: parseEcomap,

  render(text: string, config?: RenderConfig): string {
    const ast = parseEcomap(text);
    const layoutConfig = {
      nodeSpacingX: 80,
      nodeSpacingY: 100,
      nodeWidth: 40,
      nodeHeight: 40,
    };
    const layout = layoutEcomap(ast, layoutConfig);
    const renderConfig: RenderConfig = {
      fontFamily: config?.fontFamily ?? "system-ui, -apple-system, sans-serif",
      fontSize: config?.fontSize ?? 12,
      theme: config?.theme ?? "default",
      padding: config?.padding ?? 20,
    };
    return renderEcomap(layout, renderConfig, ast);
  },
};
