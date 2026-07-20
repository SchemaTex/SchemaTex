import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseUmlClass } from "./parser";
import { renderUmlClass } from "./renderer";

export const umlclass: DiagramPlugin = {
  type: "umlclass",
  capabilities: { scene: true, editablePosition: true },
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("#") || t.startsWith("//") || t.startsWith("%%")) continue;
      // Accept the native `umlclass` header plus `class-diagram` and Mermaid's `classDiagram`.
      return /^(umlclass|class-diagram|classDiagram)\b/i.test(t);
    }
    return false;
  },
  parse: parseUmlClass,
  render(text: string, config?: RenderConfig): string {
    return renderUmlClass(text, config);
  },
};

export { parseUmlClass, UmlClassParseError } from "./parser";
export { renderUmlClass, renderUmlClassLayout } from "./renderer";
export { layoutUmlClass, UMLCLASS_CONST } from "./layout";
export type * from "./types";
