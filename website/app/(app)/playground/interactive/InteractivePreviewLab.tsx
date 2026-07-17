'use client';

import { useState } from 'react';
import { Playground } from '@/components/Playground';

const DIAGRAMS = [
  {
    id: 'flowchart-td',
    label: 'Flowchart · TD',
    status: 'text + drag',
    note: 'Branches, shape labels, edge labels, and free x/y node movement.',
    dsl: `flowchart TD "Round-trip release workflow"
  A([Draft]) --> B{Schema valid?}
  B -->|yes| C[Render preview]
  B -->|no| D[Revise DSL]
  D --> B
  C --> E([Ship])

  class A start
  class B decision
  class C process
  class E success`,
  },
  {
    id: 'flowchart-lr',
    label: 'Flowchart · LR',
    status: 'text + drag',
    note: 'Horizontal layout for testing two-axis movement and live edge routing.',
    dsl: `flowchart LR "Incident response"
  Alert([Alert]) --> Check{Customer impact?}
  Check -->|yes| Open[Open incident]
  Check -->|no| Watch[Keep monitoring]
  Open --> Fix[Mitigate]
  Fix --> Verify{Recovered?}
  Verify -->|no| Fix
  Verify -->|yes| Done([Resolved])`,
  },
  {
    id: 'state',
    label: 'State',
    status: 'text + drag',
    note: 'Double-click state or transition labels to edit; drag states across the layout axis while transitions follow live.',
    dsl: `stateDiagram-v2 "Publishing Lifecycle"
  state Draft : Draft
  state Review : Review
  state Approved : Approved
  state Published : Published
  [*] --> Draft
  Draft --> Review : submit
  Review --> Approved : approve
  Review --> Draft : request_changes
  Approved --> Published : publish
  Published --> [*] : archive`,
  },
  {
    id: 'sequence',
    label: 'Sequence',
    status: 'text + drag',
    note: 'Edit participant aliases and message labels; drag lifelines horizontally. Vertical message order remains source-defined.',
    dsl: `sequenceDiagram "Interactive Render Loop"
  actor user as User
  participant app as App
  participant engine as Schematex
  user->>app: Edit diagram
  app->>engine: renderResult(source)
  engine-->>app: svg + scene
  app-->>user: Live preview`,
  },
  {
    id: 'orgchart',
    label: 'Org chart',
    status: 'text + drag',
    note: 'Double-click names to edit; drag cards horizontally without changing reporting depth.',
    dsl: `orgchart "Product Studio"
ceo: "Maya Chen" | CEO [role: ceo]
  cto: "Noah Kim" | CTO [role: cto]
    eng: "Ava Singh" | Staff Engineer [role: engineer]
    open open1: "TBH" | Product Engineer [role: engineer]
  cpo: "Lena Ortiz" | CPO [role: cpo]
    design: "Eli Park" | Product Designer [role: designer]`,
  },
  {
    id: 'circuit-positional',
    label: 'Circuit · Schematic',
    status: 'text + drag',
    note: 'Edit title, component labels, and values. Explicit component IDs can move freely; generated wire IDs remain protected.',
    dsl: `circuit "RC Low-Pass Filter"

V1: vsource down label="Vin" value="5V"
wire right
R1: resistor right label="R1" value="1kΩ"
wire right 20px
dot
C1: capacitor down label="C1" value="100nF"
wire down 10px
ground

at: C1.start
wire right 20px
label "Vout" right`,
  },
  {
    id: 'circuit-netlist',
    label: 'Circuit · Netlist',
    status: 'text + drag',
    note: 'SPICE-style IDs are stable: drag components in x/y while every routed net remains orthogonal, or edit the title and explicit label/value attributes.',
    dsl: `circuit "Sensor Front End" netlist
V1 VIN 0 value="5V" label="Supply"
R1 VIN VOUT value="10kΩ" label="Bias"
C1 VOUT 0 value="100nF" label="Filter"
R2 VOUT ADC value="1kΩ" label="Protect"
C2 ADC 0 value="10nF" label="ADC cap"`,
  },
  {
    id: 'floorplan-home',
    label: 'Floorplan · Home',
    status: 'native handles',
    note: 'Drag furniture directly. Resize a simple room from its blue east, south, or corner handle; the room body itself stays fixed so furniture selection is unambiguous.',
    dsl: `floorplan "Compact Apartment" unit m
room living "Living Room" at 0,0 size 5.2x4.2
room kitchen "Kitchen" right-of living size 3.0x4.2
room hall "Hallway" below living size 2.0x2.2
opening between living kitchen at 42% width 1.2
door hall west at 50% width 0.9
window living north at 32% width 1.8
window kitchen north at 60% width 1.2
furniture sofa "Reading Sofa" in living at 0.45,2.8
furniture coffee-table "Coffee Table" in living at 2.1,2.7
furniture fridge "Fridge" in kitchen at 2.1,0.35`,
  },
  {
    id: 'floorplan-electrical',
    label: 'Floorplan · Electrical',
    status: 'text + drag',
    note: 'Drag the panel, outlets, switch, light, and data fixtures independently. Room geometry and shared-wall openings remain fixed.',
    dsl: `floorplan "Electrical Lab Layout" unit m
room lab "Electronics Lab" at 0,0 size 8x5
room utility "Utility" right-of lab size 2.8x5
door lab south at 18% width 1.0
opening between lab utility at 50% width 1.0
window lab north at 50% width 2.2
furniture electrical-panel "Panel LP-1" in utility at 0.35,0.5
furniture duplex-outlet "Bench power" in lab at 1.0,0.35
furniture data-outlet "Data" in lab at 5.9,0.35
furniture ceiling-light "Task light" in lab at 3.5,2.1
furniture switch "Lighting" in lab at 0.35,3.9`,
  },
  {
    id: 'genogram',
    label: 'Genogram',
    status: 'text + drag',
    note: 'Edit explicit label properties and drag individuals horizontally; structural and emotional relationships follow live.',
    dsl: `genogram "Smith Family — Clinical View"
  grandpa [male, 1930, deceased, label:"Robert"]
  grandma [female, 1932, label:"Helen"]
  grandpa -- grandma
    dad [male, 1955, label:"Michael"]
    aunt [female, 1958, label:"Susan"]
  dad -- mom [female, 1957, label:"Linda"]
    me [male, 1985, index, label:"Alex"]
    sister [female, 1988, label:"Emma"]
  dad -close- aunt "supportive"`,
  },
  {
    id: 'network',
    label: 'Network',
    status: 'text + drag',
    note: 'Edit device and link labels; drag stable device IDs freely while attached topology links reroute live.',
    dsl: `network "Branch Office Network"
  layout: tiered
  internet net "Internet"
  firewall fw "Edge Firewall" tier: edge
  l3switch core "Core Switch" tier: core
  switch access "Access Switch" tier: access
  server app "Application Server"
  laptop ops "Ops Laptop"
  net -- fw : wan "1 Gbps"
  fw -- core : fiber 10G
  core -- access : trunk vlan: 20 1G
  core -- app : 1G
  access -- ops : 1G`,
  },
  {
    id: 'decisiontree',
    label: 'Decision tree',
    status: 'text only',
    note: 'Double-click a question/answer card or its text to edit the exact source range. Generated identities keep the automatic tree layout read-only.',
    dsl: `decisiontree "Customer Support Triage"
direction: top-down

question "Is the service completely down?"
  yes: question "Outage confirmed?"
    yes: answer "Page the on-call engineer"
    no: answer "Open a severity-1 ticket"
  no: question "Can the user reproduce it?"
    yes: answer "Collect a trace and file a bug"
    no: answer "Request a screenshot"`,
  },
  {
    id: 'fishbone',
    label: 'Fishbone',
    status: 'text only',
    note: 'Edit effect, category, cause, and sub-cause text. Bone geometry remains automatic because placement encodes hierarchy.',
    dsl: `fishbone "Solder Joint Defect Spike"
effect "3.2% solder joint rejects"
category man "Man"
category machine "Machine"
category material "Material"
category method "Method"
man : "New operators on night shift"
machine : "Reflow oven temperature drift"
material : "Solder paste past floor life"
method : "Stencil aperture undersized"`,
  },
  {
    id: 'erd',
    label: 'ERD',
    status: 'fields + drag',
    note: 'Edit display aliases, column names, and data types independently; drag tables on the safe cross-axis while relationships reroute.',
    dsl: `erd
title: "Commerce Schema"
direction: LR

table "Customers" as Customer {
  customer_id int PK
  email varchar UK
  name varchar
}
table "Orders" as Order {
  order_id int PK
  customer_id int FK -> Customer.customer_id
  status varchar
}
table "Order Lines" as OrderLine {
  order_id int PK FK -> Order.order_id
  product_id int PK
  qty int
}
ref Order.customer_id many-mandatory -- one-mandatory Customer.customer_id
ref OrderLine.order_id many-mandatory -- one-mandatory Order.order_id`,
  },
  {
    id: 'umlclass',
    label: 'UML class',
    status: 'fields + drag',
    note: 'Edit classifier display aliases, member names, and member types independently; drag classifiers on the cross-axis.',
    dsl: `umlclass
title: "Order Model"

class Order as "Purchase Order" {
  - id : String
  + total : Money
  + place() : void
}
class LineItem as "Line Item" {
  + qty : int
  + subtotal() : Money
}
class Customer as "Customer Account" {
  + name : String
}
Order *-- "1..*" LineItem : contains
Customer "1" -- "*" Order : places`,
  },
  {
    id: 'pid',
    label: 'P&ID',
    status: 'title + drag',
    note: 'Edit or move the title. Drag equipment and instruments freely; process and signal endpoints stay attached during the gesture and are recomputed on drop.',
    dsl: `pid "Pump with Flow Control"

equip T-101 : tank_atm [tag: "Feed Tank"]
equip P-101 : pump_centrifugal [tag: "Feed Pump"]
equip V-101 : valve_control [tag: "Control Valve", fail: "FC"]
line L1 from T-101.bottom to P-101.in [size: "4in", type: "process"]
line L2 from P-101.out to V-101.in [size: "4in", type: "process"]
inst FT-101 : field_discrete
  measures L2
inst FIC-101 : cr_shared
  controls V-101
line s1 from FT-101 to FIC-101 [type: "electric"]`,
  },
  {
    id: 'fbd',
    label: 'FBD',
    status: 'title + drag',
    note: 'Edit or move the title. Named IEC function-block instances drag vertically; synthetic inline-expression blocks remain automatic and wires reroute from named ports.',
    dsl: `fbd "Motor Interlock"

var Start: bool
var Stop: bool
var Safe: bool
var MotorOut: bool

network 0 "Interlock":
  StartGate = AND(Start, Safe)
  StopGate = NOT(Stop)
  MotorOut = AND(StartGate.OUT, StopGate.OUT)`,
  },
  {
    id: 'petri',
    label: 'Petri net',
    status: 'title + drag',
    note: 'Edit or move the title. Places and transitions keep automatic layer order but can move on the cross-axis; all supported arc types remain attached.',
    dsl: `petri "Order Fulfillment"
direction: lr
place Ready *1
transition Accept
place Processing
transition Ship timed rate: 0.8
place Complete
Ready -> Accept
Accept -> Processing
Processing -> Ship
Ship -> Complete`,
  },
  {
    id: 'timeline',
    label: 'Timeline',
    status: 'title + date handles',
    note: 'Edit or move the title. Drag blue point and range-edge handles horizontally; drops rewrite authored ISO dates without a visual-coordinate override.',
    dsl: `timeline "Interactive Editing Rollout"
config: style = gantt
config: scale = proportional
2026-07-01 : milestone "Parser ranges" [category: "Core"]
2026-07-05 .. 2026-07-18 : "Stable ID adapters" [category: "Core"]
2026-07-14 .. 2026-07-28 : "Native geometry handles" [category: "Interaction"]
2026-07-30 : milestone "Preview review" [category: "Release"]`,
  },
  {
    id: 'timing',
    label: 'Timing',
    status: 'title + wave handles',
    note: 'Edit or move the title. Drag blue diamonds between waveform runs to resize adjacent states and rewrite the literal wave token.',
    dsl: `timing "SPI Read Cycle" [hscale: 1]
[Control]
CS_N: 111000000111
SCLK: 000101010000
[Data]
MOSI: xx223344xxxx data: ["CMD" "ADDR" "DATA"]
MISO: xxxxxx5566xx data: ["D7:D4" "D3:D0"]`,
  },
  {
    id: 'breadboard',
    label: 'Breadboard',
    status: 'title + snapped drag',
    note: 'Edit or move the title. Drag on-board parts; drops snap authored point/span placements to valid holes and connected jumper wires follow live.',
    dsl: `breadboard
board: half
title: "LED Current Limiter"
parts
  r1: resistor 220 @8e..12e
  led1: led red @14e..14f
  c1: cap-ceramic 100 @18d..18f
wires
  @+t8 --red-- r1:1
  r1:2 --orange-- led1:anode
  led1:cathode --black-- @-b14`,
  },
  {
    id: 'siteplan',
    label: 'Siteplan',
    status: 'title + vertex handles',
    note: 'Edit or move the title. Drag polygon/path/line endpoints or markers; every handle writes the corresponding native x,y token in site units.',
    dsl: `siteplan "Garden Studio Lot" unit m
parcel lot "Property" points 0,0 32,0 32,22 0,22
structure studio "Studio" points 18,6 28,6 28,15 18,15
driveway drive "Drive" from 0,18 to 18,12 width 4
walkway path "Walk" points 18,12 14,10 9,10 width 1.2
fence rear "Rear fence" from 0,0 to 32,0
tree oak "Oak" at 8,7 size 3
tree maple "Maple" at 13,16 size 2.5
callout "Rain garden" at 5,19 to 10,17
dim "Studio setback" from 18,3 to 18,6
north 12
legend on`,
  },
  {
    id: 'mindmap',
    label: 'Mindmap',
    status: 'text only',
    note: 'Double-click any authored node label to edit its Markdown source. Hierarchy remains auto-laid out; persistent drag stays disabled because node IDs change after insertions.',
    dsl: `mindmap
# Product Launch
## Market readiness
- Competitive analysis
- Target segments
## Engineering
- Feature freeze
- Load testing
## Go-to-market
- Landing page
- Email campaign
## Success metrics
- Activation rate
- Day-30 retention`,
  },
  {
    id: 'ecomap',
    label: 'Ecomap',
    status: 'text + drag',
    note: 'Edit authored labels and freely drag stable systems/people; relationship lines stay attached and positions persist in @overrides.',
    dsl: `ecomap "Family supports"
  center: maria [female, label: "Maria"]
  work [label: "Tech Company", category: work]
  school [label: "Evening School", category: education]
  maria === work
  maria --- school`,
  },
  {
    id: 'pedigree',
    label: 'Pedigree',
    status: 'text + x drag',
    note: 'Edit person labels and move individuals horizontally. Generation depth remains semantic, while relationship connectors follow live.',
    dsl: `pedigree "BRCA family"
  I-1 [male, label: "Robert"]
  I-2 [female, label: "Helen"]
  I-1 -- I-2
    II-1 [female, affected, label: "Maya"]
    II-2 [male, label: "Daniel"]`,
  },
  {
    id: 'phylo',
    label: 'Phylogenetic tree',
    status: 'text only',
    note: 'Edit exact leaf or internal-clade tokens inside Newick source. Tree topology and branch geometry remain automatically laid out.',
    dsl: `phylo "Bacterial tree"
newick: "((Bacillus:0.15,Listeria:0.22)Firmicutes:0.1,Escherichia:0.3)Bacteria;"`,
  },
  {
    id: 'sociogram',
    label: 'Sociogram',
    status: 'text + drag',
    note: 'Edit member and tie labels; drag stable members in x/y while directed relationship lines update during the gesture.',
    dsl: `sociogram "Class network"
  alice [label: "Alice"]
  bob [label: "Bob"]
  carol [label: "Carol"]
  alice -> bob [label: "trusts"]
  bob -> carol [label: "supports"]`,
  },
  {
    id: 'logic',
    label: 'Logic gate',
    status: 'identity + drag',
    note: 'Signal and gate names rename atomically across declarations/references. Stable gates drag freely and attached wires update live.',
    dsl: `logic "Motor interlock"
input START, SAFE
RUN = AND(START, SAFE)
output RUN`,
  },
  {
    id: 'blockdiagram',
    label: 'Block diagram',
    status: 'text + drag',
    note: 'Edit block and signal labels; drag stable blocks freely while signal endpoints remain connected.',
    dsl: `blockdiagram "Control loop"
C = block("Controller")
G = block("Plant")
H = block("Sensor")
C -> G ["drive"]
G -> H ["measurement"]
H -> C ["feedback"]`,
  },
  {
    id: 'ladder',
    label: 'Ladder',
    status: 'fields + rung handles',
    note: 'Edit operands and names. Drag the blue grip beside a rung vertically to reorder the complete authored rung block.',
    dsl: `ladder "Motor starter"
rung 1 "Start motor":
  XIC(START, name="Start button")
  OTE(MOTOR, name="Motor coil")
rung 2 "Stop motor":
  XIC(STOP, name="Stop button")
  OTU(MOTOR, name="Motor reset")`,
  },
  {
    id: 'sfc',
    label: 'SFC',
    status: 'text + x drag',
    note: 'Edit step/action text and move stable steps across the flow axis. Step order remains semantic.',
    dsl: `sfc "Batch cycle"
step Idle [initial]
  N "Wait for start"
step Fill
  N "Open inlet valve"
step Run
  N "Run batch"
transition from: Idle to: Fill: START
transition from: Fill to: Run: LEVEL_OK`,
  },
  {
    id: 'sld',
    label: 'Single-line diagram',
    status: 'fields + x drag',
    note: 'Edit equipment labels, voltages, and ratings. Hierarchy stays fixed while equipment moves horizontally and feeders reconnect.',
    dsl: `sld "Main feeder"
UTIL = utility [label: "Utility", voltage: "13.8kV"]
BUS = bus [label: "Main Bus", voltage: "480V"]
LOAD = load [label: "Plant Load", rating: "150HP"]
UTIL -> BUS
BUS -> LOAD`,
  },
  {
    id: 'entity',
    label: 'Entity structure',
    status: 'text + x drag',
    note: 'Edit entity labels and move entities horizontally within their ownership level; ownership depth remains source-defined.',
    dsl: `entity-structure "Holding company"
entity parent "Parent Holdings" corp
entity child "Operating Co" llc
entity sub "Services LLC" llc
parent -> child [ownership: 80%]
child -> sub [ownership: 100%]`,
  },
  {
    id: 'venn',
    label: 'Venn',
    status: 'text + circle handles',
    note: 'Edit set/region labels. Drag a set body to author its normalized center; use the blue east handle to author its radius and overlap.',
    dsl: `venn "Research overlap"
set A "PubMed"
set B "Embase"
A only : "Unique PubMed"
B only : "Unique Embase"
A & B : "Shared studies"`,
  },
  {
    id: 'bpmn',
    label: 'BPMN',
    status: 'text + lane drag',
    note: 'Edit task/event text and move stable flow nodes on the safe lane axis. Pool/lane membership and sequence order stay semantic.',
    dsl: `bpmn
direction: LR
title: "Loan approval"
pool "Bank" {
  lane "Clerk" {
    A: start "Application received"
    B: task user "Check completeness"
    E: end "Complete"
  }
}
flows
A --> B
B --> E`,
  },
  {
    id: 'usecase',
    label: 'Use case',
    status: 'text + drag',
    note: 'Edit actor/use-case text and drag stable actors or use cases within presentation space; system membership stays in the DSL.',
    dsl: `usecase
title: "ATM"
system: "ATM System"
actor: Customer
actor: Operator
usecase: "Withdraw Cash" as Withdraw
usecase: "Refill Cash" as Refill
Customer -- Withdraw
Operator -- Refill`,
  },
  {
    id: 'prisma',
    label: 'PRISMA',
    status: 'structured fields',
    note: 'Edit authored stage labels and counts. Computed reconciliation warnings and automatic flow geometry remain read-only.',
    dsl: `prisma
mode: 2020-single
title: "Review flow"
identification:
  databases:
    n: 100
screening:
  records-screened: 100
  excluded:
    n: 40
eligibility:
  full-text-assessed: 60
  excluded:
    n: 10
included:
  studies: 50`,
  },
  {
    id: 'pert',
    label: 'PERT',
    status: 'fields + drag',
    note: 'Edit task labels/durations and freely move stable task nodes; dependency lines stay attached.',
    dsl: `pert
title: "Release plan"
task A "Design" duration: 2
task B "Build" duration: 3 after: A
task C "Test" duration: 2 after: B
task D "Ship" duration: 1 after: C`,
  },
  {
    id: 'faulttree',
    label: 'Fault tree',
    status: 'fields + x drag',
    note: 'Edit event labels/probabilities and move stable events across their level. Failure hierarchy remains semantic.',
    dsl: `faulttree "Pump failure"
  top T "Both pumps fail" = AND(PA, PB)
  basic PA "Pump A fails" p: 0.01
  basic PB "Pump B fails" p: 0.01`,
  },
  {
    id: 'bowtie',
    label: 'Bow-tie',
    status: 'text + y drag',
    note: 'Edit hazards, threats, barriers, and consequences. Drag within the safe region axis without swapping left/right semantics.',
    dsl: `bowtie "Loss of containment"
hazard "Pressurised gas"
topevent "Loss of containment"
threat "Corrosion"
  prevent "Inspection programme"
consequence "Release to atmosphere"
  mitigate "Gas detection"`,
  },
  {
    id: 'matrix',
    label: 'Matrix · Coordinate',
    status: 'fields + native points',
    note: 'Edit labels/cells. In coordinate mode, drag a point to rewrite its normalized x,y pair directly—no @overrides block.',
    dsl: `matrix eisenhower "This Week"
"Ship hotfix" at (0.82, 0.91)
"Plan roadmap" at (0.25, 0.73)
"Triage inbox" at (0.74, 0.28)
"Archive notes" at (0.18, 0.15)`,
  },
  {
    id: 'eventtree',
    label: 'Event tree',
    status: 'structured text',
    note: 'Edit initiating-event, function, branch, and outcome text. Branch order and geometry remain automatic.',
    dsl: `eventtree "Loss of coolant accident"
  initiating LOCA "Large LOCA" freq: 1e-4
  function A "ECCS injects" p: 0.001
  function B "Containment spray" p: 0.01
  outcome s s -> "OK"
  outcome f * -> "Core damage"`,
  },
  {
    id: 'fmea',
    label: 'FMEA',
    status: 'structured fields',
    note: 'Edit authored item/function/mode/effect/cause/control text and S/O/D ratings. Computed RPN values remain read-only.',
    dsl: `fmea "Brake DFMEA"
  item "Master cylinder" fn "Generate pressure"
    mode "Internal seal leak"
      effect "Loss of braking" sev: 9
      cause "Seal degradation" occ: 3
        controls detection: "Bench test" det: 4`,
  },
  {
    id: 'rbd',
    label: 'Reliability block',
    status: 'fields + x drag',
    note: 'Edit block labels/reliability and move stable blocks across their lane. Computed system reliability remains read-only.',
    dsl: `rbd "Two pumps"
  parallel {
    block A "Pump A" R=0.9
    block B "Pump B" R=0.9
  }`,
  },
  {
    id: 'comparison',
    label: 'Comparison',
    status: 'structured fields',
    note: 'Edit authored columns and cells. Current comparison modes have no native coordinate tokens, so layout remains automatic.',
    dsl: `comparison "Cloud options"
mode: tchart
column "Managed"
- "Fast setup"
- "Automatic patches"
column "Self-hosted"
- "Full control"
- "Custom networking"`,
  },
  {
    id: 'causalloop',
    label: 'Causal loop',
    status: 'text + drag',
    note: 'Edit variable/polarity text and freely drag stable variables. IDs containing spaces are safely quoted inside @overrides.',
    dsl: `causalloop "Adoption model"
"Adoption rate" -> Adopters : +
Adopters -> "Adoption rate" : +`,
  },
  {
    id: 'markov',
    label: 'Markov',
    status: 'fields + drag',
    note: 'Edit state labels and transition probabilities; drag stable states freely while transitions remain attached.',
    dsl: `markov "Weather"
  state Sunny "Sunny day"
  state Rainy "Rainy day"
  Sunny -> Rainy : 0.2
  Sunny -> Sunny : 0.8
  Rainy -> Sunny : 0.5
  Rainy -> Rainy : 0.5`,
  },
  {
    id: 'gitgraph',
    label: 'Git graph',
    status: 'atomic text',
    note: 'Edit commit/tag text and atomically rename a branch across declaration and checkout/switch/merge references. Lanes remain automatic.',
    dsl: `gitGraph
  commit id: "Initial commit"
  branch develop
  checkout develop
  commit id: "Feature work" tag: "v0.1"
  checkout main
  merge develop id: "Merge feature"`,
  },
  {
    id: 'epc',
    label: 'EPC',
    status: 'text + x drag',
    note: 'Edit event/function text and move stable nodes across the process axis. Event/function order stays source-defined.',
    dsl: `epc "Order fulfilment"
  event E1 "Order received"
  function F1 "Check credit"
  event E2 "Credit checked"
  function F2 "Release order"
  E1 -> F1
  F1 -> E2
  E2 -> F2`,
  },
  {
    id: 'idef0',
    label: 'IDEF0',
    status: 'text + drag',
    note: 'Edit function and ICOM labels; freely drag stable function boxes while arrows remain connected.',
    dsl: `idef0 "Manufacture product"
node A0
function A1 "Plan production"
function A2 "Make parts"
input A1 "Sales orders"
A1 -> A2 "Work plan"
output A2 "Parts"`,
  },
  {
    id: 'threatmodel',
    label: 'Threat model',
    status: 'text + drag',
    note: 'Edit element/flow/boundary text and move stable elements inside presentation space; trust-boundary membership remains semantic.',
    dsl: `threatmodel "Web App"
external: User
process P1: Web Server
datastore D1: User DB
User -> P1 : "HTTPS Request"
P1 -> D1 : Lookup
boundary "DMZ" { P1 }`,
  },
  {
    id: 'welding',
    label: 'Welding symbol',
    status: 'structured fields',
    note: 'Edit authored dimensions, joint text, and tail process text. Standardized welding geometry remains fixed.',
    dsl: `welding "Bracket"
joint "butt" {
  arrow: vgroove angle=60 root=3 throat=12
  tail: "SMAW; E7018"
}`,
  },
  {
    id: 'playbook',
    label: 'Sports playbook',
    status: 'native player + route',
    note: 'Edit labels; drag explicitly positioned players or the blue route endpoint to rewrite native sport coordinates while the route previews live.',
    dsl: `playbook "Pick and roll" sport basketball
player p1 o "Guard" at -8,24
player p5 o "Center" at 6,18
screen p5 p1
route p1 to 0,10`,
  },
] as const;

type DiagramId = (typeof DIAGRAMS)[number]['id'];

export function InteractivePreviewLab() {
  const [activeId, setActiveId] = useState<DiagramId>('flowchart-td');
  const active = DIAGRAMS.find((diagram) => diagram.id === activeId) ?? DIAGRAMS[0];

  return (
    <section aria-label="Interactive diagram examples">
      <div className="sx-specimen-switcher">
        <div
          className="sx-specimen-tabs"
          role="tablist"
          aria-label="Diagram example"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
            const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
            if (current < 0) return;
            event.preventDefault();
            const next = event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            tabs[next]?.focus();
            tabs[next]?.click();
          }}
        >
          {DIAGRAMS.map((diagram) => {
            const selected = diagram.id === active.id;
            return (
              <button
                key={diagram.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="interactive-example-panel"
                id={`interactive-example-${diagram.id}`}
                tabIndex={selected ? 0 : -1}
                data-example-id={diagram.id}
                className="sx-specimen-tab"
                onClick={() => setActiveId(diagram.id)}
              >
                <span>{diagram.label}</span>
                <small>{diagram.status}</small>
              </button>
            );
          })}
        </div>
        <p className="sx-specimen-note" aria-live="polite">{active.note}</p>
      </div>

      <div
        id="interactive-example-panel"
        role="tabpanel"
        aria-labelledby={`interactive-example-${active.id}`}
      >
        <Playground key={active.id} initial={active.dsl} height={680} />
      </div>
    </section>
  );
}
