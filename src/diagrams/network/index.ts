import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseNetwork } from "./parser";
import { renderNetwork } from "./renderer";

export const network: DiagramPlugin = {
  type: "network",
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("#") || t.startsWith("//")) continue;
      return /^(network|topology)\b/i.test(t);
    }
    return false;
  },
  parse: parseNetwork,
  render(text: string, config?: RenderConfig): string {
    return renderNetwork(text, config);
  },
};

export { parseNetwork, NetworkParseError } from "./parser";
export { renderNetwork, renderNetworkLayout } from "./renderer";
export { layoutNetwork, NET_CONST } from "./layout";
export type * from "./types";
