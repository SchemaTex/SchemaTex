/**
 * Diagram registry — metadata for every diagram type Schematex supports.
 *
 * This is the index an LLM sees when calling `listDiagrams()`. Descriptions
 * are tuned to help the model pick the right type for a user request.
 */

import type { DiagramType } from "../core/types";

export type DiagramCluster =
  | "relationships"
  | "electrical-industrial"
  | "corporate-legal"
  | "causality-analysis"
  | "generic"
  | "strategy"
  | "knowledge"
  | "behavior-modeling"
  | "research"
  | "project-management";

export interface DiagramMeta {
  /** Canonical type id — matches `DiagramType` and plugin keys. */
  type: DiagramType;
  /** Human-readable name. */
  name: string;
  /** One-sentence tagline. */
  tagline: string;
  /** When should an LLM pick this diagram? Written in "use X when …" form. */
  useWhen: string;
  /** Domain cluster for grouping. */
  cluster: DiagramCluster;
  /** Published standard the parser and layout follow. */
  standard: string;
  /** Path to the syntax doc key in the generated content bundle. */
  syntaxKey: string;
}

export const DIAGRAM_REGISTRY: readonly DiagramMeta[] = [
  // ── Relationships ────────────────────────────────────────────
  {
    type: "genogram",
    name: "Genogram",
    tagline: "Family diagram with emotional, medical, and generational notation.",
    useWhen:
      "Use for family therapy, social-work case notes, or medical family history. Handles 3+ generations with deaths, cutoffs, hostility, closeness, and the proband marker.",
    cluster: "relationships",
    standard: "McGoldrick, Gerson & Petry (2020) + GenoPro emotional taxonomy",
    syntaxKey: "genogram",
  },
  {
    type: "ecomap",
    name: "Ecomap",
    tagline: "Radial diagram of a client's connections to external systems.",
    useWhen:
      "Use for social work intake to visualise a client's support network — school, work, healthcare, faith, extended family — with strong/weak/stressful tie variants.",
    cluster: "relationships",
    standard: "Hartman (1978) + NSGC",
    syntaxKey: "ecomap",
  },
  {
    type: "pedigree",
    name: "Pedigree chart",
    tagline: "Clinical genetic-counselling pedigree with affected/carrier states.",
    useWhen:
      "Use for genetic counselling or medical genetics education — mendelian inheritance, carrier status, consanguinity, deceased generations. Follows NSGC conventions.",
    cluster: "relationships",
    standard: "NSGC Pedigree Standardization (Bennett 2008)",
    syntaxKey: "pedigree",
  },
  {
    type: "phylo",
    name: "Phylogenetic tree",
    tagline: "Rectangular cladogram from a Newick/NHX tree string.",
    useWhen:
      "Use for evolutionary biology, taxonomy, or species relationships. Accepts standard Newick input with optional branch lengths and clade highlighting.",
    cluster: "relationships",
    standard: "Newick + NHX extensions",
    syntaxKey: "phylo",
  },
  {
    type: "sociogram",
    name: "Sociogram",
    tagline: "Force-directed social network graph with edge types and weights.",
    useWhen:
      "Use for classroom sociometry, team influence mapping, or organisational network analysis. Edges can be directed, weighted, positive, negative, or reciprocal.",
    cluster: "relationships",
    standard: "Moreno (1934) sociometry",
    syntaxKey: "sociogram",
  },
  // ── Electrical & Industrial ──────────────────────────────────
  {
    type: "timing",
    name: "Timing / waveform diagram",
    tagline: "Digital signal timing diagram with clocks, buses, and annotations.",
    useWhen:
      "Use for digital-logic or bus-protocol documentation (SPI/I²C/AXI). Supports clock, data, bus, and gap signals with transition annotations.",
    cluster: "electrical-industrial",
    standard: "WaveDrom-compatible signal description",
    syntaxKey: "timing",
  },
  {
    type: "logic",
    name: "Logic gate netlist",
    tagline: "IEEE 91 logic-gate diagram from a gate-list DSL.",
    useWhen:
      "Use for combinational / sequential logic design — AND/OR/XOR/NAND/NOR/NOT/MUX/latches. Auto-routes via DAG topological sort.",
    cluster: "electrical-industrial",
    standard: "IEEE Std 91/91a-1991",
    syntaxKey: "logic",
  },
  {
    type: "circuit",
    name: "Circuit schematic",
    tagline: "Positional circuit schematic with resistors, sources, transistors.",
    useWhen:
      "Use for analogue/mixed-signal schematics — voltage/current sources, passives, diodes, BJT/MOSFET, op-amps. Uses an explicit positional DSL, not auto-layout.",
    cluster: "electrical-industrial",
    standard: "IEEE Std 315 / ANSI Y32.2",
    syntaxKey: "circuit",
  },
  {
    type: "blockdiagram",
    name: "Control-systems block diagram",
    tagline: "Transfer-function block diagram with summing junctions and feedback.",
    useWhen:
      "Use for classical control theory — plants, controllers, sensors, summing junctions, feedback loops. Nested feedback supported.",
    cluster: "electrical-industrial",
    standard: "Ogata / standard controls textbook convention",
    syntaxKey: "block",
  },
  {
    type: "ladder",
    name: "Ladder logic",
    tagline: "IEC 61131-3 ladder-logic program with rungs, contacts, coils.",
    useWhen:
      "Use for PLC / industrial-automation programs — normally-open/closed contacts, output coils, timers, counters. Renders with fixed power-rail layout.",
    cluster: "electrical-industrial",
    standard: "IEC 61131-3 Ladder Diagram",
    syntaxKey: "ladder",
  },
  {
    type: "fbd",
    name: "Function Block Diagram (FBD)",
    tagline: "IEC 61131-3 §6.4 function blocks wired through named ports.",
    useWhen:
      "Use for PLC programs that are easier to read as data-flow than as ladder rungs — boolean logic (AND/OR/NOT/NAND/NOR/XOR), timers (TON/TOF/TP), counters (CTU/CTD), edge detectors (R_TRIG/F_TRIG), comparison (EQ/NE/GT/GE/LT/LE), math (ADD/SUB/MUL/DIV/MOVE), selection (SEL/MUX/MAX/MIN/LIMIT). Inline expression notation `Out = OR(A, AND(B, C))`. Sister language to `ladder` (§10) and `sfc` (§24); together they form the visual half of IEC 61131-3.",
    cluster: "electrical-industrial",
    standard: "IEC 61131-3:2013 §6.4 + §2.5 standard FB library; see 23-FBD-STANDARD.md",
    syntaxKey: "fbd",
  },
  {
    type: "sfc",
    name: "Sequential Function Chart (SFC)",
    tagline: "IEC 61131-3 §6.5 step + transition state machine for cyclic PLC sequences.",
    useWhen:
      "Use for PLC sequential control — batch reactors, robotic cells, packaging lines, assembly stations — where the program has explicit phases that hand off to each other on boolean conditions. Steps with action qualifiers (N/S/R/L/D/P), transitions with conditions, alternative branches (single bar, OR semantics) and simultaneous branches (double bar, AND semantics), jumps for loops. Distinct from `state` (UML — Schematex `state` covers reactive UI/lifecycle FSMs, not cyclic PLC scans) and from `flowchart` (no bars, no qualifiers).",
    cluster: "electrical-industrial",
    standard: "IEC 61131-3:2013 §6.5 + IEC 60848 GRAFCET visual subset; see 24-SFC-STANDARD.md",
    syntaxKey: "sfc",
  },
  {
    type: "sld",
    name: "Single-line diagram",
    tagline: "Electrical power distribution single-line (one-line) diagram.",
    useWhen:
      "Use for facility / industrial / utility power systems — utility, generator, transformer, ATS, bus, breaker, load. Top-to-bottom power flow.",
    cluster: "electrical-industrial",
    standard: "IEEE Std 315 + ANSI device numbering",
    syntaxKey: "sld",
  },
  {
    type: "pid",
    name: "P&ID (Piping & Instrumentation)",
    tagline: "ISA-5.1 process equipment, valves, and instrument bubbles.",
    useWhen:
      "Use for chemical / petrochemical / pharmaceutical / water-treatment process diagrams — vessels, columns, heat exchangers, pumps, valves, and instrument loops with ISA tag codes (FT/FIC/PT/etc.). Equipment + piping + instrumentation in one diagram.",
    cluster: "electrical-industrial",
    standard: "ANSI/ISA-5.1-2009 + ISO 10628-1:2014",
    syntaxKey: "pid",
  },
  {
    type: "breadboard",
    name: "Breadboard / Physical wiring",
    tagline: "Fritzing-style breadboard view — physical wiring of Arduino / ESP32 / Pi prototypes.",
    useWhen:
      "Use for maker / Arduino / ESP32 / Raspberry Pi tutorials and lab handouts where the user wants to see *how to physically wire components on a breadboard* — not the abstract circuit schematic. Address tie-points by `@col-row` (e.g. `@5e`, `@+t8`). Smooth Bézier jumper-wires with conventional colors. Distinct from `circuit` (IEEE 315 schematic — same prototype, different view).",
    cluster: "electrical-industrial",
    standard: "Fritzing visual conventions + Wokwi DSL precedent (no ISO standard exists for this view; see 26-BREADBOARD-STANDARD.md)",
    syntaxKey: "breadboard",
  },
  // ── Corporate / Legal ────────────────────────────────────────
  {
    type: "entity",
    name: "Entity structure",
    tagline: "Corporate ownership hierarchy with percentage rollup.",
    useWhen:
      "Use for legal entity structures, holdco/opco charts, international tax charts, Series-A cap-table snapshots. Tiered layout with ownership percentages. NOT for database schema diagrams — use `erd` for those.",
    cluster: "corporate-legal",
    standard: "Tier-based ownership hierarchy",
    syntaxKey: "entity",
  },
  // ── Data modeling ────────────────────────────────────────────
  {
    type: "erd",
    name: "Entity-Relationship Diagram (ERD)",
    tagline: "Database schema diagram (crow's-foot tabular entities + cardinality glyphs).",
    useWhen:
      "Use for relational database schema diagrams — tables, columns, primary/foreign keys, and cardinality (1..1 / 0..N / 1..N) between tables. DBML-like text DSL plus Mermaid `}o--||` glyph aliases. Distinct from `entity` (which is for corporate/legal ownership). v0.1 supports crow's-foot only; Chen and Barker notations are deferred.",
    cluster: "corporate-legal",
    standard: "Chen 1976 / Everest 1976 (crow's foot) — implements the crow's-foot subset; see 27-ERD-STANDARD.md",
    syntaxKey: "erd",
  },
  // ── Causality / Analysis ─────────────────────────────────────
  {
    type: "fishbone",
    name: "Fishbone (Ishikawa)",
    tagline: "Ishikawa cause-and-effect diagram with categorised root causes.",
    useWhen:
      "Use for root-cause analysis, post-mortems, quality investigations. Categories branch off the spine; each cause is a bone.",
    cluster: "causality-analysis",
    standard: "Ishikawa (1968) cause-and-effect",
    syntaxKey: "fishbone",
  },
  {
    type: "venn",
    name: "Venn / Euler",
    tagline: "Set-theoretic Venn / Euler diagram with 2, 3, or 4 sets.",
    useWhen:
      "Use to visualise set overlaps, commonalities, or category intersections. Supports 2/3-set Venn and Euler (non-overlapping) arrangements.",
    cluster: "causality-analysis",
    standard: "Venn (1880) / Euler diagrams",
    syntaxKey: "venn",
  },
  {
    type: "decisiontree",
    name: "Decision tree",
    tagline: "Decision/classification tree with splits, probabilities, leaves.",
    useWhen:
      "Use for decision analysis (Howard-Raiffa EV rollback), ML decision trees, or taxonomy classification. Binary or multi-way splits.",
    cluster: "causality-analysis",
    standard: "Howard-Raiffa / CART-sklearn / taxonomy",
    syntaxKey: "decisiontree",
  },
  // ── Behavior modeling ────────────────────────────────────────
  {
    type: "state",
    name: "State diagram",
    tagline: "UML 2.5 / Harel statechart with composite states and pseudo-states.",
    useWhen:
      "Use for modeling reactive system behavior — finite state machines, lifecycle states, controller modes, UI workflows. Supports simple states, composite (nested) states, fork/join, choice, history, and full Mermaid `stateDiagram-v2` syntax.",
    cluster: "behavior-modeling",
    standard: "OMG UML 2.5.1 §14 + Harel (1987) statechart",
    syntaxKey: "state",
  },
  {
    type: "bpmn",
    name: "BPMN business process",
    tagline: "OMG BPMN 2.0 — pools and lanes, events, gateways, tasks for organizational processes.",
    useWhen:
      "Use for business processes that span multiple roles, departments, or systems — claims handling, hiring, order-to-cash, incident response, ISO-9001 / SOX audits. Pools = participants, lanes = roles, events = start/intermediate/end, gateways = XOR/AND/OR/event-based branches, message flows cross pool boundaries (`~~>`). Distinct from `flowchart` (no pools/lanes/event taxonomy), `state` (mode-centric, not activity-centric), and `pid` (physical equipment, not organisational work).",
    cluster: "behavior-modeling",
    standard: "OMG BPMN 2.0.2 / ISO/IEC 19510:2013 visual subset; see 25-BPMN-STANDARD.md",
    syntaxKey: "bpmn",
  },
  {
    type: "usecase",
    name: "UML use case diagram",
    tagline: "UML 2.5 use case — actors, use cases, subject boundary, include/extend/generalization.",
    useWhen:
      "Use for software-engineering requirements and scope diagrams — 'what does this system do, and for whom'. Actors (stick figures, or `(external)` rectangles for other systems) sit outside a subject boundary; use cases are ellipses inside it. `--` association, `..>` «include» (source includes target), `<..` «extend» (left extends right, with optional `[condition]` and extension points), `--|>` generalization (hollow triangle to parent, between actors or between use cases). Accepts a PlantUML-style inline form (`:Actor:`, `(Use case)`, `as ID`). Distinct from `state` (intra-object behavior, not system scope), `flowchart` (no actor/subject/include-extend semantics), and `bpmn` (how a process executes, not what a system offers).",
    cluster: "behavior-modeling",
    standard: "OMG UML 2.5.1 §18 visual subset; see 29-USECASE-STANDARD.md",
    syntaxKey: "usecase",
  },
  {
    type: "sequence",
    name: "UML sequence diagram",
    tagline: "UML 2.5.1 §17 interaction — lifelines, messages over time, activations, and combined fragments.",
    useWhen:
      "Use for time-ordered interactions between participants — API call flows, auth handshakes, distributed protocols, object collaborations, 'who calls whom in what order'. Lifelines run top→bottom; messages run left→right: `->` synchronous (filled head), `->>` asynchronous (open head), `-->` reply (dashed), `-x` lost, `o->` found. `+`/`-` suffixes open/close activation bars; `*Target` creates a participant and `destroy` ends one. All twelve UML combined fragments — `alt`/`opt`/`loop`/`par`/`break`/`critical`/`seq`/`strict`/`neg`/`ignore`/`consider`/`assert` — plus `ref` interaction-use frames. Participant kinds `actor`/`boundary`/`control`/`entity`/`database` render their UML/Jacobson symbols; `«stereotype»` overrides the label. Distinct from `usecase` (system scope, not message order), `state` (one object's modes, not inter-object messages), `bpmn` (organisational process), and `flowchart` (no lifelines/time axis).",
    cluster: "behavior-modeling",
    standard: "OMG UML 2.5.1 §17 (Interactions); see 33-SEQUENCE-STANDARD.md",
    syntaxKey: "sequence",
  },
  // ── Research / evidence synthesis ────────────────────────────
  {
    type: "prisma",
    name: "PRISMA 2020 flow diagram",
    tagline: "PRISMA 2020 — the mandatory four-row flow diagram for systematic reviews and meta-analyses.",
    useWhen:
      "Use whenever the user mentions 'PRISMA', 'systematic review', 'meta-analysis flow', 'scoping review', 'evidence screening', or 'Cochrane review' — this is the dedicated, standards-correct engine (prefer it over a generic flowchart). The author writes record counts and exclusion reasons; the rigid four-row layout (Identification → Screening → Eligibility → Included) is correct by construction, with mandatory `n = …` counts, parallel exclusion side-boxes, and an optional second 'other methods' column (`mode: 2020-dual`). Vocabulary swaps for scoping reviews (`kind: scoping-review`) and IPD (`kind: ipd`). Count arithmetic is validated (`validate-counts: warn|strict|off`). Distinct from `flowchart` (no mandatory stages/counts/exclusion-box convention).",
    cluster: "research",
    standard: "PRISMA 2020 (Page MJ et al., BMJ 2021;372:n71); see 28-PRISMA-STANDARD.md",
    syntaxKey: "prisma",
  },
  // ── Project management / scheduling ──────────────────────────
  {
    type: "pert",
    name: "PERT / CPM network",
    tagline:
      "Activity-on-node project schedule that computes ES/EF/LS/LF, slack, and the critical path.",
    useWhen:
      "Use whenever the user mentions 'PERT', 'CPM', 'critical path', 'project network', 'precedence diagram', or wants a project schedule from tasks + durations + dependencies. Unlike a flowchart, this engine *computes* the schedule: write `task <id> \"label\" duration: <n> after: <preds>` and it runs the forward/backward pass and returns Early/Late Start & Finish, total slack, project duration, and highlights the critical path in red. Supports PDM dependency types (FS/SS/FF/SF) with lag/lead (`after: A SS+2d`), three-point estimation (`duration: 4/6/10` → te + variance), milestones (`milestone`), swimlanes (`lane: \"Team\"`), a `layout: timescaled` mode (x ∝ ES, width ∝ duration) for a network-Gantt hybrid, and a legacy `layout: aoa` mode (activity-on-arrow: numbered event circles + arrow activities + dummy activities, FS-only). Distinct from `flowchart` (no scheduling), `timeline`/Gantt (no critical-path computation), and `bpmn` (organisational process, not a one-off schedule).",
    cluster: "project-management",
    standard: "PMI PMBOK 7 + Moder 1983 (AON/PDM); see 32-PERT-STANDARD.md",
    syntaxKey: "pert",
  },
  // ── Generic process / flow ───────────────────────────────────
  {
    type: "flowchart",
    name: "Flowchart",
    tagline: "Generic flowchart with start/end/decision/process nodes.",
    useWhen:
      "Use for process flows, decision flows, or algorithms when no more specific diagram fits. Sugiyama layered layout with orthogonal routing.",
    cluster: "generic",
    standard: "Sugiyama layered DAG + orthogonal routing",
    syntaxKey: "flowchart",
  },
  // ── Strategy / analysis ──────────────────────────────────────
  {
    type: "matrix",
    name: "Matrix / quadrant",
    tagline: "2×2 / 3×3 / N×M matrix diagrams (Eisenhower, BCG, heatmap).",
    useWhen:
      "Use for prioritisation (Eisenhower urgent/important), portfolio (BCG growth/share), or any 2-axis categorisation.",
    cluster: "strategy",
    standard: "2×2 / N×M quadrant convention",
    syntaxKey: "matrix",
  },
  {
    type: "orgchart",
    name: "Organisation chart",
    tagline: "Corporate or team reporting-line hierarchy.",
    useWhen:
      "Use for reporting lines, team structure, or organisational design. Tidy-tree layout (not to be confused with legal `entity` ownership).",
    cluster: "corporate-legal",
    standard: "Reingold-Tilford tidy tree",
    syntaxKey: "orgchart",
  },
  // ── Knowledge / brainstorming ────────────────────────────────
  {
    type: "mindmap",
    name: "Mindmap",
    tagline: "Radial or markmap-style mindmap from markdown headings.",
    useWhen:
      "Use for brainstorming, note structures, concept maps, or outline visualisation. Accepts markdown-headings input.",
    cluster: "knowledge",
    standard: "Buzan radial + markmap-compat tree",
    syntaxKey: "mindmap",
  },
  {
    type: "timeline",
    name: "Timeline",
    tagline: "Horizontal or vertical timeline with events, eras, milestones.",
    useWhen:
      "Use for historical sequences, project milestones, product roadmaps. Horizontal or vertical orientation.",
    cluster: "generic",
    standard: "Timeline convention with era bands",
    syntaxKey: "timeline",
  },
] as const;

const TYPE_ALIASES: Readonly<Record<string, DiagramType>> = {
  block: "blockdiagram",
  "entity-structure": "entity",
  graph: "flowchart",
  statediagram: "state",
  "statediagram-v2": "state",
  sequencediagram: "sequence",
};

export function resolveDiagramType(type: string): DiagramType | undefined {
  const normalized = type.trim().toLowerCase();
  return (
    DIAGRAM_REGISTRY.find((d) => d.type === normalized)?.type ??
    TYPE_ALIASES[normalized]
  );
}

export function getDiagramMeta(type: string): DiagramMeta | undefined {
  const resolved = resolveDiagramType(type);
  return DIAGRAM_REGISTRY.find((d) => d.type === resolved);
}

export function getAllDiagramTypes(): DiagramType[] {
  return DIAGRAM_REGISTRY.map((d) => d.type);
}
