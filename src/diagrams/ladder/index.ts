import type { DiagramPlugin } from "../../core/types";
import { firstContentLine } from "../../core/dsl-preprocess";
import { parseLadderDSL } from "./parser";
import { renderLadder } from "./renderer";

export const ladder: DiagramPlugin = {
  type: "ladder",
  detect(text: string): boolean {
    const first = firstContentLine(text)?.toLowerCase() ?? "";
    return first.startsWith("ladder");
  },
  parse: parseLadderDSL,

  render(text: string, config): string {
    const ast = parseLadderDSL(text);
    return renderLadder(ast, config);
  },
};

export { parseLadderDSL } from "./parser";
export { renderLadder } from "./renderer";
export { layoutLadder } from "./layout";
