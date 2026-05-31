import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseBowtie } from "./parser";
import { renderBowtie } from "./renderer";

export const bowtie: DiagramPlugin = {
  type: "bowtie" as DiagramPlugin["type"],
  detect(text) {
    return /^\s*bowtie\b/i.test(text);
  },
  parse: parseBowtie,
  render(text, config?: RenderConfig) {
    return renderBowtie(text, config);
  },
};

export { parseBowtie, BowtieParseError } from "./parser";
export { layoutBowtie, BOWTIE_CONST } from "./layout";
export { renderBowtie, renderBowtieLayout } from "./renderer";
export type * from "./types";
