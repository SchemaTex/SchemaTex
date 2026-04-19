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
  // Fishbone (Ishikawa) — parser not yet implemented; hidden from gallery.
];
