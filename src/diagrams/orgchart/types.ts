export type OrgchartDirection = "TD" | "LR";
export type OrgchartLayoutMode = "tree" | "list";

export type OrgchartRoleIcon =
  | "CEO"
  | "CTO"
  | "CFO"
  | "COO"
  | "CMO"
  | "CPO"
  | "VP"
  | "Engineer"
  | "Designer"
  | "Sales"
  | "HR"
  | "Legal"
  | "Ops"
  | "Marketing"
  | "Product"
  | "Data"
  | "Advisor"
  | "Intern"
  | "Vacant";

export type OrgchartNodeKind = "person" | "role" | "draft" | "advisor";

export interface OrgchartNode {
  id: string;
  name: string;
  title?: string;
  department?: string;
  /** Secondary info line: email, phone, location, short note */
  info?: string;
  kind: OrgchartNodeKind;
  /** Parent id determined by hierarchy / reports property */
  parent?: string;
  /** Assistant-of another node id */
  assistantOf?: string;
  /** Matrix (dotted) report targets */
  matrix: string[];
  /** Built-in role icon keyword */
  role?: OrgchartRoleIcon;
  /** Gender silhouette (shown when no role icon set) */
  gender?: "male" | "female";
  /** Vacant / open position */
  open?: boolean;
  /** Draft / planned but not actively recruited */
  draft?: boolean;
  /** External advisor / contractor */
  external?: boolean;
  /** Explicit avatar color override (hex) */
  avatarColor?: string;
  /** Status pill: NEW / HIRING / LEAVING */
  status?: "new" | "leaving" | "on-leave";
}

export interface OrgchartEdge {
  from: string;
  to: string;
  kind: "report" | "matrix";
  label?: string;
}

export interface OrgchartAST {
  type: "orgchart";
  title?: string;
  direction: OrgchartDirection;
  layout: OrgchartLayoutMode;
  nodes: OrgchartNode[];
  edges: OrgchartEdge[];
  metadata?: Record<string, string>;
}

export interface OrgchartLayoutNode {
  node: OrgchartNode;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Department color (resolved from palette) */
  deptColor?: string;
  /** Avatar background color (soft tint) */
  avatarBg: string;
  /** Avatar foreground color (darker, for initials / role glyph) */
  avatarFg: string;
  /** Avatar display initials (2 chars or 1 CJK glyph) */
  initials: string;
  /** Indent depth from root (list mode only). 0 for root. */
  depth?: number;
  /** Subtree size excluding self (list mode only). */
  subtreeSize?: number;
  /** True if this node has children (list mode only). */
  hasChildren?: boolean;
}

export interface OrgchartLayoutEdge {
  edge: OrgchartEdge;
  path: string;
  labelX?: number;
  labelY?: number;
}

export interface OrgchartLayoutResult {
  width: number;
  height: number;
  nodes: OrgchartLayoutNode[];
  edges: OrgchartLayoutEdge[];
  title?: string;
  mode: OrgchartLayoutMode;
  /** List-mode guide lines (vertical trunks + horizontal ticks). */
  guides?: string[];
}
