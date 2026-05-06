import type { DiagramPlugin } from "../../core/types";
import { parseFbd } from "./parser";
import { renderFbd } from "./renderer";

export const fbd: DiagramPlugin = {
  type: "fbd",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("fbd");
  },
  parse: parseFbd,
  render(text: string): string {
    return renderFbd(text);
  },
};

export { parseFbd } from "./parser";
export { renderFbd, renderFbdLayout } from "./renderer";
export { layoutFbd } from "./layout";
