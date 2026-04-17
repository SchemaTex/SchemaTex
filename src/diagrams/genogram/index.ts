import type { DiagramPlugin, RenderConfig } from "../../core/types";
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

  render(text: string, config?: RenderConfig): string {
    const ast = parseGenogram(text);
    const layoutConfig = {
      nodeSpacingX: 80,
      nodeSpacingY: 100,
      nodeWidth: 40,
      nodeHeight: 40,
    };
    const layout = layoutGenogram(ast, layoutConfig);
    const renderConfig: RenderConfig = {
      fontFamily: config?.fontFamily ?? "system-ui, -apple-system, sans-serif",
      fontSize: config?.fontSize ?? 12,
      theme: config?.theme ?? "default",
      padding: config?.padding ?? 20,
    };
    return renderGenogram(layout, renderConfig, ast);
  },
};
