import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parsePert } from "./parser";
import { renderPert } from "./renderer";

export const pert: DiagramPlugin = {
  type: "pert" as DiagramPlugin["type"],
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("#") || t.startsWith("//")) continue;
      return /^(pert|gantt)\b/i.test(t);
    }
    return false;
  },
  parse: parsePert,
  render(text: string, config?: RenderConfig): string {
    return renderPert(text, config);
  },
};

export { parsePert, PertParseError } from "./parser";
export { schedulePert, PertScheduleError } from "./scheduler";
export { layoutPert, PERT_CONST } from "./layout";
export { layoutAoa } from "./aoa";
export { renderPert, renderPertLayout } from "./renderer";
export { renderGantt } from "./gantt";
export type * from "./types";
