import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parseUsecase } from "./parser";
import { renderUsecase } from "./renderer";

export const usecase: DiagramPlugin = {
  type: "usecase" as DiagramPlugin["type"],
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("#") || t.startsWith("//")) continue;
      return /^usecase\b/i.test(t);
    }
    return false;
  },
  parse: parseUsecase,
  render(text: string, config?: RenderConfig): string {
    return renderUsecase(text, config);
  },
};

export { parseUsecase, UsecaseParseError } from "./parser";
export { renderUsecase, renderUsecaseLayout } from "./renderer";
export { layoutUsecase, USECASE_CONST } from "./layout";
export type * from "./types";
