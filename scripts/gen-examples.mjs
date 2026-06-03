import { render } from '../dist/index.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const examples = [
  ['examples/sociogram/criminal-network.svg', `sociogram "Operation Sunset - Communication Network"
  config: layout = force-directed
  boss [label: "Subject Alpha"]
  lt1 [label: "Lieutenant 1"]
  lt2 [label: "Lieutenant 2"]
  courier1 [label: "Courier A"]
  courier2 [label: "Courier B"]
  contact1 [label: "External Contact 1"]
  contact2 [label: "External Contact 2"]
  associate1 [label: "Associate 1"]
  associate2 [label: "Associate 2"]
  boss <-> lt1 [weight: 4]
  boss <-> lt2 [weight: 4]
  lt1 -> courier1
  lt1 -> courier2
  lt2 -> associate1
  lt2 -> associate2
  courier1 -> contact1 [label: "supplier"]
  courier2 -> contact2 [label: "distributor"]
  lt1 <-> lt2 [weight: 2]
  associate1 -.- courier1`],

  ['examples/sld/generator-ats.svg', `sld "Utility with generator backup"
UTIL = utility [voltage: "480V", label: "Utility"]
GEN = generator [rating: "500 kW", voltage: "480V", label: "Emergency Gen"]
ATS1 = ats [rating: "800A", label: "ATS-1"]
BUS1 = bus [voltage: "480V", label: "Critical Load Bus"]
CB1 = breaker [rating: "200A"]
CB2 = breaker [rating: "200A"]
L1 = load [rating: "100A", label: "Critical Load 1"]
L2 = load [rating: "100A", label: "Critical Load 2"]
UTIL -> ATS1
GEN -> ATS1
ATS1 -> BUS1
BUS1 -> CB1
BUS1 -> CB2
CB1 -> L1
CB2 -> L2`],

  ['examples/block/nested-feedback.svg', `blockdiagram "Nested Feedback Loops"
G1 = block("G1(s)") [role: plant]
G2 = block("G2(s)") [role: plant]
G3 = block("G3(s)") [role: plant]
H1 = block("H1(s)") [role: sensor]
H2 = block("H2(s)") [role: sensor, route: above]
s1 = sum(+R, -h2)
s2 = sum(+a, -h1)
in -> s1 ["R(s)"]
s1 -> G1 -> s2
s2 -> G2 -> G3
G3 -> out ["Y(s)"]
G2 -> H1
H1 -> s2
G3 -> H2
H2 -> s1`],

  ['examples/fishbone/website-traffic-drop.svg', `fishbone "Website Traffic Drop — Root Cause Analysis"
effect "Traffic Drop"
category content "Content"
category tech "Technical"
category links "Backlinks"
category ux "UX"
category competition "Competition"
category algo "Algorithm"
content : "Lower update frequency"
content : "Thin content"
content : "Keyword gaps"
content : "Low-quality AI content"
tech : "Poor Core Web Vitals"
tech : "Crawl coverage drop"
tech : "WAF blocking crawlers"
tech : "Missing structured data"
links : "High-DA backlink loss"
links : "Low-quality link ratio"
links : "Referring domain plateau"
links : "Anchor text diversity low"
ux : "Bounce rate spike"
ux : "Poor mobile experience"
ux : "Slow LCP"
ux : "Intrusive interstitials"
competition : "New entrants"
competition : "AI overviews displacing clicks"
competition : "Brand erosion"
competition : "Competitor cadence faster"
algo : "Core Update penalty"
algo : "Weak E-E-A-T signals"
algo : "SGE traffic diversion"
algo : "Intent drift"`],

  // ── Bucket A engine-extension showcase (new modes) ──────────────
  ['examples/phylo/dendrogram-gene-clusters.svg', `phylo "Gene expression clusters" [mode: dendrogram]
  newick: "(((A:1,B:1):2,C:3):2,(D:2,E:2):3);"
  cut 4
  scale "cluster distance"`],

  ['examples/decisiontree/influence-oil-wildcatter.svg', `decisiontree:influence "Oil Wildcatter"
  decision Drill "Drill?"
  chance Oil "Oil present"
  chance Seismic "Seismic test"
  value Profit "Net profit" utility=42
  Seismic -> Oil
  Seismic -> Drill
  Oil -> Profit
  Drill -> Profit`],

  ['examples/matrix/sipoc-order-fulfilment.svg', `matrix sipoc "Order fulfilment"
suppliers: "Vendor", "Warehouse"
inputs: "PO", "Stock levels"
process: "Receive order", "Pick", "Pack", "Ship"
outputs: "Shipped package", "Invoice"
customers: "End customer", "Finance"`],

  ['examples/matrix/qfd-coffee-maker.svg', `matrix qfd "Coffee maker"
what: "Quiet operation" weight: 5
what: "Brews fast" weight: 3
what: "Energy efficient" weight: 4
how: "Fan RPM" dir: down
how: "Heater watts" dir: up
how: "Insulation" dir: up
rel (0,0): 9
rel (0,2): 3
rel (1,1): 9
rel (2,1): 3
rel (2,2): 9
roof (0,1): --
roof (1,2): +`],

  ['examples/matrix/punnett-monohybrid.svg', `matrix punnett "Eye color  (Bb × Bb)"
cross: Bb x Bb
trait B: "Brown eyes" / "Blue eyes"`],

  ['examples/matrix/punnett-testcross.svg', `matrix punnett "Test cross  (Bb × bb)"
cross: Bb x bb
trait B: "Brown" / "Blue"`],

  ['examples/matrix/punnett-dihybrid.svg', `matrix punnett "Seed shape & colour  (RrYy × RrYy)"
cross: RrYy x RrYy
trait R: "Round" / "Wrinkled"
trait Y: "Yellow" / "Green"`],

  ['examples/mindmap/futureswheel-remote-work.svg', `%% style: futureswheel
# Remote work becomes default
## Less commuting
- Lower carbon emissions
- Cheaper city living
## Distributed teams
- Async communication norms
- Global hiring pools
## Empty offices
- Commercial real estate slump
- Repurposed to housing`],

  ['examples/mindmap/driver-readmissions.svg', `%% style: driver
# Reduce 30-day readmissions
## Reliable discharge process
- Teach-back at bedside
- Med reconciliation
## Timely follow-up
- Appointment within 7 days
- Post-discharge phone call`],

  // ── Bucket B engines (39–46) ────────────────────────────────────
  ['examples/eventtree/loca-sequence.svg', `eventtree "Loss of coolant accident"
  initiating LOCA "Large LOCA" freq: 1e-4
  function A "ECCS injects" p: 0.001
  function B "Containment spray" p: 0.01
  function C "Containment integrity" p: 0.005
  outcome s s s -> "OK"
  outcome s s f -> "Late release"
  outcome s f * -> "Early release"
  outcome f * * -> "Core damage"`],

  ['examples/fmea/injection-molding-pfmea.svg', `fmea "Injection-Molding PFMEA"
  type: process
  rank: rpn
  flag: rpn > 100
  item "Mold fill" fn "Fill cavity completely"
    mode "Short shot"
      effect "Incomplete part" sev: 7
      cause "Low injection pressure" occ: 6
        controls detection: "Visual check" det: 5
    mode "Flash"
      effect "Dimensional defect" sev: 5
      cause "Excess clamp wear" occ: 4
        controls detection: "Gauge inspection" det: 4`],

  ['examples/causalloop/adoption-model.svg', `causalloop "Adoption model"
"Adoption rate" -> Adopters : +
Adopters -> "Adoption rate" : +
"Adoption rate" -> "Potential adopters" : -
"Potential adopters" -> "Adoption rate" : +
loop R1 "Word of mouth"
loop B1 "Market saturation"`],

  ['examples/markov/weather-stationary.svg', `markov "Weather"
  Sunny -> Sunny : 0.9
  Sunny -> Rainy : 0.1
  Rainy -> Sunny : 0.5
  Rainy -> Rainy : 0.5`],

  ['examples/gitgraph/feature-branch-flow.svg', `gitGraph
  commit id: "init"
  branch develop
  checkout develop
  commit id: "d1"
  commit tag: "v0.1"
  checkout main
  merge develop tag: "v1.0"
  branch feature
  commit id: "f1" type: HIGHLIGHT
  checkout main
  cherry-pick id: "f1"
  merge feature`],

  ['examples/epc/order-fulfilment.svg', `epc "Order fulfilment"
  event E1 "Order received"
  function F1 "Check credit"
  xor X1
  event E2 "Credit OK"
  event E3 "Credit rejected"
  function F2 "Ship goods"
  function F3 "Notify customer"
  event E4 "Order shipped"
  event E5 "Order cancelled"
  E1 -> F1 -> X1
  X1 -> E2
  X1 -> E3
  E2 -> F2 -> E4
  E3 -> F3 -> E5`],

  ['examples/idef0/maintain-spares.svg', `idef0 "Maintain Reparable Spares"
node A0
function A1 "Remove and replace"
function A2 "Schedule into shop"
function A3 "Inspect or repair"
function A4 "Monitor and route"
input     A1 "Failed asset"
control   A1 "Maintenance policy"
mechanism A1 "Field crew"
A1 -> A2 "Removed unit"
A2 -> A3 "Work order"
control   A3 "Repair standard"
mechanism A3 "Shop technicians"
A3 -> A4 "Repaired unit"
A4 -> A1.input "Spare"
output    A4 "Serviceable spare"`],

  ['examples/threatmodel/web-app-stride.svg', `threatmodel "Web App — STRIDE"
external: User
process 1.1: Web Server
process 1.2: Auth Service
datastore D1: User DB
datastore D2: Audit Log
User -> 1.1 : HTTPS Request
1.1 -> 1.2 : Credentials
1.2 -> D1 : Lookup
1.2 -> D2 : Auth Event
boundary "Internet" { User }
boundary "DMZ" { 1.1, 1.2 }
boundary "Internal" { D1, D2 }`],

  ['examples/welding/bracket-fillet.svg', `welding "Bracket assembly"
joint "gusset to column" {
  arrow: fillet size=8 len=50 pitch=150
  other: fillet size=6
  around
  field
  tail: "GMAW"
}
joint "splice plate (butt)" {
  arrow: vgroove angle=60 root=3 throat=12 contour=flush finish=G
  other: backing
  tail: "SMAW; E7018"
}`],
];

for (const [path, dsl] of examples) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    const svg = render(dsl);
    writeFileSync(path, svg);
    console.log('OK', path, svg.length + 'b');
  } catch (e) {
    console.error('ERR', path, e.message);
  }
}
