import type { DiagramPlugin } from "../../core/types";
import { renderMatrix } from "./renderer";

export const matrix: DiagramPlugin = {
  type: "matrix",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("matrix");
  },
  render(text: string): string {
    return renderMatrix(text);
  },
};

export { parseMatrix } from "./parser";
export { renderMatrix, renderMatrixAST } from "./renderer";
export { layoutMatrix } from "./layout";
