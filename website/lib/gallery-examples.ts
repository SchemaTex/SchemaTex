// Rich gallery metadata for the filterable diagram gallery at /gallery.
// Single source of truth: every entry maps to either an existing MDX file in
// content/examples/<slug>.mdx or one that Agent C is authoring in parallel.

export type DiagramType =
  | 'genogram'
  | 'ecomap'
  | 'pedigree'
  | 'phylo'
  | 'sociogram'
  | 'timing'
  | 'logic'
  | 'circuit'
  | 'ladder'
  | 'sld'
  | 'block'
  | 'entity'
  | 'fishbone'
  | 'venn';

export type Industry =
  | 'healthcare'
  | 'legal-finance'
  | 'industrial'
  | 'education'
  | 'research'
  | 'business';

export type Complexity = 1 | 2 | 3;

export interface GalleryExample {
  slug: string;
  title: string;
  description: string;
  diagram: DiagramType;
  industry: Industry;
  complexity: Complexity;
  standard: string;
  dsl: string;
  hasDetailPage: boolean;
}

export const DIAGRAM_LABELS: Record<DiagramType, { label: string; icon: string }> = {
  genogram: { label: 'Genogram', icon: '👪' },
  ecomap: { label: 'Ecomap', icon: '🌐' },
  pedigree: { label: 'Pedigree', icon: '🧬' },
  phylo: { label: 'Phylogenetic', icon: '🌿' },
  sociogram: { label: 'Sociogram', icon: '🕸' },
  timing: { label: 'Timing', icon: '⏱' },
  logic: { label: 'Logic gate', icon: '🔌' },
  circuit: { label: 'Circuit', icon: '⚡' },
  ladder: { label: 'Ladder logic', icon: '🪜' },
  sld: { label: 'Single-line', icon: '🔋' },
  block: { label: 'Block diagram', icon: '📦' },
  entity: { label: 'Entity structure', icon: '🏢' },
  fishbone: { label: 'Fishbone', icon: '🐟' },
  venn: { label: 'Venn / Euler', icon: '⊙' },
};

export const INDUSTRY_LABELS: Record<Industry, { label: string; icon: string }> = {
  healthcare: { label: 'Healthcare', icon: '🩺' },
  'legal-finance': { label: 'Legal & Finance', icon: '⚖️' },
  industrial: { label: 'Industrial', icon: '🏭' },
  education: { label: 'Education', icon: '🎓' },
  research: { label: 'Research', icon: '🔬' },
  business: { label: 'Business', icon: '💼' },
};

export const COMPLEXITY_LABELS: Record<Complexity, string> = {
  1: 'Minimal',
  2: 'Typical',
  3: 'Advanced',
};

export const CLUSTER_TO_TYPES: Record<string, DiagramType[]> = {
  relationships: ['genogram', 'ecomap', 'pedigree', 'sociogram', 'phylo'],
  'electrical-industrial': ['timing', 'logic', 'circuit', 'ladder', 'sld', 'block'],
  'corporate-legal': ['entity'],
  'causality-analysis': ['fishbone', 'venn'],
};

export const galleryExamples: GalleryExample[] = [
  // 1. Harry Potter family (existing)
  {
    slug: 'harry-potter-family',
    title: 'The Potter Family',
    description:
      'Three-generation genogram with marriages, deaths, the index person, and three kinds of emotional relationships.',
    diagram: 'genogram',
    industry: 'education',
    complexity: 3,
    standard: 'McGoldrick 2020',
    hasDetailPage: true,
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
  // 2. Nuclear family (existing)
  {
    slug: 'nuclear-family',
    title: 'Nuclear Family — Therapy Intake',
    description:
      'Minimal three-person genogram — two parents and a child. Good starting template for a family therapy session.',
    diagram: 'genogram',
    industry: 'healthcare',
    complexity: 1,
    standard: 'McGoldrick 2020',
    hasDetailPage: true,
    dsl: `genogram "Smith Family"
  john [male, 1975]
  mary [female, 1977]
  john -- mary "m. 2002"
    alice [female, 2005, index]`,
  },
  // 3. BRCA cancer family genogram (existing)
  {
    slug: 'brca-cancer-family',
    title: 'BRCA1 Hereditary Cancer (Family)',
    description:
      'Four-generation genogram documenting BRCA1 hereditary breast and ovarian cancer — affected individuals, deceased, proband.',
    diagram: 'genogram',
    industry: 'healthcare',
    complexity: 3,
    standard: 'McGoldrick 2020',
    hasDetailPage: true,
    dsl: `genogram "BRCA1 Family"
  I_1 [male, 1930, 1995, deceased]
  I_2 [female, 1932, 1990, deceased, conditions: cancer(full, #C2185B)]
  I_1 -- I_2
    II_1 [female, 1955, conditions: cancer(full, #C2185B)]
    II_2 [male, 1958]
    II_3 [female, 1960]
  II_1 -- II_4 [male, 1954]
    III_1 [female, 1985, index, conditions: cancer(full, #C2185B)]
    III_2 [male, 1988]`,
  },
  // 4. Refugee resettlement ecomap (existing)
  {
    slug: 'refugee-resettlement',
    title: 'Refugee Family Resettlement',
    description:
      'Ecomap for a Vietnamese refugee family — resettlement agency, schools, clinic, temple, sponsor family, relatives abroad.',
    diagram: 'ecomap',
    industry: 'healthcare',
    complexity: 2,
    standard: 'Hartman 1978',
    hasDetailPage: true,
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
  // 5. Teen client ecomap (new — Agent C MDX)
  {
    slug: 'teen-client-ecomap',
    title: 'Teen Client — School-Based Support',
    description:
      'Minimal ecomap for a high-school client — family, peer group, coach, school counselor, part-time job.',
    diagram: 'ecomap',
    industry: 'healthcare',
    complexity: 1,
    standard: 'Hartman 1978',
    hasDetailPage: true,
    dsl: `ecomap "Jordan — 16yo Client"
  center: jordan [label: "Jordan (16)"]
  family [label: "Mom & Stepdad", category: family]
  peers [label: "Peer Group", category: community]
  coach [label: "Soccer Coach", category: community]
  counselor [label: "School Counselor", category: education]
  job [label: "Part-time Cafe", category: work]
  family === jordan
  peers === jordan [label: "close"]
  coach --- jordan
  counselor <-> jordan [label: "weekly"]
  jordan --- job`,
  },
  // 6. BRCA1 pedigree (existing)
  {
    slug: 'brca1-hereditary-cancer',
    title: 'BRCA1 Hereditary Cancer (Pedigree)',
    description:
      'Clinical pedigree for BRCA1 breast and ovarian cancer — affected status, carriers, presymptomatic markers, proband arrow.',
    diagram: 'pedigree',
    industry: 'healthcare',
    complexity: 3,
    standard: 'NSGC pedigree nomenclature',
    hasDetailPage: true,
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
  // 7. Cystic fibrosis pedigree (new — Agent C MDX)
  {
    slug: 'cystic-fibrosis-pedigree',
    title: 'Cystic Fibrosis — Autosomal Recessive',
    description:
      'Classic autosomal-recessive pedigree — two unaffected carrier parents with one affected child and an unaffected sibling.',
    diagram: 'pedigree',
    industry: 'healthcare',
    complexity: 2,
    standard: 'NSGC pedigree nomenclature',
    hasDetailPage: true,
    dsl: `pedigree "Cystic Fibrosis — Autosomal Recessive"
  I-1 [male, carrier]
  I-2 [female, carrier]
  I-1 -- I-2
    II-1 [male, affected, proband]
    II-2 [female, unaffected]
    II-3 [male, carrier]`,
  },
  // 8. Bacterial diversity phylo (existing)
  {
    slug: 'bacterial-diversity',
    title: 'Bacterial Diversity',
    description:
      'Ten-taxon bacterial phylogenetic tree with NHX bootstrap support values and three color-coded clades.',
    diagram: 'phylo',
    industry: 'research',
    complexity: 3,
    standard: 'Newick / NHX',
    hasDetailPage: true,
    dsl: `phylo "Bacterial Diversity"
  newick: "((((Ecoli:0.1,Salmonella:0.12):0.05[&&NHX:B=98],Vibrio:0.2):0.08[&&NHX:B=85],((Bacillus:0.15,Staph:0.18):0.06[&&NHX:B=92],Listeria:0.22):0.1):0.15,((Myco_tb:0.3,Myco_leprae:0.28):0.12[&&NHX:B=100],(Strepto:0.25,Lactobacillus:0.2):0.08[&&NHX:B=78]):0.2);"
  clade Gamma = (Ecoli, Salmonella, Vibrio) [color: "#1E88E5", label: "γ-Proteobacteria"]
  clade Firmi = (Bacillus, Staph, Listeria, Strepto, Lactobacillus) [color: "#E53935", label: "Firmicutes"]
  clade Actino = (Myco_tb, Myco_leprae) [color: "#43A047", label: "Actinobacteria"]
  scale "substitutions/site"`,
  },
  // 9. Playground dynamics sociogram (existing)
  {
    slug: 'playground-dynamics',
    title: 'Classroom Playground Dynamics',
    description:
      'Classroom sociogram with boys and girls subgroups, mutual friendships, a conflict edge, and neutral cross-group links.',
    diagram: 'sociogram',
    industry: 'education',
    complexity: 2,
    standard: 'Moreno 1934',
    hasDetailPage: true,
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
  // 10. Workplace influence sociogram (new — Agent C MDX)
  {
    slug: 'workplace-influence-sociogram',
    title: 'Workplace Influence Map',
    description:
      'Informal influence network across an engineering team — who goes to whom for advice, who is isolated, who is the hub.',
    diagram: 'sociogram',
    industry: 'business',
    complexity: 2,
    standard: 'Moreno 1934',
    hasDetailPage: true,
    dsl: `sociogram "Engineering Team — Advice Network"
  config: layout = force-directed
  config: coloring = group

  group eng [label: "Engineers", color: "#42A5F5"]
    maya; raj; sam; lee; kim

  group pm [label: "PM / Design", color: "#66BB6A"]
    nora; theo

  maya <-> raj
  sam -> maya
  lee -> maya
  kim -> raj
  nora <-> maya
  theo -> nora
  sam -.- lee
  kim -x> theo [label: "friction"]`,
  },
  // 11. SPI transaction timing (new — README source)
  {
    slug: 'spi-transaction-timing',
    title: 'SPI Transaction Timing',
    description:
      'Four-signal SPI bus waveform — clock, chip-select, and MOSI/MISO data — in WaveDrom-compatible notation.',
    diagram: 'timing',
    industry: 'industrial',
    complexity: 2,
    standard: 'WaveDrom / IEEE 1497',
    hasDetailPage: true,
    dsl: `timing "SPI transaction"
CLK:   pppppppp
CS_N:  10000001
MOSI:  x=======
MISO:  x=======`,
  },
  // 12. Full adder logic (new — README source)
  {
    slug: 'full-adder-logic',
    title: '1-Bit Full Adder',
    description:
      'Gate-level schematic of a 1-bit full adder — two XOR, two AND, one OR — rendered from a five-line netlist.',
    diagram: 'logic',
    industry: 'education',
    complexity: 2,
    standard: 'IEEE 91 / IEC 60617',
    hasDetailPage: true,
    dsl: `logic "Full Adder"
input A, B, Cin
output S, Cout
T1 = XOR(A, B)
S  = XOR(T1, Cin)
T2 = AND(T1, Cin)
T3 = AND(A, B)
Cout = OR(T2, T3)`,
  },
  // 13. CE amplifier circuit (existing)
  {
    slug: 'ce-amplifier',
    title: 'NPN Common-Emitter Amplifier',
    description:
      'Canonical NPN common-emitter BJT amplifier rendered from a five-line SPICE netlist with auto-routed rails.',
    diagram: 'circuit',
    industry: 'education',
    complexity: 2,
    standard: 'IEEE 315 / ANSI Y32.2',
    hasDetailPage: true,
    dsl: `circuit "CE Amp (netlist)" netlist
V1 vcc 0 9V
Rc vcc c 2.2k
Rb vcc b 100k
Q1 c b e npn
Re e 0 1k`,
  },
  // 14. Motor start/stop ladder (existing)
  {
    slug: 'motor-start-stop',
    title: 'Motor Start/Stop Seal-in',
    description:
      'The canonical three-wire motor start/stop ladder logic with seal-in contact — taught in every automation course.',
    diagram: 'ladder',
    industry: 'industrial',
    complexity: 1,
    standard: 'IEC 61131-3',
    hasDetailPage: true,
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
  // 15. Mode selection ladder (existing)
  {
    slug: 'mode-selection',
    title: 'System Mode Selection (Auto/Manual)',
    description:
      'Three-rung PLC program with Set/Reset coils on parallel output branches and nested serial/parallel interlock blocks.',
    diagram: 'ladder',
    industry: 'industrial',
    complexity: 3,
    standard: 'IEC 61131-3',
    hasDetailPage: true,
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
  // 16. 13.8 kV substation SLD (existing)
  {
    slug: 'substation-13kv',
    title: '13.8 kV Utility Substation',
    description:
      'Utility one-line: 138 kV grid source → 15 MVA step-down transformer → 13.8 kV medium-voltage bus → three feeder breakers.',
    diagram: 'sld',
    industry: 'industrial',
    complexity: 3,
    standard: 'IEEE 315',
    hasDetailPage: true,
    dsl: `sld "13.8 kV Substation"

util = utility [voltage: "138kV", label: "Grid 138kV"]
TX1 = transformer [rating: "15MVA, 138/13.8kV", id: "TX-1"]
BUS_HV = bus [voltage: "138kV", label: "138kV Bus"]
BUS_MV = bus [voltage: "13.8kV", label: "13.8kV Bus"]
CB1 = breaker [rating: "1200A", id: "CB-1"]
CB2 = breaker [rating: "1200A", id: "CB-2"]
CB3 = breaker [rating: "1200A", id: "CB-3"]
F1 = motor [label: "Feeder 1"]
F2 = motor [label: "Feeder 2"]
F3 = motor [label: "Feeder 3"]

util -> BUS_HV
BUS_HV -> TX1
TX1 -> BUS_MV
BUS_MV -> CB1
CB1 -> F1
BUS_MV -> CB2
CB2 -> F2
BUS_MV -> CB3
CB3 -> F3`,
  },
  // 17. Acme holding company (existing)
  {
    slug: 'holding-company',
    title: 'Multi-Jurisdiction Holding',
    description:
      'Delaware C-corp parent, UK operating subsidiary, Cayman fund, and South Dakota dynasty trust — typical M&A/tax structure.',
    diagram: 'entity',
    industry: 'legal-finance',
    complexity: 2,
    standard: 'Tier-based ownership',
    hasDetailPage: true,
    dsl: `entity-structure "Acme Holdings"

entity trust_a "Founder Trust" trust@US
entity acme_inc "Acme Inc." corp@DE
entity acme_uk "Acme UK Ltd." corp@UK
entity acme_fund "Acme Growth Fund LP" fund@KY

trust_a -> acme_inc : 100%
acme_inc -> acme_uk : 100%
acme_inc -> acme_fund : 60%`,
  },
  // 18. Series A cap table (new — Agent C MDX)
  {
    slug: 'series-a-cap-table',
    title: 'Series A Cap Table',
    description:
      'Post-Series A ownership — founders, ESOP pool, seed investor, and lead Series A fund rolled up into a single Delaware C-corp.',
    diagram: 'entity',
    industry: 'legal-finance',
    complexity: 2,
    standard: 'Tier-based ownership',
    hasDetailPage: true,
    dsl: `entity-structure "Acme Robotics — Post Series A"

entity founders "Founders (2)" individual
entity esop "ESOP Pool" pool
entity seed "Seed Fund" fund@KY
entity series_a "Series A Lead" fund@KY
entity acme "Acme Robotics Inc." corp@DE

founders -> acme : 45%
esop -> acme : 15%
seed -> acme : 15%
series_a -> acme : 25%`,
  },
  // 19. PID control loop block diagram (new — Agent C MDX)
  {
    slug: 'pid-loop-block',
    title: 'PID Control Loop',
    description:
      'Classic single-input single-output feedback control loop — reference, error summer, controller C(s), plant G(s), unity feedback.',
    diagram: 'block',
    industry: 'industrial',
    complexity: 2,
    standard: 'Ogata control systems',
    hasDetailPage: true,
    dsl: `blockdiagram "PID loop"
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
  },
  // 20. Fishbone — website traffic (new — from preview page, TC-FB-01)
  {
    slug: 'fishbone-website-traffic',
    title: 'Website Traffic Drop RCA',
    description:
      'Six-category Ishikawa diagram for an organic-traffic drop — Content, Technical, Backlinks, UX, Competition, Algorithm — 24 causes.',
    diagram: 'fishbone',
    industry: 'business',
    complexity: 3,
    standard: 'Ishikawa 1968',
    hasDetailPage: true,
    dsl: `fishbone "Fishbone diagram — 网站流量下跌原因分析"

effect "流量下跌"

category content     "内容 Content"
category tech        "技术 Technical"
category links       "外链 Backlinks"
category ux          "体验 UX"
category competition "竞争 Competition"
category algo        "算法 Algorithm"

content : "更新频率下降"
content : "同质化严重"
content : "关键词未覆盖"
content : "AI 内容质量低"

tech : "Core Web Vitals 差"
tech : "索引覆盖率下降"
tech : "爬虫被 WAF 拦截"
tech : "结构化数据缺失"

links : "高质量外链流失"
links : "低质量链接占比高"
links : "引荐域名停滞"
links : "锚文本多样性低"

ux : "跳出率上升"
ux : "移动端体验差"
ux : "首屏加载慢"
ux : "弹窗广告过多"

competition : "新对手涌入"
competition : "AI 工具替代搜索"
competition : "品牌心智减弱"
competition : "对手内容更新快"

algo : "Core Update 惩罚"
algo : "E-E-A-T 信号不足"
algo : "AIO / SGE 截流"
algo : "意图匹配漂移"`,
  },
];
