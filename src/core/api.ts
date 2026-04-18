import type { DiagramPlugin, RenderConfig } from "./types";
import { genogram } from "../diagrams/genogram";
import { ecomap } from "../diagrams/ecomap";
import { pedigree } from "../diagrams/pedigree";
import { phylo } from "../diagrams/phylo";
import { sociogram } from "../diagrams/sociogram";
import { timing } from "../diagrams/timing";
import { logic } from "../diagrams/logic";
import { circuit } from "../diagrams/circuit";
import { blockdiagram } from "../diagrams/blockdiagram";
import { ladder } from "../diagrams/ladder";
import { sld } from "../diagrams/sld";
import { entity } from "../diagrams/entity";
import { fishbone } from "../diagrams/fishbone";
import { venn } from "../diagrams/venn";
import { flowchart } from "../diagrams/flowchart";
import { mindmap } from "../diagrams/mindmap";
import { matrix } from "../diagrams/matrix";

export interface SchematexConfig {
  type?:
    | "genogram"
    | "ecomap"
    | "pedigree"
    | "phylo"
    | "sociogram"
    | "timing"
    | "logic"
    | "circuit"
    | "blockdiagram"
    | "ladder"
    | "sld"
    | "entity"
    | "fishbone"
    | "venn"
    | "flowchart"
    | "mindmap"
    | "matrix";
  width?: number;
  height?: number;
  padding?: number;
  theme?: string;
  fontFamily?: string;
}

const plugins: DiagramPlugin[] = [
  genogram,
  ecomap,
  pedigree,
  phylo,
  sociogram,
  timing,
  logic,
  circuit,
  blockdiagram,
  ladder,
  sld,
  entity,
  fishbone,
  venn,
  flowchart,
  mindmap,
  matrix,
];

function detectPlugin(text: string, config?: SchematexConfig): DiagramPlugin {
  if (config?.type) {
    const plugin = plugins.find((p) => p.type === config.type);
    if (plugin) return plugin;
  }
  for (const plugin of plugins) {
    if (plugin.detect(text)) return plugin;
  }
  throw new Error(
    "Cannot detect diagram type. Start your text with 'genogram', 'ecomap', 'pedigree', 'phylo', 'sociogram', 'timing', 'logic', 'circuit', 'blockdiagram', 'ladder', 'sld', 'entity-structure', 'fishbone', 'venn', 'flowchart', 'mindmap', or 'matrix'."
  );
}

export function render(text: string, config?: SchematexConfig): string {
  const plugin = detectPlugin(text, config);
  const renderConfig: RenderConfig = {
    fontFamily: config?.fontFamily ?? "system-ui, -apple-system, sans-serif",
    fontSize: 12,
    theme: config?.theme ?? "default",
    padding: config?.padding ?? 20,
  };
  return plugin.render(text, renderConfig);
}
