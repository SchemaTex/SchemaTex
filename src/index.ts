/**
 * Lineage — Text-to-diagram rendering engine for relationship diagrams.
 *
 * Supports: genogram, ecomap, pedigree, phylogenetic tree, sociogram, fishbone.
 * Output: SVG string.
 *
 * @example
 * ```ts
 * import { render } from 'lineage';
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

export { render, type LineageConfig } from "./core/api";
export { genogram } from "./diagrams/genogram";
export { ecomap } from "./diagrams/ecomap";
export { pedigree } from "./diagrams/pedigree";
export { phylo } from "./diagrams/phylo";
export { sociogram } from "./diagrams/sociogram";
export { timing } from "./diagrams/timing";
export { logic } from "./diagrams/logic";

export {
  type ThemeName,
  type BaseTheme,
  type PersonTokens,
  type BiologyTokens,
  type CausalityTokens,
  type ResolvedTheme,
  BASE_THEMES,
  PERSON_TOKENS,
  BIOLOGY_TOKENS,
  CAUSALITY_TOKENS,
  resolveBaseTheme,
  resolvePersonTheme,
  resolveBiologyTheme,
  resolveGenogramTheme,
  resolveFishboneTheme,
} from "./core/theme";
