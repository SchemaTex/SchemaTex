import type { DiagramPlugin } from "../../core/types";
import { parseEntityDSL } from "./parser";
import { renderEntity } from "./renderer";

export const entity: DiagramPlugin = {
  type: "entity",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
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
