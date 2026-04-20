// Source-of-truth for /examples gallery + detail pages.
// Migrated from content/examples/*.mdx — bypasses fumadocs-mdx so examples
// pages can ship with custom layout (no docs sidebar/TOC) and full-width
// playground embeds.

export interface ExampleEntry {
  slug: string;
  title: string;
  description: string;
  diagram: string;
  industry: string;
  complexity: number;
  standard: string;
  /** Short blurb shown above the playground. Plain text — no MDX. */
  blurb: string;
  /** Optional related-link rendered under the playground. */
  related?: { label: string; href: string };
  dsl: string;
}

export interface ExampleSection {
  label: string;
  slugs: string[];
}

export const exampleSections: ExampleSection[] = [
  { label: 'Genogram', slugs: ['harry-potter-family', 'nuclear-family', 'brca-cancer-family', 'medical-history-genogram'] },
  { label: 'Ecomap', slugs: ['refugee-resettlement', 'teen-client-ecomap', 'substance-abuse-recovery'] },
  { label: 'Pedigree', slugs: ['brca1-hereditary-cancer', 'cystic-fibrosis-pedigree', 'hemophilia-pedigree'] },
  { label: 'Phylogenetic', slugs: ['bacterial-diversity'] },
  { label: 'Sociogram', slugs: ['playground-dynamics', 'workplace-influence-sociogram'] },
  { label: 'Timing', slugs: ['spi-transaction-timing'] },
  { label: 'Logic Gate', slugs: ['full-adder-logic'] },
  { label: 'Ladder', slugs: ['motor-start-stop', 'mode-selection'] },
  { label: 'Circuit', slugs: ['ce-amplifier'] },
  { label: 'SLD', slugs: ['substation-13kv', 'generator-ats-sld'] },
  { label: 'Block Diagram', slugs: ['pid-loop-block'] },
  { label: 'Entity', slugs: ['holding-company', 'series-a-cap-table', 'international-tax-structure'] },
  { label: 'Fishbone', slugs: ['fishbone-website-traffic'] },
];

export const examples: ExampleEntry[] = [
  {
    slug: 'harry-potter-family',
    title: 'Genogram: The Potter family',
    description:
      'Three-generation Harry Potter family genogram showing marriage, death years, index person marker, and three emotional relationship types (cutoff, hostile, close).',
    diagram: 'genogram',
    industry: 'education',
    complexity: 3,
    standard: 'McGoldrick 2020',
    blurb:
      'A three-generation genogram of the Potter family — Fleamont & Euphemia Potter, Mr. & Mrs. Evans, their children, and Harry (the index person). Demonstrates death years, quoted marriage dates, and three kinds of emotional relationships.',
    related: { label: 'Genogram syntax', href: '/docs/genogram' },
    dsl: `genogram "The Potter Family"
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
    slug: 'nuclear-family',
    title: 'Genogram: nuclear family',
    description:
      'Minimal three-person genogram showing a married couple and one child. Good starting template for family therapy intake sessions.',
    diagram: 'genogram',
    industry: 'healthcare',
    complexity: 1,
    standard: 'McGoldrick 2020',
    blurb:
      'The simplest useful genogram — two parents and a child. Good template for a therapy intake session.',
    related: { label: 'Genogram syntax', href: '/docs/genogram' },
    dsl: `genogram "Smith Family"
  john [male, 1975]
  mary [female, 1977]
  john -- mary "m. 2002"
    alice [female, 2005, index]`,
  },
  {
    slug: 'brca-cancer-family',
    title: 'Genogram: hereditary cancer (BRCA)',
    description:
      'Four-generation genogram documenting hereditary breast and ovarian cancer (BRCA1) — affected individuals, carriers, deceased members, proband marker.',
    diagram: 'genogram',
    industry: 'healthcare',
    complexity: 3,
    standard: 'McGoldrick 2020',
    blurb:
      'Four-generation family genogram documenting BRCA1 hereditary breast and ovarian cancer. Used in genetic counseling intake.',
    related: { label: 'For clinical pedigree notation, use Pedigree', href: '/docs/pedigree' },
    dsl: `genogram "BRCA1 Family"
  I_1 [male, 1930, 1995, deceased]
  I_2 [female, 1932, 1990, deceased, cancer_ovarian]
  I_1 -- I_2
    II_1 [female, 1955, cancer_breast]
    II_2 [male, 1958]
    II_3 [female, 1960]
  II_1 -- II_4 [male, 1954]
    III_1 [female, 1985, index, cancer_breast]
    III_2 [male, 1988]`,
  },
  {
    slug: 'refugee-resettlement',
    title: 'Ecomap: refugee family resettlement',
    description:
      "Ecomap documenting a Vietnamese refugee family's support network — resettlement agency, schools, clinics, cultural temple, sponsor family. Used in social work intake.",
    diagram: 'ecomap',
    industry: 'healthcare',
    complexity: 2,
    standard: 'Hartman 1978',
    blurb:
      'An ecomap for a Vietnamese refugee family during resettlement — showing the web of institutions, social connections, and cultural anchors that support the family.',
    related: { label: 'Ecomap syntax', href: '/docs/ecomap' },
    dsl: `ecomap "Nguyen Family Resettlement"
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
    slug: 'teen-client-ecomap',
    title: 'Ecomap: teen client intake',
    description:
      'Minimal ecomap for a 15-year-old client — family, school, peer group, part-time job, therapist. Used in adolescent social work assessments.',
    diagram: 'ecomap',
    industry: 'healthcare',
    complexity: 1,
    standard: 'Hartman 1978',
    blurb:
      "A social worker's intake ecomap for a teen client — mapping the family, school, peer group, mentors, and clinical supports that surround an adolescent in crisis.",
    related: { label: 'Ecomap syntax', href: '/docs/ecomap' },
    dsl: `ecomap "Marcus, age 15"
  center: client [label: "Marcus"]
  mom [label: "Mother", category: family]
  dad [label: "Father (divorced)", category: family]
  school [label: "East High School", category: education]
  coach [label: "Soccer Coach", category: community]
  peers [label: "Soccer team", category: community]
  therapist [label: "Ms. Chen", category: mental-health]
  mom === client [label: "primary caregiver"]
  dad --- client [label: "EOW weekends"]
  school === client
  coach --> client [label: "mentor"]
  peers === client
  therapist <-> client [label: "weekly"]`,
  },
  {
    slug: 'brca1-hereditary-cancer',
    title: 'Pedigree: BRCA1 hereditary cancer',
    description:
      'Four-generation clinical pedigree for BRCA1 hereditary breast and ovarian cancer — affected status, carrier dots, presymptomatic markers, proband arrow.',
    diagram: 'pedigree',
    industry: 'healthcare',
    complexity: 3,
    standard: 'NSGC',
    blurb:
      'Clinical-grade pedigree for BRCA1 hereditary breast and ovarian cancer. Standard pedigree notation with affected status, carriers, presymptomatic individuals, and proband arrow.',
    related: { label: 'Pedigree syntax', href: '/docs/pedigree' },
    dsl: `pedigree "BRCA1 Family — Hereditary Breast/Ovarian Cancer"
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
  II-3 -- II-6 [male, unaffected]
    III-6 [female, carrier]
    III-7 [male, unaffected]`,
  },
  {
    slug: 'cystic-fibrosis-pedigree',
    title: 'Pedigree: autosomal recessive (cystic fibrosis)',
    description:
      'Three-generation pedigree illustrating autosomal recessive inheritance of cystic fibrosis — carrier parents, affected child, unaffected siblings.',
    diagram: 'pedigree',
    industry: 'healthcare',
    complexity: 2,
    standard: 'NSGC',
    blurb:
      'Classic textbook pedigree for autosomal recessive inheritance — two carrier parents producing an affected child, with carriers and unaffected siblings following the 1:2:1 Mendelian ratio.',
    related: { label: 'Pedigree syntax', href: '/docs/pedigree' },
    dsl: `pedigree "CF family — autosomal recessive"
  I-1 [male, carrier]
  I-2 [female, carrier]
  I-1 -- I-2
    II-1 [male, affected, proband]
    II-2 [female, carrier]
    II-3 [male, unaffected]
  II-2 -- II-4 [male, carrier]
    III-1 [female, affected]
    III-2 [male, unaffected]`,
  },
  {
    slug: 'bacterial-diversity',
    title: 'Phylogenetic tree: bacterial diversity',
    description:
      'Ten-taxon bacterial phylogenetic tree with NHX bootstrap support values and three color-coded clades — γ-Proteobacteria, Firmicutes, Actinobacteria.',
    diagram: 'phylo',
    industry: 'research',
    complexity: 3,
    standard: 'Newick/NHX',
    blurb: 'Ten-taxon bacterial phylogeny with bootstrap support values and three color-coded clades.',
    related: { label: 'Phylogenetic syntax', href: '/docs/phylo' },
    dsl: `phylo "Bacterial Diversity"
  newick: "((((Ecoli:0.1,Salmonella:0.12):0.05[&&NHX:B=98],Vibrio:0.2):0.08[&&NHX:B=85],((Bacillus:0.15,Staph:0.18):0.06[&&NHX:B=92],Listeria:0.22):0.1):0.15,((Myco_tb:0.3,Myco_leprae:0.28):0.12[&&NHX:B=100],(Strepto:0.25,Lactobacillus:0.2):0.08[&&NHX:B=78]):0.2);"
  clade Gamma = (Ecoli, Salmonella, Vibrio) [color: "#1E88E5", label: "γ-Proteobacteria"]
  clade Firmi = (Bacillus, Staph, Listeria, Strepto, Lactobacillus) [color: "#E53935", label: "Firmicutes"]
  clade Actino = (Myco_tb, Myco_leprae) [color: "#43A047", label: "Actinobacteria"]
  scale "substitutions/site"`,
  },
  {
    slug: 'playground-dynamics',
    title: 'Sociogram: playground dynamics',
    description:
      'Classroom-style sociogram with two groups (boys, girls), mutual friendships, rejection edges with labels, and neutral cross-group connections. Auto-detects stars and isolates.',
    diagram: 'sociogram',
    industry: 'education',
    complexity: 2,
    standard: 'Moreno 1934',
    blurb:
      'Classroom sociogram with two groups — boys and girls — showing mutual friendships, a conflict edge, and neutral cross-group connections.',
    related: { label: 'Sociogram syntax', href: '/docs/sociogram' },
    dsl: `sociogram "Playground Dynamics"
  config: layout = force-directed
  config: coloring = group

  group boys [label: "Boys", color: "#42A5F5"]
    tom; jack; mike; leo

  group girls [label: "Girls", color: "#EF5350"]
    anna; beth; chloe; diana

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
    slug: 'workplace-influence-sociogram',
    title: 'Sociogram: team influence mapping',
    description:
      'Sociometric analysis of informal influence and information flow in a 10-person engineering team. Reveals stars, isolates, and bridging roles.',
    diagram: 'sociogram',
    industry: 'business',
    complexity: 2,
    standard: 'Moreno 1934',
    blurb:
      'A sociogram mapping informal influence in a 10-person engineering team — surfacing the "stars" people actually go to for help, the bridging roles between seniority tiers, and who\'s drifting toward isolation.',
    related: { label: 'Sociogram syntax', href: '/docs/sociogram' },
    dsl: `sociogram "Engineering team — informal influence"
  config: layout = force-directed
  group leads [label: "Tech leads", color: "#1976D2"]
    alex; sam
  group sr [label: "Senior ICs", color: "#66BB6A"]
    priya; jordan; kim; tao
  group jr [label: "Junior", color: "#FFA726"]
    lee; ravi; nina; dev
  alex <-> sam
  alex -> priya
  sam -> jordan
  priya <-> kim
  jordan <-> tao
  kim -> lee
  priya -> ravi
  tao -> nina
  dev -.- lee
  nina -.- priya`,
  },
  {
    slug: 'spi-transaction-timing',
    title: 'Timing diagram: SPI transaction',
    description:
      'Digital timing diagram of an 8-byte SPI transaction — clock, chip-select, MOSI data bytes, MISO response. Standard WaveDrom-compatible syntax.',
    diagram: 'timing',
    industry: 'industrial',
    complexity: 2,
    standard: 'WaveDrom / IEEE 1497',
    blurb:
      'A full 8-byte SPI master→slave transfer — clock pulses, active-low chip-select, four MOSI command bytes followed by four MISO response bytes. The syntax is WaveDrom-compatible, so the same DSL renders in embedded datasheets.',
    related: { label: 'Timing syntax', href: '/docs/timing' },
    dsl: `timing "SPI Transaction"
CLK:   pppppppp
CS_N:  10000001
MOSI:  x=======  data: ["0xAB","0xCD","0xEF","0x01","0x02","0x03","0x04","0x05"]
MISO:  zzzz====  data: ["","","","","0xFF","0x12","0x34","0x56"]`,
  },
  {
    slug: 'full-adder-logic',
    title: 'Logic gate: 1-bit full adder',
    description:
      'Classic 1-bit full adder built from XOR/AND/OR gates. Sum and carry-out from three inputs (A, B, carry-in). Textbook digital logic example.',
    diagram: 'logic',
    industry: 'education',
    complexity: 2,
    standard: 'IEEE 91',
    blurb:
      'The textbook 1-bit full adder — two XORs compute the sum bit, two ANDs and an OR generate the carry-out. Every intro digital-logic course lands on this circuit; every ALU is built from it.',
    related: { label: 'Logic gate syntax', href: '/docs/logic' },
    dsl: `logic "1-bit Full Adder"
input A, B, Cin
output Sum, Cout
s1 = XOR(A, B)
Sum = XOR(s1, Cin)
c1 = AND(A, B)
c2 = AND(s1, Cin)
Cout = OR(c1, c2)`,
  },
  {
    slug: 'motor-start-stop',
    title: 'Ladder logic: motor start/stop seal-in',
    description:
      'Classic three-wire motor start/stop PLC ladder logic with seal-in contact. The canonical PLC programming example — taught in every industrial automation course.',
    diagram: 'ladder',
    industry: 'industrial',
    complexity: 1,
    standard: 'IEC 61131-3',
    blurb:
      'The canonical PLC program: three-wire motor start/stop with a seal-in contact that latches the motor ON until the stop button is pressed.',
    related: { label: 'Ladder syntax', href: '/docs/ladder' },
    dsl: `ladder "Motor Start/Stop"
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
    slug: 'mode-selection',
    title: 'Ladder logic: system mode selection',
    description:
      'Three-rung Allen-Bradley PLC program with Set/Reset coils on parallel output branches, input-side seal-in, and nested serial parallel blocks.',
    diagram: 'ladder',
    industry: 'industrial',
    complexity: 3,
    standard: 'IEC 61131-3',
    blurb:
      'Three-rung industrial PLC program with tag/address/description labels, Set/Reset coils on parallel output branches, input-side seal-in for manual mode, and nested serial parallel blocks for the auto-cycle interlock.',
    dsl: `ladder "System Mode Selection"

rung 1 "Set system Auto mode, reset Manual":
  XIC(AUTO_HMIPB, "BIT 5.10", name="Auto Mode HMI Pushbutton")
  XIO(MANL_HMIPB, "BIT 5.11", name="Manual Mode HMI Pushbutton")
  XIO(SYS_FAULT, "BIT 3.0", name="System Fault")
  parallel:
    branch:
      OTL(SYS_AUTO, "BIT 3.1", name="System Auto Mode")
    branch:
      OTU(SYS_MANUAL, "BIT 3.2", name="System Manual Mode")

rung 2 "Set Manual, reset Auto (with Home seal-in)":
  parallel:
    branch:
      XIC(MANL_HMIPB, "BIT 5.11", name="Manual Mode HMI Pushbutton")
    branch:
      XIC(SYS_HOMECMD, "BIT 3.5", name="System Home Command")
  XIO(AUTO_HMIPB, "BIT 5.10", name="Auto Mode HMI Pushbutton")
  XIO(SYS_FAULT, "BIT 3.0", name="System Fault")
  parallel:
    branch:
      OTL(SYS_MANUAL, "BIT 3.2", name="System Manual Mode")
    branch:
      OTU(SYS_AUTO, "BIT 3.1", name="System Auto Mode")`,
  },
  {
    slug: 'ce-amplifier',
    title: 'Circuit: NPN common-emitter amplifier',
    description:
      'Classic NPN common-emitter BJT amplifier schematic rendered from a SPICE-style netlist — automatic layout with shared Vcc supply rail, ground rail, and orthogonal signal routing.',
    diagram: 'circuit',
    industry: 'education',
    complexity: 2,
    standard: 'IEEE 315',
    blurb:
      'The canonical NPN common-emitter amplifier — rendered from a five-line SPICE netlist. No manual positioning; Schematex builds the net graph, ranks components, and routes rails automatically.',
    related: { label: 'Circuit syntax', href: '/docs/circuit' },
    dsl: `circuit "CE Amp (netlist)" netlist
V1 vcc 0 9V
Rc vcc c 2.2k
Rb vcc b 100k
Q1 c b e npn
Re e 0 1k`,
  },
  {
    slug: 'substation-13kv',
    title: 'Single-line diagram: 13.8 kV substation',
    description:
      'Utility substation one-line diagram — 138 kV grid source, 15 MVA step-down transformer, high- and medium-voltage buses, feeder breakers. IEEE 315 symbols.',
    diagram: 'sld',
    industry: 'industrial',
    complexity: 3,
    standard: 'IEEE 315',
    blurb:
      'Simplified utility substation one-line: 138 kV grid → 15 MVA step-down transformer → 13.8 kV medium-voltage bus → feeder breakers.',
    related: { label: 'SLD syntax', href: '/docs/sld' },
    dsl: `sld "13.8 kV Substation"
utility [label: "Grid 138 kV"]
xfmr1 [type: transformer, kva: 15000, primary: 138, secondary: 13.8]
bus_hv [type: bus, voltage: 138]
bus_mv [type: bus, voltage: 13.8]
brk1 [type: breaker, amps: 1200]
brk2 [type: breaker, amps: 1200]
brk3 [type: breaker, amps: 1200]
feeder1 [type: load, label: "Feeder 1"]
feeder2 [type: load, label: "Feeder 2"]
feeder3 [type: load, label: "Feeder 3"]
utility -> bus_hv
bus_hv -> xfmr1 -> bus_mv
bus_mv -> brk1 -> feeder1
bus_mv -> brk2 -> feeder2
bus_mv -> brk3 -> feeder3`,
  },
  {
    slug: 'pid-loop-block',
    title: 'Block diagram: PID control loop',
    description:
      'Classic closed-loop PID controller with plant, feedback, reference and error signals. The textbook figure from any control-systems course.',
    diagram: 'block',
    industry: 'industrial',
    complexity: 2,
    standard: 'Ogata control systems',
    blurb:
      'The canonical closed-loop PID diagram from any control-systems textbook — reference in, error through the controller, plant output fed back through the summing junction. Signal-flow semantics, not a generic flowchart.',
    related: { label: 'Block syntax', href: '/docs/block' },
    dsl: `blockdiagram "PID control loop"
C = block("PID C(s)") [role: controller]
G = block("Plant G(s)") [role: plant]
err = sum(+r, -y)
r = signal("r (setpoint)")
y = signal("y (output)")
in -> r
r -> err
err -> C
C -> G
G -> y
G -> err`,
  },
  {
    slug: 'holding-company',
    title: 'Entity structure: multi-jurisdiction holding company',
    description:
      'Corporate entity structure with Delaware parent corporation, UK operating subsidiary, Cayman Islands fund, and South Dakota trust — ownership percentages and jurisdiction clustering.',
    diagram: 'entity',
    industry: 'legal-finance',
    complexity: 2,
    standard: 'Tier ownership',
    blurb:
      'A multi-jurisdiction holding structure typical of M&A and tax planning — Delaware C-corp parent, UK operating subsidiary, Cayman Islands fund, and a South Dakota dynasty trust.',
    related: { label: 'Entity syntax', href: '/docs/entity' },
    dsl: `entity-structure "Acme Holdings"
entity trust_a "Founder Trust" trust@SD
entity acme_inc "Acme Inc." corp@DE
entity acme_uk "Acme UK Ltd." llc@UK
entity acme_fund "Acme Growth Fund LP" fund@KY
trust_a -> acme_inc : 100%
acme_inc -> acme_uk : 100%
acme_inc -> acme_fund : 60%`,
  },
  {
    slug: 'series-a-cap-table',
    title: 'Entity structure: Series A cap table',
    description:
      'Post-Series A startup cap table — founders, seed investors, lead VC, employee option pool, with ownership percentages and entity types.',
    diagram: 'entity',
    industry: 'legal-finance',
    complexity: 2,
    standard: 'Tier ownership',
    blurb:
      'A typical post–Series A cap table: two founders, a seed fund, the lead VC, an angel group, and the employee option pool — all rolling up into the Delaware C-corp with ownership percentages intact.',
    related: { label: 'Entity syntax', href: '/docs/entity' },
    dsl: `entity "Acme Inc. — post Series A"
  acme [type: corp, jurisdiction: DE, label: "Acme Inc."]
  founders [type: individual, label: "Founders (2)"]
  seed [type: fund, jurisdiction: DE, label: "Seed Fund I"]
  lead [type: fund, jurisdiction: DE, label: "Sequoia Series A"]
  angels [type: individual, label: "Angel group"]
  esop [type: trust, jurisdiction: DE, label: "Employee Option Pool"]
  founders --45%--> acme
  seed --12%--> acme
  lead --22%--> acme
  angels --6%--> acme
  esop --15%--> acme`,
  },
  {
    slug: 'fishbone-website-traffic',
    title: 'Fishbone: website traffic drop root-cause analysis',
    description:
      'Ishikawa cause-and-effect analysis for a website traffic drop — 6 categories (content, tech, links, UX, competition, algorithm) with 24 sub-causes.',
    diagram: 'fishbone',
    industry: 'business',
    complexity: 3,
    standard: 'Ishikawa 1968',
    blurb:
      'A real root-cause analysis session for a website traffic drop — six Ishikawa categories (content, technical, backlinks, UX, competition, algorithm) with 24 sub-causes brainstormed across a growth team.',
    related: { label: 'Fishbone syntax', href: '/docs/fishbone' },
    dsl: `fishbone "Fishbone diagram — Website traffic drop"

effect "Traffic decline"

category content     "Content"
category tech        "Technical"
category links       "Backlinks"
category ux          "UX"
category competition "Competition"
category algo        "Algorithm"

content : "Publishing frequency down"
content : "Content too generic"
content : "Keyword gaps"
content : "Low-quality AI content"

tech : "Core Web Vitals failing"
tech : "Crawl coverage drop"
tech : "Crawler blocked by WAF"
tech : "Missing structured data"

links : "High-quality backlinks lost"
links : "High ratio of low-quality links"
links : "Referring domain growth stalled"
links : "Low anchor text diversity"

ux : "Bounce rate rising"
ux : "Poor mobile experience"
ux : "Slow above-fold load"
ux : "Excessive popup ads"

competition : "New competitors entering"
competition : "AI tools replacing search"
competition : "Weakening brand recall"
competition : "Competitors publishing faster"

algo : "Core Update penalty"
algo : "Weak E-E-A-T signals"
algo : "AI Overviews / SGE cutoff"
algo : "Search intent drift"`,
  },
  {
    slug: 'medical-history-genogram',
    title: 'Genogram: multi-generation medical history',
    description:
      'Three-generation family genogram with color-coded inherited conditions — heart disease, diabetes, cancer, hypertension — showing how conditions pass across generations.',
    diagram: 'genogram',
    industry: 'healthcare',
    complexity: 3,
    standard: 'McGoldrick 2020',
    blurb:
      'A three-generation family medical history genogram using the conditions() annotation to show which conditions each person carries. The grandfather\'s full red fill (heart-disease) and half-orange fill (diabetes) are visually inherited by the father\'s quad-tl and quad-tr fills, and the index patient carries hypertension in the half-left quadrant — making the inheritance chain immediately visible.',
    related: { label: 'Genogram syntax', href: '/docs/genogram' },
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
  },
  {
    slug: 'hemophilia-pedigree',
    title: 'Pedigree: Hemophilia A (X-linked recessive)',
    description:
      'Three-generation clinical pedigree for X-linked recessive hemophilia A — carrier females shown with half-fill dot, affected males fully filled, standard NSGC notation.',
    diagram: 'pedigree',
    industry: 'healthcare',
    complexity: 2,
    standard: 'NSGC',
    blurb:
      'X-linked recessive hemophilia A pedigree across three generations. carrier-x marks females who carry one mutated X chromosome — shown as a circle with a centre dot per NSGC convention. Affected males (filled square) inherit the mutation from a carrier mother. The pedigree shows a carrier grandmother passing the trait through a carrier daughter to a new affected grandson.',
    related: { label: 'Pedigree syntax', href: '/docs/pedigree' },
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
  },
  {
    slug: 'substance-abuse-recovery',
    title: 'Ecomap: substance abuse recovery',
    description:
      'Clinical ecomap for a 28-year-old male client in early substance abuse recovery — mapping AA, sponsor, therapist, employer, estranged family, legal supervision, and old dealer contacts.',
    diagram: 'ecomap',
    industry: 'healthcare',
    complexity: 3,
    standard: 'Hartman 1978',
    blurb:
      'A social worker\'s ecomap for a client in early recovery — documenting every system in his ecological field. The line types encode relationship quality: === (strong/supportive), == (moderately strong), --- (tenuous), -/- (severing), ~~~ (stressful). Arrow direction shows who gives energy to whom. The visual immediately shows the imbalance: legal and AA are inbound pressure; only the sponsor and therapist are reciprocal.',
    related: { label: 'Ecomap syntax', href: '/docs/ecomap' },
    dsl: `ecomap "Substance Abuse Recovery"
  center: client [male, age: 28, label: "James"]
  aa [label: "AA Group", category: substance, importance: major]
  sponsor [label: "Bill (Sponsor)", category: substance]
  employer [label: "Warehouse Job", category: work]
  mother [label: "Mom", category: family]
  exwife [label: "Ex-wife", category: family]
  kids [label: "Children (2)", category: family]
  dealer [label: "Old Friends", category: substance]
  probation [label: "P.O. Johnson", category: legal]
  therapist [label: "CBT Therapist", category: mental-health]
  client === aa
  sponsor --> client
  client --- employer [label: "new, probationary"]
  client == mother [label: "supportive"]
  client ~~~ exwife [label: "custody conflict"]
  client - - kids [label: "supervised visits"]
  client -/- dealer [label: "trying to cut off"]
  probation --> client
  therapist <-> client [label: "weekly"]`,
  },
  {
    slug: 'generator-ats-sld',
    title: 'Single-line diagram: generator + ATS backup power',
    description:
      'Facility power one-line diagram with utility feed, 500 kW emergency generator, and automatic transfer switch — critical loads fed through breakers on a 480 V bus.',
    diagram: 'sld',
    industry: 'industrial',
    complexity: 2,
    standard: 'IEEE 315',
    blurb:
      'A facility backup power single-line: utility and emergency generator both feed an ATS (Automatic Transfer Switch) that selects the live source and connects to the critical load bus. Each device uses an IEEE 315 symbol — the ATS is a transfer-switch symbol, the generator uses the rotating-machine circle. Breakers between the bus and loads isolate individual circuits.',
    related: { label: 'SLD syntax', href: '/docs/sld' },
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
  },
  {
    slug: 'international-tax-structure',
    title: 'Entity structure: international tax holding',
    description:
      'Five-entity cross-border holding structure with a US parent, Irish holdco, Cayman IP company, Dutch EU distribution, and Singapore APAC ops — including an IP license royalty flow.',
    diagram: 'entity',
    industry: 'legal-finance',
    complexity: 3,
    standard: 'Tier ownership',
    blurb:
      'A classic BEPS-era international holding structure: the US parent owns 100% of an Irish holdco which in turn owns a Cayman IP company and a Dutch distribution entity. The -~-> (dashed) arrow from the IP company to the Dutch entity represents the IP license and royalty flow — a common mechanism for shifting taxable income to a low-rate jurisdiction. Singapore APAC is a parallel branch for Asia-Pacific operations.',
    related: { label: 'Entity syntax', href: '/docs/entity' },
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
  },
];

export const examplesBySlug = new Map(examples.map((e) => [e.slug, e]));

export function getExample(slug: string): ExampleEntry | undefined {
  return examplesBySlug.get(slug);
}
