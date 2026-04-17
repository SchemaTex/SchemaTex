import type { DiagramAST, DiagramPlugin } from "./types";
import { genogram } from "../diagrams/genogram";
import { ecomap } from "../diagrams/ecomap";
import { pedigree } from "../diagrams/pedigree";
import { phylo, renderPhyloDiagram } from "../diagrams/phylo";
import { sociogram, renderSociogramDiagram } from "../diagrams/sociogram";

export interface LineageConfig {
  type?: "genogram" | "ecomap" | "pedigree" | "phylo" | "sociogram";
  width?: number;
  height?: number;
  padding?: number;
  theme?: string;
  fontFamily?: string;
}

const plugins: DiagramPlugin[] = [genogram, ecomap, pedigree, phylo, sociogram];

function detectPlugin(text: string, config?: LineageConfig): DiagramPlugin {
  if (config?.type) {
    const plugin = plugins.find((p) => p.type === config.type);
    if (plugin) return plugin;
  }
  for (const plugin of plugins) {
    if (plugin.detect(text)) return plugin;
  }
  throw new Error(
    "Cannot detect diagram type. Start your text with 'genogram', 'ecomap', 'pedigree', 'phylo', or 'sociogram'."
  );
}

export function parse(text: string, config?: LineageConfig): DiagramAST {
  const plugin = detectPlugin(text, config);
  return plugin.parse(text);
}

export function render(text: string, config?: LineageConfig): string {
  const plugin = detectPlugin(text, config);

  // Phylo and Sociogram have their own pipelines (different AST shapes)
  if (plugin.type === "phylo") {
    return renderPhyloDiagram(text);
  }
  if (plugin.type === "sociogram") {
    return renderSociogramDiagram(text);
  }

  const ast = plugin.parse(text);
  const layoutConfig = {
    nodeSpacingX: 80,
    nodeSpacingY: 100,
    nodeWidth: 40,
    nodeHeight: 40,
  };
  const layout = plugin.layout(ast, layoutConfig);
  const renderConfig = {
    fontFamily: config?.fontFamily ?? "system-ui",
    fontSize: 12,
    theme: config?.theme ?? "default",
    padding: config?.padding ?? 20,
  };
  return plugin.render(layout, renderConfig);
}
