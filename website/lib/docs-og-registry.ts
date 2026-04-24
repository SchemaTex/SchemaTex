// Per-diagram OG image metadata.
// Each entry describes the diagram that the /docs/<slug> page covers.
// heroDsl is optional — if omitted, we fall back to the first featured example for that diagram.

export interface DocOGEntry {
  title: string;           // Display title, e.g. "Genogram Diagram"
  badge: string;           // Uppercase badge shown under the logo, e.g. "DOCS · GENOGRAM"
  standard: string;        // One-line standard / tagline, e.g. "McGoldrick 2020 · 3-generation family history"
  heroDsl?: string;        // Optional inline hero DSL; falls back to first featured example
}

export const DOCS_OG_REGISTRY: Record<string, DocOGEntry> = {
  genogram: {
    title: 'Genogram Diagram',
    badge: 'DOCS · GENOGRAM',
    standard: 'McGoldrick 2020 · family systems & multigenerational patterns',
  },
  ecomap: {
    title: 'Ecomap Diagram',
    badge: 'DOCS · ECOMAP',
    standard: 'Hartman 1975 · social-systems diagram used in clinical social work',
  },
  pedigree: {
    title: 'Pedigree Diagram',
    badge: 'DOCS · PEDIGREE',
    standard: 'NSGC 2008 · clinical-genetics family-history standard',
  },
  phylo: {
    title: 'Phylogenetic Tree',
    badge: 'DOCS · PHYLO',
    standard: 'Newick / NHX · evolutionary relationships between taxa',
  },
  sociogram: {
    title: 'Sociogram Diagram',
    badge: 'DOCS · SOCIOGRAM',
    standard: 'Moreno 1934 · sociometry of group relationships',
  },
  timing: {
    title: 'Timing Diagram',
    badge: 'DOCS · TIMING',
    standard: 'Digital waveform conventions · setup/hold, bus groups, arrows',
  },
  logic: {
    title: 'Logic Gate Diagram',
    badge: 'DOCS · LOGIC',
    standard: 'IEEE Std 91 / IEC 60617-12 · Boolean functions in hardware',
  },
  circuit: {
    title: 'Circuit Schematic',
    badge: 'DOCS · CIRCUIT',
    standard: 'IEEE Std 315 · analog / discrete electronic schematics',
  },
  ladder: {
    title: 'Ladder Logic Diagram',
    badge: 'DOCS · LADDER',
    standard: 'IEC 61131-3 · PLC programming in industrial automation',
  },
  sld: {
    title: 'Single-Line Diagram',
    badge: 'DOCS · SLD',
    standard: 'IEC 60617 · power-system one-line diagrams',
  },
  block: {
    title: 'Block Diagram',
    badge: 'DOCS · BLOCK',
    standard: 'ISO/IEC 15288 · system-level boxes and signal flow',
  },
  entity: {
    title: 'Entity Structure',
    badge: 'DOCS · ENTITY',
    standard: 'Corporate / legal entity structure with ownership percentages',
  },
  fishbone: {
    title: 'Fishbone Diagram',
    badge: 'DOCS · FISHBONE',
    standard: 'Ishikawa 1968 · cause-and-effect root-cause analysis',
  },
  decisiontree: {
    title: 'Decision Tree Diagram',
    badge: 'DOCS · DECISION TREE',
    standard: 'Taxonomy · decision analysis · CART classifier visualisation',
    heroDsl: `decisiontree "Customer Support Triage"
direction: top-down

question "Is the service down?"
  yes: question "On status page?"
    yes: answer "Incident protocol"
    no: answer "Sev-1 ticket"
  no: question "Billing affected?"
    yes: answer "Escalate — SLA risk"
    no: answer "Collect repro steps"`,
  },
  timeline: {
    title: 'Timeline Diagram',
    badge: 'DOCS · TIMELINE',
    standard: 'Swimlane · Gantt · lollipop — chronology of events and milestones',
    heroDsl: `timeline "Product roadmap"
config: style = swimlane

era 2024-Q1..2024-Q2: "Foundation" [color: #E3F2FD]
era 2024-Q3..2024-Q4: "Growth" [color: #E8F5E9]

2024-01-15: "Kick-off"
2024-02-01: milestone "Architecture" [side: above]
2024-03-01 - 2024-05-31: "API v2 build"
2024-06-30: milestone "Beta" [side: above]
2024-10-15: milestone "GA launch"`,
  },
  mindmap: {
    title: 'Mind Map',
    badge: 'DOCS · MINDMAP',
    standard: 'Buzan radial / markmap format — brainstorming and outlining',
    heroDsl: `mindmap
%% style: logic-right

# Schematex

## DSL-first
- One keyword per diagram
- AI-friendly syntax

## Zero dependencies
- Hand-written parser
- KB-level bundle

## Standards-compliant
- IEEE for logic
- IEC for circuits
- McGoldrick for genograms`,
  },
  orgchart: {
    title: 'Org Chart',
    badge: 'DOCS · ORG CHART',
    standard: 'Reporting hierarchy · pipe-separated fields · dotted-line matrix edges',
    heroDsl: `orgchart "Acme Inc"

ceo "Alice Chen | CEO":
  cto "Bob Kim | CTO | Engineering":
    eng_lead "Carol Li | Eng Lead | Platform"
    eng_lead2 "Dave Wu | Eng Lead | Product"
  cfo "Eve Wang | CFO | Finance"
  cmo "Frank Zhao | CMO | Marketing"`,
  },
  flowchart: {
    title: 'Flowchart',
    badge: 'DOCS · FLOWCHART',
    standard: 'ANSI / ISO 5807 · process flow with decisions and loops',
    heroDsl: `flowchart
direction: TD

start "Start"
input "Read input"
check {"Valid?"}
process "Transform"
save "Save result"
err "Show error"
stop "End"

start -> input
input -> check
check -> process : yes
check -> err : no
process -> save
save -> stop
err -> stop`,
  },
  matrix: {
    title: 'Relationship Matrix',
    badge: 'DOCS · MATRIX',
    standard: 'N×N influence / coupling matrix — design structure, stakeholder',
    heroDsl: `matrix "Stakeholder influence"

rows: Engineering, Product, Sales, Support
cols: Engineering, Product, Sales, Support

Engineering -> Product : strong
Product -> Engineering : strong
Product -> Sales : medium
Sales -> Support : weak
Support -> Product : medium`,
  },
  venn: {
    title: 'Venn Diagram',
    badge: 'DOCS · VENN',
    standard: 'Euler / Venn sets — overlap, intersection, difference',
    heroDsl: `venn
set A "Doctors" [color: #E53935]
set B "Engineers" [color: #1E88E5]
set C "Lawyers" [color: #43A047]

A ∩ B : "Biomedical devices"
A ∩ C : "Medical malpractice"
B ∩ C : "IP / patents"
A ∩ B ∩ C : "Schematex"`,
  },
};

export function getDocOGEntry(slug: string | undefined): DocOGEntry | null {
  if (!slug) return null;
  return DOCS_OG_REGISTRY[slug] ?? null;
}
