import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { renderFlowchart } from "./renderer";

export const flowchart: DiagramPlugin = {
  type: "flowchart",
  detect(text: string): boolean {
    // Scan the first non-blank, non-comment line.
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (t.length === 0) continue;
      if (t.startsWith("%%")) continue;
      const first = t.split(/\s+/)[0]?.toLowerCase() ?? "";
      return first === "flowchart" || first === "graph";
    }
    return false;
  },
  render(text: string, config?: RenderConfig): string {
    const themeName = (config?.theme ?? "default") as "default" | "monochrome" | "dark";
    return renderFlowchart(text, themeName);
  },
};

export { parseFlowchart } from "./parser";
export { renderFlowchart, renderFlowchartAST } from "./renderer";
export { layoutFlowchart, FC_CONST } from "./layout";
