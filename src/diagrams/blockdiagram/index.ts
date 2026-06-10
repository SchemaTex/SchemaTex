import type { DiagramPlugin } from "../../core/types";
import { parseBlockDiagram } from "./parser";
import { renderBlockDiagram } from "./renderer";

export const blockdiagram: DiagramPlugin = {
  type: "blockdiagram",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("blockdiagram");
  },
  parse: parseBlockDiagram,

  render(text: string, config?): string {
    const ast = parseBlockDiagram(text);
    return renderBlockDiagram(ast, config);
  },
};

export { parseBlockDiagram } from "./parser";
export { renderBlockDiagram } from "./renderer";
export { layoutBlockDiagram } from "./layout";
