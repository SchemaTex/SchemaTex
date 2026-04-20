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
import { orgchart } from "../diagrams/orgchart";
import { decisiontree } from "../diagrams/decisiontree";
import { timeline } from "../diagrams/timeline";

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
    | "matrix"
    | "orgchart"
    | "decisiontree"
    | "timeline";
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
  orgchart,
  decisiontree,
  timeline,
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
    "Cannot detect diagram type. Start your text with 'genogram', 'ecomap', 'pedigree', 'phylo', 'sociogram', 'timing', 'logic', 'circuit', 'blockdiagram', 'ladder', 'sld', 'entity-structure', 'fishbone', 'venn', 'flowchart', 'mindmap', 'matrix', or 'orgchart'."
  );
}

/**
 * Parse DSL text to the diagram's AST and return it as a plain object.
 * Useful for JSON serialization, programmatic inspection, or custom renderers.
 *
 * @example
 * ```ts
 * const ast = parse('genogram\n  alice [female]');
 * console.log(JSON.stringify(ast, null, 2));
 * ```
 */
export function parse(text: string, config?: SchematexConfig): unknown {
  const plugin = detectPlugin(text, config);
  if (plugin.parse) return plugin.parse(text);
  throw new Error(
    `Diagram type '${plugin.type}' does not yet expose a parse() method.`
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
