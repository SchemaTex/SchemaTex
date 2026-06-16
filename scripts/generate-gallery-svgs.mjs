import { render } from '../dist/index.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const examples = [
  {
    file: 'examples/genogram/harry-potter.svg',
    text: `genogram "The Potter Family"
  fleamont [male, 1909, 1979, deceased]
  euphemia [female, 1920, 1979, deceased]
  fleamont -- euphemia
    james [male, 1960, 1981, deceased]
  mr_evans [male, 1925, deceased]
  mrs_evans [female, 1928, deceased]
  mr_evans -- mrs_evans
    lily [female, 1960, 1981, deceased]
    petunia [female, 1958]
  james -- lily "m. 1978"
    harry [male, 1980, index]
  petunia -- vernon [male, 1951]
    dudley [male, 1980]
  harry -cutoff- petunia
  harry -hostile- dudley
  harry -close- lily`,
  },
  {
    file: 'examples/ecomap/refugee-family.svg',
    text: `ecomap "Nguyen Family Resettlement"
  center: family [label: "Nguyen Family"]
  resettlement [label: "IRC Office", category: government]
  school [label: "Lincoln Elementary", category: education]
  esl [label: "Adult ESL Class", category: education]
  clinic [label: "Community Clinic", category: health]
  caseworker [label: "Ms. Patel", category: mental-health]
  temple [label: "Vietnamese Temple", category: cultural]
  neighbors [label: "Sponsor Family", category: community]
  employer [label: "Warehouse Job", category: work]
  cousins [label: "Cousins (CA)", category: family]
  family === resettlement [label: "active case"]
  family === school
  family --- esl [label: "twice weekly"]
  clinic --> family [label: "vaccinations"]
  caseworker <-> family [label: "weekly"]
  family === temple [label: "anchor"]
  neighbors === family [label: "housing host"]
  family --- employer [label: "new, part-time"]
  cousins == family [label: "phone support"]`,
  },
  {
    file: 'examples/pedigree/brca-family.svg',
    text: `pedigree "BRCA1 Family — Hereditary Breast/Ovarian Cancer"
  I-1 [male, unaffected]
  I-2 [female, affected, deceased]
  I-1 -- I-2
    II-1 [female, affected]
    II-2 [male, unaffected]
    II-3 [female, carrier]
  II-1 -- II-4 [male, unaffected]
    III-1 [female, affected, proband]
    III-2 [male, unaffected]
    III-3 [female, presymptomatic]
  II-2 -- II-5 [female, unaffected]
    III-4 [male, unaffected]
    III-5 [female, unaffected]
  II-3 -- II-6 [male, unaffected]
    III-6 [female, carrier]
    III-7 [male, unaffected]
  III-1 -- III-8 [male, unaffected]
    IV-1 [female, unaffected]
    IV-2 [female, presymptomatic]`,
  },
  {
    file: 'examples/phylo/bacterial-diversity.svg',
    text: `phylo "Bacterial Diversity"
  newick: "((((Ecoli:0.1,Salmonella:0.12):0.05[&&NHX:B=98],Vibrio:0.2):0.08[&&NHX:B=85],((Bacillus:0.15,Staph:0.18):0.06[&&NHX:B=92],Listeria:0.22):0.1):0.15,((Myco_tb:0.3,Myco_leprae:0.28):0.12[&&NHX:B=100],(Strepto:0.25,Lactobacillus:0.2):0.08[&&NHX:B=78]):0.2);"

  clade Gamma = (Ecoli, Salmonella, Vibrio) [color: "#1E88E5", label: "γ-Proteobacteria"]
  clade Firmi = (Bacillus, Staph, Listeria, Strepto, Lactobacillus) [color: "#E53935", label: "Firmicutes"]
  clade Actino = (Myco_tb, Myco_leprae) [color: "#43A047", label: "Actinobacteria"]

  scale "substitutions/site"`,
  },
  {
    file: 'examples/timing/spi-transaction.svg',
    text: `timing "SPI Transaction" [hscale: 2]

CLK:  ppppppppp
CS:   10000001
MOSI: x=======x  data: ["0xAB", "0xCD", "0xEF", "0x01", "0x02", "0x03", "0x04", "0x05"]
MISO: xzzzz===x  data: ["", "", "", "", "0xFF", "0x12", "0x34", "0x56"]`,
  },
  {
    file: 'examples/logic/full-adder.svg',
    text: `logic "1-bit Full Adder" [style: ansi]

input A, B, Cin
output Sum, Cout

s1 = xor(A, B)
Sum = xor(s1, Cin)
c1 = and(A, B)
c2 = and(s1, Cin)
Cout = or(c1, c2)`,
  },
  {
    file: 'examples/block/pid-loop.svg',
    text: `blockdiagram "PID Closed-Loop Control System"

C = block("C(s)") [name: "PID Controller", role: controller]
G = block("G(s)") [name: "Plant", role: plant]
H = block("H(s)") [name: "Sensor", role: sensor]

r = signal("r(t)")
e = signal("e(t)")
u = signal("u(t)")
y = signal("y(t)")
ym = signal("y_m(t)")

err = sum(+r, -ym)

in -> r
r -> err ["R(s)"]
err -> C ["E(s)"]
C -> G ["U(s)"]
G -> out ["Y(s)"]
G -> H ["Y(s)"]
H -> err ["Y_m(s)"]`,
  },
  {
    file: 'examples/circuit/ce-amplifier.svg',
    text: `circuit "CE Amp (netlist)" netlist
V1 vcc 0 9V
Rc vcc c 2.2k
Rb vcc b 100k
Q1 c b e npn
Re e 0 1k`,
  },
  {
    file: 'examples/ladder/motor-start-stop.svg',
    text: `ladder "Motor Start/Stop"
rung 1 "Seal-in circuit":
  parallel:
    branch:
      XIC(START_PB, "IN 1.0", name="Start Button")
    branch:
      XIC(MOTOR_AUX, "BIT 3.0", name="Aux Contact")
  XIO(STOP_PB, "IN 1.1", name="Stop Button")
  OTE(MOTOR_CMD, "OUT 2.0", name="Motor Command")`,
  },
  {
    file: 'examples/sld/substation-13kv.svg',
    text: `sld "13.8 kV Substation"
utility = utility [label: "Grid 138 kV"]
xfmr1 = transformer [label: "15 MVA"]
bus_hv = bus [voltage: "138 kV"]
bus_mv = bus [voltage: "13.8 kV"]
brk1 = breaker [rating: "1200 A"]
brk2 = breaker [rating: "1200 A"]
brk3 = breaker [rating: "1200 A"]
feeder1 = load [label: "Feeder 1"]
feeder2 = load [label: "Feeder 2"]
feeder3 = load [label: "Feeder 3"]
utility -> bus_hv
bus_hv -> xfmr1
xfmr1 -> bus_mv
bus_mv -> brk1
brk1 -> feeder1
bus_mv -> brk2
brk2 -> feeder2
bus_mv -> brk3
brk3 -> feeder3`,
  },
  {
    file: 'examples/entity/holding-company.svg',
    text: `entity-structure "Acme Holdings"
entity acme_inc "Acme Inc." corp@DE
entity acme_uk "Acme UK Ltd." llc@UK
entity acme_fund "Acme Growth Fund LP" fund@KY
entity trust_a "Founder Trust" trust@SD
trust_a -> acme_inc : 100%
acme_inc -> acme_uk : 100%
acme_inc -> acme_fund : 60%`,
  },
  {
    file: 'examples/sociogram/playground-dynamics.svg',
    text: `sociogram "Playground Dynamics"
  config: layout = force-directed
  config: coloring = group

  group boys [label: "Boys", color: "#42A5F5"]
    tom
    jack
    mike
    leo

  group girls [label: "Girls", color: "#EF5350"]
    anna
    beth
    chloe
    diana

  tom <-> jack
  tom -> mike
  jack -> leo
  mike -x> leo [label: "conflict"]
  anna <-> beth
  anna <-> chloe
  beth <-> chloe
  anna -> diana
  diana -.- tom
  leo -.- anna`,
  },
  {
    file: 'examples/petri/mutual-exclusion.svg',
    text: `petri "Mutual Exclusion — two processes, one resource"
  place idleA *1 "A idle"
  place idleB *1 "B idle"
  place mutex *1 "resource"
  place critA "A critical"
  place critB "B critical"
  transition enterA
  transition exitA
  transition enterB
  transition exitB
  idleA -> enterA
  mutex -> enterA
  enterA -> critA
  critA -> exitA
  exitA -> idleA
  exitA -> mutex
  idleB -> enterB
  mutex -> enterB
  enterB -> critB
  critB -> exitB
  exitB -> idleB
  exitB -> mutex`,
  },
  {
    file: 'examples/petri/producer-consumer.svg',
    text: `petri "Producer / Consumer (bounded buffer)"
  place pReady *1 "producer ready"
  place free *3 "free slots"
  place used capacity: 3 "used slots"
  place cReady *1 "consumer ready"
  transition produce "deposit"
  transition consume timed rate: 0.8 "withdraw"
  pReady -> produce
  free -> produce
  produce -> used
  produce -> pReady
  used -> consume
  cReady -> consume
  consume -> free
  consume -> cReady`,
  },
  {
    file: 'examples/network/cctv-camera-network.svg',
    text: `network "Acme HQ — CCTV"
  layout: tiered
  internet net "Internet"
  firewall fw1 "Perimeter FW" tier: edge
  l3switch core1 "Core SW" tier: core
  poeswitch poe1 "PoE Switch A" tier: access
  poeswitch poe2 "PoE Switch B" tier: access
  nvr nvr1 "Video Recorder"
  monitor wall1 "Guard Station"
  subnet cams "192.168.20.0/24" {
    camera cam1 "Lobby Dome" type: dome ip: 192.168.20.11
    camera cam2 "Gate PTZ" type: ptz ip: 192.168.20.12
    camera cam3 "Dock Bullet" type: bullet ip: 192.168.20.13
    poe1
    poe2
  }
  net -- fw1 : wan "ISP 1Gbps"
  fw1 -- core1 : fiber 10G
  core1 -- poe1 : trunk vlan: 20 1G
  core1 -- poe2 : trunk vlan: 20 1G
  core1 -- nvr1 : 1G
  core1 -- wall1
  poe1 -- cam1 : poe
  poe1 -- cam2 : poe
  poe2 -- cam3 : poe`,
  },
  {
    file: 'examples/network/enterprise-campus.svg',
    text: `network "Driscoll Campus"
  layout: tiered
  internet inet
  cloud wan "WAN"
  firewall fw1 "Core Firewall" tier: edge
  router er1 "Edge Rtr 1" tier: edge
  l3switch cs1 "Core SW 1" tier: core
  l3switch cs2 "Core SW 2" tier: core
  switch d1 "Dist A" tier: distribution
  switch d2 "Dist B" tier: distribution
  serverfarm farm "Server Farm" count: 4
  a1 a2 a3 : switch tier: access
  inet -- fw1
  wan -- er1 : serial
  fw1 -- cs1 : 10G
  er1 -- cs2
  cs1 == cs2 : lag 40G
  cs1 -- d1
  cs2 -- d2
  cs1 -- farm : trunk vlan: 100
  d1 -- a1
  d2 -- a2
  d2 -- a3`,
  },
  {
    file: 'examples/network/spine-leaf-fabric.svg',
    text: `network "DC Fabric"
  layout: spine-leaf
  spines: sp1 sp2
  leaves: lf1 lf2 lf3 lf4
  server h1
  server h2
  server h3
  lf1 -- h1 : 25G
  lf2 -- h2 : 25G
  lf4 -- h3 : 25G`,
  },
  {
    file: 'examples/umlclass/shape-hierarchy.svg',
    text: `umlclass
title: "Shapes"
«interface» Shape {
  + area() : double
  + perimeter() : double
}
abstract class AbstractShape {
  # name : String
  + area() : double {abstract}
  + describe() : String
}
class Circle {
  + radius : double
  + area() : double
}
class Square {
  + side : double
  + area() : double
}
Shape         <|.. AbstractShape
AbstractShape <|-- Circle
AbstractShape <|-- Square`,
  },
  {
    file: 'examples/umlclass/order-domain.svg',
    text: `umlclass
title: "Order domain"
class Order {
  - id : String
  + total : Money {readOnly}
  + place() : void
}
class LineItem {
  + qty : int
  + subtotal() : Money
}
class Customer { + name : String }
class Address  { + city : String }
class TaxPolicy { + rate(c : Country) : Percent }
Customer "1" -- "*" Order   : places
Order    *-- "1..*" LineItem : contains
Customer o-- "0..*" Address : has
Order    ..> TaxPolicy      : uses`,
  },
  {
    file: 'examples/umlclass/namespaces.svg',
    text: `umlclass
title: "Layered packages"
namespace Platform {
namespace Auth {
class UserService {
  + login()
  + logout()
}
}
namespace Data {
class Repository {
  + find()
  + save()
}
}
}
class Gateway {
  + route()
}
Gateway --> UserService : delegates
Gateway --> Repository  : delegates`,
  },
  {
    file: 'examples/faulttree/pump-redundancy.svg',
    text: `faulttree "Both pumps fail"
  analysis: cutsets, probability
  top T "Both redundant pumps fail" = AND(PA, PB)
  basic PA "Pump A fails" p: 0.01
  basic PB "Pump B fails" p: 0.01`,
  },
  {
    file: 'examples/faulttree/repeated-event.svg',
    text: `faulttree "Product not removed"
  analysis: cutsets, probability
  top T  "Failure to remove product" = OR(G1, G2)
  gate G1 "Arm jams or collides"      = AND(MSF, G3)
  gate G2 "Wrong slot commanded"      = OR(CDM, MSF)
  gate G3 "Loss of position feedback" = OR(ESF, RCF)
  basic MSF "Manipulator system failure" p: 0.0035
  basic CDM "Controller command error"   p: 0.0009
  basic ESF "Encoder sensor failure"     p: 0.0021
  basic RCF "Resolver cable fault"       p: 0.0012`,
  },
  {
    file: 'examples/faulttree/vessel-rupture.svg',
    text: `faulttree "Vessel ruptures"
  analysis: cutsets, probability
  prob: mcub
  top TOP "Pressure vessel ruptures" = AND(OVP, RELIEF)
  gate OVP    "Sustained over-pressure" = INHIBIT(PUMP) if HEATER
  gate RELIEF "Both reliefs fail"        = VOTING(2/2; PRV_A, PRV_B)
  basic PUMP  "Pump runaway"   p: 0.004
  basic PRV_A "Relief A stuck" p: 0.02
  basic PRV_B "Relief B stuck" p: 0.02
  house HEATER "Heater energised" state: 1
  undeveloped EXT "External fire (not modelled)"`,
  },
  {
    file: 'examples/bowtie/lpg-loss-of-containment.svg',
    text: `bowtie "LPG storage — loss of containment"
hazard "LPG stored under pressure"
topevent "Loss of containment"
threat "Corrosion of vessel wall"
  prevent "Corrosion-resistant coating"
  prevent "UT thickness inspection"
threat "Overpressure during filling"
  prevent "High-pressure trip (SIL 2)"
  prevent "Pressure relief valve"
threat "Mechanical impact (vehicle)"
  prevent "Bollards / vehicle barriers"
  prevent "Site speed limit + banksman"
consequence "Jet fire"
  mitigate "Gas detection + ESD"
  mitigate "Deluge / water spray"
consequence "Vapour cloud explosion"
  mitigate "Ignition-source control (ATEX)"
  mitigate "Blast-resistant control room"
consequence "Toxic / asphyxiation exposure"
  mitigate "Personal gas monitors"
  mitigate "Emergency evacuation plan"`,
  },
  {
    file: 'examples/bowtie/working-at-height.svg',
    text: `bowtie "Working at height"
hazard "Working at height"
topevent "Person falls from height"
threat "Guardrail removed for access"
  prevent "Permit-to-work system"
  prevent "Temporary edge protection"
    escalation "Edge protection not inspected"
      barrier "Pre-use inspection regime"
  prevent "Spotter / banksman"
threat "Fragile roof surface"
  prevent "Crawling boards + signage"
  prevent "Roof-access risk assessment"
consequence "Fatality"
  mitigate "Fall-arrest harness + lanyard"
  mitigate "Rescue plan + first aid"
consequence "Serious injury"
  mitigate "Safety netting below"
  mitigate "On-site medic + evacuation"`,
  },
  {
    file: 'examples/bowtie/hot-work-fire.svg',
    text: `bowtie "Hot work — fire bowtie"
hazard "Hot work near flammable materials"
topevent "Ignition of flammable atmosphere"
threat "Sparks / hot slag"
  prevent "Hot-work permit"
  prevent "Fire watch"
    escalation "Fire watch leaves post early"
      barrier "Post-work monitoring period (60 min)"
threat "Static discharge"
  prevent "Bonding + grounding"
  prevent "Antistatic PPE"
consequence "Flash fire"
  mitigate "Fixed fire suppression"
    escalation "Suppression isolated for maintenance"
      barrier "Impairment register + MoC"
consequence "Asset loss"
  mitigate "Fire-rated separation"
  mitigate "Business-continuity plan"`,
  },
  {
    file: 'examples/floorplan/family-home.svg',
    text: `floorplan "Four-Bedroom Family Home — 160 m²" unit m
north
room living  "Living Room" at 0,0 size 6x4.6
extend living at 0,4.6 size 2x2.6
room kitchen "Kitchen" right-of living size 4.2x4.6
room dining  "Dining" right-of kitchen size 3.6x4.6
room hall    "Hall" at 2,4.6 size 9.5x2.6 nolabel
room bath    "Bath" at 11.5,4.6 size 2.3x2.6
room master  "Master Bedroom" at 0,7.2 size 4.3x4.4
room wic     "WIC" at 4.3,7.2 size 1.8x2.0
room ensuite "En-suite" at 4.3,9.2 size 1.8x2.4
room laundry "Laundry" at 6.1,7.2 size 1.9x2.0
room bed2    "Bedroom 2" at 8.0,7.2 size 2.5x4.4
extend bed2 at 6.1,9.2 size 1.9x2.4
room bed3    "Bedroom 3" at 10.5,7.2 size 3.3x4.4

door living west at 88% width 1.0
opening between living kitchen at 45% width 1.8
opening between kitchen dining at 50% width 1.5
opening between living hall at 70% width 1.6
door between hall bath at 40%
door between hall master at 75%
door between master wic at 50% type sliding
door between master ensuite at 50%
door between hall laundry at 50% type bifold width 1.2
door between hall bed2 at 50%
door between hall bed3 at 30%

window living north at 70% width 2.2 type bay
window living west at 30% width 1.6
window kitchen north at 50% width 1.8 type sliding
window dining north at 50% width 1.8 type sliding
window dining east at 40% width 1.6
window bath east at 50% width 0.7 type casement
window master west at 50% width 1.6
window master south at 40% width 1.8
window ensuite south at 50% width 0.8
window bed2 south at 60% width 1.6
window bed3 south at 50% width 1.8
window bed3 east at 40% width 1.4

furniture fireplace in living at 0.8,0.06 size 1.5x0.45
furniture sectional in living at 0.4,1.2 size 2.8x2.0
furniture rug in living at 0.5,0.9 size 3.8x2.8
furniture coffee-table in living at 3.2,1.7
furniture piano in living at 4.3,0.7 rotate 180
furniture tv-stand in living at 2.4,4.05
furniture tv in living at 2.55,4.18 size 1.3x0.12
furniture ceiling-fan in living at 2.5,2.2
furniture plant in living at 0.25,4.8
furniture side-table in living at 1.3,4.75

furniture counter in kitchen at 0.15,0.12 size 3.9x0.65
furniture wall-cabinet in kitchen at 0.15,0.12 size 3.9x0.35
furniture kitchen-sink in kitchen at 0.8,0.15
furniture dishwasher in kitchen at 1.6,0.15
furniture stove in kitchen at 2.6,0.13
furniture range-hood in kitchen at 2.5,0.1 size 0.8x0.55
furniture fridge in kitchen at 3.4,1.0 size 0.8x0.75
furniture island in kitchen at 1.0,2.2 size 2.2x0.9
furniture bar-stool in kitchen at 1.3,3.25
furniture bar-stool in kitchen at 2.0,3.25
furniture bar-stool in kitchen at 2.7,3.25

furniture dining-table in dining at 0.7,1.5 size 2.2x1.0
furniture bookcase "Cabinet" in dining at 0.3,0.12 size 1.5x0.35
furniture plant in dining at 3.0,0.3

furniture stairs in hall at 0.15,0.1 size 1.0x2.4

furniture toilet in bath at 0.25,0.15
furniture vanity in bath at 0.85,0.15 size 1.3x0.5
furniture bathtub in bath at 0.2,0.9 size 0.75x1.6

furniture bed-king in master at 0.9,1.1
furniture nightstand in master at 0.35,1.3
furniture nightstand in master at 2.95,1.3
furniture dresser in master at 3.7,1.0 size 0.5x1.4
furniture armchair in master at 3.3,3.4
furniture ceiling-fan in master at 2.0,2.6

furniture wardrobe in wic at 0.12,0.15 size 0.55x1.7
furniture wardrobe in wic at 1.15,0.15 size 0.55x1.7

furniture toilet in ensuite at 0.2,0.2
furniture sink in ensuite at 1.1,0.2
furniture shower in ensuite at 0.75,1.4 size 0.95x0.9

furniture washer in laundry at 0.15,0.2
furniture dryer in laundry at 0.85,0.2
furniture counter in laundry at 0.15,1.4 size 1.6x0.5

furniture bed-double in bed2 at 2.0,1.6 size 1.5x2.0
furniture wardrobe in bed2 at 3.85,0.15 size 0.5x1.6
furniture desk in bed2 at 0.2,2.6 size 1.2x0.6

furniture bed-double in bed3 at 0.9,1.0 size 1.6x2.0
furniture nightstand in bed3 at 0.3,1.1
furniture wardrobe in bed3 at 2.7,0.15 size 0.5x1.8
furniture bookshelf in bed3 at 0.3,3.9 size 1.2x0.35`,
  },
  {
    file: 'examples/playbook/football-four-verticals.svg',
    text: `playbook "Four Verticals" sport football
field down 2 distance 7 los 40
formation spread
defense cover-2
route X go
route H seam
route Y seam
route Z go
route RB flat right`,
  },
  {
    file: 'examples/playbook/basketball-pick-and-roll.svg',
    text: `playbook "Spread Pick & Roll" sport basketball
set spread-pnr
screen 5 1
dribble 1 to 11,17
cut 5 rim
pass 1 2`,
  },
  {
    file: 'examples/playbook/soccer-counter-attack.svg',
    text: `playbook "Counter-Attack" sport soccer
formation 4-3-3
pass 6 8
dribble 8 to 66,28
pass 8 to 96,18
run 7 to 99,20
run 9 to 94,36
run 11 to 95,52`,
  },
  {
    file: 'examples/pert/gantt-website-relaunch.svg',
    text: `gantt "Website Relaunch"
  start: 2026-07-01
  calendar: 5day
  task A "Discovery" duration: 5 lane: "Plan"
  task B "Wireframes" duration: 8 after: A lane: "Design"
  task C "Visual design" duration: 6 after: B lane: "Design" progress: 40%
  task D "Frontend build" duration: 12 after: C lane: "Build"
  task E "Backend API" duration: 10 after: A lane: "Build"
  task F "Integration & QA" duration: 5 after: D, E lane: "Build"
  task LAUNCH "Go live" milestone after: F lane: "Build"
  today: 2026-07-20`,
  },
  {
    file: 'examples/rbd/redundant-server.svg',
    text: `rbd "Redundant Server"
  series {
    block PSU "Power Supply" R=0.99
    parallel {
      block FAN1 "Fan A" R=0.95
      block FAN2 "Fan B" R=0.95
    }
    kofn 2/3 {
      block D1 "Disk 1" R=0.97
      block D2 "Disk 2" R=0.97
      block D3 "Disk 3" R=0.97
    }
  }`,
  },
  {
    file: 'examples/rbd/data-center-tier-iii.svg',
    text: `rbd "Data Center Tier III Availability"
  series {
    parallel {
      block UTIL "Utility feed" R=0.999
      series {
        block GEN "Diesel generator" R=0.98
        block ATS "Transfer switch" R=0.995
      }
    }
    kofn 2/3 {
      block CRAC1 "CRAC unit 1" R=0.97
      block CRAC2 "CRAC unit 2" R=0.97
      block CRAC3 "CRAC unit 3" R=0.97
    }
    parallel {
      block SW1 "Core switch A" R=0.995
      block SW2 "Core switch B" R=0.995
    }
    parallel {
      block ST1 "Storage node A" R=0.99
      block ST2 "Storage node B" R=0.99
    }
  }`,
  },
  {
    file: 'examples/comparison/cicd-decision-matrix.svg',
    text: `comparison "Selecting a CI/CD platform"
mode: decision
baseline: "Jenkins"
option "GitHub Actions"
option "GitLab CI"
option "CircleCI"
option "Jenkins"
criterion "Ease of setup" weight: 5
  GitHub Actions: 5
  GitLab CI: 4
  CircleCI: 4
  Jenkins: 2
criterion "Build speed" weight: 4
  GitHub Actions: 4
  GitLab CI: 4
  CircleCI: 5
  Jenkins: 3
criterion "Cost at our scale" weight: 4
  GitHub Actions: 4
  GitLab CI: 3
  CircleCI: 3
  Jenkins: 5
criterion "Ecosystem / marketplace" weight: 3
  GitHub Actions: 5
  GitLab CI: 3
  CircleCI: 3
  Jenkins: 4
criterion "Self-host control" weight: 2
  GitHub Actions: 2
  GitLab CI: 5
  CircleCI: 2
  Jenkins: 5`,
  },
  {
    file: 'examples/comparison/cloud-feature-matrix.svg',
    text: `comparison "Cloud provider — managed services"
mode: matrix
option "AWS"
option "GCP"
option "Azure"
criterion "Free tier"
  AWS: "12 months"
  GCP: "Always-free"
  Azure: "12 months"
criterion "Managed Postgres"
  AWS: yes
  GCP: yes
  Azure: yes
criterion "Serverless GPU"
  AWS: partial
  GCP: yes
  Azure: partial
criterion "Spot discount"
  AWS: "up to 90%"
  GCP: "up to 91%"
  Azure: "up to 90%"
criterion "On-prem hybrid"
  AWS: partial
  GCP: partial
  Azure: yes`,
  },
  {
    file: 'examples/comparison/microservices-pros-cons.svg',
    text: `comparison "Migrate the monolith to microservices?"
mode: pros-cons
pro "Independent team deploys, no release train"
pro "Scale hot paths in isolation"
pro "Fault isolation between services"
con "Distributed-systems complexity (tracing, retries)"
con "Operational + infra cost goes up"
con "Network latency across service hops"
con "Harder local dev + end-to-end testing"`,
  },
  {
    file: 'examples/comparison/cell-double-bubble.svg',
    text: `comparison "Plant cell vs Animal cell"
mode: double-bubble
left "Plant cell"
right "Animal cell"
shared "Has a nucleus"
shared "Mitochondria"
shared "Cell membrane"
left-only "Cell wall"
left-only "Chloroplasts"
left-only "Large central vacuole"
right-only "Centrioles"
right-only "Lysosomes"
right-only "Many small vacuoles"`,
  },
];

for (const { file, text } of examples) {
  const outPath = join(root, file);
  mkdirSync(dirname(outPath), { recursive: true });
  const svg = render(text);
  writeFileSync(outPath, svg, 'utf8');
  console.log(`✓ ${file}`);
}
