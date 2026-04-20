import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseMindmap } from "./parser";
import { renderMindmap } from "./renderer";

export const mindmap: DiagramPlugin = {
  type: "mindmap",
  detect(text: string): boolean {
    const lines = text.trim().split("\n");
    const first = lines[0]?.trim().toLowerCase() ?? "";
    if (first.startsWith("mindmap")) return true;
    // Detect markdown-heading DSL: first non-directive line starts with `# `
    for (const ln of lines) {
      const t = ln.trim();
      if (!t) continue;
      if (t.startsWith("%%")) continue;
      return /^#\s+\S/.test(t);
    }
    return false;
  },
  parse: parseMindmap,

  render(text: string, config?: RenderConfig): string {
    return renderMindmap(text, {
      theme: config?.theme,
      fontFamily: config?.fontFamily,
    });
  },
};

export { parseMindmap } from "./parser";
export { layoutMindmap } from "./layout";
export { renderMindmap, renderMindmapAST } from "./renderer";
