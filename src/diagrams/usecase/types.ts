/**
 * UML Use Case diagram — AST and layout types.
 *
 * Spec: docs/reference/29-USECASE-STANDARD.md
 */

export type UsecaseDirection = "LR" | "TB";

/**
 * Actor visual kind.
 *  - human:    default stick figure
 *  - external: rectangle with «actor» stereotype (third-party system)
 *  - system:   alias for external (UML 2.5 lets both reuse rectangle)
 *  - business: stick figure with diagonal slash (Bittner & Spence)
 */
export type UsecaseActorKind = "human" | "external" | "system" | "business";

export type UsecaseActorSide = "left" | "right" | "auto";

export interface UsecaseActor {
  id: string;
  name: string;
  kind: UsecaseActorKind;
  /** Optional custom stereotype label (rendered in guillemets above the name). */
  stereotype?: string;
  side?: UsecaseActorSide;
  /** Declaration line — used in error messages. */
  line?: number;
}

export interface UsecaseNode {
  id: string;
  name: string;
  stereotype?: string;
  extensionPoints: string[];
  line?: number;
}

export type UsecaseRelKind =
  | "association"
  | "directed"
  | "include"
  | "extend"
  | "generalization";

export interface UsecaseRelation {
  kind: UsecaseRelKind;
  /** Logical source. For include: includer. For extend: extension. For generalization: child. */
  source: string;
  /** Logical target. For include: included. For extend: base. For generalization: parent. */
  target: string;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  /** Custom stereotype label override (defaults to «include» / «extend» based on kind). */
  stereotype?: string;
  /** Condition clause for «extend» relationships, e.g. `[payment failed]`. */
  condition?: string;
  /** Extension point reference for «extend» relationships. */
  extensionPointRef?: string;
  line?: number;
}

export interface UsecaseNote {
  text: string;
  members: string[];
  line?: number;
}

export interface UsecaseAst {
  type: "usecase";
  title?: string;
  /** Subject (system boundary) name. Optional — if absent, no boundary is drawn. */
  system?: string;
  direction: UsecaseDirection;
  /** If true, merge ≥3 generalization arrows from siblings into one shared head. */
  generalizationTree: boolean;
  actors: UsecaseActor[];
  usecases: UsecaseNode[];
  relations: UsecaseRelation[];
  notes: UsecaseNote[];
  warnings: string[];
}

// ─── Layout types ───────────────────────────────────────────────

export interface UsecaseActorBox {
  actor: UsecaseActor;
  /** Top-left corner of the bounding box (40×60 stick figure or 100×44 rectangle). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Which side of the subject this actor sits on. */
  side: "left" | "right";
  /** Center x for the anchor used when routing the association line. */
  anchorX: number;
  anchorY: number;
}

export interface UsecaseEllipse {
  usecase: UsecaseNode;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** y of divider line between name and extension-point compartment. */
  dividerY?: number;
}

export interface UsecaseSubject {
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UsecaseEdgeLabel {
  /** Label centerline rows — index 0 is the stereotype line, additional rows are condition / extpoint. */
  rows: string[];
  cx: number;
  cy: number;
}

export interface UsecaseMultiplicity {
  text: string;
  x: number;
  y: number;
}

export type UsecaseArrowKind = "none" | "open" | "hollow";

export interface UsecaseEdge {
  relation: UsecaseRelation;
  /** SVG path 'd' attribute. */
  d: string;
  /** Endpoint where the arrowhead sits (used so renderer can place markers without re-routing). */
  arrowKind: UsecaseArrowKind;
  dashed: boolean;
  label?: UsecaseEdgeLabel;
  multiplicityFrom?: UsecaseMultiplicity;
  multiplicityTo?: UsecaseMultiplicity;
  /** For dedup of edges drawn together (e.g., tree-shared generalization). */
  group?: string;
}

export interface UsecaseGeneralizationTree {
  parentId: string;
  childIds: string[];
  /** Stem coordinates (top, bottom). */
  stemX: number;
  stemTop: number;
  stemBottom: number;
  /** Arrowhead path d (already includes hollow triangle endpoint). */
  trunkD: string;
  /** Leg paths from each child to the stem. */
  legPaths: string[];
}

export interface UsecaseLayoutResult {
  width: number;
  height: number;
  title?: string;
  subject?: UsecaseSubject;
  actors: UsecaseActorBox[];
  usecases: UsecaseEllipse[];
  edges: UsecaseEdge[];
  trees: UsecaseGeneralizationTree[];
  warnings: string[];
  ast: UsecaseAst;
}
