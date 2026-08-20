import type { DiagramPlugin } from "../../core/types";
import type { SchematexDiagnostic } from "../../core/diagnostics";
import { parseBlockDiagram } from "./parser";
import { renderBlockDiagram } from "./renderer";

export const blockdiagram: DiagramPlugin = {
  type: "blockdiagram",
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("blockdiagram");
  },
  parse: parseBlockDiagram,
  lint(text: string): SchematexDiagnostic[] {
    try {
      return parseBlockDiagram(text).warnings ?? [];
    } catch {
      return [];
    }
  },

  render(text: string, config?): string {
    const ast = parseBlockDiagram(text);
    return renderBlockDiagram(ast, config);
  },
};

export { parseBlockDiagram } from "./parser";
export { renderBlockDiagram } from "./renderer";
export {
  findBlockDiagramCollisions,
  layoutBlockDiagram,
} from "./layout";
export {
  BLOCKDIAGRAM_GENERATION_CAPABILITIES,
  getBlockDiagramGenerationCapabilities,
  type BlockDiagramGenerationCapabilities,
} from "./capabilities";
