import type { DiagramPlugin } from "../../core/types";
import { parseTiming } from "./parser";
import { renderTiming } from "./renderer";

export const timing: DiagramPlugin = {
  type: "timing",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("timing");
  },
  parse: parseTiming,

  render(text: string): string {
    const ast = parseTiming(text);
    return renderTiming(ast);
  },
};

export { parseTiming } from "./parser";
export { renderTiming } from "./renderer";
