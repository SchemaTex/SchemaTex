import { firstContentLine } from "../../core/dsl-preprocess";
import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseTiming } from "./parser";
import { renderTiming } from "./renderer";

export const timing: DiagramPlugin = {
  type: "timing",
  capabilities: { scene: true, editablePosition: true },
  detect(text: string): boolean {
    const first = firstContentLine(text)?.toLowerCase() ?? "";
    return first.startsWith("timing");
  },
  parse: parseTiming,

  render(text: string, config?: RenderConfig): string {
    const ast = parseTiming(text);
    return renderTiming(ast, config);
  },
};

export { parseTiming } from "./parser";
export { renderTiming } from "./renderer";
