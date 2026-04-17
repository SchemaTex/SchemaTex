import type { DiagramPlugin, RenderConfig } from "./types";
import { genogram } from "../diagrams/genogram";
import { ecomap } from "../diagrams/ecomap";
import { pedigree } from "../diagrams/pedigree";
import { phylo } from "../diagrams/phylo";
import { sociogram } from "../diagrams/sociogram";
import { fishbone } from "../diagrams/fishbone";

export interface LineageConfig {
  type?: "genogram" | "ecomap" | "pedigree" | "phylo" | "sociogram" | "fishbone";
  width?: number;
  height?: number;
  padding?: number;
  theme?: string;
  fontFamily?: string;
}

const plugins: DiagramPlugin[] = [genogram, ecomap, pedigree, phylo, sociogram, fishbone];

function detectPlugin(text: string, config?: LineageConfig): DiagramPlugin {
  if (config?.type) {
    const plugin = plugins.find((p) => p.type === config.type);
    if (plugin) return plugin;
  }
  for (const plugin of plugins) {
    if (plugin.detect(text)) return plugin;
  }
  throw new Error(
    "Cannot detect diagram type. Start your text with 'genogram', 'ecomap', 'pedigree', 'phylo', 'sociogram', or 'fishbone'."
  );
}

export function render(text: string, config?: LineageConfig): string {
  const plugin = detectPlugin(text, config);
  const renderConfig: RenderConfig = {
    fontFamily: config?.fontFamily ?? "system-ui, -apple-system, sans-serif",
    fontSize: 12,
    theme: config?.theme ?? "default",
    padding: config?.padding ?? 20,
  };
  return plugin.render(text, renderConfig);
}
