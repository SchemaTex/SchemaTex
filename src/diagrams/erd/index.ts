import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseErd } from "./parser";
import { renderErd } from "./renderer";

export const erd: DiagramPlugin = {
  type: "erd",
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (t.length === 0) continue;
      if (t.startsWith("//") || t.startsWith("#")) continue;
      const first = t.split(/\s+/)[0]?.toLowerCase() ?? "";
      return first === "erd";
    }
    return false;
  },
  parse: parseErd,
  render(text: string, config?: RenderConfig): string {
    return renderErd(text, config);
  },
};

export { parseErd } from "./parser";
export { renderErd, renderErdAst } from "./renderer";
export { layoutErd, ERD_CONST } from "./layout";
