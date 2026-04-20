import type { DiagramPlugin } from "../../core/types";
import { parseSociogram } from "./parser";
import { layoutSociogram } from "./layout";
import { renderSociogram } from "./renderer";

export const sociogram: DiagramPlugin = {
  type: "sociogram",

  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("sociogram");
  },

  parse: parseSociogram,

  render(text: string, config): string {
    const ast = parseSociogram(text);
    const layout = layoutSociogram(ast);
    return renderSociogram(layout, { theme: config?.theme });
  },
};

export { parseSociogram } from "./parser";
export { layoutSociogram } from "./layout";
export { renderSociogram } from "./renderer";
