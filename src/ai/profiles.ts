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
    mode: "WaveDrom-compatible signals",
    forms: ['CLK: pppppppp', 'DATA: x======x data: ["A", "B"]'],
    prefer: ["Keep wave strings contiguous with no internal spaces.", "Use `data:` labels for bus segments."],
    avoid: ["Avoid unsupported WaveDrom annotation syntax."],
    repair: ["Invalid wave strings usually contain a character outside the timing wave table."],
  },
  logic: {
    type: "logic",
    header: 'logic "Title"',
    mode: "logic netlist",
    forms: ["INPUT A, B", "G1 = AND(A, B)", "OUTPUT Y = G1"],
    prefer: ["Use canonical gate names and explicit inputs/outputs."],
    avoid: ["Avoid circuit component names inside logic diagrams."],
    repair: ["Unknown gate kinds should be replaced with the closest listed logic primitive."],
  },
  circuit: {
    type: "circuit",
    header: 'circuit "Title" netlist',
    mode: "SPICE-style netlist",
    forms: ["V1 vcc 0 5V", "R1 vcc out 10k", "C1 out 0 100n"],
    prefer: ["Use netlist mode for generated schematics unless geometry is the task.", "Add explicit `type=` when an ID prefix is ambiguous."],
    avoid: ["Avoid positional cursor routing (`wire`, `at:`) for first-shot output."],
    repair: ["If a component type or pin count is ambiguous, make the symbol type explicit."],
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
    forms: ['util = utility [label: "Grid"]', 'xfmr = transformer [rating: "500 kVA"]', "util -> xfmr -> load is not allowed; use one edge per line"],
    prefer: ["Declare equipment as `id = nodeType [attrs]`.", "Use one `from -> to` connection per line."],
    avoid: ["Avoid generic flowchart node syntax."],
    repair: ["Unknown equipment types often have a suggested canonical type or alias."],
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
    header: 'state "Title"',
    mode: "Schematex statechart core",
    forms: ["initial Start", "Start --> Running : event", "Running --> Done", "final Done"],
    prefer: ["Use `state` header for generated DSL.", "Use Mermaid `stateDiagram-v2` only when adapting Mermaid input."],
    avoid: ["Avoid composite/concurrent-state syntax until the request needs it."],
    repair: ["Use `-->` transitions and a named state between initial/final aliases."],
  },
  pid: {
    type: "pid",
    header: 'pid "Title"',
    mode: "equipment + process lines",
    forms: ["equip T-101 : tank_atm", "equip P-101 : pump_centrifugal", "line L1 from T-101.bottom to P-101.in"],
    prefer: ["Declare equipment first, then process/signal lines."],
    avoid: ["Avoid SLD electrical nodes in a P&ID."],
    repair: ["Unknown equipment and instrument categories must come from the catalog."],
  },
  erd: {
    type: "erd",
    header: "erd",
    mode: "table blocks + named cardinality refs",
    forms: ["table User { id int PK; email varchar }", "table Order { id int PK; user_id int FK -> User.id }", "ref Order.user_id many-mandatory -- one-mandatory User.id"],
    prefer: ["Use named cardinality tokens for generated refs.", "Keep FK targets explicit."],
    avoid: ["Avoid Mermaid cardinality glyphs unless converting Mermaid input."],
    repair: ["Unknown cardinality tokens and unterminated table blocks fail validation."],
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
    header: 'sequence "Title"',
    mode: "participants + messages",
    forms: ["actor User", 'participant API as "API"', "User -> API : request", "API --> User : response"],
    prefer: ["Start with participants/messages, then add fragments only if control flow matters."],
    avoid: ["Avoid Mermaid `sequenceDiagram` header; this parser uses `sequence`."],
    repair: ["Unmatched `end`, `else`, or activation statements are validation failures."],
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
};

export function getGenerationProfile(
  type: DiagramType
): GenerationProfile {
  return PROFILES[type];
}
