import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseStateDiagram } from "./parser";
import { renderStateDiagram } from "./renderer";

export const state: DiagramPlugin = {
  type: "state" as DiagramPlugin["type"],
  capabilities: { scene: true, editablePosition: true },
  detect(text) {
    return /^\s*(?:state\b|stateDiagram(?:-v2)?\b)/i.test(text);
  },
  parse: parseStateDiagram,
  render(text, config?: RenderConfig) {
    const ast = parseStateDiagram(text);
    return renderStateDiagram(ast, config);
  },
};

export { parseStateDiagram, StateParseError } from "./parser";
export { renderStateDiagram, renderState } from "./renderer";
export { layoutStateDiagram } from "./layout";
export type * from "./types";
