import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { renderTimeline } from "./renderer";

export const timeline: DiagramPlugin = {
  type: "timeline" as DiagramPlugin["type"],
  detect(text) {
    return /^\s*timeline\b/i.test(text);
  },
  render(text, config?: RenderConfig) {
    return renderTimeline(text, config);
  },
};

export { parseTimeline, TimelineParseError } from "./parser";
export { layoutTimeline } from "./layout";
export { renderTimeline } from "./renderer";
export type * from "./types";
