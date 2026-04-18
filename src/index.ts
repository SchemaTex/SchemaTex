/**
 * Schematex — Text-to-diagram rendering engine for relationship diagrams.
 *
 * Supports: genogram, ecomap, pedigree, phylogenetic tree, sociogram, fishbone.
 * Output: SVG string.
 *
 * @example
 * ```ts
 * import { render } from 'schematex';
 *
 * const svg = render(`
 *   genogram
 *     john [male, 1950]
 *     mary [female, 1952]
 *     john -- mary
 *       child alice [female, 1975]
 * `);
 *
 * document.getElementById('diagram').innerHTML = svg;
 * ```
 */

export { render, type SchematexConfig } from "./core/api";
export { genogram } from "./diagrams/genogram";
export { ecomap } from "./diagrams/ecomap";
export { pedigree } from "./diagrams/pedigree";
export { phylo } from "./diagrams/phylo";
export { sociogram } from "./diagrams/sociogram";
export { timing } from "./diagrams/timing";
export { logic } from "./diagrams/logic";
export { circuit } from "./diagrams/circuit";
export { blockdiagram } from "./diagrams/blockdiagram";
export { ladder } from "./diagrams/ladder";
export { sld } from "./diagrams/sld";
export { entity } from "./diagrams/entity";
export { fishbone } from "./diagrams/fishbone";
export { venn } from "./diagrams/venn";
export { flowchart } from "./diagrams/flowchart";

export {
  type ThemeName,
  type BaseTheme,
  type PersonTokens,
  type BiologyTokens,
  type CausalityTokens,
  type VennTokens,
  type ResolvedTheme,
  BASE_THEMES,
  PERSON_TOKENS,
  BIOLOGY_TOKENS,
  CAUSALITY_TOKENS,
  VENN_TOKENS,
  resolveBaseTheme,
  resolvePersonTheme,
  resolveBiologyTheme,
  resolveGenogramTheme,
  resolveFishboneTheme,
  resolveVennTheme,
} from "./core/theme";
