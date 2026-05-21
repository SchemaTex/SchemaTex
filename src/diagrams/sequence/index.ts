import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseSequence } from "./parser";
import { renderSequence } from "./renderer";

export const sequence: DiagramPlugin = {
  type: "sequence",
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("#") || t.startsWith("//")) continue;
      // `\b` after "sequence" rejects Mermaid's "sequenceDiagram" header.
      return /^sequence\b/i.test(t);
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
