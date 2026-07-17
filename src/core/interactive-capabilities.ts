import type { DiagramType, SceneItem } from "./types";

export type InteractiveTextCapability =
  | "title"
  | "labels"
  | "structured-fields";

export type InteractivePositionCapability =
  | "none"
  | "free"
  | "move-x"
  | "move-y"
  | "cross-axis"
  | "native-x"
  | "native-y"
  | "native-xy";

export interface InteractiveCapabilities {
  type: DiagramType;
  /** Whether scene metadata is emitted by the engine or the guarded compatibility mapper. */
  implementation: "native" | "compatibility";
  /** Every engine exposes at least one authored title, label, or structured field. */
  text: readonly InteractiveTextCapability[];
  /** Human-facing summary; individual SceneItems remain the exact source of truth. */
  position: InteractivePositionCapability;
  /** Presentation pin mode used only by the compatibility mapper. */
  compatibilityPosition?: Exclude<SceneItem["editable"]["position"], "none">;
}

function capability(
  type: DiagramType,
  implementation: InteractiveCapabilities["implementation"],
  text: InteractiveCapabilities["text"],
  position: InteractivePositionCapability,
  compatibilityPosition?: InteractiveCapabilities["compatibilityPosition"],
): InteractiveCapabilities {
  return {
    type,
    implementation,
    text,
    position,
    ...(compatibilityPosition ? { compatibilityPosition } : {}),
  };
}

/**
 * Canonical canvas-editing capability registry.
 *
 * Documentation, the website, AI tools, and the compatibility adapter all
 * consume this table so supported behavior cannot drift across four lists.
 */
export const INTERACTIVE_CAPABILITIES = {
  genogram: capability("genogram", "native", ["title", "labels"], "move-x"),
  ecomap: capability("ecomap", "compatibility", ["title", "labels"], "free", "free"),
  pedigree: capability("pedigree", "compatibility", ["title", "labels"], "move-x", "move-x"),
  phylo: capability("phylo", "compatibility", ["title", "labels"], "none"),
  sociogram: capability("sociogram", "compatibility", ["title", "labels"], "free", "free"),
  timing: capability("timing", "native", ["title"], "native-x"),
  logic: capability("logic", "compatibility", ["title", "labels"], "free", "free"),
  circuit: capability("circuit", "native", ["title", "structured-fields"], "free"),
  blockdiagram: capability("blockdiagram", "compatibility", ["title", "labels"], "free", "free"),
  ladder: capability("ladder", "compatibility", ["title", "structured-fields"], "native-y"),
  sld: capability("sld", "compatibility", ["title", "structured-fields"], "move-x", "move-x"),
  entity: capability("entity", "compatibility", ["title", "structured-fields"], "move-x", "move-x"),
  fishbone: capability("fishbone", "native", ["title", "labels"], "none"),
  venn: capability("venn", "compatibility", ["title", "structured-fields"], "native-xy"),
  flowchart: capability("flowchart", "native", ["title", "labels"], "free"),
  mindmap: capability("mindmap", "native", ["labels"], "none"),
  matrix: capability("matrix", "compatibility", ["title", "structured-fields"], "native-xy"),
  orgchart: capability("orgchart", "native", ["title", "structured-fields"], "move-x"),
  decisiontree: capability("decisiontree", "native", ["title", "labels"], "none"),
  timeline: capability("timeline", "native", ["title"], "native-x"),
  state: capability("state", "native", ["title", "labels"], "cross-axis"),
  pid: capability("pid", "native", ["title"], "free"),
  erd: capability("erd", "native", ["title", "structured-fields"], "cross-axis"),
  breadboard: capability("breadboard", "native", ["title"], "native-xy"),
  bpmn: capability("bpmn", "compatibility", ["title", "labels"], "move-x", "move-x"),
  fbd: capability("fbd", "native", ["title"], "move-y"),
  sfc: capability("sfc", "compatibility", ["title", "labels"], "move-x", "move-x"),
  prisma: capability("prisma", "compatibility", ["title", "structured-fields"], "none"),
  usecase: capability("usecase", "compatibility", ["title", "labels"], "free", "free"),
  pert: capability("pert", "compatibility", ["title", "structured-fields"], "free", "free"),
  sequence: capability("sequence", "native", ["title", "labels"], "move-x"),
  petri: capability("petri", "native", ["title"], "cross-axis"),
  network: capability("network", "native", ["title", "labels"], "free"),
  umlclass: capability("umlclass", "native", ["title", "structured-fields"], "cross-axis"),
  faulttree: capability("faulttree", "compatibility", ["title", "structured-fields"], "move-x", "move-x"),
  bowtie: capability("bowtie", "compatibility", ["title", "labels"], "move-y", "move-y"),
  eventtree: capability("eventtree", "compatibility", ["title", "structured-fields"], "none"),
  fmea: capability("fmea", "compatibility", ["title", "structured-fields"], "none"),
  rbd: capability("rbd", "compatibility", ["title", "structured-fields"], "move-x", "move-x"),
  comparison: capability("comparison", "compatibility", ["title", "structured-fields"], "none"),
  causalloop: capability("causalloop", "compatibility", ["title", "labels"], "free", "free"),
  markov: capability("markov", "compatibility", ["title", "structured-fields"], "free", "free"),
  gitgraph: capability("gitgraph", "compatibility", ["title", "structured-fields"], "none"),
  epc: capability("epc", "compatibility", ["title", "labels"], "move-x", "move-x"),
  idef0: capability("idef0", "compatibility", ["title", "labels"], "free", "free"),
  threatmodel: capability("threatmodel", "compatibility", ["title", "structured-fields"], "free", "free"),
  welding: capability("welding", "compatibility", ["title", "structured-fields"], "none"),
  floorplan: capability("floorplan", "native", ["title", "labels"], "native-xy"),
  siteplan: capability("siteplan", "native", ["title"], "native-xy"),
  playbook: capability("playbook", "compatibility", ["title", "labels"], "native-xy"),
} as const satisfies Record<DiagramType, InteractiveCapabilities>;

export function getInteractiveCapabilities(
  type: DiagramType,
): InteractiveCapabilities {
  return INTERACTIVE_CAPABILITIES[type];
}

export const INTERACTIVE_DIAGRAM_COUNT = Object.keys(INTERACTIVE_CAPABILITIES).length;
export const POSITION_EDITABLE_DIAGRAM_COUNT = Object.values(INTERACTIVE_CAPABILITIES)
  .filter((entry) => entry.position !== "none").length;
