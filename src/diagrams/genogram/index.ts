import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { firstContentLine } from "../../core/dsl-preprocess";
import { parseGenogram } from "./parser";
import { layoutGenogram } from "./layout";
import { renderGenogram } from "./renderer";

export { parseGenogram, ParseError } from "./parser";
export { layoutGenogram } from "./layout";
export { renderGenogram } from "./renderer";
export { renderIndividualSymbol, getRequiredDefs } from "./symbols";

export const genogram: DiagramPlugin = {
  type: "genogram",
  capabilities: { scene: true, editablePosition: true },

  detect(text: string): boolean {
    const firstLine = firstContentLine(text)?.toLowerCase() ?? "";
    return firstLine === "genogram" || firstLine.startsWith("genogram ");
  },

  parse: parseGenogram,

  render(text: string, config?: RenderConfig): string {
    const ast = parseGenogram(text);
    const layoutConfig = {
      nodeSpacingX: 80,
      nodeSpacingY: 100,
      nodeWidth: 40,
      nodeHeight: 40,
    };
    const layout = layoutGenogram(ast, layoutConfig, config?.__pins);
    const renderConfig: RenderConfig = {
      fontFamily: config?.fontFamily ?? "system-ui, -apple-system, sans-serif",
      fontSize: config?.fontSize ?? 12,
      theme: config?.theme ?? "default",
      padding: config?.padding ?? 20,
      __scene: config?.__scene,
      __pins: config?.__pins,
    };
    return renderGenogram(layout, renderConfig, ast);
  },
};
