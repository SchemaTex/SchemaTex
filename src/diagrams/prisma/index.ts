import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parsePrisma } from "./parser";
import { renderPrisma } from "./renderer";

export const prisma: DiagramPlugin = {
  type: "prisma" as DiagramPlugin["type"],
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("#") || t.startsWith("//")) continue;
      return /^prisma\b/i.test(t);
    }
    return false;
  },
  parse: parsePrisma,
  render(text: string, config?: RenderConfig): string {
    return renderPrisma(text, config);
  },
};

export { parsePrisma, PrismaParseError } from "./parser";
export { renderPrisma, renderPrismaLayout } from "./renderer";
export { layoutPrisma, PRISMA_CONST } from "./layout";
export type * from "./types";
