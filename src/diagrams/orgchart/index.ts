import type { DiagramPlugin } from "../../core/types";
import { parseOrgchart } from "./parser";
import { renderOrgchart } from "./renderer";

export const orgchart: DiagramPlugin = {
  type: "orgchart",
  detect(text) {
    return /^\s*orgchart\b/i.test(text);
  },
  render(text, config) {
    const ast = parseOrgchart(text);
    return renderOrgchart(ast, config);
  },
};

export { parseOrgchart, OrgchartParseError } from "./parser";
export { renderOrgchart } from "./renderer";
export { layoutOrgchart } from "./layout";
export type * from "./types";
