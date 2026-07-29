import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseStateDiagram } from "./parser";
import { renderStateDiagram } from "./renderer";
import { lintStateDiagram } from "./lint";

export const state: DiagramPlugin = {
  type: "state" as DiagramPlugin["type"],
  capabilities: { scene: true, editablePosition: true },
  detect(text) {
    return /^\s*(?:state\b|stateDiagram(?:-v2)?\b)/i.test(text);
  },
  parse: parseStateDiagram,
  lint: lintStateDiagram,
  render(text, config?: RenderConfig) {
    const ast = parseStateDiagram(text);
    return renderStateDiagram(ast, config);
  },
};

export { parseStateDiagram, StateParseError } from "./parser";
export { renderStateDiagram, renderState } from "./renderer";
export { layoutStateDiagram } from "./layout";
export { lintStateDiagram } from "./lint";
export type * from "./types";
export {
  STATE_GENERATION_CAPABILITIES,
  getStateGenerationCapabilities,
  type StateGenerationCapabilities,
} from "./capabilities";
