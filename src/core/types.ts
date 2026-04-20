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
  | "timeline"; // Timeline — events / eras / lifespans on a time axis (19-TIMELINE-STANDARD)

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
  /** Problem / outcome displayed in the head box. */
  effect: string;
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
  render: (text: string, config?: RenderConfig) => string;
  /** Parse DSL text to the diagram's AST (for JSON export / programmatic access). */
  parse?: (text: string) => unknown;
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
  | "SHIFT_REG";     // Generic shift register (SRG label, CLK/SER/Q0–Q7)

export type LogicGateStyle = "ansi" | "iec";

export interface LogicGateNode {
  id: string;
  gateType: LogicGateType;
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

  // ── Electromechanical ─────────────────────────────────────────
  | "motor"             // Circle + M + shaft line
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
  componentType: CircuitComponentType;
  direction: CircuitDirection;
  /** Reference to anchor point of previous/named element: e.g. "R1.end", "origin" */
  at?: string;
  /** Display label (R1, C2, etc.) */
  label?: string;
  /** Value annotation (1kΩ, 100nF, etc.) */
  value?: string;
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
export type LadderCoilType = "OTE" | "OTL" | "OTU" | "OTN";
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

  // ── Loads & Equipment ─────────────────────────────────────────
  | "motor"             // Motor (circle + M + 3-phase dots)
  | "load"              // Generic load (rectangle)
  | "capacitor_bank"    // Capacitor bank (two plates + switch)
  | "harmonic_filter"   // Passive harmonic filter (LC symbol)
  | "vfd"               // Variable frequency drive (rect + "VFD")

  // ── Metering ──────────────────────────────────────────────────
  | "watthour_meter"    // Energy meter (circle + Wh)
  | "demand_meter"      // Demand meter (circle + D);

export interface SLDNode {
  id: string;
  nodeType: SLDNodeType;
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
  label?: string;
}

export interface SLDAST {
  type: "sld";
  title?: string;
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
}

// ─── Mindmap Types ──────────────────────────────────────────

export type MindmapStyle = "map" | "logic-right";

export interface MindmapNode {
  id: string;
  label: string;
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
