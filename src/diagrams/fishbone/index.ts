import type { DiagramPlugin } from "../../core/types";
import { renderFishbone } from "./renderer";

export const fishbone: DiagramPlugin = {
  type: "fishbone",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("fishbone");
  },
  render(text: string): string {
    return renderFishbone(text);
  },
};

export { parseFishboneDSL } from "./parser";
export { renderFishbone, renderFishboneAST } from "./renderer";
export { layoutFishbone, FB_CONST } from "./layout";
