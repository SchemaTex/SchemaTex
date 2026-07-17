import type { DiagramPlugin } from "../../core/types";
import { parseCircuit } from "./parser";
import { lintCircuit } from "./lint";
import { renderCircuit } from "./renderer";

export const circuit: DiagramPlugin = {
  type: "circuit",
  capabilities: { scene: true, editablePosition: true },
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("circuit");
  },
  parse: parseCircuit,
  lint: lintCircuit,

  render(text: string, config): string {
    const ast = parseCircuit(text);
    return renderCircuit(ast, config);
  },
};

export { parseCircuit } from "./parser";
export { lintCircuit } from "./lint";
export { parseNetlist } from "./netlist";
export { renderCircuit } from "./renderer";
export { layoutCircuit } from "./layout";
export { layoutCircuitNetlist } from "./autolayout";
