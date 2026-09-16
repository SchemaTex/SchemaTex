import { firstContentLine } from "../../core/dsl-preprocess";
import type { DiagramPlugin } from "../../core/types";
import { parseLogic } from "./parser";
import { renderLogic } from "./renderer";
import { lintLogic } from "./lint";

export const logic: DiagramPlugin = {
  type: "logic",
  detect(text: string): boolean {
    const first = firstContentLine(text)?.toLowerCase() ?? "";
    return first.startsWith("logic");
  },
  parse: parseLogic,
  lint: lintLogic,

  render(text: string, config): string {
    const ast = parseLogic(text);
    return renderLogic(ast, config);
  },
};

export { parseLogic } from "./parser";
export { renderLogic } from "./renderer";
export { layoutLogic } from "./layout";
export { lintLogic, lintLogicAst } from "./lint";
