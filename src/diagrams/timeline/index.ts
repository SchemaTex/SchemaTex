import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseTimeline } from "./parser";
import { renderTimeline } from "./renderer";

export const timeline: DiagramPlugin = {
  type: "timeline" as DiagramPlugin["type"],
  detect(text) {
    return /^\s*timeline\b/i.test(text);
  },
  parse: parseTimeline,
  render(text, config?: RenderConfig) {
    return renderTimeline(text, config);
  },
};

export { parseTimeline, TimelineParseError } from "./parser";
export { layoutTimeline } from "./layout";
export { renderTimeline } from "./renderer";
export type * from "./types";
