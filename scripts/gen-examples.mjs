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
