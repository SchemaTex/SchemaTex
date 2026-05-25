import type { DiagramPlugin, RenderConfig } from "../../core/types";
import { parsePetri } from "./parser";
import { renderPetri } from "./renderer";

export const petri: DiagramPlugin = {
  type: "petri",
  detect(text: string): boolean {
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith("#") || t.startsWith("//")) continue;
      return /^petri(net)?\b/i.test(t);
    }
    return false;
  },
  parse: parsePetri,
  render(text: string, config?: RenderConfig): string {
    return renderPetri(text, config);
  },
};

export { parsePetri, PetriParseError } from "./parser";
export { renderPetri, renderPetriLayout } from "./renderer";
export { layoutPetri, PETRI_CONST } from "./layout";
export type * from "./types";
