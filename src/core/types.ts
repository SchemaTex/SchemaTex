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

export type DiagramType = "genogram" | "ecomap" | "pedigree" | "phylo";

export type GenogramMode = "medical" | "heritage";
export type LegendPosition = "bottom-right" | "right" | "bottom-center" | "none";

export interface DiagramAST {
  type: DiagramType;
  individuals: Individual[];
  relationships: Relationship[];
  metadata?: Record<string, string>;
  /** Legend definitions (pedigree traits, heritage colors, etc.) */
  legend?: LegendEntry[];
  /** Genogram display mode: medical conditions or cultural heritage */
  mode?: GenogramMode;
  /** Legend box position */
  legendPosition?: LegendPosition;
}

export interface LegendEntry {
  id: string;
  label: string;
  /** Fill position (for pedigree trait legend) */
  fill?: ConditionFill;
  /** Color (for heritage legend or pedigree trait legend) */
  color?: string;
}

export interface Individual {
  id: string;
  label: string;
  sex: Sex;
  status: IndividualStatus;
  birthYear?: number;
  deathYear?: number;
  /** Medical/psychological conditions (genogram) or affected traits (pedigree) */
  conditions?: Condition[];
  /** Genetic status for pedigree charts */
  geneticStatus?: GeneticStatus;
  /** Child relationship modifier */
  childType?: ChildType;
  /** Special markers */
  markers?: IndividualMarker[];
  /** Gender identity annotation (Bennett 2022: when gender ≠ assigned sex) */
  genderIdentity?: string;
  /** Cultural/ethnic heritage identifiers (heritage genogram mode) */
  heritage?: string[];
  /** Age to display inside shape (auto-calculated from birthYear if omitted) */
  age?: number;
  /** Rich annotations: occupation, traits, notes, etc. */
  annotations?: Record<string, string>;
  /** Whether this individual is external/non-family (dashed border) */
  external?: boolean;
  /** Custom properties for extensibility */
  properties?: Record<string, string>;
}

export type Sex =
  | "male"
  | "female"
  | "unknown"
  | "other"
  // Bennett 2022 additions
  | "nonbinary"
  | "intersex";

export type IndividualStatus =
  | "alive"
  | "deceased"
  | "stillborn"
  | "miscarriage"
  | "abortion"
  // Expanded statuses
  | "pregnancy"
  | "sab" // spontaneous abortion (pedigree terminology)
  | "tab" // therapeutic/induced abortion
  | "ectopic";

export type GeneticStatus =
  | "unaffected"
  | "affected"
  | "carrier"
  | "carrier-x" // X-linked carrier (dot in center)
  | "obligate-carrier"
  | "presymptomatic";

export type ChildType =
  | "biological"
  | "adopted"
  | "adopted-in" // pedigree: adopted into family
  | "adopted-out" // pedigree: adopted out of family
  | "foster"
  | "step"
  | "surrogate"
  | "donor"
  | "donor-egg"
  | "donor-sperm"
  | "donor-embryo";

export type IndividualMarker =
  | "proband" // pedigree: index case (arrow + P)
  | "consultand" // pedigree: person who sought counseling (arrow + C)
  | "evaluated" // pedigree: clinically evaluated (E)
  | "index-person" // genogram: identified patient (concentric shape)
  | "transgender" // Bennett 2022: gender ≠ assigned sex
  | "no-children" // by choice
  | "infertile";

export type TwinType =
  | "twin-identical" // monozygotic
  | "twin-fraternal" // dizygotic
  | "twin-unknown" // unknown zygosity
  | "triplet-identical"
  | "triplet-fraternal";

export interface Condition {
  label: string;
  /** Fill pattern for condition display */
  fill: ConditionFill;
  /** Color for the fill (hex or named). Falls back to category default. */
  color?: string;
  /** Medical category for automatic color assignment */
  category?: MedicalCategory;
}

export type ConditionFill =
  | "full"
  | "half-left"
  | "half-right"
  | "half-top"
  | "half-bottom"
  | "quad-tl"
  | "quad-tr"
  | "quad-bl"
  | "quad-br"
  | "striped" // carrier/asymptomatic
  | "dotted"
  | "carrier"; // alias for striped

/** Standard 22-category medical condition system (genogram) */
export type MedicalCategory =
  | "cardiovascular"
  | "cancer"
  | "diabetes"
  | "mental-health"
  | "depression"
  | "anxiety"
  | "bipolar"
  | "ptsd"
  | "substance-alcohol"
  | "substance-drugs"
  | "substance-tobacco"
  | "neurological"
  | "respiratory"
  | "autoimmune"
  | "genetic"
  | "reproductive"
  | "eating-disorder"
  | "learning-developmental"
  | "kidney"
  | "liver-gi"
  | "obesity"
  | "other";

// ─── Phylogenetic Tree Types ────────────────────────────────

/** Layout algorithm for phylogenetic tree */
export type PhyloLayout = "rectangular" | "slanted" | "circular" | "unrooted";

/** Tree representation mode — determines how branch lengths are interpreted */
export type PhyloMode = "phylogram" | "cladogram" | "chronogram";

/** Clade highlight display mode */
export type CladeHighlightMode = "branch" | "background" | "both";

/** A phylogenetic tree node (distinct from family-tree Individual) */
export interface PhyloNode {
  /** Unique id (auto-generated for unnamed internal nodes) */
  id: string;
  /** Display label (species name, gene id, etc.) */
  label?: string;
  /** Branch length to parent (substitutions/site or time units) */
  branchLength?: number;
  /** Bootstrap support or Bayesian posterior probability (0-100 or 0-1) */
  support?: number;
  /** Children nodes (empty = leaf/tip) */
  children: PhyloNode[];
  /** Is this a leaf/tip node? */
  isLeaf: boolean;
  /** NHX metadata key-value pairs */
  nhx?: Record<string, string>;
}

/** Clade definition for visual highlighting */
export interface CladeDef {
  id: string;
  /** Label to display next to clade bracket/background */
  label?: string;
  /** Leaf ids that define this clade (MRCA computed automatically) */
  members: string[];
  /** Branch/background color */
  color?: string;
  /** Highlight mode */
  highlight?: CladeHighlightMode;
}

/** Phylogenetic tree AST — separate from DiagramAST because structure is fundamentally different */
export interface PhyloTreeAST {
  type: "phylo";
  /** Tree title */
  title?: string;
  /** Root node of the tree */
  root: PhyloNode;
  /** Is this explicitly unrooted? */
  unrooted: boolean;
  /** Layout algorithm */
  layout: PhyloLayout;
  /** Branch length interpretation */
  mode: PhyloMode;
  /** Clade definitions for visual highlighting */
  clades: CladeDef[];
  /** Scale bar label (e.g. "substitutions/site", "Million years ago") */
  scaleLabel?: string;
  /** Most recent sampling date (for chronogram mode) */
  mrsd?: string;
  /** Outgroup taxon id (for rooting) */
  outgroup?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
}

/** Layout result for phylogenetic tree */
export interface PhyloLayoutNode {
  node: PhyloNode;
  x: number;
  y: number;
  /** Angle in radians (for circular/unrooted layouts) */
  angle?: number;
  /** Radius from center (for circular/unrooted layouts) */
  radius?: number;
}

/** Phylogenetic tree render config (extends base RenderConfig) */
export interface PhyloRenderConfig {
  fontFamily: string;
  fontSize: number;
  theme: string;
  padding: number;
  /** Branch line width in px */
  branchWidth: number;
  /** Show tip dots */
  showTipDots: boolean;
  /** Show bootstrap/support values as text */
  showSupportValues: boolean;
  /** Show bootstrap/support values as colored dots */
  showSupportDots: boolean;
  /** Minimum support value to display (default: 50) */
  supportThreshold: number;
  /** Show scale bar */
  showScaleBar: boolean;
  /** Tip spacing in px */
  tipSpacing: number;
  /** Fan opening angle in degrees (circular layout, default: 0 = full circle) */
  openAngle: number;
  /** Italicize species binomials automatically */
  italicizeSpecies: boolean;
}

// ─── Relationship Types ─────────────────────────────────────

export type RelationshipType =
  // Structural couple relationships (genogram + pedigree)
  | "married"
  | "divorced"
  | "separated"
  | "engaged"
  | "cohabiting"
  | "domestic-partnership"
  | "consanguineous"
  // Structural parent-child
  | "parent-child"
  | "adopted"
  | "foster"
  | "twin-identical"
  | "twin-fraternal"
  // Emotional relationships — Positive/Close (genogram)
  | "harmony"
  | "close"
  | "bestfriends"
  | "love"
  | "inlove"
  | "friendship"
  // Emotional — Negative/Hostile
  | "hostile"
  | "conflict"
  | "enmity"
  | "distant-hostile"
  | "cutoff"
  // Emotional — Ambivalent/Complex
  | "close-hostile"
  | "fused"
  | "fused-hostile"
  // Emotional — Distance
  | "distant"
  | "normal"
  | "nevermet"
  // Emotional — Abuse (directional)
  | "abuse"
  | "physical-abuse"
  | "emotional-abuse"
  | "sexual-abuse"
  | "neglect"
  // Emotional — Control/Power (directional)
  | "manipulative"
  | "controlling"
  | "jealous"
  // Emotional — Special
  | "focused"
  | "focused-neg"
  | "distrust"
  | "admirer"
  | "limerence"
  // Ecomap-specific
  | "strong"
  | "moderate"
  | "weak"
  | "stressful"
  | "stressful-strong"
  | "conflictual"
  | "broken"
  | "reciprocal";

export interface Relationship {
  type: RelationshipType;
  from: string; // Individual id
  to: string; // Individual id
  label?: string;
  /** Is this relationship directional? (abuse, control, focused, ecomap energy flow) */
  directional?: boolean;
  /** For ecomap: line weight 1-5 */
  weight?: number;
  /** For ecomap: energy flow direction */
  energyFlow?: "from" | "to" | "mutual" | "none";
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
  /** Show age number inside shapes */
  showAge?: boolean;
  /** Show rich annotations below names */
  showAnnotations?: boolean;
  /** Show relationship labels on lines */
  showEdgeLabels?: boolean;
  /** Show in-law relationship labels */
  showInLawLabels?: boolean;
  /** Legend position override */
  legendPosition?: LegendPosition;
}
