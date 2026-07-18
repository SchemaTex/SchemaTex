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
  /**
   * Standards/layout reason for a constrained or native position model.
   * This is canonical product data consumed by docs, playgrounds, and AI tools;
   * callers should not maintain their own explanation tables.
   */
  reason?: string;
}

function capability(
  type: DiagramType,
  text: InteractiveCapabilities["text"],
  position: InteractivePositionCapability,
  reason?: string,
): InteractiveCapabilities {
  return { type, text, position, ...(reason ? { reason } : {}) };
}

/**
 * Canonical canvas-editing capability registry.
 *
 * Only parser-native engines appear here. Documentation, the website, and AI
 * tools consume this table so an engine cannot accidentally advertise canvas
 * editing before its parser and renderer produce deterministic source ranges.
 */
export const INTERACTIVE_CAPABILITIES = {
  genogram: capability("genogram", ["title", "labels"], "move-x", "Generation is semantic in a genogram, so people may move within a generation while the vertical generation order stays locked."),
  timing: capability("timing", ["title"], "native-x", "Time is the authored horizontal axis; native handles change event boundaries while signal rows stay aligned by declaration order."),
  circuit: capability("circuit", ["title", "structured-fields"], "free"),
  fishbone: capability("fishbone", ["title", "labels"], "none", "Ishikawa geometry is derived from category and cause nesting, so labels are editable but branch positions remain automatic."),
  flowchart: capability("flowchart", ["title", "labels"], "free"),
  mindmap: capability("mindmap", ["labels"], "none", "Hierarchy determines the automatic tree layout, so branch text is editable but node coordinates are not authored."),
  orgchart: capability("orgchart", ["title", "structured-fields"], "move-x", "Reporting depth is semantic, so people may move within a reporting level while hierarchy controls the vertical axis."),
  decisiontree: capability("decisiontree", ["title", "labels"], "none", "Branch topology and rollback order determine the tree layout, so decision text is editable while node positions remain automatic."),
  timeline: capability("timeline", ["title"], "native-x", "Dates own the horizontal axis; native handles rewrite authored dates instead of storing decorative canvas coordinates."),
  state: capability("state", ["title", "labels"], "cross-axis", "The primary flow axis expresses transition progression, so nodes move only on the safe cross-axis for the selected direction."),
  pid: capability("pid", ["title"], "free"),
  erd: capability("erd", ["title", "structured-fields"], "cross-axis", "Relationship ranks own the primary layout axis, so tables move only across ranks without changing schema semantics."),
  breadboard: capability("breadboard", ["title"], "native-xy", "Parts and wire endpoints snap to authored breadboard holes; the board and rail geometry remain fixed."),
  fbd: capability("fbd", ["title"], "move-y", "IEC 61131-3 signal flow remains left-to-right, so blocks may be reordered vertically without reversing logic flow."),
  sequence: capability("sequence", ["title", "labels"], "move-x", "Horizontal lifeline order is editable, while the vertical axis remains semantic time and message order."),
  petri: capability("petri", ["title"], "cross-axis", "Flow layers preserve token progression, so places and transitions move only on the cross-axis for the selected direction."),
  network: capability("network", ["title", "labels"], "free"),
  umlclass: capability("umlclass", ["title", "structured-fields"], "cross-axis", "Relationship ranks own the primary layout axis, so classifiers move across ranks without changing UML relationships."),
  floorplan: capability("floorplan", ["title", "labels"], "native-xy", "Native handles rewrite room dimensions, openings, and item coordinates in plan units; topology and shared-wall validation still apply."),
  siteplan: capability("siteplan", ["title"], "native-xy", "Native handles rewrite authored plan coordinates and endpoints while scale, boundaries, and surveyed geometry remain explicit."),
} as const satisfies Partial<Record<DiagramType, InteractiveCapabilities>>;

const SOURCE_ONLY_REASON =
  "Canvas editing is disabled until this parser emits deterministic scene identities and exact source ranges; the DSL remains fully editable.";

export function isInteractiveDiagramType(type: DiagramType): boolean {
  return Object.hasOwn(INTERACTIVE_CAPABILITIES, type);
}

export function getInteractiveCapabilities(
  type: DiagramType,
): InteractiveCapabilities {
  return (INTERACTIVE_CAPABILITIES as Partial<Record<DiagramType, InteractiveCapabilities>>)[type]
    ?? capability(type, [], "none", SOURCE_ONLY_REASON);
}

export const INTERACTIVE_DIAGRAM_COUNT = Object.keys(INTERACTIVE_CAPABILITIES).length;
export const POSITION_EDITABLE_DIAGRAM_COUNT = Object.values(INTERACTIVE_CAPABILITIES)
  .filter((entry) => entry.position !== "none").length;
