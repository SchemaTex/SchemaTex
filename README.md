<p align="center">
  <strong>Lineage</strong><br>
  Text-to-SVG rendering for genograms, ecomaps, pedigree charts, phylogenetic trees, and sociograms.<br>
  <em>Like <a href="https://mermaid.js.org/">Mermaid</a> — but for relationship diagrams.</em>
</p>

<p align="center">
  <a href="#gallery">Gallery</a> ·
  <a href="#install">Install</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#genogram-syntax">Genogram</a> ·
  <a href="#ecomap-syntax">Ecomap</a> ·
  <a href="#pedigree-syntax">Pedigree</a> ·
  <a href="#phylogenetic-tree-syntax">Phylo</a> ·
  <a href="#sociogram-syntax">Sociogram</a> ·
  <a href="#api">API</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

## What is Lineage?

Lineage turns plain text into clinical-grade SVG diagrams — genograms, ecomaps, and pedigree charts — the kind used daily in social work, family therapy, genetics, and medical practice.

```
genogram "The Smiths"
  john [male, 1950]
  mary [female, 1952]
  john -- mary
    alice [female, 1975]
    bob [male, 1978, deceased]
```

This produces a standards-compliant genogram with proper McGoldrick symbols, generation-based layout, and accessible SVG output — no dragging boxes around, no learning a visual editor.

### Why not Mermaid?

Mermaid is great for flowcharts and sequence diagrams. But **relationship diagrams** have domain-specific requirements that general-purpose tools can't meet:

- **Genograms** follow the [McGoldrick (2020) standard](https://en.wikipedia.org/wiki/Genogram) — gender-specific shapes (square/circle/diamond), medical condition fill patterns, standardized relationship lines, generation-based layout
- **Ecomaps** use radial layout with concentric rings, weighted connection types, and directional energy flow arrows ([Hartman 1978](https://en.wikipedia.org/wiki/Ecomap))
- **Pedigree charts** track genetic inheritance with carrier/affected status indicators

No existing open-source library handles these well. GoJS has a genogram sample but costs $7k+. Everything else is either proprietary or abandoned.

### Design principles

- **Zero runtime dependencies.** No D3, no dagre, no parser generators. Hand-written parsers and layout algorithms. The entire library is self-contained TypeScript.
- **Semantic SVG output.** Every element has accessible `<title>`/`<desc>`, CSS classes for theming, and `data-*` attributes for interactivity. No inline styles.
- **Plugin architecture.** Each diagram type (genogram, ecomap, pedigree) is an independent plugin with its own parser, layout engine, and renderer. Import only what you need.

## Gallery

### Genogram — Harry Potter Family

Multi-generation family with death years, relationship labels, index person, and emotional relationships.

```
genogram "The Potter Family"
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
  harry -close- lily
```

**Features shown:** birth/death year ranges (`1960–1981`), `index` person gold border, quoted relationship label (`m. 1978`), `deceased` status, and three emotional relationship types — `cutoff` (dashed blue), `hostile` (red), `close` (green).

---

### Ecomap — Refugee Family Resettlement

Family system embedded in institutional, social, and cultural support networks.

```
ecomap "Nguyen Family Resettlement"
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
  cousins == family [label: "phone support"]
```

**Features shown:** center node, 9 external systems with categories, mixed connection strengths (`===` / `==` / `---`), directional arrows (`-->`, `<->`), and labeled connections.

---

### Pedigree — Hereditary Breast & Ovarian Cancer (BRCA)

Four-generation family with multiple affected members, X-linked carrier status, and a proband.

```
pedigree "BRCA1 Family — Hereditary Breast/Ovarian Cancer"
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
    IV-2 [female, presymptomatic]
```

**Features shown:** 4 generations with Roman numeral labels, `affected` / `carrier` / `presymptomatic` / `unaffected` status fills, `proband` arrow marker, `deceased` individual, and automatic sibling/spouse layout.

---

### Phylogenetic Tree — Bacterial Diversity

Ten-taxon tree with Newick input, clade coloring, and bootstrap support values.

```
phylo "Bacterial Diversity"
  newick: "((((Ecoli:0.1,Salmonella:0.12):0.05[&&NHX:B=98],Vibrio:0.2):0.08[&&NHX:B=85],((Bacillus:0.15,Staph:0.18):0.06[&&NHX:B=92],Listeria:0.22):0.1):0.15,((Myco_tb:0.3,Myco_leprae:0.28):0.12[&&NHX:B=100],(Strepto:0.25,Lactobacillus:0.2):0.08[&&NHX:B=78]):0.2);"

  clade Gamma = (Ecoli, Salmonella, Vibrio) [color: "#1E88E5", label: "γ-Proteobacteria"]
  clade Firmi = (Bacillus, Staph, Listeria, Strepto, Lactobacillus) [color: "#E53935", label: "Firmicutes"]
  clade Actino = (Myco_tb, Myco_leprae) [color: "#43A047", label: "Actinobacteria"]

  scale "substitutions/site"
```

**Features shown:** Standard Newick input with branch lengths, NHX bootstrap support values (colored dots: green ≥95, yellow ≥75), 3 clade-colored branch groups with labels, and proportional scale bar.

---

### Sociogram — Playground Dynamics

Social network diagram with groups, mutual choices, rejections, and neutral connections.

```
sociogram "Playground Dynamics"
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
  leo -.- anna
```

**Features shown:** Force-directed layout, group coloring (Boys blue, Girls red), mutual choices (`<->`), rejection edge (`-x>`) with label, neutral connections (`-.-`), auto-detected roles (stars, isolates).

---

## Install

```bash
npm install lineage
```

Works with any bundler (Vite, webpack, esbuild, Rollup) and Node.js. Ships as ESM + CJS with full TypeScript declarations.

## Quick Start

```ts
import { render } from 'lineage';

const svg = render(`
genogram
  john [male, 1950]
  mary [female, 1952]
  john -- mary
    alice [female, 1975]
    bob [male, 1978]
`);

document.getElementById('diagram').innerHTML = svg;
```

The `render()` function auto-detects the diagram type from the first line and returns a complete SVG string.

## Genogram Syntax

Genograms model family structure across generations — marriages, divorces, children, medical conditions, and life status.

### Individuals

```
genogram
  john [male, 1950]
  mary [female, 1952]
  child [unknown, 1980, deceased]
```

| Property | Effect |
|----------|--------|
| `male` | Square symbol |
| `female` | Circle symbol |
| `unknown` | Diamond symbol |
| `1950` | Birth year (shown as label) |
| `deceased` | X drawn through symbol |
| `stillbirth` | Smaller symbol with X |
| `conditions: X(fill)` | Medical condition overlay |

### Relationships

```
genogram
  a [male, 1950]
  b [female, 1952]
  a -- b              # married
    child [female, 1975]
  a -x- b             # divorced
  a -/- b             # separated
  a ~ b               # cohabitation
  a -o- b             # engaged
```

Children are indented under the couple line they belong to:

```
genogram
  dad [male, 1950]
  mom [female, 1952]
  dad -- mom
    son [male, 1975]
    daughter [female, 1978]
```

### Medical conditions

Conditions use standard genogram fill patterns:

```
genogram
  patient [male, 1960, conditions: heart-disease(full) + diabetes(half-left)]
```

Fill types: `full`, `half-left`, `half-right`, `half-top`, `half-bottom`, `striped`, `dotted`

### Multi-generation example

```
genogram "Three Generations"
  grandpa [male, 1930, deceased]
  grandma [female, 1932]
  grandpa -- grandma
    dad [male, 1955]
    aunt [female, 1958]
  dad -- mom [female, 1957]
    me [male, 1985]
    sister [female, 1988]
```

## Ecomap Syntax

Ecomaps visualize a person or family's relationships with external systems — work, healthcare, community, legal, and social connections.

### Structure

Every ecomap has a **center** (the individual or family) surrounded by **external systems**, connected by lines that show relationship strength and energy flow.

```
ecomap "Maria's Network"
  center: maria [female, age: 34]

  work [label: "Tech Company", category: work]
  church [label: "St. Mary's", category: religion]
  mother [label: "Mom", category: family]

  maria === mother
  maria --- church
  maria === work
```

### Connection types

| Operator | Type | Visual |
|----------|------|--------|
| `===` | Strong | Triple line |
| `==` | Moderate | Double line |
| `---` | Normal | Single line |
| `- -` | Weak | Dashed line |
| `~~~` | Stressful | Wavy line |
| `~=~` | Stressful-strong | Thick wavy line |
| `~x~` | Conflictual | Line with X marks |
| `-/-` | Broken/cut off | Line with break |

### Energy flow (directional arrows)

```
therapist --> maria         # energy flows from therapist to maria
maria ==> work              # moderate, energy flows from maria to work
maria <-> church            # mutual energy exchange
```

| Operator | Flow | Strength |
|----------|------|----------|
| `-->` / `<--` | One-way | Normal |
| `<->` | Mutual | Normal |
| `==>` / `<==` | One-way | Moderate |
| `<=>` | Mutual | Moderate |
| `===>` / `<===` | One-way | Strong |

### Connection labels

```
maria --- employer [label: "part-time"]
maria ~~~ ex [label: "custody conflict"]
```

### System categories

Systems can be tagged with a `category` for color-coded rendering:

```
work [label: "Tech Corp", category: work]
doc [label: "Dr. Smith", category: health]
church [label: "St. Mary's", category: religion]
```

Built-in categories: `family`, `friends`, `work`, `education`, `health`, `mental-health`, `religion`, `recreation`, `legal`, `government`, `substance`, `community`, `financial`, `housing`, `cultural`, `social-media`, `other`

### Full example

```
ecomap "Substance Abuse Recovery"
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
  therapist <-> client [label: "weekly"]
```

## Pedigree Syntax

Pedigree charts track genetic inheritance patterns — simpler than genograms, focused on carrier status and trait expression.

### Structure

```
pedigree "Cystic Fibrosis Family"
  I-1 [male, carrier]
  I-2 [female, carrier]
  I-1 -- I-2
    II-1 [male, unaffected]
    II-2 [female, carrier]
    II-3 [male, affected, proband]
    II-4 [female, unaffected]
```

### Genetic status

| Property | Fill | Meaning |
|----------|------|---------|
| `affected` | Full black | Has the condition |
| `carrier` | Half-filled (left) | Carries the gene |
| `carrier-x` | Center dot | X-linked carrier |
| `obligate-carrier` | Center dot | Obligate carrier |
| `presymptomatic` | Vertical line | Gene positive, no symptoms yet |
| `unaffected` | Empty | Does not have the condition |

### Special markers

| Marker | Symbol | Meaning |
|--------|--------|---------|
| `proband` | Arrow + P | Index case |
| `consultand` | Arrow + C | Person who sought counseling |
| `evaluated` | E above | Clinically evaluated |

### Consanguinity

```
II-1 == II-3    # double line = related parents
```

### Legend (for multi-trait pedigrees)

```
pedigree "Cancer Family"
  legend: breast = "Breast cancer" (fill: quad-tl)
  legend: ovarian = "Ovarian cancer" (fill: quad-tr)
  I-1 [female, affected: breast+ovarian]
```

Generation labels (I, II, III...) and individual numbering (I-1, I-2...) are rendered automatically.

## Phylogenetic Tree Syntax

Phylogenetic trees display evolutionary relationships between species, genes, or sequences. Lineage supports the standard **Newick format** natively, plus an indent-based DSL for hand-written trees.

### Newick input

```
phylo "Simple Vertebrates"
  newick: "((Human:0.1,Mouse:0.3):0.05,(Chicken:0.4,(Zebrafish:0.6,Frog:0.5):0.15):0.1);"
  scale "substitutions/site"
```

### Tree modes

| Mode | Effect | Activation |
|------|--------|------------|
| `phylogram` | Branch lengths proportional to evolutionary distance (default) | — |
| `cladogram` | All tips aligned, only topology shown | `[mode: cladogram]` |
| `chronogram` | Branch lengths proportional to divergence time | `[mode: chronogram]` |

### Layout types

| Layout | Description | Activation |
|--------|-------------|------------|
| `rectangular` | Standard L-shaped branches (default) | — |
| `slanted` | Diagonal branch lines | `[layout: slanted]` |

### Bootstrap support values

```
phylo "Primates"
  newick: "((Human:0.02,Chimp:0.03):0.01[&&NHX:B=100],(Gorilla:0.05,Orangutan:0.08):0.04[&&NHX:B=72]);"
```

Support values ≥50 are shown as colored dots (green ≥95, yellow ≥75, orange ≥50) with numeric labels.

### Clade highlighting

```
clade Mammals = (Human, Mouse, Dog) [color: "#1E88E5", label: "Mammalia"]
clade Birds = (Chicken, Eagle) [color: "#43A047", label: "Aves", highlight: background]
```

Highlight modes: `branch` (colored branches, default), `background` (shaded rectangle), `both`.

### Indent DSL (alternative to Newick)

For small, hand-written trees:

```
phylo "Simple Tree"

root:
  :0.15
    :0.03
      Human: 0.1
      Chimp: 0.08
    Gorilla: 0.12
  Dog: 0.35

clade Apes = (Human, Chimp, Gorilla) [color: "#1E88E5"]
scale "substitutions/site"
```

### Full example

```
phylo "Bacterial Diversity"
  newick: "((((Ecoli:0.1,Salmonella:0.12):0.05,Vibrio:0.2):0.08,((Bacillus:0.15,Staph:0.18):0.06,Listeria:0.22):0.1):0.15,((Myco_tb:0.3,Myco_leprae:0.28):0.12,(Strepto:0.25,Lactobacillus:0.2):0.08):0.2);"

  clade Gamma = (Ecoli, Salmonella, Vibrio) [color: "#1E88E5", label: "γ-Proteobacteria"]
  clade Firmi = (Bacillus, Staph, Listeria, Strepto, Lactobacillus) [color: "#E53935", label: "Firmicutes"]
  clade Actino = (Myco_tb, Myco_leprae) [color: "#43A047", label: "Actinobacteria"]

  scale "substitutions/site"
```

## Sociogram Syntax

Sociograms visualize social relationships within a group — who chooses whom, mutual bonds, rejections, and social isolation. Based on Moreno (1934) sociometry.

### Nodes

```
sociogram
  alice [label: "Alice", group: team-a]
  bob [label: "Bob", role: star]
  carol [label: "Carol", size: large]
```

| Property | Effect |
|----------|--------|
| `label: "..."` | Display name |
| `group: id` | Group membership (for coloring) |
| `role: star\|isolate\|bridge` | Force role annotation |
| `size: small\|medium\|large` | Override node size |

### Edge operators

| Operator | Direction | Valence | Visual |
|----------|-----------|---------|--------|
| `->` | One-way | Positive | Green solid arrow |
| `<->` | Mutual | Positive | Green double arrow |
| `--` | Undirected | Positive | Green solid line |
| `-x>` | One-way | Negative | Red dashed arrow |
| `<x->` | Mutual | Negative | Red dashed double arrow |
| `-x-` | Undirected | Negative | Red dashed line |
| `-.>` | One-way | Neutral | Gray dotted arrow |
| `-.-` | Undirected | Neutral | Gray dotted line |
| `==>` | One-way | Strong positive | Thick green arrow |
| `<==>` | Mutual | Strong positive | Thick green double arrow |
| `===>` / `<===>` | Very strong | Positive | Very thick line |

### Edge properties

```
alice -> bob [label: "best friend", weight: 3]
```

### Groups

```
group boys [label: "Boys", color: "#42A5F5"]
    tom
    jack
    mike
```

### Config options

```
config: layout = force-directed    # circular | force-directed
config: sizing = in-degree         # uniform | in-degree
config: coloring = group           # default | group | role
config: highlight = stars, isolates
```

### Auto-detected roles

| Role | Detection | Visual |
|------|-----------|--------|
| Star | in-degree ≥ mean + 1.5σ | Gold fill + star badge |
| Isolate | in-degree = 0 AND out-degree = 0 | Gray, dashed border |
| Neglectee | in-degree = 0, out-degree > 0 | Blue, dashed border |
| Rejected | ≥2 rejection edges received | Red-tinted, dashed border |

### Full example

```
sociogram "Mrs. Chen's 4th Grade Class"
  config: layout = circular

  alice [label: "Alice"]
  bob [label: "Bob"]
  carol [label: "Carol"]
  dave [label: "Dave"]
  eve [label: "Eve"]
  frank [label: "Frank"]

  alice -> bob
  alice -> carol
  bob -> alice
  bob -> dave
  carol -> alice
  carol -> eve
  dave -> bob
  dave -> frank
  eve -> carol
  eve -> alice
  frank -> dave
```

## API

### `render(text, config?)`

Parse, layout, and render a diagram in one call. Returns an SVG string.

```ts
import { render } from 'lineage';

const svg = render(diagramText);
const svg = render(diagramText, { type: 'ecomap' }); // force type
const svg = render(diagramText, {
  fontFamily: 'Inter, system-ui',
  padding: 40,
  theme: 'mono', // override theme
});
```

### `parse(text, config?)`

Parse text into an AST without rendering. Useful for inspection, transformation, or custom rendering.

```ts
import { parse } from 'lineage';

const ast = parse(diagramText);
// → { type: 'genogram', individuals: [...], relationships: [...], metadata: {...} }
```

### Tree-shakable imports

Import only the diagram type you need:

```ts
import { genogram } from 'lineage/genogram';
import { ecomap } from 'lineage/ecomap';

// Each export is a DiagramPlugin with parse(), layout(), render()
const ast = genogram.parse(text);
const layout = genogram.layout(ast, layoutConfig);
const svg = genogram.render(layout, renderConfig);
```

### `LineageConfig`

```ts
interface LineageConfig {
  type?: 'genogram' | 'ecomap' | 'pedigree' | 'phylo' | 'sociogram';  // force diagram type
  fontFamily?: string;   // default: 'system-ui'
  padding?: number;      // SVG padding in px, default: 20
  theme?: string;        // 'default' | 'clinical' | 'colorful' | 'mono'
}
```

## SVG Output

Lineage produces clean, semantic SVG suitable for embedding, printing, or interactive use:

```html
<svg xmlns="http://www.w3.org/2000/svg" class="lineage-diagram lineage-genogram">
  <title>Genogram: The Smiths</title>
  <desc>Genogram with 5 individuals across 2 generations</desc>
  <style>/* Themeable CSS classes */</style>
  <!-- Each element has data-* attributes for JS interaction -->
  <g data-individual-id="john" class="lineage-node lineage-male">...</g>
</svg>
```

**Accessibility:** Every diagram includes `<title>` and `<desc>` elements. Nodes and edges carry semantic class names.

**Theming:** The default theme renders males in light blue and females in light pink (clinical style). Built-in themes: `default` (clinical colors), `colorful` (brighter palette), `mono` (pure black/white). Override any `.lineage-*` CSS class for custom styling — no inline styles, everything is in a single `<style>` block within the SVG.

**Interactivity:** Use `data-individual-id` and `data-relationship-type` attributes to attach event handlers.

## Roadmap

- [x] **Phase 1: Genogram** — Parser, generation-based layout, McGoldrick symbols, SVG renderer
- [x] **Phase 2: Ecomap** — Radial layout, weighted connections, energy flow arrows, category colors
- [x] **Phase 2: Pedigree** — Generation layout, Roman numeral labels, affected/carrier/presymptomatic fills, proband arrows, consanguinity, legend
- [x] **Phase 2: Phylogenetic Tree** — Newick parser, rectangular/slanted/cladogram layouts, bootstrap support, clade highlighting, scale bar
- [x] **Phase 2: Sociogram** — Moreno sociometry, circular + force-directed layout, 3 valence types, auto-detected roles, group coloring
- [ ] **Phase 3: Integrations** — React component, Markdown plugin, Obsidian plugin
- [ ] **Phase 4: Advanced** — Interactive editing, JSON import/export, PDF export

## Architecture

```
Text DSL → Parser → AST → Layout → Renderer → SVG string
```

Each diagram type is a **plugin** implementing `DiagramPlugin`:

```
src/
  core/
    types.ts        # Shared type definitions (the spec)
    api.ts          # render() and parse() entry points
    svg.ts          # SVG builder utilities
  diagrams/
    genogram/       # McGoldrick-standard genogram
      parser.ts     # Hand-written recursive descent
      layout.ts     # Generation-based layered layout
      symbols.ts    # Gender shapes, condition fills, status markers
      renderer.ts   # SVG output with semantic markup
    ecomap/         # Hartman-standard ecomap
      parser.ts     # Connection operator parser
      layout.ts     # Radial/polar layout with concentric rings
      renderer.ts   # 8 line types, arrows, category colors
    pedigree/       # Bennett-standard pedigree chart
      parser.ts     # Genetic status + legend parser
      layout.ts     # Generation layout + Roman numeral labels
      renderer.ts   # Affected/carrier fills, proband arrows
    phylo/          # Phylogenetic tree (Felsenstein standard)
      parser.ts     # Newick + indent DSL + clade definitions
      layout.ts     # Rectangular/slanted/cladogram layout
      renderer.ts   # Branch paths, support dots, scale bar, clade highlights
    sociogram/      # Moreno sociometry (1934)
      parser.ts     # Edge operators, groups, config
      layout.ts     # Circular + Fruchterman-Reingold force-directed
      renderer.ts   # Valence-colored edges, role-based nodes, arrow markers
```

## Development

```bash
git clone https://github.com/mymap-ai/lineage.git
cd lineage
npm install
npm run dev          # watch mode (tsup)
npm run test         # vitest (338 tests)
npm run typecheck    # strict TypeScript
npm run lint         # ESLint
npm run build        # ESM + CJS + DTS → dist/
```

Open `preview/index.html` in a browser (via Vite or any dev server) to see live-rendered examples of all diagram types.

## Contributing

Contributions are welcome. Key areas where help is needed:

- **Standard accuracy** — McGoldrick genogram symbols, Hartman ecomap conventions
- **Layout optimization** — Edge crossing minimization, better label placement
- **Accessibility** — Screen reader support for relationship diagrams
- **Emotional relationships** — Colored line styles for hostile, close, distant, cutoff relationships
- **Integrations** — React component, Obsidian plugin, Markdown-it plugin

Please open an issue to discuss significant changes before submitting a PR.

## License

[AGPL-3.0](LICENSE) — free to use, modify, and distribute. Commercial integrations that modify the library must open-source their changes.

Built by [MyMap AI](https://mymap.ai).
