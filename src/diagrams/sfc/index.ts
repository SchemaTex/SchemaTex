import type { DiagramPlugin } from "../../core/types";
import { parseSfc } from "./parser";
import { renderSfc } from "./renderer";

export const sfc: DiagramPlugin = {
  type: "sfc",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("sfc");
  },
  parse: parseSfc,
  render(text: string): string {
    return renderSfc(text);
  },
};

export { parseSfc } from "./parser";
export { renderSfc, renderSfcLayout } from "./renderer";
export { layoutSfc } from "./layout";
