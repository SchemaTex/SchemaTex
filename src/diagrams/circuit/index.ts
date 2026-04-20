import type { DiagramPlugin } from "../../core/types";
import { parseCircuit } from "./parser";
import { renderCircuit } from "./renderer";

export const circuit: DiagramPlugin = {
  type: "circuit",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("circuit");
  },
  parse: parseCircuit,

  render(text: string, config): string {
    const ast = parseCircuit(text);
    return renderCircuit(ast, config);
  },
};

export { parseCircuit } from "./parser";
export { parseNetlist } from "./netlist";
export { renderCircuit } from "./renderer";
export { layoutCircuit } from "./layout";
export { layoutCircuitNetlist } from "./autolayout";
