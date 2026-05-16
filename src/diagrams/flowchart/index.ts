import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { firstContentLine } from "../../core/dsl-preprocess";
import { parseFlowchart } from "./parser";
import { renderFlowchart } from "./renderer";

export const flowchart: DiagramPlugin = {
  type: "flowchart",
  detect(text: string): boolean {
    const first = firstContentLine(text)?.split(/\s+/)[0]?.toLowerCase() ?? "";
    return first === "flowchart" || first === "graph";
  },
  parse: parseFlowchart,

  render(text: string, config?: RenderConfig): string {
    const themeName = (config?.theme ?? "default") as "default" | "monochrome" | "dark";
    return renderFlowchart(text, themeName);
  },
};

export { parseFlowchart } from "./parser";
export { renderFlowchart, renderFlowchartAST } from "./renderer";
export { layoutFlowchart, FC_CONST } from "./layout";
