import type { DiagramType } from "./types";

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
  /** Empty for engines that have not shipped parser-native scene metadata yet. */
  text: readonly InteractiveTextCapability[];
  /** Human-facing summary; individual SceneItems remain the exact source of truth. */
  position: InteractivePositionCapability;
}

function capability(
  type: DiagramType,
  text: InteractiveCapabilities["text"],
  position: InteractivePositionCapability,
): InteractiveCapabilities {
  return { type, text, position };
}

/**
 * Canonical canvas-editing capability registry.
 *
 * Only parser-native engines appear here. Documentation, the website, and AI
 * tools consume this table so an engine cannot accidentally advertise canvas
 * editing before its parser and renderer produce deterministic source ranges.
 */
export const INTERACTIVE_CAPABILITIES = {
  genogram: capability("genogram", ["title", "labels"], "move-x"),
  timing: capability("timing", ["title"], "native-x"),
  circuit: capability("circuit", ["title", "structured-fields"], "free"),
  fishbone: capability("fishbone", ["title", "labels"], "none"),
  flowchart: capability("flowchart", ["title", "labels"], "free"),
  mindmap: capability("mindmap", ["labels"], "none"),
  orgchart: capability("orgchart", ["title", "structured-fields"], "move-x"),
  decisiontree: capability("decisiontree", ["title", "labels"], "none"),
  timeline: capability("timeline", ["title"], "native-x"),
  state: capability("state", ["title", "labels"], "cross-axis"),
  pid: capability("pid", ["title"], "free"),
  erd: capability("erd", ["title", "structured-fields"], "cross-axis"),
  breadboard: capability("breadboard", ["title"], "native-xy"),
  fbd: capability("fbd", ["title"], "move-y"),
  sequence: capability("sequence", ["title", "labels"], "move-x"),
  petri: capability("petri", ["title"], "cross-axis"),
  network: capability("network", ["title", "labels"], "free"),
  umlclass: capability("umlclass", ["title", "structured-fields"], "cross-axis"),
  floorplan: capability("floorplan", ["title", "labels"], "native-xy"),
  siteplan: capability("siteplan", ["title"], "native-xy"),
} as const satisfies Partial<Record<DiagramType, InteractiveCapabilities>>;

export function isInteractiveDiagramType(type: DiagramType): boolean {
  return Object.hasOwn(INTERACTIVE_CAPABILITIES, type);
}

export function getInteractiveCapabilities(
  type: DiagramType,
): InteractiveCapabilities {
  return (INTERACTIVE_CAPABILITIES as Partial<Record<DiagramType, InteractiveCapabilities>>)[type]
    ?? capability(type, [], "none");
}

export const INTERACTIVE_DIAGRAM_COUNT = Object.keys(INTERACTIVE_CAPABILITIES).length;
export const POSITION_EDITABLE_DIAGRAM_COUNT = Object.values(INTERACTIVE_CAPABILITIES)
  .filter((entry) => entry.position !== "none").length;
