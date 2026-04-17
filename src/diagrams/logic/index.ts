import type { DiagramPlugin } from "../../core/types";
import { parseLogic } from "./parser";
import { renderLogic } from "./renderer";

export const logic: DiagramPlugin = {
  type: "logic",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("logic");
  },
  render(text: string): string {
    const ast = parseLogic(text);
    return renderLogic(ast);
  },
};

export { parseLogic } from "./parser";
export { renderLogic } from "./renderer";
export { layoutLogic } from "./layout";
