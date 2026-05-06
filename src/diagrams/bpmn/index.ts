import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseBpmn } from "./parser";
import { renderBpmn } from "./renderer";

export const bpmn: DiagramPlugin = {
  type: "bpmn",
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (t.length === 0) continue;
      if (t.startsWith("//") || t.startsWith("#") || t.startsWith("%%")) continue;
      const first = t.split(/\s+/)[0]?.toLowerCase() ?? "";
      return first === "bpmn";
    }
    return false;
  },
  parse: parseBpmn,
  render(text: string, config?: RenderConfig): string {
    return renderBpmn(text, config);
  },
};

export { parseBpmn, BpmnParseError } from "./parser";
export { renderBpmn, renderBpmnLayout } from "./renderer";
export { layoutBpmn, BPMN_CONST } from "./layout";
