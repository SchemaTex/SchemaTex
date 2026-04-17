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

  parse(text: string) {
    return parseSociogram(text) as never;
  },

  layout(_ast) {
    return null as never;
  },

  render(_layout) {
    return "";
  },
};

export function renderSociogramDiagram(text: string): string {
  const ast = parseSociogram(text);
  const layout = layoutSociogram(ast);
  return renderSociogram(layout);
}
