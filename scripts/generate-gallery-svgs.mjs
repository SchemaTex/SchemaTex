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
];

for (const { file, text } of examples) {
  const outPath = join(root, file);
  mkdirSync(dirname(outPath), { recursive: true });
  const svg = render(text);
  writeFileSync(outPath, svg, 'utf8');
  console.log(`✓ ${file}`);
}
