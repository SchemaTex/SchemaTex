import { firstContentLine } from "../../core/dsl-preprocess";
import type { DiagramPlugin } from "../../core/types";
import { parseEntityDSL } from "./parser";
import { renderEntity } from "./renderer";

export const entity: DiagramPlugin = {
  type: "entity",
  detect(text: string): boolean {
    const first = firstContentLine(text)?.toLowerCase() ?? "";
    return first.startsWith("entity-structure");
  },
  parse: parseEntityDSL,

  render(text: string, config): string {
    const ast = parseEntityDSL(text);
    return renderEntity(ast, config);
  },
};

export { parseEntityDSL } from "./parser";
export { renderEntity } from "./renderer";
export { layoutEntity } from "./layout";
