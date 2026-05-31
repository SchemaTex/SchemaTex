import type { DiagramType } from "../core/types";

/**
 * Shared generation policy exposed to LLM-facing syntax callers.
 *
 * Parsers remain domain-specific and may accept imported dialects or aliases.
 * Generated DSL should stay on this smaller surface unless a caller asks for
 * reference syntax to reach an advanced feature.
 */
export const COMMON_GENERATION_RULES = [
  "Generate one diagram document with one selected diagram type.",
  "Use the canonical header and canonical forms from the generation profile first.",
  'Use ASCII double quotes (") for generated labels and titles.',
  "Do not emit DSL comments unless the user explicitly asks for annotated source.",
  "Prefer explicit IDs and declarations when they make validation less ambiguous.",
  "Call validateDsl with the explicit selected type, fix reported errors, and validate again before returning DSL.",
] as const;

export interface GenerationProfile {
  /** Canonical type id from `listDiagrams()`. */
  type: DiagramType;
  /** First line form preferred for generated DSL. */
  header: string;
  /** Short name for the preferred authoring mode when a parser has several. */
  mode: string;
  /** Forms that cover most first-shot generations for this type. */
  forms: readonly string[];
  /** Short grammar choices the model should make by default. */
  prefer: readonly string[];
  /** Accepted adapters / advanced paths to avoid unless explicitly needed. */
  avoid: readonly string[];
  /** Validation or semantic reminders that prevent common failed renders. */
  repair: readonly string[];
}

const PROFILES: Record<DiagramType, GenerationProfile> = {
  genogram: {
    type: "genogram",
    header: 'genogram "Title"',
    mode: "family declarations + indented children",
    forms: [
      "personId [sex, birthYear, optionalAttrs]",
      'parentA -- parentB "optional relationship label"',
      "indent children under the couple line",
    ],
    prefer: ["Declare people before emotional relationships.", "Use `[label: \"...\"]` only where the syntax reference shows a label attribute."],
    avoid: ["Avoid inline comments and speculative relationship operators."],
    repair: ["Unknown individuals usually need a declaration before the relationship line."],
  },
  ecomap: {
    type: "ecomap",
    header: 'ecomap "Title"',
    mode: "center + external systems",
    forms: [
      'center: client [label: "Client"]',
      'systemId [label: "System", category: family]',
      'systemId === client [label: "support"]',
    ],
    prefer: ["Declare exactly one center.", "Declare outside systems before their connection lines."],
    avoid: ["Avoid borrowing genogram operators such as `--`."],
    repair: ["A valid render with a missing center is semantically wrong; add `center:` first."],
  },
  pedigree: {
    type: "pedigree",
    header: 'pedigree "Title"',
    mode: "clinical pedigree",
    forms: [
      "personId [sex, generationAttrs]",
      "parentA -- parentB",
      "indent offspring under the couple line",
    ],
    prefer: ["Use pedigree status/trait attributes from the syntax reference.", "Keep generation structure explicit."],
    avoid: ["Avoid genogram emotional-relationship lines in pedigree output."],
    repair: ["Declare every referenced individual before relationships."],
  },
  phylo: {
    type: "phylo",
    header: 'phylo "Title"',
    mode: "quoted Newick",
    forms: ['newick: "((A:0.1,B:0.2),C:0.3);"', 'clade Group = (A, B) [label: "Group"]'],
    prefer: ["Use Newick for first-shot generation.", "Quote the Newick string."],
    avoid: ["Avoid indent-tree mode unless the user wants a hand-authored tree."],
    repair: ["A phylo document needs exactly one tree definition: Newick or indent tree."],
  },
  sociogram: {
    type: "sociogram",
    header: 'sociogram "Title"',
    mode: "declared nodes + social ties",
    forms: ['nodeId [label: "Person"]', 'nodeA -> nodeB [label: "choice"]', "config: layout = circular"],
    prefer: ["Declare actors first.", "Use one supported layout/config value at a time."],
    avoid: ["Avoid unknown config values; some adapters keep defaults."],
    repair: ["Unknown edge endpoints need matching node declarations."],
  },
  timing: {
    type: "timing",
    header: 'timing "Title"',
    mode: "WaveDrom signals, with clock/run-length shorthands",
    forms: [
      "CLK: clock 8                 (clock generator, 8 periods — no char-counting)",
      "RST: rle 1*2 0*6             (run-length: two 1s then six 0s)",
      'DATA: x====x data: ["A","B"] (raw WaveDrom wave + bus labels)',
    ],
    prefer: [
      "Use `clock N` for clocks instead of counting `p` characters.",
      "Use `rle <state>*<count> ...` for level/data signals instead of counting characters — it auto-aligns length.",
      "Drop to a raw wave string only for fine control; keep all signals the same total length so they align.",
      "Use `data:` labels for bus segments (`=` or digit states).",
    ],
    avoid: ["Avoid hand-counting long runs of identical characters — that is the main source of misaligned waves."],
    repair: [
      "Wave-state errors name the offending character and list the valid states.",
      "If two signals don't line up, make their total cell counts equal (clock N and rle make this easy).",
    ],
  },
  logic: {
    type: "logic",
    header: 'logic "Title"',
    mode: "logic netlist",
    forms: ["INPUT A, B", "G1 = AND(A, B)", "OUTPUT Y = G1"],
    prefer: [
      "Gate form is `id = TYPE(in1, in2, …)`; declare `INPUT`/`OUTPUT` ports explicitly. Prefix a signal with `~` for active-low.",
      "Use only these canonical gate TYPEs: combinational AND, OR, NOT, NAND, NOR, XOR, XNOR, BUF; output buffers TRISTATE_BUF, TRISTATE_INV, OPEN_DRAIN, SCHMITT; flip-flops DFF, JKFF, SRFF, TFF; latches LATCH_SR, LATCH_D; complex MUX, DEMUX, DECODER, ENCODER, COUNTER, SHIFT_REG.",
    ],
    avoid: ["Avoid circuit component names (R, C, transistors) inside logic diagrams."],
    repair: ["An unrecognised gate renders as a flagged `?` placeholder; replace it with the closest canonical gate from the list above (e.g. LOAD/REG → DFF, INV → NOT)."],
  },
  circuit: {
    type: "circuit",
    header: 'circuit "Title" netlist',
    mode: "SPICE-style netlist (recommended for generation)",
    forms: [
      "V1 in 0 5V        (component-id  node-A  node-B  value)",
      "R1 in out 1k",
      "C1 out 0 100n",
    ],
    prefer: [
      "Always use netlist mode (`... netlist` header). Each line is one component; no spatial state to track.",
      "Two components that share a node name are wired together. `0`, `gnd`, or `GND` is the ground net.",
      "The component-id prefix sets the type (R=resistor, C=capacitor, L=inductor, V=source, D=diode, Q=BJT). Add explicit `type=` only when the prefix is ambiguous.",
      "Optional orientation hint `dir=` (right|left|up|down) nudges a single symbol's facing, e.g. `C1 out 0 100n dir=down` for a shunt cap. Connectivity is unaffected; omit it unless layout readability needs it.",
    ],
    avoid: [
      "Avoid positional cursor routing (`wire`, `at:`) — that mode is for hand-drawing, not generation.",
      "Do not invent coordinates; the layout engine places components from the net connectivity. `dir=` only rotates a symbol, it does not set position.",
    ],
    repair: ["If a component type or pin count is ambiguous, make the symbol type explicit with `type=`."],
  },
  blockdiagram: {
    type: "blockdiagram",
    header: 'blockdiagram "Title"',
    mode: "blocks, sums, signals",
    forms: ['ctrl = block("PID") [role: controller]', "err = sum(+r, -y)", "err -> ctrl -> plant"],
    prefer: ["Use named blocks and directed `->` chains."],
    avoid: ["Avoid unlabeled feedback intent; model the summing junction."],
    repair: ["Connections must point at declared blocks, sums, signals, or boundary IDs."],
  },
  ladder: {
    type: "ladder",
    header: 'ladder "Title"',
    mode: "rungs + IEC/Rockwell elements",
    forms: ['rung 1 "Run motor":', "  XIC(START_PB)", "  OTE(MOTOR_RUN)"],
    prefer: ["Use uppercase element names.", "Use `parallel:` + `branch:` only for OR branches."],
    avoid: ["Avoid variable declarations and ST syntax."],
    repair: ["Element typos are repairable from parser suggestions; keep the tag in parentheses."],
  },
  sld: {
    type: "sld",
    header: 'sld "Title"',
    mode: "equipment assignments + power-flow edges",
    forms: ['util = utility [label: "Grid"]', 'xfmr = transformer [rating: "500 kVA"]', "util -> xfmr  (one edge per line, no chaining)"],
    prefer: [
      "Declare equipment as `id = nodeType [attrs]`, one `from -> to` connection per line.",
      "Use only these canonical nodeTypes: sources utility, generator, solar, wind, ups; transformers transformer, transformer_dy, transformer_yd, transformer_yy, transformer_dd, autotransformer, transformer_3winding; buses bus, bus_tie, hub; switching breaker, breaker_vacuum, switch, switch_load, ground_switch, ats, recloser, sectionalizer, fuse, fuse_cl; protection ct, pt, relay, surge_arrester, ground_fault; loads motor, load, capacitor_bank, harmonic_filter, vfd; metering watthour_meter, demand_meter.",
      "IEC/REBT residential aliases are also accepted: mcb/mccb→breaker, rcd/rcbo/rccb→ground_fault, isolator/disconnector→switch_load, panel/consumer_unit/distribution_board→bus.",
    ],
    avoid: ["Avoid generic flowchart node syntax."],
    repair: ["An unrecognised nodeType renders as a flagged `?` placeholder; pick the closest canonical type or alias from the list above (e.g. meter→watthour_meter, inverter→vfd)."],
  },
  entity: {
    type: "entity",
    header: 'entity-structure "Title"',
    mode: "legal entities + ownership edges",
    forms: ['entity holdco "HoldCo" corp@US', 'entity opco "OpCo" llc@DE', "holdco -> opco : 100%"],
    prefer: ["Use `entity` declarations before ownership edges.", "Keep legal form and jurisdiction explicit when known."],
    avoid: ["Avoid database schema terminology; use `erd` for tables and FKs."],
    repair: ["Unknown ownership endpoints need entity declarations."],
  },
  fishbone: {
    type: "fishbone",
    header: 'fishbone "Title"',
    mode: "effect + cause categories",
    forms: ['effect "Late Delivery"', 'category process "Process"', 'process: "Handoff delay"'],
    prefer: ["Use one effect and structured categories for generated DSL."],
    avoid: ["Avoid mixing compact alien syntax when a structured category form works."],
    repair: ["If a cause lands nowhere, add or reference its category explicitly."],
  },
  venn: {
    type: "venn",
    header: 'venn "Title"',
    mode: "declared-set region counts",
    forms: ['set A "Group A"', 'set B "Group B"', "A & B : 120", "A only : 80"],
    prefer: ["Use declared sets plus region counts for first-shot Venn output.", "Use Euler relations only when subset/disjoint structure is the request."],
    avoid: ["Avoid mixing enumeration mode with explicit region counts."],
    repair: ["Declare every set before region or Euler relation lines."],
  },
  flowchart: {
    type: "flowchart",
    header: 'flowchart TD "Title"',
    mode: "Mermaid-compatible nodes + edges",
    forms: ["start([Start]) --> check{Decision?}", "check -->|Yes| done([Done])"],
    prefer: ["Choose one direction in the header.", "Declare shapes explicitly when shape matters."],
    avoid: ["Avoid subgraph complexity unless grouping is part of the request."],
    repair: ["A bad header direction fails early; use TD, TB, BT, LR, or RL."],
  },
  mindmap: {
    type: "mindmap",
    header: "mindmap",
    mode: "Markdown headings + bullets",
    forms: ["# Root", "## Branch", "- Child item"],
    prefer: ["Use exactly one `#` root heading.", "Use bullets/headings instead of graph edges."],
    avoid: ["Avoid comments in the body."],
    repair: ["An orphan branch means the root `#` heading is missing."],
  },
  matrix: {
    type: "matrix",
    header: 'matrix "Title"',
    mode: "quadrant scatter",
    forms: ["x-axis: Low -> High", "y-axis: Low -> High", '"Item" at (0.25, 0.8)'],
    prefer: ["Use quadrant scatter for first-shot prioritization/portfolio requests.", "Use built-in templates when the framework is named."],
    avoid: ["Avoid heatmap, correlation, and table modes unless the user asks for that form."],
    repair: ["Point coordinates are normalized fractions; keep them in `[0,1]`."],
  },
  orgchart: {
    type: "orgchart",
    header: 'orgchart "Title"',
    mode: "indented hierarchy",
    forms: ['ceo: "Name" | CEO', '  cto: "Name" | CTO', '    eng: "Name" | Engineer'],
    prefer: ["Use indentation for the reporting tree.", "Use dotted explicit edges only for matrix reporting."],
    avoid: ["Avoid mixing explicit report edges with indentation unless needed."],
    repair: ["Duplicate IDs and unknown explicit edge endpoints are parse failures."],
  },
  decisiontree: {
    type: "decisiontree",
    header: 'decisiontree "Title"',
    mode: "taxonomy questions",
    forms: ['question "Question?"', '  yes: answer "Outcome"', '  no: answer "Other outcome"'],
    prefer: ["Use taxonomy mode for troubleshooting and triage.", "Select `decisiontree:decision` or `decisiontree:ml` only when expected value or ML is explicit."],
    avoid: ["Avoid mixing mode-specific keywords."],
    repair: ["Indent each child under its parent and use the branch prefix required by the selected mode."],
  },
  timeline: {
    type: "timeline",
    header: 'timeline "Title"',
    mode: "dated events",
    forms: ['2026-05-22: "Event"', '2026-06-01 - 2026-06-30: "Phase"', '2026-07-01: milestone "Launch"'],
    prefer: ["Use dated events/ranges and `milestone` for important points."],
    avoid: ["Avoid custom row keys when a date is known."],
    repair: ["Quote labels and keep the colon after the date/range."],
  },
  state: {
    type: "state",
    header: "stateDiagram-v2",
    mode: "Mermaid stateDiagram-v2 (recommended for generation)",
    forms: [
      "[*] --> Idle",
      "Idle --> Running : start",
      "Running --> Done : finish",
      "Done --> [*]",
    ],
    prefer: [
      "Use Mermaid `stateDiagram-v2` syntax: `[*]` for the start/end pseudo-states, `-->` for transitions, `: label` for the event/guard.",
      "This matches the most common training data, so prefer it over the native `state \"Title\"` + `initial`/`final` form (which is also accepted).",
    ],
    avoid: [
      "Avoid composite/concurrent-state syntax until the request needs it.",
      "Do not mix the two styles in one file (e.g. `[*]` together with `initial X`); pick `[*]`.",
    ],
    repair: [
      "Every transition uses `-->`; place at least one named state between a `[*]` start and a `[*]` end.",
      "If the header is rejected, use exactly `stateDiagram-v2` (or `state \"Title\"`).",
    ],
  },
  pid: {
    type: "pid",
    header: 'pid "Title"',
    mode: "equipment + process lines",
    forms: [
      "equip T-101 : tank_atm",
      "equip P-101 : pump_centrifugal",
      "line L1 from T-101.bottom to P-101.in",
      "inst FIC-201 : cr_shared",
    ],
    prefer: [
      "Declare equipment first (`equip ID : type [attrs]`), then process/signal lines, then instruments (`inst TAG : category`).",
      "Use only these canonical equipment types: tanks/vessels tank_atm, tank_cone_roof, vessel_v, vessel_h, sphere; columns column_tray, column_packed; heat transfer hx_shell_tube, hx_air_cooled, reboiler, condenser; rotating pump_centrifugal, pump_pd, compressor, blower; reactors reactor_cstr, reactor_pfr; misc filter, cyclone, flare, cooling_tower; valves valve_gate, valve_ball, valve_globe, valve_butterfly, valve_check, valve_control, valve_psv.",
      "Instrument categories: field_discrete, field_shared, field_computer, field_plc, cr_discrete, cr_shared, cr_computer, cr_plc, local_discrete, local_shared. Line types (`[type: …]`): process, process_minor, pneumatic, electric, hydraulic, capillary, software, mechanical.",
    ],
    avoid: ["Avoid SLD electrical nodes (transformer, breaker) in a P&ID."],
    repair: ["An unrecognised equipment type renders as a flagged `?` placeholder; pick the closest canonical type from the list above (e.g. exchanger/heat_exchanger→hx_shell_tube, vessel_horizontal→vessel_h, cstr→reactor_cstr)."],
  },
  erd: {
    type: "erd",
    header: "erDiagram",
    mode: "Mermaid erDiagram (recommended for generation)",
    forms: [
      "CUSTOMER ||--o{ ORDER : places",
      "ORDER {",
      "  int id PK",
      "  string customerId FK",
      "}",
    ],
    prefer: [
      "Use Mermaid `erDiagram` syntax: relationships `A <card>--<card> B : label` with crow's-foot glyphs (`||` one, `o{` zero-or-many, `|{` one-or-many, `|o` zero-or-one); entity blocks `NAME { type name KEY }` with attributes **type-first** and KEY ∈ PK/FK/UK.",
      "Entities are auto-created from relationships; you only need a `{ … }` block to list attributes.",
      "This matches the dominant training-data prior. The native `erd` header with `table NAME { name type PK }` + `ref … many-mandatory -- one-mandatory …` is also accepted.",
    ],
    avoid: ["Do not mix the two header styles; under `erDiagram`, attributes are type-first (`int id PK`), not name-first."],
    repair: [
      "Crow's-foot glyph pairs must be valid (`||`, `|o`, `}o`, `}|` on the left; `||`, `o|`, `o{`, `|{` on the right).",
      "If the header is rejected, use exactly `erDiagram` (or native `erd`).",
    ],
  },
  breadboard: {
    type: "breadboard",
    header: "breadboard",
    mode: "parts + wires blocks",
    forms: ['title: "Prototype"', "parts", "wires"],
    prefer: ["Use physical parts and addressable tie points.", "Keep schematic tasks on `circuit` instead."],
    avoid: ["Avoid abstract netlist syntax in breadboard output."],
    repair: ["Missing parts or invalid breadboard connection endpoints need the breadboard syntax reference."],
  },
  bpmn: {
    type: "bpmn",
    header: "bpmn",
    mode: "pool/lane objects + flows",
    forms: ['pool "Service" {', '  lane "Worker" { A: start "Request" }', "flows", "A --> B"],
    prefer: ["Use pools, lanes, and a `flows` block.", "Use `~~>` only for cross-pool message flow."],
    avoid: ["Avoid generic flowchart syntax for BPMN semantics."],
    repair: ["Sequence flows cannot cross pools; switch to message flow when needed."],
  },
  fbd: {
    type: "fbd",
    header: 'fbd "Title"',
    mode: "networks + blocks",
    forms: ["var Start: bool", 'network "Logic":', "Motor = AND(Start, Safe)"],
    prefer: ["Use network/expression forms from the FBD syntax guide."],
    avoid: ["Avoid ladder rung syntax in FBD output."],
    repair: ["Invalid block calls need a supported block and valid arguments."],
  },
  sfc: {
    type: "sfc",
    header: 'sfc "Title"',
    mode: "steps + transitions",
    forms: ["step Idle [initial]", "transition Idle -> Run : Start", "step Run"],
    prefer: ["Use explicit steps and transitions before alternative/simultaneous branches."],
    avoid: ["Avoid UML state syntax in SFC output."],
    repair: ["Every transition step reference must resolve to a declared step."],
  },
  prisma: {
    type: "prisma",
    header: "prisma",
    mode: "PRISMA 2020 single pipeline",
    forms: ["identification:", "  databases:", "    n: 1000", "screening:", "included:"],
    prefer: ["Use the required four stages and mandatory counts.", "Use single-pipeline 2020 mode unless other-methods data is present."],
    avoid: ["Avoid generic flowchart boxes for PRISMA requests."],
    repair: ["Missing stage blocks or mandatory `n` fields are intentional parser errors."],
  },
  usecase: {
    type: "usecase",
    header: "usecase",
    mode: "declarative UML use cases",
    forms: ['system: "System"', "actor: Customer", 'usecase: "Checkout" as Checkout', "Customer -- Checkout"],
    prefer: ["Use declarative actor/usecase lines for generated DSL."],
    avoid: ["Avoid PlantUML inline form unless converting PlantUML-like input."],
    repair: ["Include/extend relations must connect use cases, not actors."],
  },
  pert: {
    type: "pert",
    header: "pert",
    mode: "AON tasks + dependencies",
    forms: ['task A "Spec" duration: 3', 'task B "Build" duration: 8 after: A'],
    prefer: ["Use AON network tasks first.", "Use time-scaled/AOA layouts only when requested."],
    avoid: ["Avoid writing computed ES/EF/LS/LF fields yourself."],
    repair: ["Task IDs must exist before they are used in `after:` lists."],
  },
  sequence: {
    type: "sequence",
    header: "sequenceDiagram",
    mode: "Mermaid sequenceDiagram (recommended for generation)",
    forms: [
      "participant Alice",
      "participant Bob",
      "Alice->>Bob: request",
      "Bob-->>Alice: response",
      "Note over Alice,Bob: handshake",
    ],
    prefer: [
      "Use Mermaid `sequenceDiagram` syntax: `->>` is a sync call, `-->>` a reply/return, `-)` async; `participant`/`actor`, `Note over A,B:`, and `loop`/`alt`/`opt`/`par … end` all work.",
      "This matches the dominant training-data prior; the native `sequence \"Title\"` header (where `->>` means async) is also accepted.",
      "Add combined fragments only when control flow matters.",
    ],
    avoid: ["Do not mix the two header styles; pick `sequenceDiagram` and keep Mermaid arrow meanings throughout."],
    repair: [
      "Every fragment (`loop`/`alt`/`opt`/`par`/`break`/`critical`) needs a matching `end`; `else` only inside `alt`.",
      "If the header is rejected, use exactly `sequenceDiagram` (or `sequence \"Title\"`).",
    ],
  },
  petri: {
    type: "petri",
    header: 'petri "Title"',
    mode: "declared places + transitions + arcs",
    forms: [
      "place P1 *1",
      "transition T1",
      "P1 -> T1",
      "T1 -> P2",
      "P3 -> T2 weight: 2",
    ],
    prefer: [
      "Declare every place and transition before any arc references it.",
      "Use `*n` or `tokens: n` for the initial marking and `weight: n` for arc multiplicity > 1.",
      "Keep arcs bipartite: every arc goes place→transition or transition→place.",
    ],
    avoid: [
      "Avoid place→place or transition→transition arcs.",
      "Avoid `-o`/`=>` arcs from a transition; inhibitor and reset arcs are place→transition only.",
    ],
    repair: [
      "An 'unknown node' error means an arc references an undeclared place/transition — declare it first.",
      "Set the initial marking so the transitions you intend to be enabled actually have enough input tokens.",
    ],
  },
  network: {
    type: "network",
    header: 'network "Title"',
    mode: "device declarations + links (annotations are optional)",
    forms: [
      'router r1 "Edge Router"      (kind  id  "label")',
      'l3switch core1 "Core" tier: core      (optional structural hint)',
      'switch acc1 "Access" tier: access',
      'pc pc1 "Workstation"',
      "r1 -- core1                  (link: id -- id)",
      "core1 -- acc1",
      "acc1 -- pc1",
    ],
    prefer: [
      "Start from the skeleton: `kind id \"label\"` device lines plus `a -- b` links. That alone renders a complete, valid diagram.",
      "Declare every device before any link references it.",
      "Keep the cheap structural hints `layout:` (tiered/tree/star/ring/bus/mesh/spine-leaf) and `tier:` (edge/core/distribution/access) — they cost little and drive a readable hierarchy. They are recommended, not noise.",
      "Common kinds: router, switch, l3switch, firewall, ap, server, pc, laptop, camera, nvr, poeswitch, internet, cloud.",
    ],
    avoid: [
      "Avoid linking to an undeclared device id.",
      "Add the verbose per-link annotations — `vlan:`, `port:`, speeds (1G/10G), `trunk`/`access` — and `subnet \"cidr\" { ... }` boundaries ONLY when the request explicitly needs them. These don't affect the layout and are where generation most often breaks.",
    ],
    repair: [
      "An 'undeclared device' error means a link references an id with no `kind id` declaration — declare it first.",
      "If the layout looks flat/messy, add `layout: tiered` + `tier:` on infrastructure; if unsure about per-link annotations, drop them — the skeleton always renders.",
    ],
  },
  umlclass: {
    type: "umlclass",
    header: "umlclass",
    mode: "classifier declarations + relationship lines (PlantUML-flavoured, Mermaid aliases accepted)",
    forms: [
      'class Order { + id : String  + place() : void }     (visibility: + - # ~)',
      '«interface» Shape { + area() : double }              (stereotype above name)',
      'abstract class AbstractShape { + area() : double {abstract} }',
      '«enumeration» Suit { HEARTS DIAMONDS CLUBS SPADES } (literals in attr compartment)',
      'Animal <|-- Dog                                     (generalization — hollow triangle to parent)',
      'Shape <|.. Circle                                    (realization — dashed + hollow triangle)',
      'Order *-- "1..*" LineItem : contains                (composition — filled diamond at whole)',
      'Customer o-- "0..*" Address                          (aggregation — hollow diamond at whole)',
      'A "1" --> "*" B : owns                               (directed association — open arrow to target)',
      'X ..> Y                                              (dependency — dashed + open arrow)',
    ],
    prefer: [
      "Single-word keyword is `umlclass` (also accepts `class-diagram` and Mermaid's `classDiagram`).",
      "Use `class`, `abstract class`, `«interface»`, `«enumeration»`, or any custom `«stereotype»` above the name.",
      "Members go in `{ … }`; visibility glyphs are `+ - # ~`; `{static}` underlines, `{abstract}` italicises, `/name` marks a derived attribute.",
      "Multiplicity is the quoted token next to an endpoint: `\"1\"`, `\"0..*\"`, `\"1..*\"`. The line midpoint label after `:` is the association name.",
      "PlantUML connectors are primary; the Mermaid reversed forms `--|>`, `..|>`, `--*`, `--o` are accepted and normalised.",
    ],
    avoid: [
      "Don't use bare `class` as the diagram keyword — that's a reserved programming-language word, and the engine keyword is `umlclass`.",
      "Don't put `-->` for dependency: `-->` is *directed association*; dependency is the dashed `..>` (this is a deliberate deviation from PlantUML, matching Mermaid and the usual UML reading).",
      "Don't declare a classifier with an empty body and `{}` if you want a name-only sketch box — write `class Foo` on its own line.",
    ],
    repair: [
      "A 'malformed relationship' error means no connector glyph was found between two ids — check the line uses one of `<|--` `<|..` `*--` `o--` `-->` `..>` `--` `..`.",
      "A 'generalization cycle' error means inheritance edges form a loop — fix the parent/child direction of one of the edges named in the cycle.",
      "If a class appears as a one-line empty box you didn't expect, the parser auto-created it from an arc reference — declare it explicitly or fix the typo in the relationship id.",
    ],
  },
  faulttree: {
    type: "faulttree",
    header: 'faulttree "Title"',
    mode: "flat event/gate declarations wired by id (top + gates + leaves)",
    forms: [
      "analysis: cutsets, probability",
      'top  T  "System fails" = OR(G1, G2)',
      'gate G1 "Sub-fault"    = AND(A, B)',
      'basic A "Component A fails" p: 0.01',
      "undeveloped EXT \"External cause\"",
      'house HX "Power on" state: 1',
      "RELIEF = VOTING(2/3; PRV_A, PRV_B, PRV_C)",
      "OVP = INHIBIT(PUMP) if HEATER",
    ],
    prefer: [
      "Single-word keyword is `faulttree` (alias `fta`). Declare exactly one `top` event.",
      "Declare every referenced event before or after use; wire gates by id (the tree is a DAG — a basic event may feed several gates).",
      "Gate expressions: AND/OR/XOR(a, b, …), VOTING(k/n; …), INHIBIT(x) if cond, PAND(a, b) order: a, b.",
      "Put `p: 0.001` (or scientific `1e-3`) on basic/undeveloped events; the engine computes minimal cut sets and P(top).",
      "Use `prob: rare` (default), `mcub`, or `exact`; `house … state: 0|1` switches branches on/off.",
    ],
    avoid: [
      "Don't nest by indentation — fault tree is flat declaration + id reference (so repeated/shared events are unambiguous).",
      "Don't attach `if <cond>` to anything but INHIBIT (or `order:` to anything but PAND).",
      "Don't declare more than one `top`, and don't create cycles (a gate may not transitively reference itself).",
    ],
    repair: [
      "'references undefined event' means a gate input id was never declared — add the `basic`/`gate`/… line.",
      "'must have exactly one top' — keep a single `top`; downgrade the others to `gate`.",
      "'VOTING k/n: n must equal the number of inputs' — make n match the listed inputs.",
      "If P(top) shows 'n/a', a basic event in a cut set is missing its `p:`.",
    ],
  },
};

export function getGenerationProfile(
  type: DiagramType
): GenerationProfile {
  return PROFILES[type];
}
