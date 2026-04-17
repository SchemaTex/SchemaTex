/**
 * Lineage — Text-to-diagram rendering engine for relationship diagrams.
 *
 * Supports: genogram, ecomap, pedigree chart.
 * Output: SVG string or DOM element.
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

export { render, parse, type LineageConfig } from "./core/api";
export { genogram } from "./diagrams/genogram";
export { ecomap } from "./diagrams/ecomap";
export { pedigree } from "./diagrams/pedigree";
export { phylo } from "./diagrams/phylo";
export { sociogram } from "./diagrams/sociogram";
