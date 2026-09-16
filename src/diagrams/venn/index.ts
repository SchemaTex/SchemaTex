import { firstContentLine } from "../../core/dsl-preprocess";
import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseVennDSL } from "./parser";
import { renderVenn } from "./renderer";

export const venn: DiagramPlugin = {
  type: "venn",
  detect(text: string): boolean {
    const first = firstContentLine(text)?.toLowerCase() ?? "";
    return first.startsWith("venn");
  },
  parse: parseVennDSL,
  render(text: string, config?: RenderConfig): string {
    return renderVenn(text, config);
  },
};

export { parseVennDSL, VennParseError } from "./parser";
export { renderVenn, renderVennAST, renderVennLayout } from "./renderer";
export { layoutVenn } from "./layout";
