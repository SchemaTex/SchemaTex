import type { DiagramPlugin } from "../../core/types";
import { parseLadderDSL } from "./parser";
import { renderLadder } from "./renderer";

export const ladder: DiagramPlugin = {
  type: "ladder",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
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
