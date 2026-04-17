# Lineage

Text-to-SVG rendering engine for **genograms**, **ecomaps**, and **pedigree charts**.

Like [Mermaid](https://mermaid.js.org/) — but for relationship diagrams used in social work, family therapy, genetics, and clinical practice.

```
genogram
  john [male, 1950]
  mary [female, 1952]
  john -- mary
    alice [female, 1975]
    bob [male, 1978, deceased]
```

↓

![genogram example](docs/example-genogram.svg)

## Why Lineage?

Mermaid is great for flowcharts and sequence diagrams. But **specialized relationship diagrams** — genograms, ecomaps, pedigree charts — need domain-specific layout algorithms and standardized symbol systems that general-purpose tools can't provide.

- **Genograms** follow the [McGoldrick standard](https://en.wikipedia.org/wiki/Genogram): gender-specific shapes, medical condition fills, relationship line patterns, generation-based layout
- **Ecomaps** use radial layout with weighted connections showing resource flow direction
- **Pedigree charts** track genetic inheritance with carrier/affected status indicators

No existing open-source library handles these well. GoJS has a genogram sample but costs $7k+. Everything else is either proprietary or abandoned.

## Install

```bash
npm install lineage
```

## Usage

### Basic

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

### With configuration

```ts
import { render } from 'lineage';

const svg = render(diagramText, {
  theme: 'clinical',
  fontFamily: 'Inter, system-ui',
  padding: 40,
});
```

### Parse only (get AST)

```ts
import { parse } from 'lineage';

const ast = parse(diagramText);
// → { type: 'genogram', individuals: [...], relationships: [...] }
```

### Tree-shakable imports

```ts
// Only import what you need
import { genogram } from 'lineage/genogram';
import { ecomap } from 'lineage/ecomap';
import { pedigree } from 'lineage/pedigree';
```

## DSL Syntax

### Genogram

```
genogram "The Smith Family"

  # Generation 1
  john [male, 1950, conditions: heart-disease]
  mary [female, 1952]
  john -- mary                    # married

  # Generation 2
  john -- mary
    alice [female, 1975]          # child
    bob [male, 1978, deceased]    # deceased child

  # Second marriage
  john -x- mary                   # divorced
  john -- susan [female, 1955]    # remarried

  # Medical conditions
  john [conditions: heart-disease(full), diabetes(half-left)]
```

**Symbols:**
| Syntax | Meaning |
|--------|---------|
| `[male]` | □ Male |
| `[female]` | ○ Female |
| `[unknown]` | ◇ Unknown/Other |
| `[deceased]` | ✕ through shape |
| `A -- B` | Marriage |
| `A -x- B` | Divorce |
| `A -/- B` | Separation |
| `A ~ B` | Cohabitation |
| Indented under couple | Child |
| `[conditions: X(fill)]` | Medical condition with fill pattern |

### Ecomap

```
ecomap "Maria's Support System"

  center: maria [female, age: 34]

  # External systems
  work [label: "Tech Company"]
  church [label: "St. Mary's"]
  mother [label: "Mom (Rosa)"]
  therapist [label: "Dr. Chen"]
  ex [label: "Ex-husband"]

  # Connections
  maria === work          # strong positive
  maria --- church        # weak/tenuous
  maria === mother        # strong positive
  maria === therapist     # strong positive
  maria ~~~ ex            # stressful
  maria --> mother        # energy flows to mother
  therapist --> maria     # energy flows from therapist
```

### Pedigree Chart

```
pedigree "Cystic Fibrosis Inheritance"

  # Generation I
  I-1 [male, carrier]
  I-2 [female, carrier]
  I-1 -- I-2

  # Generation II
  I-1 -- I-2
    II-1 [male, unaffected]
    II-2 [female, carrier]
    II-3 [male, affected, proband]   # proband = index case
    II-4 [female, unaffected]

  # Consanguinity
  II-1 == II-5 [female, carrier]     # double line = related parents
```

## Output

Lineage outputs clean, semantic SVG with:

- Accessible `<title>` and `<desc>` elements
- CSS class names for styling (`.lineage-node`, `.lineage-edge`, `.lineage-label`)
- Data attributes for interaction (`data-individual-id`, `data-relationship-type`)
- No external dependencies in the SVG output

## Roadmap

- [x] Project scaffold and type system
- [ ] **Phase 1: Genogram** — parser, generation-based layout, McGoldrick symbols, SVG renderer
- [ ] **Phase 2: Ecomap + Pedigree** — radial layout (ecomap), shared layout engine (pedigree)
- [ ] **Phase 3: Integrations** — Markdown plugin, React component, Obsidian plugin
- [ ] **Phase 4: Advanced** — Interactive editing, JSON import/export, PDF export

## Architecture

```
Text DSL
   │
   ▼
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Parser  │ ──▶ │   AST    │ ──▶ │  Layout  │ ──▶ │ Renderer │ ──▶ SVG
└─────────┘     └──────────┘     └──────────┘     └──────────┘
                                  genogram:         Clean SVG
                                  generation-based   with CSS
                                  layered layout     classes

                                  ecomap:
                                  radial/polar

                                  pedigree:
                                  simplified
                                  generation-based
```

Each diagram type is a **plugin** that implements `parse()`, `layout()`, and `render()`. The core provides the pipeline, type system, and shared SVG utilities.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Key areas where help is needed:
- McGoldrick standard symbol accuracy
- Layout algorithm optimization (edge crossing minimization)
- Accessibility (screen reader support for relationship diagrams)
- Internationalization (RTL language support)

## License

MIT © [MyMap AI](https://mymap.ai)
