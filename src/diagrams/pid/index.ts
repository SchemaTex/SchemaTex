import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parsePid } from "./parser";
import { renderPidAST } from "./renderer";

export const pid: DiagramPlugin = {
  type: "pid" as DiagramPlugin["type"],
  detect(text) {
    return /^\s*pid\b/i.test(text);
  },
  parse: parsePid,
  render(text, config?: RenderConfig) {
    const ast = parsePid(text);
    return renderPidAST(ast, config);
  },
};

export { parsePid, PidParseError } from "./parser";
export { renderPid, renderPidAST } from "./renderer";
export { layoutPid } from "./layout";
export type * from "./types";
