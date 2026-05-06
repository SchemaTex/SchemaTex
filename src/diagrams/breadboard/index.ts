import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseBreadboard } from "./parser";
import { renderBreadboard } from "./renderer";

export const breadboard: DiagramPlugin = {
  type: "breadboard",
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (t.length === 0) continue;
      if (t.startsWith("//") || t.startsWith("#")) continue;
      const first = t.split(/\s+/)[0]?.toLowerCase() ?? "";
      return first === "breadboard";
    }
    return false;
  },
  parse: parseBreadboard,
  render(text: string, config?: RenderConfig): string {
    return renderBreadboard(text, config);
  },
};

export { parseBreadboard, BreadboardParseError } from "./parser";
export { renderBreadboard, renderBreadboardLayout } from "./renderer";
export { layoutBreadboard, BB_CONST } from "./layout";
export { partSpec, PART_CATALOG, HOLE_PITCH } from "./parts";
