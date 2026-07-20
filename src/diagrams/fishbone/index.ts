import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { firstContentLine } from "../../core/dsl-preprocess";
import { parseFishboneDSL } from "./parser";
import { renderFishbone } from "./renderer";

export const fishbone: DiagramPlugin = {
  type: "fishbone",
  capabilities: { scene: true },
  detect(text: string): boolean {
    const first = firstContentLine(text)?.toLowerCase() ?? "";
    return first.startsWith("fishbone");
  },
  parse: parseFishboneDSL,
  render(text: string, config?: RenderConfig): string {
    return renderFishbone(text, config);
  },
};

export { parseFishboneDSL } from "./parser";
export { renderFishbone, renderFishboneAST } from "./renderer";
export { layoutFishbone, FB_CONST } from "./layout";
