import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseMarkov } from "./parser";
import { renderMarkov } from "./renderer";

export const markov: DiagramPlugin = {
  // Cast: the `markov` literal is not yet in the shared DiagramType union
  // (folder-isolated build — api.ts registration is intentionally deferred).
  type: "markov" as DiagramPlugin["type"],
  detect: (t: string): boolean => /^\s*(markov|markovchain)\b/i.test(t),
  parse: parseMarkov,
  render: (text: string, config?: RenderConfig): string => renderMarkov(text, config),
};

export { parseMarkov, MarkovParseError } from "./parser";
export { renderMarkov, renderMarkovLayout } from "./renderer";
export { layoutMarkov, MARKOV_CONST } from "./layout";
export { analyseMarkov } from "./analysis";
export type * from "./types";
