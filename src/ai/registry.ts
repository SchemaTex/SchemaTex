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
  | "concurrency"
  | "research"
  | "project-management"
  | "network-infrastructure"
  | "software-uml"
  | "risk-reliability"
  | "architecture";

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
  /**
   * Other *names* the same diagram goes by — what a user types as the noun
   * ("single-line diagram" → sld, "cap table" → entity). One canonical CJK
   * name may be included. Powers the "Also known as" line on doc pages, SEO
   * synonyms, and LLM type routing. Goal: populate for every type (tracked P1).
   */
  aliases?: readonly string[];
  /**
   * Search-intent terms that are NOT names — use-cases, industries, standards,
   * jobs-to-be-done ("PLC programming", "M&A due diligence", "IEC 61131-3").
   * Powers SEO `keywords` meta + on-site search. Goal: populate every type (P1).
   */
  keywords?: readonly string[];
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
    tagline: "UML 2.5.1 use case diagram — captures what a system does and for whom: actors, use cases, a subject boundary, and include/extend/generalization.",
    useWhen:
      "Use for software-engineering requirements and scope diagrams — 'what does this system do, and for whom'. Actors (stick figures, or `(external)` rectangles for other systems) sit outside a subject boundary; use cases are ellipses inside it. `--` association, `..>` «include» (source includes target), `<..` «extend» (left extends right, with optional `[condition]` and extension points), `--|>` generalization (hollow triangle to parent, between actors or between use cases). Accepts a PlantUML-style inline form (`:Actor:`, `(Use case)`, `as ID`). Distinct from `state` (intra-object behavior, not system scope), `flowchart` (no actor/subject/include-extend semantics), and `bpmn` (how a process executes, not what a system offers).",
    cluster: "behavior-modeling",
    standard: "OMG UML 2.5.1 §18 visual subset; see 29-USECASE-STANDARD.md",
    syntaxKey: "usecase",
  },
  {
    type: "sequence",
    name: "UML sequence diagram",
    tagline: "UML 2.5.1 §17 interaction diagram — shows how participants exchange messages over time (who calls whom, in what order): lifelines, activations, and all twelve combined fragments.",
    useWhen:
      "Use for time-ordered interactions between participants — API call flows, auth handshakes, distributed protocols, object collaborations, 'who calls whom in what order'. Lifelines run top→bottom; messages run left→right: `->` synchronous (filled head), `->>` asynchronous (open head), `-->` reply (dashed), `-x` lost, `o->` found. `+`/`-` suffixes open/close activation bars; `*Target` creates a participant and `destroy` ends one. All twelve UML combined fragments — `alt`/`opt`/`loop`/`par`/`break`/`critical`/`seq`/`strict`/`neg`/`ignore`/`consider`/`assert` — plus `ref` interaction-use frames. Participant kinds `actor`/`boundary`/`control`/`entity`/`database` render their UML/Jacobson symbols; `«stereotype»` overrides the label. Distinct from `usecase` (system scope, not message order), `state` (one object's modes, not inter-object messages), `bpmn` (organisational process), and `flowchart` (no lifelines/time axis).",
    cluster: "behavior-modeling",
    standard: "OMG UML 2.5.1 §17 (Interactions); see 33-SEQUENCE-STANDARD.md",
    syntaxKey: "sequence",
  },
  {
    type: "petri",
    name: "Petri net",
    tagline:
      "Place/transition net that computes the dynamics — enabled transitions and token firing, not just shapes.",
    useWhen:
      "Use whenever the user mentions 'Petri net', 'place/transition net', 'token', 'marking', 'concurrency model', 'mutual exclusion', 'producer/consumer', or wants to model concurrent resource flow / synchronisation. Declare `place <id> *<tokens>` (circles holding tokens), `transition <id>` (bars — add `timed rate: <λ>` for a GSPN timed transition), and bipartite arcs: `->` standard, `-o` inhibitor (enabled only while the place is empty), `--` read/test, `=>` reset. Arc weight via `weight: n` or `*n`; place limit via `capacity: n`. The engine validates the bipartite structure, applies a `fire: T1, T2` sequence to the initial marking, and highlights which transitions are *enabled* in the result. `layout: lr|tb`. Distinct from `state` (one active state, not a token distribution), `sfc` (a restricted PLC Petri net), `bpmn` (organisational process), and `flowchart` (single thread, no concurrency or marking).",
    cluster: "concurrency",
    standard: "Murata 1989 + ISO/IEC 15909-1 (place/transition net); see 34-PETRINET-STANDARD.md",
    syntaxKey: "petri",
  },
  // ── Network / infrastructure ─────────────────────────────────
  {
    type: "network",
    name: "Network topology",
    tagline:
      "IT / CCTV network topology with Cisco-convention device icons, typed links, subnets/VLANs, and topology-correct layout.",
    useWhen:
      "Use whenever the user mentions 'network diagram', 'network topology', 'infrastructure diagram', a 'cámaras / CCTV / camera network', a LAN/WAN/data-center diagram, or wants to lay out routers, switches, firewalls, access points, servers, IP cameras, NVRs, etc. Declare typed devices `<kind> <id> \"label\"` (router, switch, l3switch, firewall, loadbalancer, ap, wlc, gateway, modem, ids, proxy, vpngw, server, serverfarm, pc, laptop, mobile, ipphone, printer, storage, camera (with `type: fixed|bullet|dome|ptz|turret`), nvr, dvr, poeswitch, encoder, monitor, internet, wan, pstn, cloud, lan) and connect with `a -- b` (undirected), `a -> b` (directed), or `a == b` (LAG). After `:` add a link spec: a link type (fiber/wireless/serial/poe/vpn/lag), `trunk`/`access` mode, `vlan: 10,20`, a speed like `1G`/`10G`, and `port: Gi0/1>eth0`. Group devices in nested boundaries: `site`/`rack` (physical) and `subnet`/`vlan`/`zone`/`dmz` (logical) blocks `{ … }`. Choose `layout: tiered` (default; band by `tier: edge|core|distribution|access`), `tree`, `star`, `ring`, `bus`, `mesh`, `spine-leaf` (declare `spines:`/`leaves:` and the mesh is auto-generated), or `manual`. The engine never drops a device/port/link, and validates VLAN range 1–4094 plus device IP-in-subnet-CIDR. Distinct from `flowchart` (no device icons/topology), `c4` (software containers, not physical devices), and `sld` (electrical single-line, not data network).",
    cluster: "network-infrastructure",
    standard: "Cisco-convention topology icons + hierarchical/spine-leaf models + ANSI/TIA-606 + ONVIF; see 35-NETWORK-STANDARD.md",
    syntaxKey: "network",
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
  // ── Structural UML ───────────────────────────────────────────
  {
    type: "umlclass",
    name: "UML Class Diagram",
    tagline:
      "OMG UML 2.5.1 class diagram — classifiers (class / abstract / interface / enum / datatype / primitive) joined by the six relationship kinds, with visibility, multiplicity, and stereotypes.",
    useWhen:
      "Use for OO design — the static type structure of a software system. Declare `class X { + name: T }` / `«interface» Y { + op(): R }` / `«enumeration» Z { A B C }`, then connect with PlantUML-flavoured glyphs: `<|--` generalization (hollow triangle to parent), `<|..` realization (dashed + hollow triangle to interface), `*--` composition (filled diamond at the whole), `o--` aggregation (hollow diamond at the whole), `-->` directed association (open arrow to target), `..>` dependency (dashed + open arrow), `--` plain association. Adornment placement is normalised regardless of which id is typed first (reversed forms accepted). Mermaid `classDiagram` glyphs work as aliases. Layout is generalization-driven (parents on top by default). Distinct from `erd` (data tables + crow's-foot — no visibility/methods/inheritance) and from `entity` (legal/corporate ownership). This is the C4 (§30) Code-level engine.",
    cluster: "software-uml",
    standard:
      "OMG UML 2.5.1 §9–§11 (Classification / Classifiers / Associations) + ISO/IEC 19505-2:2012; see 36-UMLCLASS-STANDARD.md",
    syntaxKey: "umlclass",
  },
  {
    type: "faulttree",
    name: "Fault Tree Analysis",
    tagline:
      "Deductive top-down reliability analysis — decompose one undesired top event through Boolean AND/OR/voting gates to basic component failures; the engine computes the minimal cut sets and the top-event probability.",
    useWhen:
      "Use for safety / reliability analysis: start from one top event and decompose its causes through gates down to basic events with known failure probabilities. Flat declaration wired by id: `top T \"…\" = OR(G1, G2)`, `gate G1 = AND(A, B)`, `basic A \"…\" p: 0.01`. Gates: AND/OR/XOR(a,b,…), VOTING(k/n; …), INHIBIT(x) if cond, PAND(a,b). `house H state: 0|1` switches branches; `undeveloped` for unanalysed causes. The engine *computes* the minimal cut sets (MOCUS) and P(top) (`prob: rare|mcub|exact`) and highlights single points of failure — the differentiator over a shape stencil. Keyword `faulttree` (alias `fta`). Distinct from `logic` (left-right signal netlist), `decisiontree` (expected-value rollback), and `fishbone` (qualitative, unquantified).",
    cluster: "risk-reliability",
    standard:
      "NUREG-0492 Fault Tree Handbook + IEC 61025:2006 + NASA FT Handbook 2002; MOCUS cut sets (Fussell-Vesely 1972); see 37-FAULT-TREE-STANDARD.md",
    syntaxKey: "faulttree",
  },
  {
    type: "bowtie",
    name: "Bowtie risk diagram",
    tagline:
      "Barrier-based risk management — one hazard's top event (the knot) with threats fanning in through preventative barriers on the left and consequences fanning out through mitigative barriers on the right, the whole shaped like a bow tie.",
    useWhen:
      "Use for process-safety / barrier risk analysis (oil & gas, aviation SMS, chemical, rail): one hazard, one top event, the threats that could cause it and the consequences if it happens, with the controls (barriers) in between. Indentation-structured DSL mirrors the CCPS 7-step build: `hazard \"…\"`, `topevent \"…\"`, then each `threat \"…\"` with indented `prevent \"…\"` barrier chain, each `consequence \"…\"` with indented `mitigate \"…\"` chain; `escalation \"…\"` nests under a barrier it degrades, `barrier \"…\"` nests under an escalation. Correct-by-construction: the engine *rejects* a threat/consequence with no barrier and an escalation not attached to a barrier (CCPS/EI barrier rule set). Qualitative — no probability rollup (that is `faulttree`'s job; a bowtie's left wing read backwards IS a fault tree). Distinct from `fishbone` (one-sided causes, no barriers) and `faulttree` (Boolean gates + cut sets, left wing only).",
    cluster: "risk-reliability",
    standard:
      "CCPS / Energy Institute 2018 (Bow Ties in Risk Management) + IEC 31010:2019 §B.4.6 + ICAO Doc 9859; Swiss-cheese lineage (Reason 1990); see 38-BOWTIE-STANDARD.md",
    syntaxKey: "bowtie",
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
  // ── Risk & reliability (Bucket B) ────────────────────────────
  {
    type: "eventtree",
    name: "Event Tree Analysis",
    tagline:
      "Forward-looking risk: one initiating event branches through each safety function into outcome sequences, with computed path frequencies.",
    useWhen:
      "Use to propagate the consequences of an initiating event through a chain of barriers/safety functions and quantify each outcome's frequency — the inductive complement to a fault tree and the right wing of a bowtie. Header `eventtree`/`eta`; declare the initiating event with a frequency, the ordered functions with success/failure branch probabilities, and outcome rows with `s`/`f`/`*` patterns. The engine computes path frequency = f_initiating × Π branch-probabilities and flags the dominant sequence.",
    cluster: "risk-reliability",
    standard: "IEC 62502:2010 · NUREG/CR-2300 (PRA) · ISO 31010 Annex B; see 39-EVENT-TREE-STANDARD.md",
    syntaxKey: "eventtree",
    aliases: ["Event Tree Analysis", "ETA diagram", "event tree", "事件树分析"],
    keywords: [
      "probabilistic risk assessment",
      "PRA",
      "safety function",
      "accident sequence",
      "barrier analysis",
      "consequence analysis",
      "nuclear safety",
      "IEC 62502",
    ],
  },
  {
    type: "fmea",
    name: "FMEA (Failure Mode and Effects Analysis)",
    tagline:
      "The reliability worksheet that computes its own risk — RPN = S×O×D plus AIAG-VDA Action Priority, ranked and colour-coded.",
    useWhen:
      "Use to score and prioritise how each component/process step can fail — severity, occurrence, detection — and decide what to fix first. Header `fmea`; declare item/function → failure mode → effect (with `sev`) → cause (with `occ`) → controls (with `det`). The engine computes RPN = S×O×D and the AIAG-VDA Action Priority (High/Medium/Low), sorts the sheet, and colour-fills the RPN/AP cells by risk. Schematex's first table-shaped diagram.",
    cluster: "risk-reliability",
    standard: "AIAG-VDA FMEA Handbook (2019) · IEC 60812:2018 · SAE J1739 · MIL-STD-1629A; see 40-FMEA-STANDARD.md",
    syntaxKey: "fmea",
    aliases: [
      "FMEA",
      "Failure Mode and Effects Analysis",
      "FMECA",
      "failure mode analysis",
      "故障模式与影响分析",
    ],
    keywords: [
      "RPN",
      "risk priority number",
      "Action Priority",
      "AIAG-VDA",
      "DFMEA",
      "PFMEA",
      "severity occurrence detection",
      "reliability engineering",
      "IEC 60812",
    ],
  },
  // ── Systems thinking / stochastic ────────────────────────────
  {
    type: "causalloop",
    name: "Causal Loop Diagram",
    tagline:
      "System-dynamics feedback map — signed causal links the engine reads to classify each loop as reinforcing (R) or balancing (B).",
    useWhen:
      "Use for systems thinking / system dynamics: variables connected by `+`/`−` causal links, where the engine detects feedback loops and labels each R (even number of negative links) or B (odd). Header `causalloop`/`cld`; write `A -> B : +` links and optional `loop R1 \"name\"` annotations and `delay` marks. Distinct from `sociogram` (social ties, no polarity) and `flowchart` (process steps).",
    cluster: "causality-analysis",
    standard: "Sterman, Business Dynamics (2000) · Meadows, Thinking in Systems; see 41-CAUSAL-LOOP-STANDARD.md",
    syntaxKey: "causalloop",
    aliases: [
      "Causal Loop Diagram",
      "CLD",
      "feedback loop diagram",
      "systems thinking diagram",
      "因果回路图",
    ],
    keywords: [
      "system dynamics",
      "reinforcing loop",
      "balancing loop",
      "feedback loop",
      "stock and flow",
      "Sterman",
      "Meadows",
    ],
  },
  {
    type: "markov",
    name: "Markov chain",
    tagline:
      "Discrete-time Markov chain — circles + probability arcs, with the stationary distribution and recurrent/transient/absorbing classification computed for you.",
    useWhen:
      "Use to model a probabilistic state process (reliability/availability, queueing, regime models) where you want the long-run distribution or absorption answer, not just the picture. Header `markov`/`markovchain`; write `S1 -> S2 : 0.3` transitions (each state's out-edges sum to 1). The engine computes the stationary distribution, classifies states, and for absorbing chains the fundamental matrix. Sibling of `state` and `petri`.",
    cluster: "behavior-modeling",
    standard: "Norris, Markov Chains (1997) · Kemeny & Snell, Finite Markov Chains; see 42-MARKOV-CHAIN-STANDARD.md",
    syntaxKey: "markov",
    aliases: [
      "Markov chain",
      "Markov chain diagram",
      "stochastic state transition diagram",
      "马尔可夫链",
    ],
    keywords: [
      "stationary distribution",
      "stochastic process",
      "transition matrix",
      "transition probability",
      "absorbing state",
      "steady state",
      "discrete-time",
    ],
  },
  // ── Software / process engineering ───────────────────────────
  {
    type: "gitgraph",
    name: "Git commit graph",
    tagline:
      "Branch-and-merge commit history on per-branch swimlanes — Mermaid gitGraph compatible.",
    useWhen:
      "Use to visualise a git branching/merging history. Header `gitGraph`; ordered `commit`, `branch <name>`, `checkout <name>`, `merge <name>`, `cherry-pick id: \"…\"`, with `commit id:/tag:/type: HIGHLIGHT|REVERSE`. Mermaid `gitGraph` syntax parity so LLM output is drop-in compatible. Commits sit on per-branch lanes ordered chronologically; merges join lanes.",
    cluster: "software-uml",
    standard: "Mermaid gitGraph syntax · git DAG model; see 43-GIT-GRAPH-STANDARD.md",
    syntaxKey: "gitgraph",
    aliases: [
      "Git commit graph",
      "git graph",
      "git branch diagram",
      "branching diagram",
      "Git 提交图",
    ],
    keywords: [
      "branching strategy",
      "git history",
      "merge",
      "cherry-pick",
      "GitFlow",
      "Mermaid gitGraph",
      "commit history",
    ],
  },
  {
    type: "epc",
    name: "Event-driven Process Chain (EPC)",
    tagline:
      "ARIS business-process notation — alternating events (red hexagons) and functions (green rounded rects) joined by AND/OR/XOR connectors, with the alternation rule validated.",
    useWhen:
      "Use for ARIS-style business process modelling (SAP / enterprise BPM). Header `epc`; declare `event`, `function`, connectors `and`/`or`/`xor`, and the control flow between them. The engine validates strict event↔function alternation and connector legality (an event cannot be the source of an OR/XOR split). Distinct from `bpmn` and `flowchart` — a separate published standard with stricter rules.",
    cluster: "corporate-legal",
    standard: "ARIS / Keller, Nüttgens & Scheer (1992); see 44-EPC-STANDARD.md",
    syntaxKey: "epc",
    aliases: [
      "Event-driven Process Chain",
      "EPC diagram",
      "ARIS EPC",
      "事件驱动过程链",
    ],
    keywords: [
      "ARIS",
      "business process modeling",
      "SAP",
      "BPM",
      "process chain",
      "enterprise architecture",
      "Scheer",
    ],
  },
  {
    type: "idef0",
    name: "IDEF0 function model",
    tagline:
      "Federal function-modelling standard — boxes are activities, arrows are positional (the ICOM rule: Input-left, Control-top, Output-right, Mechanism-bottom).",
    useWhen:
      "Use to model what a system/process does and its inputs/controls/outputs/mechanisms — systems engineering, defence/government process docs, enterprise architecture. Header `idef0`; declare `function` boxes and ICOM arrows (`input`/`control`/`output`/`mechanism`) plus box→box flows that name the target ICOM side. The engine enforces ICOM placement and assigns node numbers, in a diagonal box staircase.",
    cluster: "project-management",
    standard: "FIPS PUB 183 (1993) · SADT (Ross); see 45-IDEF0-STANDARD.md",
    syntaxKey: "idef0",
    aliases: [
      "IDEF0",
      "IDEF0 function model",
      "SADT diagram",
      "function model",
      "ICOM diagram",
    ],
    keywords: [
      "functional modeling",
      "FIPS 183",
      "systems engineering",
      "activity model",
      "ICOM",
      "process model",
      "enterprise architecture",
    ],
  },
  {
    type: "threatmodel",
    name: "Threat model (DFD + STRIDE)",
    tagline:
      "Security data-flow diagram where the engine annotates each element with its applicable STRIDE threats and flags every flow that crosses a trust boundary.",
    useWhen:
      "Use for security threat modelling (Microsoft SDL / OWASP Threat Dragon workflow): DFD shapes (external entity, process, data store), labelled data flows, and `boundary` trust zones. Header `threatmodel`/`stride`. The engine maps each element type to its STRIDE categories (external = S,R; process = all six; store = T,I,D + conditional R for logs; flow = T,I,D) and accents flows crossing a trust boundary. Includes the DFD base notation (no separate `dfd` engine).",
    cluster: "network-infrastructure",
    standard: "Shostack, Threat Modeling (2014) STRIDE-per-element · Microsoft SDL · base DFD DeMarco/Yourdon; see 46-THREAT-MODEL-STRIDE-STANDARD.md + 31-DFD-STANDARD.md",
    syntaxKey: "threatmodel",
    aliases: [
      "Threat model",
      "STRIDE diagram",
      "DFD threat model",
      "data flow diagram",
      "DFD",
      "威胁建模",
    ],
    keywords: [
      "STRIDE",
      "security threat modeling",
      "Microsoft SDL",
      "OWASP Threat Dragon",
      "trust boundary",
      "attack surface",
      "application security",
      "Shostack",
    ],
  },
  {
    type: "welding",
    name: "Welding symbols",
    tagline:
      "AWS A2.4 / ISO 2553 welding callouts — the reference-line skeleton with weld glyphs, dimensions, and supplementary symbols placed correct-by-construction.",
    useWhen:
      "Use to annotate a welded joint on an engineering drawing: a horizontal reference line, a leader arrow to the joint, and a weld-symbol glyph above (other side) / below (arrow side) with size, length-pitch, groove angle, root opening, contour + finish. Header `welding [standard: aws|iso-a|iso-b]`; one `joint \"label\" { arrow: … other: … around field tail: … }` block per joint. Full glyph catalog (fillet, all groove types, plug/slot, spot/seam, back/backing, surfacing, edge) + weld-all-around, field flag, and tail process note. Validates illegal type/side/dimension combinations.",
    cluster: "electrical-industrial",
    standard: "AWS A2.4:2020 · ISO 2553:2019; see 47-WELDING-SYMBOL-STANDARD.md",
    syntaxKey: "welding",
    aliases: [
      "Welding symbols",
      "weld symbol",
      "welding callout",
      "weld joint symbol",
      "焊接符号",
    ],
    keywords: [
      "AWS A2.4",
      "ISO 2553",
      "fillet weld",
      "groove weld",
      "weld notation",
      "engineering drawing",
      "fabrication",
      "weld dimensions",
    ],
  },
  {
    type: "floorplan",
    name: "Floor plan",
    tagline:
      "2D architectural floor plans & space layouts — poch\u00e9 walls with automatic shared-wall merging, door swing arcs, windows, and an auto-seating furniture catalog with collision validation.",
    useWhen:
      "Use for any measurable room/space layout: apartments and small homes, classroom seating arrangements, wedding/event floor plans, small shops and offices. Declare rooms with real dimensions (`room living at 0,0 size 5.2x4.2`, `unit m|ft`), chain placement with right-of/below, hang doors/windows on walls (`door between A B at 50%`), and place furniture room-relative \u2014 individually or as `grid`/`row`/`arc` arrays (27-desk classroom, 15 banquet rounds). L/T/U-shaped rooms via `extend`, stairs (straight/L/U/spiral with UP arrow + cut-plane break line), bifold/sliding/pocket doors, casement/sliding/bay windows, north compass. The engine merges shared walls, computes room areas and dimension lines, auto-seats tables, and validates room overlap, non-adjacent doors, and furniture collisions (chair-ring envelopes included). Not for photorealistic renders or CAD construction documents.",
    cluster: "architecture",
    standard:
      "Ramsey & Sleeper Architectural Graphic Standards · US National CAD Standard v6 \u00b7 banquet-industry capacity conventions; see 48-FLOORPLAN-STANDARD.md",
    syntaxKey: "floorplan",
    aliases: [
      "Floor plan",
      "floorplan",
      "room layout",
      "space plan",
      "seating chart",
      "classroom layout",
      "event layout",
      "\u5e73\u9762\u56fe",
      "\u6237\u578b\u56fe",
    ],
    keywords: [
      "floor plan",
      "architecture",
      "interior layout",
      "room dimensions",
      "seating arrangement",
      "wedding reception layout",
      "classroom seating",
      "furniture placement",
      "space planning",
    ],
  },
] as const;

/**
 * The library version that first shipped each diagram type, sourced from
 * CHANGELOG.md "Added" entries. Kept as a companion map (rather than a field on
 * the big registry literal) so the literal stays stable. `since` powers the
 * version badge on /diagrams and the cross-link to /changelog.
 */
export const DIAGRAM_SINCE: Readonly<Record<DiagramType, string>> = {
  // 0.1.0 — initial release (2026-03-15)
  genogram: "0.1.0",
  ecomap: "0.1.0",
  pedigree: "0.1.0",
  phylo: "0.1.0",
  sociogram: "0.1.0",
  logic: "0.1.0",
  circuit: "0.1.0",
  timing: "0.1.0",
  blockdiagram: "0.1.0",
  ladder: "0.1.0",
  sld: "0.1.0",
  entity: "0.1.0",
  fishbone: "0.1.0",
  // 0.1.1 (2026-04-18)
  flowchart: "0.1.1",
  venn: "0.1.1",
  matrix: "0.1.1",
  mindmap: "0.1.1",
  orgchart: "0.1.1",
  // 0.2.0 (2026-04-20)
  timeline: "0.2.0",
  decisiontree: "0.2.0",
  // 0.3.0 (2026-04-29)
  state: "0.3.0",
  pid: "0.3.0",
  // 0.4.0 (2026-05-05)
  erd: "0.4.0",
  breadboard: "0.4.0",
  bpmn: "0.4.0",
  fbd: "0.4.0",
  sfc: "0.4.0",
  // 0.4.3 (2026-05-16) — usecase
  usecase: "0.4.3",
  // 0.5.0 (2026-05-19)
  prisma: "0.5.0",
  // 0.5.1
  sequence: "0.5.1",
  // 0.6.0 — upcoming (committed post-0.5.2, not yet released)
  pert: "0.6.0",
  petri: "0.6.0",
  network: "0.6.0",
  // 0.6.4
  umlclass: "0.6.4",
  // 0.6.5
  faulttree: "0.6.5",
  // 0.6.6
  bowtie: "0.6.6",
  // 0.8.0 — Bucket B (event tree, FMEA, causal loop, Markov, git graph, EPC, IDEF0, threat model)
  eventtree: "0.8.0",
  fmea: "0.8.0",
  causalloop: "0.8.0",
  markov: "0.8.0",
  gitgraph: "0.8.0",
  epc: "0.8.0",
  idef0: "0.8.0",
  threatmodel: "0.8.0",
  // 0.8.1 — welding symbols (AWS A2.4 / ISO 2553)
  welding: "0.8.1",
  // 0.9.3
  floorplan: "0.9.3",
};

export function getDiagramSince(type: string): string | undefined {
  const resolved = resolveDiagramType(type);
  return resolved ? DIAGRAM_SINCE[resolved] : undefined;
}

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
