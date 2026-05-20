import type { DiagramPlugin, RenderConfig } from "./types";
import { parseFrontmatter } from "./dsl-preprocess";
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
import { state } from "../diagrams/state";
import { pid } from "../diagrams/pid";
import { erd } from "../diagrams/erd";
import { breadboard } from "../diagrams/breadboard";
import { bpmn } from "../diagrams/bpmn";
import { fbd } from "../diagrams/fbd";
import { sfc } from "../diagrams/sfc";
import { prisma } from "../diagrams/prisma";
import { usecase } from "../diagrams/usecase";

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
    | "timeline"
    | "state"
    | "pid"
    | "erd"
    | "breadboard"
    | "bpmn"
    | "fbd"
    | "sfc"
    | "prisma"
    | "usecase";
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
  state,
  pid,
  erd,
  breadboard,
  bpmn,
  fbd,
  sfc,
  prisma,
  usecase,
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
    "Cannot detect diagram type. Start your text with 'genogram', 'ecomap', 'pedigree', 'phylo', 'sociogram', 'timing', 'logic', 'circuit', 'blockdiagram', 'ladder', 'sld', 'entity-structure', 'fishbone', 'venn', 'flowchart', 'mindmap', 'matrix', 'orgchart', 'state', 'pid', 'erd', 'breadboard', 'bpmn', 'fbd', 'sfc', 'prisma', or 'usecase'."
  );
}

/**
 * Run the Mermaid-compat frontmatter pass and merge any `title:` into the
 * first header line as a quoted suffix (`flowchart TD` → `flowchart TD "T"`).
 *
 * Most per-diagram header regexes already accept a trailing quoted title, or
 * tolerate trailing tokens. Diagram types whose grammar would reject the
 * appended title are left alone — the frontmatter is silently dropped rather
 * than producing a misleading parse error.
 */
function preprocess(text: string): string {
  const { data, body } = parseFrontmatter(text);
  if (!data.title) return body;
  // Strip the title here — `data.title` was already unquoted by parseFrontmatter.
  const safeTitle = data.title.replace(/"/g, '\\"');
  // Find the first non-blank line in body and append the title if it doesn't
  // already carry a quoted region.
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (trimmed === "") continue;
    // Already has a quoted title — frontmatter loses.
    if (/["“「『«][^"”」』»]+["”」』»]/.test(trimmed)) return body;
    lines[i] = lines[i]!.replace(/\s*$/, ` "${safeTitle}"`);
    return lines.join("\n");
  }
  return body;
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
  const prepared = preprocess(text);
  const plugin = detectPlugin(prepared, config);
  if (plugin.parse) return plugin.parse(prepared);
  throw new Error(
    `Diagram type '${plugin.type}' does not yet expose a parse() method.`
  );
}

export function render(text: string, config?: SchematexConfig): string {
  const prepared = preprocess(text);
  const plugin = detectPlugin(prepared, config);
  const renderConfig: RenderConfig = {
    fontFamily: config?.fontFamily ?? "system-ui, -apple-system, sans-serif",
    fontSize: 12,
    theme: config?.theme ?? "default",
    padding: config?.padding ?? 20,
  };
  return plugin.render(prepared, renderConfig);
}
