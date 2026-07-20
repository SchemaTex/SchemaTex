import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parsePid } from "./parser";
import { renderPidAST } from "./renderer";
import { lintPid } from "./lint";

export const pid: DiagramPlugin = {
  type: "pid" as DiagramPlugin["type"],
  capabilities: { scene: true, editablePosition: true },
  detect(text) {
    return /^\s*pid\b/i.test(text);
  },
  parse: parsePid,
  lint: lintPid,
  render(text, config?: RenderConfig) {
    const ast = parsePid(text);
    return renderPidAST(ast, config);
  },
};

export { lintPid, lintPidAst } from "./lint";
export { parsePid, PidParseError } from "./parser";
export { renderPid, renderPidAST } from "./renderer";
export { layoutPid } from "./layout";
export type * from "./types";
