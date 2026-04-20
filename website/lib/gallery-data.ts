export const heroDefault = `genogram "The Smiths"
  john [male, 1950]
  mary [female, 1952]
  john -- mary
    alice [female, 1975, index]
    bob [male, 1978]
  alice -close- mary
  alice -hostile- bob`;

import type { DiagramType } from '@/components/DiagramIcon';

interface GalleryExample {
  slug: string;
  title: string;
  blurb: string;
  icon: DiagramType;
  dsl: string;
  fallback: string;
}

export const galleryExamples: GalleryExample[] = [
  {
    slug: 'genogram',
    title: 'Genogram',
    icon: 'genogram',
    blurb: 'Family-systems therapy. McGoldrick standard.',
    dsl: `genogram "Family"
  j [male, 1950]
  m [female, 1952]
  j -- m
    a [female, 1975, index]
    b [male, 1978]`,
    fallback: '',
  },
  {
    slug: 'ecomap',
    title: 'Ecomap',
    icon: 'ecomap',
    blurb: 'Family in social context. Hartman 1978.',
    dsl: `ecomap "Family"
  center: f [label: "Family"]
  s [label: "School", category: education]
  c [label: "Clinic", category: health]
  t [label: "Temple", category: cultural]
  f === s
  c --> f
  f === t`,
    fallback: '',
  },
  {
    slug: 'pedigree',
    title: 'Pedigree',
    icon: 'pedigree',
    blurb: 'Clinical genetics. Standard nomenclature.',
    dsl: `pedigree "BRCA"
  I-1 [male, unaffected]
  I-2 [female, affected]
  I-1 -- I-2
    II-1 [female, affected, proband]
    II-2 [male, unaffected]
    II-3 [female, carrier]`,
    fallback: '',
  },
  {
    slug: 'phylo',
    title: 'Phylogenetic tree',
    icon: 'phylo',
    blurb: 'Evolutionary biology. Newick + NHX.',
    dsl: `phylo "Tree"
  newick: "((A:0.1,B:0.12):0.05,(C:0.15,D:0.18):0.06);"`,
    fallback: '',
  },
  {
    slug: 'sociogram',
    title: 'Sociogram',
    icon: 'sociogram',
    blurb: 'Social network analysis. Moreno sociometry.',
    dsl: `sociogram "Group"
  a; b; c; d
  a <-> b
  a -> c
  b -x> d
  c -.- d`,
    fallback: '',
  },
  {
    slug: 'timing',
    title: 'Timing diagram',
    icon: 'timing',
    blurb: 'Digital waveforms. WaveDrom-compatible.',
    dsl: `timing "SPI"
CLK:   pppppppp
CS_N:  10000001
MOSI:  x=======`,
    fallback: '',
  },
  {
    slug: 'logic',
    title: 'Logic gate',
    icon: 'logic',
    blurb: 'Combinational logic. IEEE 91 / IEC 60617.',
    dsl: `logic "Adder"
input A, B
output S, C
S = XOR(A, B)
C = AND(A, B)`,
    fallback: '',
  },
  {
    slug: 'circuit',
    title: 'Circuit schematic',
    icon: 'circuit',
    blurb: 'SPICE netlist or positional DSL.',
    dsl: `circuit "CE Amp" netlist
V1 vcc 0 9V
Rc vcc c 2.2k
Rb vcc b 100k
Q1 c b e npn
Re e 0 1k`,
    fallback: '',
  },
  {
    slug: 'ladder',
    title: 'Ladder logic',
    icon: 'ladder',
    blurb: 'PLC programs. IEC 61131-3 / Allen-Bradley.',
    dsl: `ladder "Motor"
rung 1 "Start":
  XIC(START_PB)
  XIO(STOP_PB)
  OTE(MOTOR_CMD)`,
    fallback: '',
  },
  {
    slug: 'sld',
    title: 'Single-line diagram',
    icon: 'sld',
    blurb: 'Power one-line. IEEE 315.',
    dsl: `sld "Substation"
utility = utility [label: "Grid 138 kV"]
xfmr = transformer [label: "15 MVA"]
bus_hv = bus [voltage: "138 kV"]
bus_mv = bus [voltage: "13.8 kV"]
brk = breaker [rating: "1200 A"]
feeder = load [label: "Feeder"]
utility -> bus_hv
bus_hv -> xfmr
xfmr -> bus_mv
bus_mv -> brk
brk -> feeder`,
    fallback: '',
  },
  {
    slug: 'entity',
    title: 'Entity structure',
    icon: 'entity',
    blurb: 'Corporate ownership & cap tables.',
    dsl: `entity-structure "Holdings"
entity parent "Acme Inc." corp@DE
entity sub "Acme UK Ltd." llc@UK
entity fund "Acme Growth Fund" fund@KY
parent -> sub : 100%
parent -> fund : 60%`,
    fallback: '',
  },
  {
    slug: 'block',
    title: 'Block diagram',
    icon: 'block',
    blurb: 'Signal-flow with feedback loops.',
    dsl: `blockdiagram "Control"
C = block("C(s)") [role: controller]
G = block("G(s)") [role: plant]
err = sum(+r, -y)
r = signal("r")
y = signal("y")
in -> r
r -> err
err -> C
C -> G
G -> y
G -> err`,
    fallback: '',
  },
  {
    slug: 'flowchart',
    title: 'Flowchart',
    icon: 'flowchart',
    blurb: 'Process & decision flows. Mermaid-compatible DSL.',
    dsl: `flowchart TD
  Start([Start]) --> Auth{Authenticated?}
  Auth -->|yes| Role{Admin?}
  Auth -->|no| Login[Login Page]
  Role -->|yes| Admin[Admin Panel]
  Role -->|no| Dashboard[User Dashboard]
  Login --> Auth`,
    fallback: '',
  },
  {
    slug: 'flowchart-shapes',
    title: 'FC Shapes',
    icon: 'flowchart',
    blurb: 'All node shapes — cylinder, circle, hexagon…',
    dsl: `flowchart LR
  S([Start]) --> P[Process]
  P --> D{Decision}
  D --> DB[(Database)]
  D --> Sub[[Subprocess]]
  DB --> End(((Stop)))
  Sub --> Hex{{Prepare}}
  Hex --> End`,
    fallback: '',
  },
  {
    slug: 'flowchart-arch',
    title: 'FC Architecture',
    icon: 'flowchart',
    blurb: 'System architecture with subgraph grouping.',
    dsl: `flowchart LR
  subgraph "Client"
    UI[React App] --> GW[API Gateway]
  end
  subgraph "Backend"
    GW --> Auth[Auth Service]
    GW --> API[Core API]
    API --> DB[(Postgres)]
  end
  Auth --> DB`,
    fallback: '',
  },
  {
    slug: 'medical-history-genogram',
    title: 'Medical history genogram',
    icon: 'genogram',
    blurb: 'Three-generation family medical history with color-coded inherited conditions.',
    dsl: `genogram "Medical History"
  grandfather [male, 1930, 1990, deceased, conditions: heart-disease(full, #e74c3c) + diabetes(half-left, #ff9800)]
  grandmother [female, 1935, conditions: cancer(half-right, #9c27b0)]
  grandfather -- grandmother
    father [male, 1960, conditions: heart-disease(quad-tl, #e74c3c) + hypertension(quad-tr, #2196f3)]
    uncle [male, 1963, conditions: diabetes(full, #ff9800)]
  mother [female, 1962]
  father -- mother
    patient [male, 1988, index, conditions: hypertension(half-left, #2196f3)]
    sister [female, 1991]`,
    fallback: '',
  },
  {
    slug: 'hemophilia-pedigree',
    title: 'Hemophilia A pedigree',
    icon: 'pedigree',
    blurb: 'X-linked recessive inheritance. Carrier females, affected males. NSGC notation.',
    dsl: `pedigree "Hemophilia A"
  I-1 [male, unaffected]
  I-2 [female, carrier-x]
  I-1 -- I-2
    II-1 [male, affected]
    II-2 [female, carrier-x]
    II-3 [male, unaffected]
    II-4 [female, unaffected]
  II-2 -- II-5 [male, unaffected]
    III-1 [male, affected]
    III-2 [female, carrier-x]
    III-3 [male, unaffected]`,
    fallback: '',
  },
  {
    slug: 'substance-abuse-recovery',
    title: 'Recovery ecomap',
    icon: 'ecomap',
    blurb: 'Clinical ecomap for substance abuse recovery — AA, therapist, legal, family.',
    dsl: `ecomap "Substance Abuse Recovery"
  center: client [male, age: 28, label: "James"]
  aa [label: "AA Group", category: substance, importance: major]
  sponsor [label: "Bill (Sponsor)", category: substance]
  employer [label: "Warehouse Job", category: work]
  mother [label: "Mom", category: family]
  kids [label: "Children (2)", category: family]
  dealer [label: "Old Friends", category: substance]
  therapist [label: "CBT Therapist", category: mental-health]
  client === aa
  sponsor --> client
  client --- employer [label: "new, probationary"]
  client == mother [label: "supportive"]
  client -/- dealer [label: "trying to cut off"]
  therapist <-> client [label: "weekly"]`,
    fallback: '',
  },
  {
    slug: 'generator-ats-sld',
    title: 'Generator + ATS single-line',
    icon: 'sld',
    blurb: 'Utility + emergency generator with ATS transfer. IEEE 315.',
    dsl: `sld "Utility + Generator Backup"
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
CB2 -> L2`,
    fallback: '',
  },
  {
    slug: 'international-tax-structure',
    title: 'International tax structure',
    icon: 'entity',
    blurb: 'Five-jurisdiction cross-border holding with IP license flow.',
    dsl: `entity-structure "Acme Global Holdings"
entity parent "Acme Global, Inc." corp@US [note: "Ultimate Parent"]
entity ie-holdco "Acme Ireland Holdings" corp@IE
entity ie-ip "Acme IP Ltd" corp@KY [note: "Holds group IP"]
entity nl-bv "Acme EU Distribution" corp@NL
entity sg-apac "Acme APAC Trading" corp@SG
parent -> ie-holdco : 100%
ie-holdco -> ie-ip : 100%
ie-holdco -> nl-bv : 100%
ie-ip -~-> nl-bv [label: "IP License · royalty"]
parent -> sg-apac : 100%`,
    fallback: '',
  },
  // Fishbone (Ishikawa) — parser not yet implemented; hidden from gallery.
];
