import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseMindmap } from "./parser";
import { lintMindmap } from "./lint";
import { renderMindmap } from "./renderer";

export const mindmap: DiagramPlugin = {
  type: "mindmap",
  isDirective: line => /^\s*%%\s*(?:style|theme|maxLabelWidth)\s*:/i.test(line),
  capabilities: { scene: true },
  detect(text: string): boolean {
    const lines = text.trim().split("\n");
    const first = lines[0]?.trim().toLowerCase() ?? "";
    if (first.startsWith("mindmap")) return true;
    // Headerless markdown form. A leading `# ` alone is not enough: `#` is also
    // the comment marker most other grammars accept, so "# Crude oil train"
    // above a P&ID would be claimed here. Require the *whole* document to match
    // `document = directive* node*` from the grammar above — every content line
    // a heading or a bullet — which no commented diagram satisfies.
    let sawRoot = false;
    for (const ln of lines) {
      const t = ln.trim();
      if (!t || t.startsWith("%%")) continue;
      if (!sawRoot) {
        if (!/^#\s+\S/.test(t)) return false;
        sawRoot = true;
        continue;
      }
      if (!/^#+\s+\S/.test(t) && !/^[-*+]\s+\S/.test(t)) return false;
    }
    return sawRoot;
  },
  parse: parseMindmap,
  lint: lintMindmap,

  render(text: string, config?: RenderConfig): string {
    return renderMindmap(text, {
      theme: config?.theme,
      fontFamily: config?.fontFamily,
      scene: config?.__scene,
    });
  },
};

export { parseMindmap } from "./parser";
export { lintMindmap } from "./lint";
export { layoutMindmap } from "./layout";
export { renderMindmap, renderMindmapAST } from "./renderer";
export { modeOf, type ExtendedMindmapMode } from "./modes";
export { layoutFuturesWheel, RING_GAP, wheelCenter, maxOrder } from "./futureswheel";
