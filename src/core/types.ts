/**
 * Core type definitions for Lineage.
 *
 * The pipeline is: Text → Parser → AST → Layout → LayoutResult → Renderer → SVG
 *
 * Each diagram type (genogram, ecomap, pedigree) implements its own:
 *   - Parser:   text → DiagramAST
 *   - Layout:   DiagramAST → LayoutResult
 *   - Renderer: LayoutResult → SVG string
 */

// ─── AST Types ───────────────────────────────────────────────

export type DiagramType = "genogram" | "ecomap" | "pedigree";

export interface DiagramAST {
  type: DiagramType;
  individuals: Individual[];
  relationships: Relationship[];
  metadata?: Record<string, string>;
}

export interface Individual {
  id: string;
  label: string;
  sex: "male" | "female" | "unknown" | "other";
  status: "alive" | "deceased" | "stillborn" | "miscarriage" | "abortion";
  birthYear?: number;
  deathYear?: number;
  /** Medical/psychological conditions (genogram-specific) */
  conditions?: Condition[];
  /** Custom properties for extensibility */
  properties?: Record<string, string>;
}

export interface Condition {
  label: string;
  /** Fill pattern: 'full' | 'half-left' | 'half-right' | 'quarter' | 'striped' */
  fill: string;
  color?: string;
}

export type RelationshipType =
  | "married"
  | "divorced"
  | "separated"
  | "engaged"
  | "cohabiting"
  | "parent-child"
  | "adopted"
  | "foster"
  | "twin-identical"
  | "twin-fraternal"
  // Ecomap-specific
  | "strong"
  | "weak"
  | "stressful"
  | "reciprocal";

export interface Relationship {
  type: RelationshipType;
  from: string; // Individual id
  to: string; // Individual id
  label?: string;
  /** For ecomap: line weight 1-5 */
  weight?: number;
}

// ─── Layout Types ────────────────────────────────────────────

export interface LayoutResult {
  width: number;
  height: number;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Generation/layer index (0 = oldest generation) */
  generation: number;
  individual: Individual;
}

export interface LayoutEdge {
  from: string;
  to: string;
  relationship: Relationship;
  /** SVG path data (d attribute) */
  path: string;
}

// ─── Diagram Plugin Interface ────────────────────────────────

export interface DiagramPlugin {
  type: DiagramType;
  detect: (text: string) => boolean;
  parse: (text: string) => DiagramAST;
  layout: (ast: DiagramAST, config: LayoutConfig) => LayoutResult;
  render: (layout: LayoutResult, config: RenderConfig) => string;
}

export interface LayoutConfig {
  /** Horizontal spacing between nodes */
  nodeSpacingX: number;
  /** Vertical spacing between generations */
  nodeSpacingY: number;
  /** Node dimensions */
  nodeWidth: number;
  nodeHeight: number;
}

export interface RenderConfig {
  fontFamily: string;
  fontSize: number;
  theme: string;
  padding: number;
}
