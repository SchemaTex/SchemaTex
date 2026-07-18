/** Focused interaction fixtures. Product example discovery comes from the registry. */
export const INTERACTIVE_FIXTURES = {
  "flowchart-td": `flowchart TD "Round-trip release workflow"
  A([Draft]) --> B{Schema valid?}
  B -->|yes| C[Render preview]
  B -->|no| D[Revise DSL]
  D --> B
  C --> E([Ship])`,
  "flowchart-lr": `flowchart LR "Incident response"
  Alert([Alert]) --> Check{Customer impact?}
  Check -->|yes| Open[Open incident]
  Check -->|no| Watch[Keep monitoring]
  Open --> Fix[Mitigate]
  Fix --> Verify{Recovered?}
  Verify -->|no| Fix
  Verify -->|yes| Done([Resolved])`,
  state: `stateDiagram-v2 "Publishing Lifecycle"
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
  sequence: `sequenceDiagram "Interactive Render Loop"
  actor user as User
  participant app as App
  participant engine as Schematex
  user->>app: Edit diagram
  app->>engine: renderResult(source)
  engine-->>app: svg + scene
  app-->>user: Live preview`,
  orgchart: `orgchart "Product Studio"
ceo: "Maya Chen" | CEO [role: ceo]
  cto: "Noah Kim" | CTO [role: cto]
    eng: "Ava Singh" | Staff Engineer [role: engineer]
    open open1: "TBH" | Product Engineer [role: engineer]
  cpo: "Lena Ortiz" | CPO [role: cpo]
    design: "Eli Park" | Product Designer [role: designer]`,
  "circuit-netlist": `circuit "Sensor Front End" netlist
V1 VIN 0 value="5V" label="Supply"
R1 VIN VOUT value="10kΩ" label="Bias"
C1 VOUT 0 value="100nF" label="Filter"
R2 VOUT ADC value="1kΩ" label="Protect"
C2 ADC 0 value="10nF" label="ADC cap"`,
  "floorplan-home": `floorplan "Compact Apartment" unit m
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
  genogram: `genogram "Smith Family — Clinical View"
  grandpa [male, 1930, deceased, label:"Robert"]
  grandma [female, 1932, label:"Helen"]
  grandpa -- grandma
    dad [male, 1955, label:"Michael"]
    aunt [female, 1958, label:"Susan"]
  dad -- mom [female, 1957, label:"Linda"]
    me [male, 1985, index, label:"Alex"]
    sister [female, 1988, label:"Emma"]
  dad -close- aunt "supportive"`,
  mindmap: `mindmap
# Product Launch
## Market readiness
- Competitive analysis
- Target segments
## Engineering
- Feature freeze
- Load testing`,
  network: `network "Branch Office Network"
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
  decisiontree: `decisiontree "Customer Support Triage"
direction: top-down
question "Is the service completely down?"
  yes: question "Outage confirmed?"
    yes: answer "Page the on-call engineer"
    no: answer "Open a severity-1 ticket"
  no: answer "Request a screenshot"`,
  fishbone: `fishbone "Solder Joint Defect Spike"
effect "3.2% solder joint rejects"
category man "Man"
category machine "Machine"
man : "New operators on night shift"
machine : "Reflow oven temperature drift"`,
  erd: `erd
title: "Commerce Schema"
direction: LR
table "Customers" as Customer {
  customer_id int PK
  email varchar UK
}
table "Orders" as Order {
  order_id int PK
  customer_id int FK -> Customer.customer_id
}
ref Order.customer_id many-mandatory -- one-mandatory Customer.customer_id`,
  umlclass: `umlclass
title: "Order Model"
class Order as "Purchase Order" {
  - id : String
  + total : Money
}
class Customer as "Customer Account" {
  + name : String
}
Customer "1" -- "*" Order : places`,
};
