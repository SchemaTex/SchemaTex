import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseSequence } from "./parser";
import { renderSequence } from "./renderer";

export const sequence: DiagramPlugin = {
  type: "sequence",
  capabilities: { scene: true, editablePosition: true },
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("#") || t.startsWith("//")) continue;
      // Accept both the native `sequence` header and Mermaid's `sequenceDiagram`.
      return /^sequence(?:diagram)?\b/i.test(t);
    }
    return false;
  },
  parse: parseSequence,
  render(text: string, config?: RenderConfig): string {
    return renderSequence(text, config);
  },
};

export { parseSequence, SequenceParseError } from "./parser";
export { renderSequence, renderSequenceLayout } from "./renderer";
export { layoutSequence, SEQ_CONST } from "./layout";
export type * from "./types";
