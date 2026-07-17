/**
 * Core type definitions for Schematex.
 *
 * The pipeline is: Text → Parser → AST → Layout → LayoutResult → Renderer → SVG
 *
 * Each diagram type (genogram, ecomap, pedigree) implements its own:
 *   - Parser:   text → DiagramAST
 *   - Layout:   DiagramAST → LayoutResult
 *   - Renderer: LayoutResult → SVG string
 */

// Type-only import (erased at runtime — no dependency cycle) for the plugin
// lint hook's return type.
import type { SchematexDiagnostic } from "./diagnostics";

// ─── AST Types ───────────────────────────────────────────────

export type DiagramType =
  // Relationship diagrams
  | "genogram"
  | "ecomap"
  | "pedigree"
  | "phylo"
  | "sociogram"
  // Electrical engineering diagrams
  | "timing"    // Digital timing / waveform (06-TIMING-STANDARD)
  | "logic"     // Logic gate netlist (07-LOGIC-GATE-STANDARD)
  | "circuit"   // Circuit schematic positional DSL (08-CIRCUIT-SCHEMATIC-STANDARD)
  | "blockdiagram"  // Control systems block diagram (09-BLOCK-DIAGRAM-STANDARD)
  | "ladder"    // PLC ladder logic IEC 61131-3 (10-LADDER-LOGIC-STANDARD)
  | "sld"       // Single-line diagram / power distribution (11-SINGLE-LINE-STANDARD)
  // Corporate / legal structure diagrams
  | "entity"    // Entity structure / corporate ownership (12-ENTITY-STRUCTURE-STANDARD)
  // Causality / analysis diagrams
  | "fishbone" // Ishikawa cause-and-effect (14-FISHBONE-STANDARD)
  // Set-theory / logic diagrams
  | "venn"    // Venn / Euler diagram (15-VENN-STANDARD)
  // Generic process / decision flowchart
  | "flowchart" // Flowchart (14-FLOWCHART-STANDARD)
  // Knowledge / brainstorming diagrams
  | "mindmap" // Mindmap — radial Buzan + markmap-compat tree (20-MINDMAP-STANDARD)
  // Strategy / prioritization / analysis diagrams
  | "matrix" // Matrix / 2x2 quadrant / 3x3 / N×M heatmap (18-MATRIX-STANDARD)
  // Organizational hierarchy diagrams
  | "orgchart" // Organizational / reporting structure chart (16-ORGCHART-STANDARD)
  // Decision-analysis / ML / taxonomy trees
  | "decisiontree" // Decision tree — Howard-Raiffa + CART + taxonomy (17-DECISION-TREE-STANDARD)
  // Time axis
  | "timeline" // Timeline — events / eras / lifespans on a time axis (19-TIMELINE-STANDARD)
  // Behavior modeling
  | "state"    // UML 2.5 / Harel statechart (21-STATE-DIAGRAM-STANDARD)
  // Process & instrumentation
  | "pid"     // ISA-5.1 / ISO 10628 P&ID (22-PID-STANDARD)
  // Data modeling
  | "erd"     // Entity-Relationship Diagram (Chen / crow's foot, 27-ERD-STANDARD)
  // Physical wiring / hardware prototyping
  | "breadboard"    // Fritzing-style breadboard view (26-BREADBOARD-STANDARD)
  // Business process modelling
  | "bpmn"       // OMG BPMN 2.0 business process diagram (25-BPMN-STANDARD)
  // IEC 61131-3 visual PLC languages (sister to ladder §10)
  | "fbd"        // Function Block Diagram — IEC 61131-3 §6.4 (23-FBD-STANDARD)
  | "sfc"        // Sequential Function Chart — IEC 61131-3 §6.5 (24-SFC-STANDARD)
  // Evidence-synthesis / research reporting
  | "prisma"    // PRISMA 2020 flow diagram (28-PRISMA-STANDARD)
  // Structural UML (sister to behavioral §21 state)
  | "usecase"   // UML 2.5.1 use case diagram (29-USECASE-STANDARD)
  // Project scheduling networks
  | "pert"      // PERT / CPM activity-on-node network (32-PERT-STANDARD)
  // Behavioral UML (sister to §21 state, §29 usecase)
  | "sequence"  // UML 2.5.1 §17 sequence / interaction diagram (33-SEQUENCE-STANDARD)
  // Concurrency / discrete-event formalism
  | "petri"     // Petri net (place/transition net) — Murata 1989 / ISO-IEC 15909 (34-PETRINET-STANDARD)
  // Network / infrastructure topology
  | "network"   // Network topology — Cisco-convention icons + hierarchical/spine-leaf layout (35-NETWORK-STANDARD)
  // Structural UML (sister to behavioral §21 state, §29 usecase, §33 sequence)
  | "umlclass" // UML 2.5.1 §9–§11 class diagram — classifiers + 6 relationships (36-UMLCLASS-STANDARD)
  // Risk & reliability engineering
  | "faulttree" // Fault Tree Analysis — NUREG-0492 / IEC 61025, MOCUS cut sets + P(top) (37-FAULT-TREE-STANDARD)
  | "bowtie" // Bowtie risk diagram — CCPS/EI 2018 barrier-based risk mgmt, symmetric threat→knot→consequence wings (38-BOWTIE-STANDARD)
  | "eventtree" // Event Tree Analysis — IEC 62502 / NUREG, computed path frequencies (39-EVENT-TREE-STANDARD)
  | "fmea" // FMEA — AIAG-VDA / IEC 60812, computed RPN=S×O×D + Action Priority (40-FMEA-STANDARD)
  | "rbd" // Reliability Block Diagram — IEC 61078, computed system reliability (series/parallel/k-of-n) + Birnbaum importance + SPOF (50-RBD-STANDARD)
  | "comparison" // Comparison & decision — T-chart / pros-cons / comparison matrix / Pugh decision matrix (computed weighted winner) / Thinking-Maps double-bubble (51-COMPARISON-STANDARD)
  // Systems thinking / stochastic
  | "causalloop" // Causal Loop Diagram — Sterman system dynamics, R/B loop detection (41-CAUSAL-LOOP-STANDARD)
  | "markov" // Markov chain — stationary distribution + state classification (42-MARKOV-CHAIN-STANDARD)
  // Software / process engineering
  | "gitgraph" // Git commit graph — Mermaid gitGraph parity, branch swimlanes (43-GIT-GRAPH-STANDARD)
  | "epc" // Event-driven Process Chain — ARIS, event/function alternation validation (44-EPC-STANDARD)
  | "idef0" // IDEF0 function modeling — FIPS PUB 183, ICOM arrow placement (45-IDEF0-STANDARD)
  | "threatmodel" // Threat model (DFD + STRIDE) — Shostack per-element mapping + trust-boundary crossing (46-THREAT-MODEL-STRIDE-STANDARD)
  | "welding" // Welding symbols — AWS A2.4 / ISO 2553 reference-line callouts (47-WELDING-SYMBOL-STANDARD)
  // Architectural / space planning
  | "floorplan" // Floor plan / space layout — AGS poché walls, door swing arcs, furniture catalog (48-FLOORPLAN-STANDARD)
  | "siteplan" // Site plan / parcel layout — property boundaries, roads, setbacks, easements, footprints
  // Sports / tactics
  | "playbook"; // Football playbook — chalkboard X&O notation, route tree, formations, coverage (49-SPORTS-PLAYBOOK-STANDARD)

export type GenogramMode = "medical" | "heritage";

/**
 * Standard legend positions:
 *   - "bottom-inline" (default) — horizontal strip below the diagram, no box/border
 *   - "bottom-right"            — overlay anchored at bottom-right corner
 *   - "none"                    — disabled
 *
 * All other values are legacy aliases (pedigree DSL, older docs) that the renderer
 * silently maps to one of the standard positions: "outside-*", "right",
 * "top-*", "bottom-left", "bottom-center" → bottom-inline (or bottom-right where
 * a corner is closer in spirit).
 */
export type LegendPosition =
  | "bottom-inline"
  | "bottom-right"
  | "none"
  // Legacy aliases (kept for backwards compat; mapped at render time)
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "outside-right"
  | "outside-bottom"
  | "right";

export type LegendItemKind =
  | "shape"
  | "fill"
  | "fill-pattern"
  | "line"
  | "marker"
  | "edge";

export type LegendLinePattern =
  | "solid"
  | "dashed"
  | "dotted"
  | "double"
  | "wavy"
  | "zigzag"
  | "broken";

export interface LegendItem {
  /** Stable identifier addressable from DSL `legend.label <key>: ...` */
  key: string;
  /** Display text (user-overridable). */
  label: string;
  kind: LegendItemKind;
  /** Primary color. For "shape": stroke. For "line"/"edge": stroke. For "fill"/"fill-pattern"/"marker": fill. */
  color?: string;
  /** For kind: "shape" — fill color (separate from stroke). Used for WYSIWYG matching of node fills. */
  fill?: string;
  /** Secondary color for two-tone swatches (half-fill, etc.). */
  color2?: string;
  pattern?: LegendLinePattern;
  strokeWidth?: number;
  /** For kind: "shape" — "square" | "circle" | "diamond" | "triangle" | "concentric-square" | "concentric-circle". */
  shape?: string;
  /** For kind: "marker" / "edge" — "arrow" | "X" | "dot" | "P" | "C" | "E" | "star" | "slash". */
  marker?: string;
  /** Section group id (e.g. "symbols", "structural", "relationships", "conditions"). */
  section?: string;
}

export interface LegendSection {
  id: string;
  title: string;
  hidden?: boolean;
}

export interface LegendSpec {
  /** "auto" resolves to "on" if items remain after override, else "off". */
  mode: "on" | "off" | "auto";
  title: string;
  position: LegendPosition;
  columns: number;
  sections: LegendSection[];
  items: LegendItem[];
}

/** User edits parsed from DSL; merged onto each diagram's auto-derived spec. */
export interface LegendOverrides {
  mode?: "on" | "off" | "auto";
  title?: string;
  position?: LegendPosition;
  columns?: number;
  /** Rename items by key. */
  labels?: Record<string, string>;
  /** Hide items by key. */
  hide?: string[];
  /** Rename / hide sections by id. */
  sections?: Record<string, { title?: string; hidden?: boolean }>;
  /** Manually authored items appended after auto-derived ones. */
  added?: LegendItem[];
}

export interface DiagramAST {
  type: DiagramType;
  individuals: Individual[];
  relationships: Relationship[];
  metadata?: Record<string, string>;
  /** Exact authored title token, including quotes when present. */
  titleSourceRange?: SourceRange;
  /** Legacy: pedigree-style trait legend. To be migrated into LegendOverrides.added. */
  legend?: LegendEntry[];
  /** Genogram display mode: medical conditions or cultural heritage */
  mode?: GenogramMode;
  /** Legacy: pre-unified-legend position field. New code uses legendOverrides.position. */
  legendPosition?: LegendPosition;
  /** Unified legend system — user DSL edits merged onto auto-derived spec at render time. */
  legendOverrides?: LegendOverrides;
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
  /** Exact explicitly-authored display label token. */
  labelSourceRange?: SourceRange;
  sex: Sex;
  status: IndividualStatus;
  birthYear?: number;
  deathYear?: number;
  /**
   * Full ISO birth date (`"1940-03-12"`) for genealogy / legal family trees.
   * Backward-compatible with `birthYear`: when present it takes precedence in
   * the vital-records caption (`* 1940-03-12`). A bare 4-digit year still fills
   * `birthYear`.
   */
  dob?: string;
  /** Full ISO death date (`"2018-11-04"`), rendered as `† 2018-11-04`. */
  dod?: string;
  /** One-line free-text annotation rendered as a small caption under the symbol. */
  note?: string;
  /**
   * Legal/genealogy birth status (German Ahnentafel convention). Modifies the
   * born glyph in the vital-records caption: `out-of-wedlock` → `(*)`,
   * `adopted` → `[*]`. Default (legitimate) keeps the plain `*` born glyph.
   */
  birthStatus?: "legitimate" | "out-of-wedlock" | "adopted";
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
  /**
   * Optional shape override. By default the shape is derived from `sex`
   * (male=square, female=circle, other=diamond). Some kinship/anthropology
   * conventions use triangles for males, etc. This field lets the DSL request
   * a specific shape regardless of sex.
   */
  shape?: "square" | "circle" | "diamond" | "triangle" | "triangle-down";
  /**
   * Pedigree convention for "known relative, unknown ancestry":
   * id of another individual whose generation this person shares as a sibling.
   * No phantom parents are synthesized — layout pins generation, renderer
   * draws a dashed bracket between the two.
   */
  siblingOf?: string;
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
  | "infertile"
  // Pedigree convention: ≥1 sibling(s) of unknown count — single diamond with "?"
  | "unknown-siblings";

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

// ─── Fishbone (Ishikawa) Types ──────────────────────────────

export type FishboneOrientation = "ltr" | "rtl";

/** Which halves of the spine host ribs. */
export type FishboneSides = "both" | "top" | "bottom";

/** Density preset — controls spine length, slot spacing, header size. */
export type FishboneDensity = "compact" | "normal" | "spacious";

/** Where cause branches stick out of a rib. */
export type FishboneCauseSide = "head" | "tail" | "both";

export interface FishboneNode {
  /** Display text on the bone. */
  label: string;
  /** Exact authored label token used by interactive text editing. */
  sourceRange?: SourceRange;
  /** Optional explicit hex color (conventionally set only on majors). */
  color?: string;
  /** Nested sub-causes (unbounded depth, recommended ≤ 3). */
  children: FishboneNode[];
  /** Per-rib placement override (only honored on majors). */
  side?: "top" | "bottom";
  /** Per-rib explicit ordering within its half (lower = closer to tail). */
  order?: number;
}

export interface FishboneLegendEntry {
  label: string;
  color: string;
}

export interface FishboneAST {
  type: "fishbone";
  title?: string;
  titleSourceRange?: SourceRange;
  /** Problem / outcome displayed in the head box. */
  effect: string;
  effectSourceRange?: SourceRange;
  /** Top-level cause categories (major bones). */
  majors: FishboneNode[];
  /** Effect position: `ltr` → head on right, `rtl` → head on left. */
  orientation: FishboneOrientation;
  /** Optional explicit canvas dimensions (otherwise auto-computed). */
  width?: number;
  height?: number;
  /** Optional legend entries rendered in a corner box. */
  legend?: FishboneLegendEntry[];
  metadata?: Record<string, string>;
  /** Which sides of the spine host ribs. Default: "both". */
  sides?: FishboneSides;
  /** Rib slope dx/dy. Default: 0.6. Accepts number or preset name. */
  ribSlope?: number;
  /** Density preset. Default: "normal". */
  density?: FishboneDensity;
  /** Which side of the rib cause branches stick out on. Default: "head". */
  causeSide?: FishboneCauseSide;
}

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
  | "cohabiting-ended" // unmarried cohabitation that has ended (LATAM "quiebre")
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
  /**
   * Genogram parent-child only. When true, this link is data-true but
   * does NOT dominate layout — used for foster/adopted/guardian "current
   * caregiver" relationships when biological parents already claim the
   * child structurally. Renderer draws it as a dotted line.
   */
  secondary?: boolean;
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

/** A source span in the caller's original UTF-16 string coordinate space. */
export interface SourceRange {
  /** Absolute UTF-16 offsets; end is exclusive. */
  start: number;
  end: number;
  /** Zero-based line and columns; colEnd is exclusive. */
  line: number;
  colStart: number;
  colEnd: number;
}

export type ScenePositionSource =
  | {
      /** Existing authored `x,y` coordinate pair. */
      kind?: "point";
      range: SourceRange;
      x: number;
      y: number;
      unitsPerSvgX: number;
      unitsPerSvgY: number;
      /** Optional syntax emitted around the coordinate pair (also supports zero-width insertion ranges). */
      prefix?: string;
      suffix?: string;
    }
  | {
      /** One authored scalar controlled by a one-axis geometry handle. */
      kind: "scalar";
      range: SourceRange;
      value: number;
      unitsPerSvgX: number;
      min?: number;
      max?: number;
      prefix?: string;
      suffix?: string;
    }
  | {
      /** Reorder one complete authored block by dragging a discrete row handle. */
      kind: "source-block";
      range: SourceRange;
      blocks: SourceRange[];
      index: number;
      step: number;
    }
  | {
      /** Authored `WxH` dimensions, edited by edge/corner handles. */
      kind: "size";
      range: SourceRange;
      width: number;
      height: number;
      unitsPerSvgX: number;
      unitsPerSvgY: number;
      axis: "x" | "y" | "xy";
      minWidth?: number;
      minHeight?: number;
    }
  | {
      /** Timeline date or year scalar, edited on the time axis. */
      kind: "date";
      range: SourceRange;
      value: number;
      raw: string;
      precision: "day" | "month" | "year" | "ma";
      unitsPerSvgX: number;
    }
  | {
      /** Boundary between two adjacent runs in a canonical timing wave. */
      kind: "wave-boundary";
      range: SourceRange;
      wave: string;
      boundary: number;
      runStart: number;
      runEnd: number;
      periodWidth: number;
    }
  | {
      /** Breadboard point/span placement, snapped to physical board holes. */
      kind: "breadboard";
      range: SourceRange;
      from: {
        kind: "hole" | "rail";
        col: number;
        row?: string;
        rail?: string;
      };
      to?: {
        kind: "hole" | "rail";
        col: number;
        row?: string;
        rail?: string;
      };
      anchorSvgX: number;
      anchorSvgY: number;
      gridX0: number;
      holeRowYs: number[];
      railRowYs: Record<string, number>;
      pitch: number;
      cols: number;
    };

/** Derived geometry and source identity for an interactive render. */
export interface SceneItem {
  /** Render-unique identity. This, rather than semanticId, is written to SVG. */
  key: string;
  kind: "node" | "edge" | "label" | "group" | "handle";
  /** Stable DSL identity used by pin/reconcile operations when available. */
  semanticId?: string;
  label?: string;
  /**
   * How setLabel writes the edited value back into source. Most DSL labels
   * use delimiter-aware encoding; authored markup such as Mindmap Markdown
   * must be replaced verbatim so quotes/backticks remain meaningful content.
   */
  labelWrite?: "encoded" | "verbatim" | "identifier" | "newick-bare" | "newick-quoted";
  sourceRange?: SourceRange;
  /** All identity references that must be renamed atomically with this label. */
  labelSourceRanges?: SourceRange[];
  bbox?: { x: number; y: number; width: number; height: number };
  path?: string;
  /**
   * Optional native coordinate writer for DSLs that already author an `at x,y`
   * token. The interaction layer still works in SVG coordinates; setPosition
   * converts the drag delta back into source units and replaces this range.
   */
  positionSource?: ScenePositionSource;
  editable: {
    label: boolean;
    position: "free" | "move-x" | "move-y" | "none";
  };
}

export interface DiagramPlugin {
  type: DiagramType;
  detect: (text: string) => boolean;
  render: (text: string, config?: RenderConfig) => string;
  /** Parse DSL text to the diagram's AST (for JSON export / programmatic access). */
  parse?: (text: string) => unknown;
  /**
   * Optional non-fatal validation pass. Runs after a successful parse and
   * returns domain-level warnings (e.g. an incomplete instrument loop) without
   * blocking rendering. Surfaced through `parseResult` / `renderResult`
   * diagnostics. Must not throw — return `[]` when there's nothing to flag.
   */
  lint?: (text: string) => SchematexDiagnostic[];
  capabilities?: {
    /** Renderer can populate RenderConfig.__scene when explicitly requested. */
    scene?: boolean;
    /** The engine has at least one safe position-editing mode. */
    editablePosition?: boolean;
  };
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
  /** @internal Core-owned scene collector; absent in the default render path. */
  __scene?: SceneItem[];
  /** @internal Parsed @overrides pins, blanked out before the diagram parser. */
  __pins?: Map<string, { x: number; y: number }>;
  /** @internal Exact preprocessed DSL used by compatibility scene adapters. */
  __source?: string;
}

// ─── Electrical Engineering AST Types ───────────────────────

// ── Timing Diagram ──────────────────────────────────────────

/** A single waveform signal or group */
export type TimingSignalState =
  | "0" | "1" | "x" | "z" | "=" | "." | "u" | "d"
  | "p" | "P" | "n" | "N" | "h" | "H" | "l" | "L"
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

export interface TimingSignal {
  /** Signal name (display label) */
  name: string;
  /** WaveDrom wave string: sequence of state chars */
  wave: string;
  /** Exact authored wave token; absent for expanded clock/rle shorthand. */
  waveSourceRange?: SourceRange;
  /** Data labels for bus states (= or 2-9) */
  data?: string[];
  /** Phase offset in half-periods */
  phase?: number;
  /** Period multiplier */
  period?: number;
  /** Node markers for annotation arrows */
  node?: string;
}

export interface TimingGroup {
  label: string;
  signals: Array<TimingSignal | TimingGroup>;
}

export interface TimingAnnotation {
  /** Source node marker id */
  from: string;
  /** Target node marker id */
  to: string;
  label?: string;
}

export interface TimingAST {
  type: "timing";
  title?: string;
  titleSourceRange?: SourceRange;
  /** Time scale multiplier (1–4) */
  hscale?: number;
  signals: Array<TimingSignal | TimingGroup>;
  annotations?: TimingAnnotation[];
  metadata?: Record<string, string>;
}

// ── Logic Gate ───────────────────────────────────────────────

export type LogicGateType =
  // ── Combinational Gates ──────────────────────────────────────
  | "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR" | "XNOR" | "BUF"
  // ── Buffers with special output types ────────────────────────
  | "TRISTATE_BUF"   // Buffer + enable pin; Z-state when disabled
  | "TRISTATE_INV"   // Inverting buffer + enable pin
  | "OPEN_DRAIN"     // Open-drain/open-collector output (pull-up required)
  | "SCHMITT"        // Schmitt trigger; hysteresis symbol inside body
  // ── Edge-triggered flip-flops ─────────────────────────────────
  | "DFF"            // D flip-flop (clock triangle)
  | "JKFF"           // JK flip-flop
  | "SRFF"           // SR flip-flop
  | "TFF"            // T (toggle) flip-flop
  // ── Level-sensitive latches ────────────────────────────────────
  | "LATCH_SR"       // SR latch (NOR/NAND cross-coupled, no clock)
  | "LATCH_D"        // D latch (transparent when enable=1)
  // ── Combinational complex ──────────────────────────────────────
  | "MUX" | "DEMUX" | "DECODER" | "ENCODER"
  // ── Sequential complex ─────────────────────────────────────────
  | "COUNTER"        // Generic binary counter (CTR label, CLK/RESET/Q0–Q3)
  | "SHIFT_REG"      // Generic shift register (SRG label, CLK/SER/Q0–Q7)
  // Graceful-degradation sentinel — an unrecognised gate token, drawn as a
  // flagged placeholder rather than blanking the whole diagram.
  | "unknown";

export type LogicGateStyle = "ansi" | "iec";

export interface LogicGateNode {
  id: string;
  gateType: LogicGateType;
  /** Original (unrecognised) gate token, set only when `gateType === "unknown"`. */
  rawType?: string;
  inputs: string[];          // References to signal ids or gate ids (with ~ for active-low)
  label?: string;
  style?: LogicGateStyle;
  /** Optional module/sub-circuit this gate belongs to */
  moduleId?: string;
}

export interface LogicGateModule {
  id: string;
  label: string;
}

export interface LogicGateInput {
  id: string;
  label: string;
  isActiveLow?: boolean;
  /** True when the parser inferred this input from a gate reference rather than an explicit declaration. */
  autoDeclared?: boolean;
}

export interface LogicGateOutput {
  id: string;
  /** Signal source id (gate output or input port) */
  from: string;
  label: string;
  isActiveLow?: boolean;
}

export interface LogicGateAST {
  type: "logic";
  title?: string;
  style?: LogicGateStyle;
  inputs: LogicGateInput[];
  outputs: LogicGateOutput[];
  gates: LogicGateNode[];
  modules?: LogicGateModule[];
  metadata?: Record<string, string>;
  /** Non-fatal parser warnings (e.g. signals auto-declared as inputs). */
  warnings?: string[];
}

// ── Circuit Schematic ────────────────────────────────────────

export type CircuitComponentType =
  // ── Resistors & Passive Variants ────────────────────────────
  | "resistor"          // Zigzag (ANSI) / rectangle (IEC)
  | "potentiometer"     // Resistor + diagonal arrow, 3-pin (A/wiper/B)
  | "rheostat"          // Resistor + diagonal arrow, 2-pin variable
  | "thermistor_ntc"    // Resistor + diagonal arrow + "-t°" label
  | "thermistor_ptc"    // Resistor + diagonal arrow + "+t°" label
  | "ldr"               // Resistor + two inward arrows (light dependent)
  | "varistor"          // Resistor + "V" label inside box
  | "fuse"              // Small rectangle/oval on wire (sacrificial)
  | "fuse_slow"         // Fuse + "T" designation

  // ── Capacitors ───────────────────────────────────────────────
  | "capacitor"         // Two parallel lines (nonpolar)
  | "electrolytic_cap"  // Curved plate + polarity markers (polar)
  | "variable_cap"      // Capacitor + diagonal arrow

  // ── Inductors ────────────────────────────────────────────────
  | "inductor"          // Arc humps (air core)
  | "inductor_iron"     // Arc humps + two parallel core lines
  | "inductor_ferrite"  // Arc humps + one filled core line
  | "variable_inductor" // Inductor + diagonal arrow
  | "ferrite_bead"      // Small filled rectangle on wire (EMI bead)
  | "crystal"           // Rect body + two external lines (quartz oscillator)
  | "transformer"       // Two coil groups + core lines

  // ── Diodes ───────────────────────────────────────────────────
  | "diode"             // Triangle + bar
  | "zener"             // Triangle + bent bar (Z)
  | "schottky"          // Triangle + S-bar
  | "led"               // Diode + two outward arrows
  | "photodiode"        // Diode + two inward arrows
  | "varactor"          // Diode + variable capacitor symbol
  | "tvs_diode"         // Bidirectional zener (two bent bars)
  | "bridge_rectifier"  // Diamond of 4 diodes, 4-pin (AC1/AC2/DC+/DC−)

  // ── Bipolar Transistors ───────────────────────────────────────
  | "npn"               // NPN BJT (arrow outward on emitter)
  | "pnp"               // PNP BJT (arrow inward on emitter)
  | "darlington_npn"    // NPN + NPN Darlington pair
  | "darlington_pnp"    // PNP + PNP Darlington pair

  // ── Field Effect Transistors ──────────────────────────────────
  | "nmos"              // N-channel MOSFET enhancement (gate insulated, dashed channel)
  | "pmos"              // P-channel MOSFET enhancement
  | "nmos_depletion"    // N-channel MOSFET depletion (solid channel)
  | "jfet_n"            // N-channel JFET (gate arrow pointing in)
  | "jfet_p"            // P-channel JFET (gate arrow pointing out)

  // ── Power Semiconductors ─────────────────────────────────────
  | "igbt"              // IGBT: MOSFET gate + BJT body + diode body
  | "scr"               // SCR/Thyristor: diode + gate lead (PNPN)
  | "triac"             // TRIAC: two back-to-back SCRs + gate
  | "diac"              // DIAC: two back-to-back diodes, 2-pin

  // ── Optoelectronics ───────────────────────────────────────────
  | "phototransistor"   // NPN shape + two inward arrows on base
  | "optocoupler"       // LED + phototransistor in dashed isolation box

  // ── Op-Amp / Analog ICs ───────────────────────────────────────
  | "opamp"             // Triangle: +/− inputs, output, ±Vcc
  | "comparator"        // Triangle (same shape, open-collector output)
  | "schmitt_buffer"    // Buffer triangle + hysteresis symbol inside
  | "tri_state_buffer"  // Buffer triangle + enable pin
  | "instrumentation_amp" // Three op-amp INA block

  // ── Generic IC & Special Blocks ──────────────────────────────
  | "generic_ic"        // Rect with configurable labeled pins (attrs: pins_left, pins_right)
  | "voltage_regulator" // 3-terminal rect block (IN/GND/OUT), e.g. LM7805
  | "dc_dc_converter"   // 2-port rect block with "DC/DC" label
  | "555_timer"         // 8-pin rect with standard 555 pinout
  | "terminal_block"    // Labeled enclosure with N named terminals (junction box, terminal strip)
  | "enclosure"         // Panel/cabinet outline for control-cabinet layouts
  | "din_rail"          // DIN rail mounting row inside a panel
  | "wire_duct"         // Slotted trunking / wire duct inside a panel
  | "plc"               // PLC / controller module block
  | "pilot_light"       // Front-panel indicator lamp
  | "selector_switch"   // Front-panel selector switch
  | "emergency_stop"    // Mushroom emergency-stop pushbutton

  // ── Sources & Power ───────────────────────────────────────────
  | "voltage_source"    // Circle + V or ± polarity
  | "current_source"    // Circle + arrow
  | "ac_source"         // Circle + ~ (sine symbol)
  | "battery"           // Alternating long/short lines
  | "vcc"               // Power rail arrow pointing up
  | "ground"            // Earth ground (3 horizontal lines)
  | "gnd_signal"        // Signal ground (solid triangle)
  | "gnd_chassis"       // Chassis ground (hash-like)
  | "gnd_digital"       // Digital ground (square)

  // ── Switches ──────────────────────────────────────────────────
  | "switch_spst"       // Single-pole single-throw (angled arm + gap)
  | "switch_spdt"       // Single-pole double-throw (3-pin)
  | "switch_dpdt"       // Double-pole double-throw (6-pin)
  | "push_no"           // Push button normally-open (circle + contact gap)
  | "push_nc"           // Push button normally-closed (circle + line + slash)

  // ── Relays (coil and contacts placed separately) ───────────────
  | "relay_coil"        // Rectangle with coil symbol, 2-pin
  | "relay_no"          // Relay contact normally-open (like switch_spst)
  | "relay_nc"          // Relay contact normally-closed (with slash)

  // ── Industrial control / Power electrical (IEC 60617 §07/§14) ──
  | "contactor"         // Heavy-load switching (KM*) — bold contact + dash actuator
  | "solenoid_valve"    // Pneumatic / hydraulic control (EV*) — coil + valve symbol
  | "thermal_overload"  // Motor protection (F2*) — hashed rectangle + heat marks
  | "disconnect_switch" // Service disconnect / isolator (Q1*) — switch with disconnect bracket

  // ── Electromechanical ─────────────────────────────────────────
  | "motor"             // Circle + M + shaft line
  | "lamp"              // Circle + X (lighting load)
  | "speaker"           // Triangle + box + radiating lines
  | "microphone"        // Circle + vertical lines (capsule)
  | "buzzer"            // Piezo symbol or speaker variant

  // ── Measurement ───────────────────────────────────────────────
  | "ammeter"           // Circle + "A"
  | "voltmeter"         // Circle + "V"
  | "wattmeter"         // Circle + "W"
  | "oscilloscope"      // Circle + waveform symbol

  // ── Connectors & Annotations ──────────────────────────────────
  | "wire"              // Plain wire segment
  | "dot"               // Junction dot
  | "label"             // Net label (flag or text-only)
  | "port"              // Named port (hollow circle + label)
  | "test_point"        // TP marker (small circle + "TP" label)
  | "no_connect"        // X marker — no electrical connection
  | "antenna";          // Antenna (vertical line + radiating stubs)

export type CircuitDirection = "right" | "left" | "up" | "down";

export interface CircuitComponent {
  id: string;
  /** True only when the id is explicitly authored and safe to persist in @overrides. */
  stableId?: boolean;
  componentType: CircuitComponentType;
  direction: CircuitDirection;
  /** Reference to anchor point of previous/named element: e.g. "R1.end", "origin" */
  at?: string;
  /** Display label (R1, C2, etc.) */
  label?: string;
  labelSourceRange?: SourceRange;
  /** Value annotation (1kΩ, 100nF, etc.) */
  value?: string;
  valueSourceRange?: SourceRange;
  /** Extra attributes (length for wires, gain for opamp, etc.) */
  attrs?: Record<string, string>;
}

/** Multi-terminal electrical node — connects multiple anchor refs to the same node */
export interface CircuitNet {
  /** Net name (e.g. "VOUT") */
  id: string;
  /** Anchor refs sharing the same node (e.g. ["R2.end", "U1.out", "OUT.start"]) */
  anchors: string[];
}

export interface CircuitAST {
  type: "circuit";
  title?: string;
  titleSourceRange?: SourceRange;
  components: CircuitComponent[];
  /** Explicit net declarations for multi-terminal connections */
  nets: CircuitNet[];
  metadata?: Record<string, string>;
  /** Layout mode: "positional" (Schemdraw-style direction chain) or "netlist" (SPICE-style, auto-layout). */
  mode?: "positional" | "netlist";
  /**
   * Netlist-only. Maps componentId → { pinName → netId }.
   * Populated by the netlist parser; consumed by the auto-layout engine.
   */
  pinMap?: Record<string, Record<string, string>>;
  /**
   * Netlist-only recoverable-input notes. Components given fewer nets than
   * their pin count are padded with floating no-connect nets and rendered
   * anyway (rather than throwing). Surfaced as `CIRCUIT_PIN_UNDERSPECIFIED`
   * lint warnings (status `partial`).
   */
  recovered?: {
    underspecified?: { id: string; type: string; expected: number; got: number }[];
  };
}

// ── Block Diagram ────────────────────────────────────────────

export type BlockRole = "plant" | "controller" | "sensor" | "actuator" | "reference" | "disturbance" | "generic";

export interface BlockNode {
  id: string;
  /** Display label / transfer function e.g. "G(s)" */
  label: string;
  role?: BlockRole;
  /** Routing hint for feedback/feedforward blocks: "above" = route over forward path */
  route?: "above" | "below";
}

export interface SummingJunction {
  id: string;
  /** Signed inputs: "+r" means add signal r, "-ym" means subtract signal ym */
  inputs: string[];
  /** Output signal id */
  output?: string;
}

export interface BlockEdge {
  from: string;
  to: string;
  /** Signal label e.g. "E(s)", "U(s)" */
  label?: string;
  /** Dashed line for discrete-time signals */
  discrete?: boolean;
}

export interface BlockAST {
  type: "blockdiagram";
  title?: string;
  blocks: BlockNode[];
  sums: SummingJunction[];
  connections: BlockEdge[];
  metadata?: Record<string, string>;
}

// ── Ladder Logic ─────────────────────────────────────────────

export type LadderContactType = "XIC" | "XIO" | "ONS" | "OSF";
export type LadderCoilType = "OTE" | "OTL" | "OTU" | "OTN" | "RES";
export type LadderFBType =
  | "TON" | "TOFF" | "TP"         // Timers
  | "CTU" | "CTD" | "CTUD"        // Counters
  | "ADD" | "SUB" | "MUL" | "DIV" // Math
  | "MOV"                                                       // Move
  | "EQU" | "NEQ" | "GRT" | "LES" | "GEQ" | "LEQ";             // Compare (Allen-Bradley convention)

export interface LadderContact {
  elementType: "contact";
  contactType: LadderContactType;
  tag: string;
  address?: string;
  /** Human-readable description (rendered above the tag as 1–3 wrapped lines) */
  name?: string;
}

export interface LadderCoil {
  elementType: "coil";
  coilType: LadderCoilType;
  tag: string;
  address?: string;
  /** Human-readable description (rendered above the tag as 1–3 wrapped lines) */
  name?: string;
}

export interface LadderFunctionBlock {
  elementType: "function_block";
  fbType: LadderFBType;
  tag: string;
  params: Record<string, string | number>;
}

export type LadderElement = LadderContact | LadderCoil | LadderFunctionBlock;

export interface LadderBranch {
  elements: LadderElement[];
}

export interface LadderRung {
  number: number;
  comment?: string;
  /** Sequential elements and parallel groups */
  elements: Array<LadderElement | { parallel: LadderBranch[] }>;
}

export interface LadderAST {
  type: "ladder";
  title?: string;
  rungs: LadderRung[];
  metadata?: Record<string, string>;
}

// ── Single-Line Diagram ──────────────────────────────────────

export type SLDNodeType =
  // ── Generation & Sources ─────────────────────────────────────
  | "utility"           // Infinite bus / utility feed (circle + ~)
  | "generator"         // Synchronous generator (circle + G)
  | "solar"             // PV array (panel symbol)
  | "wind"              // Wind turbine
  | "ups"               // Uninterruptible power supply block

  // ── Transformers (winding configuration variants) ──────────────
  | "transformer"           // Generic (two coil groups, no winding spec)
  | "transformer_dy"        // Delta primary → Wye grounded secondary (Δ-Yg)
  | "transformer_yd"        // Wye grounded primary → Delta secondary (Yg-Δ)
  | "transformer_yy"        // Wye-Wye (both grounded)
  | "transformer_dd"        // Delta-Delta
  | "autotransformer"       // Single winding with tap (zigzag coil symbol)
  | "transformer_3winding"  // Three-winding power transformer

  // ── Buses & Nodes ─────────────────────────────────────────────
  | "bus"               // Horizontal thick line (6px stroke)
  | "bus_tie"           // Bus-tie breaker between two parallel same-level buses
  | "hub"               // Multi-port synchronization / combining hub (wide rectangle)

  // ── Switching Equipment ───────────────────────────────────────
  | "breaker"           // Circuit breaker (diagonal + arc at top)
  | "breaker_vacuum"    // Vacuum CB (diagonal + "V" inside oval)
  | "switch"            // Disconnect switch (diagonal, no arc, open tip)
  | "switch_load"       // Load interrupter switch
  | "ground_switch"     // Grounding disconnect (diagonal + ground symbol)
  | "ats"               // Automatic transfer switch (two breakers + tie)
  | "recloser"          // Auto-reclosing breaker (diagonal + arc + circling arrow)
  | "sectionalizer"     // Sectionalizer (diagonal + "S" designation)
  | "fuse"              // Expulsion fuse cutout (diagonal in oval)
  | "fuse_cl"           // Current-limiting fuse (diagonal in rect)

  // ── Protection & Monitoring ───────────────────────────────────
  | "ct"                // Current transformer (small circle + CT + line through)
  | "pt"                // Potential/voltage transformer (small circle + PT)
  | "relay"             // Protection relay (small circle + ANSI device number)
  | "surge_arrester"    // Surge arrester / lightning arrester (downward arrow + ground)
  | "ground_fault"      // Ground fault detector (GFI)
  | "rcd"               // IEC residual-current device / RCD-RCCB-RCBO

  // ── Loads & Equipment ─────────────────────────────────────────
  | "motor"             // Motor (circle + M + 3-phase dots)
  | "load"              // Generic load (rectangle)
  | "capacitor_bank"    // Capacitor bank (two plates + switch)
  | "harmonic_filter"   // Passive harmonic filter (LC symbol)
  | "vfd"               // Variable frequency drive (rect + "VFD")

  // ── Metering ──────────────────────────────────────────────────
  | "watthour_meter"    // Energy meter (circle + Wh)
  | "demand_meter"      // Demand meter (circle + D)
  | "consumer_unit"     // Domestic distribution board / consumer unit container

  // ── Graceful-degradation sentinel ─────────────────────────────
  | "unknown";          // Unrecognised type token — drawn as a flagged placeholder, never silently substituted

export interface SLDNode {
  id: string;
  nodeType: SLDNodeType;
  /** Original (unrecognised) type token, set only when `nodeType === "unknown"`. */
  rawType?: string;
  label?: string;
  /** Voltage level e.g. "13.8kV", "480V" */
  voltage?: string;
  /** Equipment rating e.g. "1000A", "500kVA" */
  rating?: string;
  /** ANSI device number (relays: 51, 87, 27, etc.) */
  deviceNumber?: string;
  /** Additional nameplate data (transformer: kVA, ratio, %Z) */
  nameplate?: Record<string, string>;
}

export interface SLDConnection {
  from: string;
  to: string;
  /** Cable specification e.g. "3#2/0 AWG" */
  cable?: string;
  /** Cable cross-sectional area, common in IEC/REBT residential docs (e.g. "2.5 mm2"). */
  cableCsa?: string;
  /** Cable length in meters, when a prompt asks for cable schedule hints. */
  cableLengthM?: string;
  /** Cable insulation / construction (e.g. "H07V-K", "XLPE/SWA/PVC"). */
  cableInsulation?: string;
  label?: string;
}

/**
 * Symbol standard for SLD / circuit glyphs. `ansi` (IEEE 315 / ANSI Y32.2) is
 * the default and preserves historical rendering. `iec` (IEC 60617) switches to
 * IEC symbol forms. `abnt` (Brazil, NBR 5410) and `as-nzs` (Australia/NZ,
 * AS/NZS 3000) are IEC 60364-family presets: they reuse the IEC glyphs and add
 * their own jurisdiction labelling.
 */
export type SLDStandard = "ansi" | "iec" | "abnt" | "as-nzs";

/** True for standards that render with the IEC 60617 glyph set. */
export function isIecFamily(standard: SLDStandard | undefined): boolean {
  return standard === "iec" || standard === "abnt" || standard === "as-nzs";
}

export interface SLDAST {
  type: "sld";
  title?: string;
  /** Symbol standard (default `ansi`). */
  standard?: SLDStandard;
  nodes: SLDNode[];
  connections: SLDConnection[];
  metadata?: Record<string, string>;
}

// ─── Entity Structure Types ─────────────────────────────────

export type EntityType =
  | "corp"
  | "llc"
  | "lp"
  | "trust"
  | "individual"
  | "foundation"
  | "disregarded"
  | "pool"
  | "placeholder";

export type EntityStatus = "normal" | "new" | "eliminated" | "modified";

export interface EntityNode {
  id: string;
  name: string;
  entityType: EntityType;
  /** ISO 3166-1 alpha-2 or 2-3 letter state code (DE, IE, KY, BVI, ...) */
  jurisdiction?: string;
  status?: EntityStatus;
  taxClass?: string;
  role?: string;
  note?: string;
  formationDate?: string;
  properties?: Record<string, string>;
}

export type EntityEdgeOp =
  | "ownership"   // -> solid black arrow (default)
  | "voting"      // ==> double line (voting-only control)
  | "pool"        // -.-> dashed grey (option pool)
  | "license"     // -~-> purple dashed (IP license / management)
  | "distribution"; // --> green dashed (trust distribution)

export interface EntityEdge {
  from: string;
  to: string;
  op: EntityEdgeOp;
  /** Raw percentage text, e.g. "100%" or "V 75% / E 50%" or "was 40% → 100%" */
  percentage?: string;
  /** Share class label (Series A Pref, Common, Option Pool) */
  shareClass?: string;
  label?: string;
}

export interface JurisdictionDef {
  code: string;
  name: string;
  color?: string;
}

export interface ClusterDef {
  id: string;
  label: string;
  /** Entity ids (explicit members) */
  members: string[];
  color?: string;
}

export interface EntityAST {
  type: "entity";
  title?: string;
  entities: EntityNode[];
  edges: EntityEdge[];
  jurisdictions: JurisdictionDef[];
  clusters: ClusterDef[];
  metadata?: Record<string, string>;
}

// ─── ERD (Entity-Relationship Diagram) Types ─────────────────
// 27-ERD-STANDARD — crow's foot first. Chen / Barker deferred.

export type ErdNotation = "crowsfoot" | "chen" | "barker";

/** Min..Max cardinality for one end of a relationship. */
export type ErdCardinality =
  | "one-mandatory"   // 1..1   ─┃
  | "one-optional"    // 0..1   ─○
  | "many-mandatory"  // 1..N   ─┃<
  | "many-optional";  // 0..N   ─○<

/** Attribute / column row within a tabular entity (crow's foot mode). */
export interface ErdAttribute {
  name: string;
  /** Exact authored column-name token. */
  nameSourceRange?: SourceRange;
  /** Free-form type token, e.g. "int", "varchar(255)", "timestamp" — rendered verbatim. */
  type?: string;
  /** Exact authored type token(s), excluding flags. */
  typeSourceRange?: SourceRange;
  pk?: boolean;
  fk?: boolean;
  uk?: boolean;
  /** NOT NULL marker. */
  notNull?: boolean;
  /** FK target as "TableName.columnName" (parser canonicalizes inline `FK -> X.y` here). */
  fkTarget?: string;
  /** Optional in-line comment / description. */
  comment?: string;
}

export interface ErdEntity {
  id: string;
  /** Display name (defaults to id when not separately quoted). */
  name: string;
  /** Exact authored display-name/id token. */
  nameSourceRange?: SourceRange;
  attributes: ErdAttribute[];
  /** Reserved for Chen mode (weak entity). Ignored in crow's foot rendering. */
  weak?: boolean;
}

export interface ErdRef {
  /** "TableName" or "TableName.columnName". */
  from: string;
  to: string;
  fromCard: ErdCardinality;
  toCard: ErdCardinality;
  /** "--" identifying (solid). "..": non-identifying (dashed). */
  identifying: boolean;
  label?: string;
}

export interface ErdAst {
  type: "erd";
  notation: ErdNotation;
  direction: "LR" | "TB";
  title?: string;
  titleSourceRange?: SourceRange;
  entities: ErdEntity[];
  refs: ErdRef[];
}

/** Per-attribute-row geometry inside a laid-out entity. */
export interface ErdLayoutRow {
  attribute: ErdAttribute;
  /** y offset relative to entity top, where the row's vertical center sits. */
  yCenter: number;
}

export interface ErdLayoutEntity {
  entity: ErdEntity;
  x: number;
  y: number;
  width: number;
  height: number;
  /** y coordinate of the header bar baseline (relative to entity top). */
  headerHeight: number;
  rows: ErdLayoutRow[];
}

export interface ErdLayoutEdge {
  ref: ErdRef;
  /** Orthogonal SVG path data ("M ... L ... L ..."). */
  path: string;
  /** Center coords of the source-end glyph anchor (just outside the entity edge). */
  fromAnchor: { x: number; y: number; side: "left" | "right" | "top" | "bottom" };
  toAnchor: { x: number; y: number; side: "left" | "right" | "top" | "bottom" };
  /** Optional label position (mid-segment). */
  labelAt?: { x: number; y: number };
}

export interface ErdLayoutResult {
  ast: ErdAst;
  entities: ErdLayoutEntity[];
  edges: ErdLayoutEdge[];
  width: number;
  height: number;
}

// ── EE Plugin union type (for type-narrowing in plugins) ──────

export type EEDiagramAST =
  | TimingAST
  | LogicGateAST
  | CircuitAST
  | BlockAST
  | LadderAST
  | SLDAST;

// ─── Venn / Euler Diagram Types ──────────────────────────────

export type VennDiagramMode = "auto" | "venn" | "euler";
export type VennPalette = "default" | "brand" | "monochrome";
export type VennBlendMode = "multiply" | "screen" | "none";
export type VennEulerRelationType = "subset" | "disjoint" | "overlap";

/** Raw value attached to a region. */
export type VennRegionValue =
  | { kind: "integer"; value: number }
  | { kind: "percent"; value: number }
  | { kind: "text"; value: string }
  | { kind: "list"; value: string[] }
  | { kind: "none" };

/** One set (a circle or ellipse in the diagram). */
export interface VennSet {
  id: string;
  label: string;
  /** Optional explicit elements (enumeration DSL). */
  elements?: string[];
  /** Override color (hex). */
  color?: string;
  /** Optional normalized center authored by the native geometry handle. */
  at?: { x: number; y: number };
  /** Optional normalized radius / ellipse scale authored by the native size handle. */
  radius?: number;
}

/** A named region. `sets` is the subset of set ids that define it (at least one). */
export interface VennRegion {
  /** Sorted list of set ids that belong to the intersection (e.g. ["A","B"]). */
  sets: string[];
  /** Does this region mean "only" these sets (exclude any other set)? */
  only: boolean;
  /** Value payload attached to the region. */
  value: VennRegionValue;
}

export interface VennEulerRelation {
  from: string;
  to: string;
  type: VennEulerRelationType;
}

export interface VennConfig {
  mode: VennDiagramMode;
  proportional: boolean;
  palette: VennPalette;
  blendMode: VennBlendMode;
  showCounts: boolean | "auto";
  showPercent: boolean;
}

export interface VennAST {
  type: "venn";
  title?: string;
  sets: VennSet[];
  regions: VennRegion[];
  relations: VennEulerRelation[];
  config: VennConfig;
  metadata?: Record<string, string>;
}

/** Circle geometry (n=2, n=3 and Euler). */
export interface VennCircle {
  id: string;
  cx: number;
  cy: number;
  r: number;
}

/** Ellipse geometry (n=4). */
export interface VennEllipse {
  id: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Rotation in degrees around (cx,cy). */
  rotation: number;
}

export type VennShape =
  | ({ kind: "circle" } & VennCircle)
  | ({ kind: "ellipse" } & VennEllipse);

export interface VennLabelPosition {
  /** Region this label describes (sorted set ids). */
  sets: string[];
  /** Canonical label text (e.g. "A ∩ B", "42", "[a,b,c]"). */
  label: string;
  /** Centroid x / y (inside or external). */
  x: number;
  y: number;
  /** If true, label is placed outside the region and `leader` is populated. */
  external: boolean;
  /** Optional leader line endpoints (from region-interior → label). */
  leader?: { x1: number; y1: number; x2: number; y2: number };
  /** Text anchor for external labels. */
  anchor?: "start" | "middle" | "end";
}

export interface VennLayoutResult {
  width: number;
  height: number;
  /** Rendering mode chosen (venn or euler; upset deferred). */
  mode: "venn" | "euler";
  /** Shape per set id (circles for n=2/3/euler, ellipses for n=4). */
  shapes: VennShape[];
  /** Region labels + placements. */
  labels: VennLabelPosition[];
  /** Set-title positions (one per set). */
  setLabels: Array<{ id: string; label: string; x: number; y: number; anchor: "start" | "middle" | "end" }>;
  /** Title placement (optional). */
  title?: { text: string; x: number; y: number };
  /** Proportional-solve residual (0 if not proportional). */
  proportionalResidual?: number;
}
// ─── Flowchart Types ─────────────────────────────────────────

export type FlowchartDirection = "TB" | "BT" | "LR" | "RL";

/**
 * Shape keyword catalog. M1 implements only the first 5; the rest are reserved
 * for M2 so AST/types don't have to be rewritten later.
 */
export type FlowchartShape =
  // M1 core shapes
  | "rect"
  | "round"
  | "stadium"
  | "diamond"
  | "parallelogram"
  // M2 (declared for forward-compat; parser accepts them but may fall back to "rect")
  | "parallelogram-alt"
  | "trapezoid"
  | "trapezoid-alt"
  | "subroutine"
  | "cylinder"
  | "circle"
  | "double-circle"
  | "hexagon"
  | "asymmetric";

export type FlowchartEdgeKind =
  | "solid"          // -->
  | "none"           // ---
  | "dotted"         // -.->
  | "thick"          // ==>
  | "bidirectional"  // <-->
  | "crossed"        // --x
  | "round-end";     // --o

export type FlowchartArrowEnd = "none" | "arrow" | "circle" | "cross";

export interface FlowchartNode {
  id: string;
  label: string;
  shape: FlowchartShape;
  icon?: string;
  classes?: string[];
  /** Inline CSS overrides from `style nodeId fill:#f9f,...` */
  style?: Record<string, string>;
  /** Containing subgraph id (undefined = root) */
  parent?: string;
  /** Exact editable label token in the parser input. */
  labelSourceRange?: SourceRange;
}

export interface FlowchartEdge {
  id?: string;
  from: string;
  to: string;
  kind: FlowchartEdgeKind;
  label?: string;
  arrowStart?: FlowchartArrowEnd;
  arrowEnd?: FlowchartArrowEnd;
  classes?: string[];
  /** Reversed during cycle-removal (renderer must flip visual arrow) */
  isReversed?: boolean;
  /** Exact editable edge-label token in the parser input. */
  labelSourceRange?: SourceRange;
}

export interface FlowchartSubgraph {
  id: string;
  label: string;
  direction?: FlowchartDirection;
  children: string[];
  subgraphs: string[];
  classes?: string[];
}

export interface FlowchartClassDef {
  id: string;
  props: Record<string, string>;
}

export interface FlowchartAST {
  type: "flowchart";
  title?: string;
  titleSourceRange?: SourceRange;
  direction: FlowchartDirection;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  subgraphs: FlowchartSubgraph[];
  classDefs: FlowchartClassDef[];
  /** linkStyle index → css-ish props. Parsed in M1, applied in M2. */
  linkStyles: Map<number, Record<string, string>>;
  metadata?: Record<string, string>;
}

export interface FlowchartLayoutNode {
  node: FlowchartNode;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 0-based layer index (top for TB, left for LR) */
  layer: number;
  /** Position within the layer (0-based) */
  order: number;
  /** Dummy routing node inserted for long edges */
  isDummy?: boolean;
}

export interface FlowchartLayoutEdge {
  edge: FlowchartEdge;
  /** SVG path d attribute */
  path: string;
  /** Label anchor with optional text-anchor hint for proper line clearance */
  labelAnchor?: { x: number; y: number; textAnchor?: "start" | "middle" | "end" };
  /** Position in `ast.edges` (declaration order) — used by linkStyle index targeting */
  index?: number;
}

export interface FlowchartLayoutCluster {
  subgraph: FlowchartSubgraph;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

export interface FlowchartLayoutResult {
  width: number;
  height: number;
  direction: FlowchartDirection;
  nodes: FlowchartLayoutNode[];
  edges: FlowchartLayoutEdge[];
  clusters: FlowchartLayoutCluster[];
  /** Optional expanded viewport when authored pins leave the auto-layout canvas. */
  viewBox?: { x: number; y: number; width: number; height: number };
}

// ─── Mindmap Types ──────────────────────────────────────────

export type MindmapStyle = "map" | "logic-right";

/**
 * Inline markdown token for mindmap labels. Parsed once at parse-time by
 * `inline.ts`, consumed by layout (width measurement) and renderer (tspan
 * emission). See `docs/reference/00-OVERVIEW.md` for the DSL contract.
 */
export type InlineToken =
  | { kind: "text"; value: string; bold?: boolean; italic?: boolean }
  | { kind: "code"; value: string }
  | { kind: "link"; href: string; value: InlineToken[] }
  | { kind: "checkbox"; checked: boolean };

export interface MindmapNode {
  id: string;
  /** Raw label text (post-bullet-marker, pre-tokenize) — kept for title/tooltip. */
  label: string;
  /** Exact span of the authored Markdown label; absent for synthesized nodes. */
  sourceRange?: SourceRange;
  /** Tokenized label. Layout & renderer consume this. */
  tokens: InlineToken[];
  depth: number;
  children: MindmapNode[];
}

export interface MindmapAST {
  type: "mindmap";
  title?: string;
  style: MindmapStyle;
  root: MindmapNode;
  /** Theme override from DSL `%% theme:` directive. */
  themeOverride?: string;
  /** Max wrap width for labels (px). Default 240. From `%% maxLabelWidth:`. */
  maxLabelWidth: number;
  /**
   * Set when no explicit `# Title` central topic was found and the parser had
   * to recover one: `"line"` = adopted the first plain text line as the center;
   * `"placeholder"` = inserted a synthetic "Mindmap" root over orphan bullets.
   * Surfaced as a `MINDMAP_SYNTHESIZED_ROOT` lint warning (status `partial`).
   */
  rootInferred?: "line" | "placeholder";
}

export interface MindmapLayoutNode {
  node: MindmapNode;
  x: number;
  y: number;
  /** "center" for root; "left"/"right" for map style; "right" for logic-right. */
  side: "left" | "right" | "center";
  /** Main-branch index (0..N-1); -1 for root. Drives palette. */
  branchIndex: number;
  labelWidth: number;
  labelHeight: number;
  /** Font size chosen for this node — used by renderer + for per-line measurement. */
  fontSize: number;
  /** Wrapped token lines. Always at least one entry. */
  lines: MindmapLabelLine[];
}

export interface MindmapLabelLine {
  tokens: InlineToken[];
  width: number;
}

export interface MindmapLayoutEdge {
  from: string;
  to: string;
  path: string;
  color: string;
  width: number;
}

export interface MindmapLayoutResult {
  width: number;
  height: number;
  style: MindmapStyle;
  nodes: MindmapLayoutNode[];
  edges: MindmapLayoutEdge[];
  title?: string;
}

// ─── Breadboard / Physical Wiring Types ─────────────────────

/**
 * Breadboard form factor:
 *  - "mini"  170 tie-points, 17 cols × 5+5 rows, no power rails
 *  - "half"  400 tie-points, 30 cols, 2 rail pairs (continuous)
 *  - "full"  830 tie-points, 63 cols, 2 rail pairs (broken at col 30/31)
 */
export type BreadboardForm = "mini" | "half" | "full";

/** Power-rail half: top vs bottom edge of board, positive vs negative stripe. */
export type BreadboardRail = "+t" | "-t" | "+b" | "-b";

/** Breadboard hole address — main grid (col + row) or rail (col + rail). */
export type BreadboardCoord =
  | { kind: "hole"; col: number; row: "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" }
  | { kind: "rail"; rail: BreadboardRail; col: number };

/** Off-board MCU placement (relative to breadboard substrate). */
export type BreadboardSidePlacement = "beside-left" | "beside-right" | "above" | "below";

/** Where a part lives. Either a span across the grid (resistor, led, dip) or a side placement (uno). */
export type BreadboardPlacement =
  | { kind: "point"; at: BreadboardCoord }
  | { kind: "span"; from: BreadboardCoord; to: BreadboardCoord }
  | { kind: "side"; side: BreadboardSidePlacement };

/** Catalog of v0.1 part kinds. */
export type BreadboardPartKind =
  | "resistor"
  | "led"
  | "cap-elec"
  | "cap-ceramic"
  | "diode"
  | "button"
  | "dip"
  | "header"
  | "mcu-uno"
  | "mcu-nano"
  | "mcu-esp32"
  | "mcu-pico"
  | "potentiometer"
  | "sensor-hcsr04"
  | "sensor-dht11"
  | "sensor-dht22"
  | "sensor-vl53l0x"
  | "display-oled-ssd1306"
  | "display-lcd-1602-i2c"
  | "display-tm1637"
  | "module-rotary-ky040"
  | "module-l298n"
  | "actuator-servo-sg90";

export interface BreadboardPart {
  /** User-assigned id (e.g. "uno", "r1"). */
  id: string;
  kind: BreadboardPartKind;
  /** Optional kind-specific args. e.g. resistor.value="220", dip.pins=8, led.color="red". */
  args: Record<string, string | number>;
  placement: BreadboardPlacement;
  /** Exact authored `@...` placement token for hole-snapped editing. */
  placementSourceRange?: SourceRange;
  /** Optional inline label drawn near the part body. */
  label?: string;
}

export type BreadboardWireColor =
  | "red"
  | "black"
  | "blue"
  | "yellow"
  | "orange"
  | "green"
  | "white"
  | "purple"
  | "brown"
  | "grey";

/** Wire endpoint — either a part pin or a board hole/rail. */
export type BreadboardEndpoint =
  | { kind: "pin"; partId: string; pin: string }
  | { kind: "coord"; at: BreadboardCoord };

export interface BreadboardWire {
  from: BreadboardEndpoint;
  to: BreadboardEndpoint;
  color: BreadboardWireColor;
  /** Optional intermediate hole that biases the Bézier control points. */
  via?: BreadboardCoord;
}

export interface BreadboardAst {
  type: "breadboard";
  board: BreadboardForm;
  title?: string;
  titleSourceRange?: SourceRange;
  parts: BreadboardPart[];
  wires: BreadboardWire[];
}

/** Resolved part box on (or beside) the substrate. */
export interface BreadboardLayoutPart {
  part: BreadboardPart;
  /** Top-left x of bounding box in canvas px. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** For span/point parts: rotation angle in degrees (currently 0 or 90). */
  rotation: number;
  /** Resolved pin centers in canvas px, keyed by pin name. */
  pins: Record<string, { x: number; y: number }>;
}

export interface BreadboardLayoutWire {
  wire: BreadboardWire;
  /** Cubic Bézier path "M x1 y1 C cx1 cy1 cx2 cy2 x2 y2". */
  path: string;
  /** Endpoint dots (rendered as small filled circles). */
  fromXY: { x: number; y: number };
  toXY: { x: number; y: number };
  color: BreadboardWireColor;
}

export interface BreadboardLayoutSubstrate {
  /** Top-left of board substrate. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Hole pitch in px (default 14). */
  pitch: number;
  /** Number of columns (17 / 30 / 63). */
  cols: number;
  /** Whether rails exist on this form. */
  hasRails: boolean;
  /** Whether rails break at col 30/31 (full board only). */
  railsBreak: boolean;
  /** Vertical center of the trough channel. */
  troughY: number;
  /** Width of trough channel (≈ pitch). */
  troughHeight: number;
}

export interface BreadboardLayoutResult {
  ast: BreadboardAst;
  substrate: BreadboardLayoutSubstrate;
  parts: BreadboardLayoutPart[];
  wires: BreadboardLayoutWire[];
  width: number;
  height: number;
}

// ─── BPMN AST Types (25-BPMN-STANDARD) ─────────────────────

/** Direction the process flows. LR is conventional. */
export type BpmnDirection = "LR" | "TB";

/** BPMN event lifecycle role — encoded in stroke weight. */
export type BpmnEventKind = "start" | "intermediate" | "end";

/** Trigger types (inner glyph). v0.1 supports the common subset. */
export type BpmnEventTrigger = "none" | "message" | "timer";

/** Filled glyph = throw, unfilled = catch. v0.1 derives this from kind+context. */
export type BpmnEventThrowCatch = "throw" | "catch";

export interface BpmnEvent {
  id: string;
  kind: BpmnEventKind;
  trigger: BpmnEventTrigger;
  /** Filled (throw) vs unfilled (catch). End events with a trigger throw; intermediate without context catch. */
  throwCatch: BpmnEventThrowCatch;
  label?: string;
  /** Owning lane id, set by parser. */
  laneId: string;
  /** Owning pool id. */
  poolId: string;
}

/** Activity (rounded rectangle) — v0.1 covers task and collapsed subprocess. */
export type BpmnActivityKind = "task" | "subprocess-collapsed";

/** Task type marker (top-left small icon). */
export type BpmnTaskMarker =
  | "abstract"
  | "user"
  | "service"
  | "send"
  | "receive"
  | "manual"
  | "script";

export interface BpmnActivity {
  id: string;
  kind: BpmnActivityKind;
  marker: BpmnTaskMarker;
  label: string;
  laneId: string;
  poolId: string;
}

/** Gateway types — diamond inner glyph. */
export type BpmnGatewayKind = "xor" | "or" | "and" | "event";

export interface BpmnGateway {
  id: string;
  gatewayKind: BpmnGatewayKind;
  label?: string;
  laneId: string;
  poolId: string;
}

export type BpmnFlowObject = BpmnEvent | BpmnActivity | BpmnGateway;

/** Connector kinds — sequence/conditional/default within a pool, message across pools. */
export type BpmnFlowKind = "sequence" | "conditional" | "default" | "message";

export interface BpmnFlow {
  /** Source flow-object id, OR a pool name (for message flows from a black-box pool). */
  from: string;
  /** Target flow-object id, OR a pool name. */
  to: string;
  kind: BpmnFlowKind;
  label?: string;
}

export interface BpmnLane {
  id: string;
  label: string;
  poolId: string;
  /** Ordered child object ids (events / activities / gateways). */
  children: string[];
}

export interface BpmnPool {
  id: string;
  label: string;
  /** Black-box pools must contain no flow objects. */
  blackbox: boolean;
  /** Lane ids in display order. Empty for blackbox. */
  lanes: string[];
}

export interface BpmnAst {
  type: "bpmn";
  direction: BpmnDirection;
  title?: string;
  pools: BpmnPool[];
  lanes: BpmnLane[];
  events: BpmnEvent[];
  activities: BpmnActivity[];
  gateways: BpmnGateway[];
  flows: BpmnFlow[];
}

// ─── BPMN Layout Types ─────────────────────────────────────

export interface BpmnLayoutObject {
  obj: BpmnFlowObject;
  /** Top-left corner of the object's bounding box. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BpmnLayoutLane {
  lane: BpmnLane;
  /** Lane band geometry (interior, label band excluded). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** X position of the lane label band (rotated text). */
  labelX: number;
  labelY: number;
  labelHeight: number;
}

export interface BpmnLayoutPool {
  pool: BpmnPool;
  /** Pool outer geometry (includes pool label band on the left). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Pool label band geometry (rotated text on the left). */
  labelX: number;
  labelY: number;
  labelWidth: number;
}

export interface BpmnLayoutFlow {
  flow: BpmnFlow;
  /** Manhattan polyline path data. */
  path: string;
  /** Anchor for label rendering. */
  labelAnchor?: { x: number; y: number };
}

export interface BpmnLayoutResult {
  ast: BpmnAst;
  pools: BpmnLayoutPool[];
  lanes: BpmnLayoutLane[];
  objects: BpmnLayoutObject[];
  flows: BpmnLayoutFlow[];
  width: number;
  height: number;
}

// ─── FBD (Function Block Diagram) Types ─────────────────────
// IEC 61131-3 §6.4 — function blocks wired through named ports.
// See docs/reference/23-FBD-STANDARD.md.

/** IEC 61131-3 standard data types (subset used for wire coloring + display). */
export type FbdDataType =
  | "bool"
  | "int" | "dint" | "uint" | "udint"
  | "real" | "lreal"
  | "time" | "date" | "tod"
  | "string" | "wstring"
  | "byte" | "word" | "dword"
  | "timer" | "counter"
  | "any";

/** Variable scope (IEC 61131-3 §2.4.3). */
export type FbdVarScope =
  | "local"
  | "input"
  | "output"
  | "in_out"
  | "global"
  | "external";

export interface FbdVarDecl {
  name: string;
  scope: FbdVarScope;
  dataType: FbdDataType | string; // user-defined FB type as opaque string
  initValue?: string;
  /** True if the type is a user-defined function block (not a primitive type). */
  isUserFb?: boolean;
}

/** Standard function block / function names (uppercase). The renderer knows how to draw each. */
export type FbdStdBlockName =
  | "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR" | "XNOR" | "BUF"
  | "R_TRIG" | "F_TRIG" | "SR" | "RS"
  | "TON" | "TOF" | "TP"
  | "CTU" | "CTD"
  | "ADD" | "SUB" | "MUL" | "DIV" | "MOD"
  | "ABS" | "NEG" | "MOVE"
  | "EQ" | "NE" | "GT" | "GE" | "LT" | "LE"
  | "SEL" | "MUX" | "MAX" | "MIN" | "LIMIT";

export type FbdPortSide = "in" | "out";

export interface FbdPort {
  name: string;
  side: FbdPortSide;
  dataType: FbdDataType;
  /** Inline constant on input ports (e.g. `T#5s`, `5`, `TRUE`). When set, no incoming wire. */
  constant?: string;
  /** Negation bubble on this port. */
  negated?: boolean;
}

export interface FbdBlock {
  /** Optional user-given instance tag (italic above header). */
  instance?: string;
  /** Type — standard name or user-defined FB type. */
  blockType: string;
  /** True if blockType is one of FbdStdBlockName. */
  isStd: boolean;
  /** Ports in declaration order (top-to-bottom on each side). */
  ports: FbdPort[];
  /** Network this block belongs to. */
  networkIndex: number;
  /** Synthetic id for wire references (`block-N` or instance). */
  id: string;
}

export interface FbdWire {
  /** Source: either `{block: id, port: name}` or `{var: name}` (declared variable). */
  from: { kind: "port"; blockId: string; portName: string } | { kind: "var"; name: string };
  /** Sink. */
  to: { kind: "port"; blockId: string; portName: string } | { kind: "var"; name: string };
  /** Inferred from source port. */
  dataType: FbdDataType;
  /** Negation bubble at sink end (for `~`). */
  negatedAtSink?: boolean;
}

export interface FbdNetwork {
  index: number;
  title?: string;
  blocks: FbdBlock[];
  wires: FbdWire[];
}

export interface FbdAst {
  type: "fbd";
  title?: string;
  titleSourceRange?: SourceRange;
  variables: FbdVarDecl[];
  networks: FbdNetwork[];
}

// ─── FBD Layout Types ────────────────────────────────────────

export interface FbdLayoutPort {
  name: string;
  side: FbdPortSide;
  /** Absolute x of the port end (port_stub_length out from block edge). */
  x: number;
  y: number;
  /** Block-edge x (port stub start). */
  edgeX: number;
  dataType: FbdDataType;
  constant?: string;
  negated?: boolean;
}

export interface FbdLayoutBlock {
  block: FbdBlock;
  x: number;
  y: number;
  width: number;
  height: number;
  ports: FbdLayoutPort[];
}

export interface FbdLayoutWire {
  wire: FbdWire;
  /** SVG path "d" attribute (Manhattan polyline). */
  path: string;
}

/** Variable terminal: a small labeled box on the left (input vars) or right (output vars) of each network. */
export interface FbdLayoutVarTerm {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  side: "left" | "right";
  dataType: FbdDataType;
}

export interface FbdLayoutNetwork {
  network: FbdNetwork;
  x: number;
  y: number;
  width: number;
  height: number;
  blocks: FbdLayoutBlock[];
  wires: FbdLayoutWire[];
  varTerms: FbdLayoutVarTerm[];
  /** Junction points (filled circles where one wire branches to multiple sinks). */
  junctions: { x: number; y: number }[];
}

export interface FbdLayoutResult {
  ast: FbdAst;
  networks: FbdLayoutNetwork[];
  width: number;
  height: number;
}

// ─── SFC (Sequential Function Chart) Types ──────────────────
// IEC 61131-3 §6.5 — steps + transitions with bars.
// See docs/reference/24-SFC-STANDARD.md.

export type SfcStepKind = "initial" | "normal" | "final";

export type SfcActionQualifier =
  | "N" | "S" | "R" | "L" | "D" | "P" | "P0" | "P1" | "SD" | "DS" | "SL";

export interface SfcAction {
  qualifier: SfcActionQualifier;
  /** Action body — name reference or inline ST text. */
  body: string;
  /** Optional duration literal (T#5s) for L/D/SD/SL/DS qualifiers. */
  time?: string;
}

export interface SfcStep {
  id: string;
  kind: SfcStepKind;
  /** Display label override; defaults to id. */
  label?: string;
  actions: SfcAction[];
}

export interface SfcTransition {
  /** Optional explicit transition id (e.g. T_Reset). */
  id?: string;
  from: string;
  to: string;
  /** Boolean expression as raw text. */
  condition: string;
}

export type SfcVarType =
  | "bool" | "int" | "real" | "time" | "timer" | "counter" | string;

export interface SfcVarDecl {
  name: string;
  dataType: SfcVarType;
  initValue?: string;
}

/** Branch group nodes — recursive AST for alt/sim regions. */
export type SfcNode =
  | { kind: "step"; stepId: string }
  | { kind: "alt"; branches: SfcAltBranch[]; mergeTo: string }
  | { kind: "sim"; condition: string; branches: SfcSimBranch[]; mergeTo: string; mergeCondition: string };

export interface SfcAltBranch {
  /** Optional priority (default = declaration order). */
  priority?: number;
  /** Entry transition condition (rendered between divergence bar and first step). */
  entryCondition: string;
  /** Inner steps in linear order. */
  body: SfcNode[];
  /** Exit transition condition (rendered between last step and convergence bar). */
  exitCondition: string;
}

export interface SfcSimBranch {
  body: SfcNode[];
}

export interface SfcAst {
  type: "sfc";
  title?: string;
  variables: SfcVarDecl[];
  steps: Map<string, SfcStep>;
  /** Top-level node sequence (linear chain with possibly branch nodes). */
  body: SfcNode[];
  /** All transitions — explicit ones from `transition` directives.
   * Branch entry/exit conditions live inside SfcAltBranch / SfcSimBranch. */
  transitions: SfcTransition[];
}

// ─── SFC Layout Types ──────────────────────────────────────

export interface SfcLayoutStep {
  step: SfcStep;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SfcLayoutAction {
  action: SfcAction;
  stepId: string;
  /** Index in step's action list. */
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  qualifierWidth: number;
}

export interface SfcLayoutTransition {
  transition: SfcTransition;
  /** Center of the transition bar. */
  cx: number;
  cy: number;
  /** Bar half-width — bar spans [cx-w, cx+w]. */
  w: number;
  /** Optional explicit id label (e.g. T_Reset). */
  id?: string;
}

export type SfcBarKind = "alt-div" | "alt-conv" | "sim-div" | "sim-conv";

export interface SfcLayoutBar {
  kind: SfcBarKind;
  /** Horizontal extent. */
  x1: number;
  x2: number;
  y: number;
}

export interface SfcLayoutWire {
  /** SVG path "d" — typically a vertical or L-shape. */
  path: string;
  /** Optional class hint (e.g. "wire", "jump"). */
  cls: "wire" | "jump";
}

export interface SfcLayoutJump {
  fromStepId: string;
  toStepId: string;
  /** Polyline path including arrowhead. */
  path: string;
  /** Margin label position. */
  labelX: number;
  labelY: number;
  labelText: string;
  /** Condition text (rendered near the source). */
  condition?: string;
}

export interface SfcLayoutResult {
  ast: SfcAst;
  steps: SfcLayoutStep[];
  actions: SfcLayoutAction[];
  transitions: SfcLayoutTransition[];
  bars: SfcLayoutBar[];
  wires: SfcLayoutWire[];
  jumps: SfcLayoutJump[];
  width: number;
  height: number;
}
