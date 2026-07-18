/**
 * Schematex — professional text-to-diagram rendering and editing engine.
 *
 * Supports 50 medical, engineering, legal, software, and analytical diagrams.
 * Output: SVG plus optional scene metadata for browser editing.
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

export {
  render,
  renderPreview,
  renderResult,
  parse,
  parseResult,
  type SchematexConfig,
} from "./core/api";
export type {
  SchematexDiagnostic,
  SchematexParseResult,
  SchematexRenderResult,
  SchematexResultStatus,
} from "./core/diagnostics";
export type { SceneItem, SourceRange } from "./core/types";
export {
  INTERACTIVE_CAPABILITIES,
  INTERACTIVE_DIAGRAM_COUNT,
  POSITION_EDITABLE_DIAGRAM_COUNT,
  getInteractiveCapabilities,
  isInteractiveDiagramType,
  type InteractiveCapabilities,
  type InteractivePositionCapability,
  type InteractiveTextCapability,
} from "./core/interactive-capabilities";
export {
  applyPins,
  prunePins,
  reattachPins,
  setLabel,
  setPosition,
  stripPins,
  type SceneEditTarget,
  type SourceEditResult,
} from "./core/editing";
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
export { orgchart } from "./diagrams/orgchart";
export { decisiontree } from "./diagrams/decisiontree";
export { timeline } from "./diagrams/timeline";
export { state } from "./diagrams/state";
export { pid } from "./diagrams/pid";
export { prisma } from "./diagrams/prisma";
export { usecase } from "./diagrams/usecase";
export { pert } from "./diagrams/pert";
export { sequence } from "./diagrams/sequence";
export { petri } from "./diagrams/petri";
export { network } from "./diagrams/network";
export { umlclass } from "./diagrams/umlclass";
export { faulttree } from "./diagrams/faulttree";
export { bowtie } from "./diagrams/bowtie";
export { eventtree } from "./diagrams/eventtree";
export { fmea } from "./diagrams/fmea";
export { causalloop } from "./diagrams/causalloop";
export { markov } from "./diagrams/markov";
export { gitgraph } from "./diagrams/gitgraph";
export { epc } from "./diagrams/epc";
export { idef0 } from "./diagrams/idef0";
export { threatmodel } from "./diagrams/threatmodel";
export { welding } from "./diagrams/welding";
export { rbd } from "./diagrams/rbd";
export { comparison } from "./diagrams/comparison";
export { floorplan } from "./diagrams/floorplan";
export { siteplan } from "./diagrams/siteplan";
export { playbook } from "./diagrams/playbook";

export {
  type SymbolCatalog,
  type SymbolCatalogEntry,
  SYMBOL_CATALOG_TYPES,
  getSymbolCatalog,
} from "./symbols-catalog";

export {
  type ThemeName,
  type BaseTheme,
  type PersonTokens,
  type BiologyTokens,
  type VennTokens,
  type ResolvedTheme,
  BASE_THEMES,
  PERSON_TOKENS,
  BIOLOGY_TOKENS,
  VENN_TOKENS,
  resolveBaseTheme,
  resolvePersonTheme,
  resolveBiologyTheme,
  resolveGenogramTheme,
  resolveFishboneTheme,
  resolveVennTheme,
  resolveTimelineTheme,
  type TimelineTokens,
  type PetriTokens,
  PETRI_TOKENS,
  resolvePetriTheme,
  type NetworkTokens,
  NETWORK_TOKENS,
  resolveNetworkTheme,
} from "./core/theme";
