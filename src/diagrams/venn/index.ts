import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { renderVenn } from "./renderer";

export const venn: DiagramPlugin = {
  type: "venn",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("venn");
  },
  render(text: string, config?: RenderConfig): string {
    return renderVenn(text, { theme: config?.theme });
  },
};

export { parseVennDSL, VennParseError } from "./parser";
export { renderVenn, renderVennAST, renderVennLayout } from "./renderer";
export { layoutVenn } from "./layout";
