/**
 * UML Class Diagram (umlclass) — AST + LayoutResult types.
 *
 * See docs/reference/36-UMLCLASS-STANDARD.md.
 * Pattern mirrors sibling UML engines (state §21, usecase §29, sequence §33):
 * the local types file owns the engine-specific shapes; only the bare
 * `"umlclass"` literal is added to the shared DiagramType union in core/types.ts.
 */

// ─── Vocabulary primitives ────────────────────────────────────

export type UmlClassVisibility = "public" | "private" | "protected" | "package";

export type UmlClassClassifierKind =
  | "class"
  | "interface"
  | "enum"
  | "datatype"
  | "primitive";

export type UmlClassRelationKind =
  | "association"     // plain solid line, no head
  | "directed"        // solid line + open arrowhead at target
  | "aggregation"     // solid line + hollow diamond at source (whole)
  | "composition"     // solid line + filled diamond at source (whole)
  | "generalization"  // solid line + hollow triangle at target (parent)
  | "realization"     // dashed line + hollow triangle at target (interface)
  | "dependency";     // dashed line + open arrowhead at target (supplier)

export type UmlClassDirection = "tb" | "bt" | "lr" | "rl";

export type UmlClassMemberKind = "attribute" | "operation" | "literal";

// ─── Members (attributes / operations / enum literals) ────────

export interface UmlClassParameter {
  name: string;
  type?: string;
  /** "in" | "out" | "inout" — "in" is the unshown default. */
  direction?: "in" | "out" | "inout";
}

export interface UmlClassMember {
  kind: UmlClassMemberKind;
  visibility?: UmlClassVisibility;
  name: string;
  /** Exact authored member-name token. */
  nameSourceRange?: import("../../core/types").SourceRange;
  /** Static = class-scope (renders underlined). */
  isStatic?: boolean;
  /** Abstract operation (renders italic). Only meaningful for operations. */
  isAbstract?: boolean;
  /** Derived attribute (renders with leading `/`). Only meaningful for attributes. */
  isDerived?: boolean;
  /** `: Type` after the name (attr) or before `{}` (op return). */
  type?: string;
  /** Exact authored member/return type token. */
  typeSourceRange?: import("../../core/types").SourceRange;
  /** `[0..1]`, `[*]`, etc. for attributes. */
  multiplicity?: string;
  /** `= literal` default value (attributes only). */
  defaultValue?: string;
  /** Operation parameters. */
  params?: UmlClassParameter[];
  /** `{readOnly}`, `{abstract}`, `{static}`, `{query}`, `{ordered}`, … */
  properties?: string[];
}

// ─── Classifiers ──────────────────────────────────────────────

export interface UmlClassClassifier {
  id: string;
  /** Display name (defaults to id; differs only when an `as` alias is used). */
  name: string;
  /** Exact authored classifier display-name/id token. */
  nameSourceRange?: import("../../core/types").SourceRange;
  kind: UmlClassClassifierKind;
  /** «interface», «enumeration», «entity», custom — rendered above the name. */
  stereotype?: string;
  /** `abstract class` or `{abstract}` annotation — renders name in italics. */
  isAbstract?: boolean;
  members: UmlClassMember[];
  /** True when this classifier was auto-created by an arc reference (not declared). */
  autoCreated?: boolean;
  /** Fully-qualified id of the package/namespace this classifier lives in (if any). */
  packageId?: string;
}

// ─── Packages / namespaces ────────────────────────────────────

/**
 * A `namespace`/package grouping. Mermaid-compatible: dot-notation
 * (`namespace A.B.C`) auto-creates parent packages, and blocks may nest
 * syntactically. Rendered as a labelled bounding frame enclosing its members
 * (and any nested sub-packages). Per spec §4.5 (promoted from §11 deferred).
 */
export interface UmlClassPackage {
  /** Fully-qualified id (dot-joined), e.g. "Company.Engineering". */
  id: string;
  /** Display label (the last path segment, or an explicit `["Label"]`). */
  name: string;
  /** Parent package id, when nested. */
  parentId?: string;
  /** Ids of classifiers declared *directly* inside this package. */
  classifierIds: string[];
}

// ─── Relationships ────────────────────────────────────────────

export interface UmlClassRelationship {
  /** Source classifier id (left-hand side of the original connector). */
  from: string;
  /** Target classifier id (right-hand side, after reversed-form normalisation). */
  to: string;
  kind: UmlClassRelationKind;
  /** Optional association name / label at the line midpoint. */
  label?: string;
  /** Multiplicity at the source end (e.g. "1", "0..*"). */
  sourceMult?: string;
  /** Multiplicity at the target end. */
  targetMult?: string;
  /** Role name at the source end. */
  sourceRole?: string;
  /** Role name at the target end. */
  targetRole?: string;
}

// ─── AST root ─────────────────────────────────────────────────

export interface UmlClassAst {
  type: "umlclass";
  title?: string;
  titleSourceRange?: import("../../core/types").SourceRange;
  /** Rank direction — default "tb" (parents on top). */
  direction: UmlClassDirection;
  classifiers: UmlClassClassifier[];
  relationships: UmlClassRelationship[];
  /** Package/namespace groupings (empty when no `namespace` blocks were used). */
  packages: UmlClassPackage[];
  /** Soft warnings (auto-created classifiers, realization to non-interface, duplicate edges, etc.). */
  warnings: string[];
  /** Reserved for future legend / theme directives. */
  metadata?: Record<string, string>;
}

// ─── Layout output ────────────────────────────────────────────

export interface UmlClassLayoutRow {
  member: UmlClassMember;
  /** y of the row baseline relative to the box top. */
  baselineY: number;
  /** Pre-computed display string (with leading visibility glyph + body, post box-width truncation). */
  displayText: string;
  /** True if the row's text was truncated to fit BOX_MAX_W. */
  truncated?: boolean;
}

export interface UmlClassLayoutBox {
  classifier: UmlClassClassifier;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 0-based layer index (top = 0 in `tb`). */
  layer: number;
  /** Position within the layer (for stable ordering). */
  order: number;
  /** y of the stereotype row baseline (relative to box top), if a stereotype is shown. */
  stereotypeBaselineY?: number;
  /** y of the name row baseline (relative to box top). */
  nameBaselineY: number;
  /** y of the divider between name and attributes compartment. */
  attrsTopY: number;
  /** y of the divider between attributes and operations compartment. */
  opsTopY: number;
  /** Attribute / literal rows. */
  attrRows: UmlClassLayoutRow[];
  /** Operation rows. */
  opRows: UmlClassLayoutRow[];
}

export interface UmlClassLayoutEdgeEnd {
  /** Box id this end attaches to. */
  boxId: string;
  /** Absolute attachment point on the box boundary. */
  x: number;
  y: number;
  /** Which side of the box the end attaches to. */
  side: "top" | "bottom" | "left" | "right";
}

export interface UmlClassLayoutEdge {
  rel: UmlClassRelationship;
  /** SVG path "d" attribute (orthogonal Manhattan). */
  path: string;
  /** Source end (the side the author typed first, post-normalisation). */
  sourceEnd: UmlClassLayoutEdgeEnd;
  /** Target end (the semantic head — parent / interface / whole / supplier). */
  targetEnd: UmlClassLayoutEdgeEnd;
  /** Midpoint position for the association name label, if any. */
  labelAnchor?: { x: number; y: number };
}

/**
 * A tree-merged inheritance fan: N children share one parent via a single
 * trunk + per-child legs + ONE shared adornment head at the parent end.
 * Per spec §5.4 ("Shared generalization heads") + ported from
 * usecase/layout.ts:504-633 ("the use-case generalization tree-merge").
 */
export interface UmlClassLayoutTree {
  parentId: string;
  childIds: string[];
  /** "generalization" or "realization" — drives dashed vs solid + adornment kind. */
  kind: "generalization" | "realization";
  /** SVG "d" attribute for the trunk (junction → parent end, carries the triangle head). */
  trunkD: string;
  /** SVG "d" attributes for the per-child legs (child → junction), each headless. */
  legPaths: string[];
  /** Coordinates of the trunk's parent-end attachment (where the triangle head sits). */
  parentEnd: UmlClassLayoutEdgeEnd;
}

/**
 * A laid-out package frame: a labelled rectangle enclosing all member boxes
 * (and nested sub-package frames) computed as a union + padding (C4-style).
 */
export interface UmlClassLayoutPackage {
  pkg: UmlClassPackage;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Nesting depth (0 = top-level) — drives frame tint/stroke layering. */
  depth: number;
  /** Label baseline position (top-centre of the frame). */
  labelX: number;
  labelY: number;
}

export interface UmlClassLayoutResult {
  ast: UmlClassAst;
  boxes: UmlClassLayoutBox[];
  /** Package frames, ordered outermost-first (depth ascending) for under-box rendering. */
  packages: UmlClassLayoutPackage[];
  /** Non-merged relationship edges (associations, dependencies, etc., plus
   * single-child inheritance/realization edges that didn't form a tree). */
  edges: UmlClassLayoutEdge[];
  /** Tree-merged inheritance/realization fans (≥2 children share one parent). */
  trees: UmlClassLayoutTree[];
  width: number;
  height: number;
}
