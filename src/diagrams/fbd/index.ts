import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseFbd } from "./parser";
import { renderFbd } from "./renderer";

export const fbd: DiagramPlugin = {
  type: "fbd",
  capabilities: { scene: true, editablePosition: true },
  detect(text: string): boolean {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("fbd");
  },
  parse: parseFbd,
  render(text: string, config?: RenderConfig): string {
    return renderFbd(text, config);
  },
};

export { parseFbd } from "./parser";
export { renderFbd, renderFbdLayout } from "./renderer";
export { layoutFbd } from "./layout";
