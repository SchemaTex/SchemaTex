# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.2.4] — 2026-04-25

### Fixed — Genogram: disconnected sibship bar when a child is also a partner in another union

The parent drop line and sibship bar could fail to connect when one of the children from a family unit is also a partner in a separate couple. Layout pass 3 cannot satisfy both centering objectives simultaneously (center under parents AND stay next to spouse), leaving the parent midpoint outside the `[leftmost child, rightmost child]` range. The sibship bar only spanned that child range, so the drop line ended in empty space and both children appeared visually disconnected from their parents.

**Fix:** the sibship bar now extends to `min(leftX, midX) … max(rightX, midX)`, guaranteeing the parent drop always lands on it regardless of where children are positioned.

---

## [0.2.3] — 2026-04-25 (backfilled)

### Added — Structured parse errors (Pass A)

Parse errors across 8 diagram types now carry machine-readable position fields, making it straightforward to surface exact error locations in editors, AI tools, and error UIs:

| Parser | `.line` | `.column` | `.source` |
|--------|---------|-----------|-----------|
| `flowchart` | ✓ | ✓ (renamed from `col`) | ✓ |
| `decisiontree` | ✓ | ✓ | ✓ |
| `timeline` | ✓ | ✓ | ✓ |
| `ladder` | ✓ | ✓ | ✓ |
| `mindmap` | ✓ | — | ✓ |
| `timing` | ✓ | — | ✓ |
| `blockdiagram` | ✓ | — | ✓ |
| `orgchart` | ✓ | — | ✓ |

All thrown errors are instances of a typed error class with public `line`, `column?`, and `source?` fields. The `extractError()` helper in `src/ai/errors.ts` reads these structurally and is already used by `validateDsl` / `renderDsl` AI tools.

---

## [0.2.3] — 2026-04-25

### Added — Unified legend system

`legend.*` DSL directives are now supported across all four relationship diagrams (genogram, ecomap, sociogram, pedigree):

```
%% legend: bottom-inline    # default; rows of sections with a fixed label column
%% legend: bottom-right     # compact floating legend, lower-right corner
%% legend: none             # suppress legend
%% legend-title: My Title
```

- **`bottom-inline`** (new default): sections flow left-to-right in rows; canvas minimum width 480 px
- **`bottom-right`**: compact floating legend anchored to the lower-right corner; does not widen the chart canvas
- **`none` / `legend: none`**: suppress legend entirely
- **`LegendItem.fill`** — new field on the `LegendItem` type; separates shape-fill color from stroke/line color so swatches render WYSIWYG

Each diagram auto-derives its own legend sections:

| Diagram | Auto-derived sections |
|---------|----------------------|
| Genogram | RELATIONSHIPS (non-obvious types), CONDITIONS (per-condition color swatches) |
| Ecomap | SYSTEMS (Hartman category colors), TIES (strength × valence) |
| Sociogram | GROUPS (node group colors), ROLES, TIES (valence line styles) |
| Pedigree | GENETIC STATUS (affected/carrier/presymptomatic fill patterns), TRAITS, SYMBOLS (deceased diagonal, proband P) |

Universal McGoldrick conventions (Male/Female shapes, Married, Parent-Child) are intentionally excluded from the genogram legend as "obvious" encodings.

### Added — AI tool layer (`schematex/ai`, `schematex/ai/sdk`, `@schematex/mcp`)

A set of LLM-ready tools for building AI agents that generate and validate diagrams.

**`schematex/ai`** — five tools with JSON schemas:

```ts
import { listDiagrams, getSyntax, getExamples, validateDsl, renderDsl } from 'schematex/ai';

listDiagrams()           // → { diagrams: string[] }
getSyntax('genogram')    // → { syntax: string }   ~grammar spec
getExamples('ecomap')    // → { examples: string[] } ~2 600-token budget
validateDsl(text)         // → { ok: true } | { ok: false, errors: StructuredError[] }
renderDsl(text, config?)  // → { svg: string }
```

**`schematex/ai/sdk`** — drop-in Vercel AI SDK adapter:

```ts
import { schematexTools } from 'schematex/ai/sdk';
import { streamText } from 'ai';

const result = await streamText({
  model: ...,
  tools: schematexTools,   // all five tools, Zod-validated
  ...
});
```

**`@schematex/mcp`** — standalone stdio MCP server (separate package, same five tools):

```bash
npx @schematex/mcp          # stdio transport for Claude Desktop / any MCP client
```

A hosted JSON-RPC 2.0 MCP endpoint is also available at `https://schematex.js.org/mcp`.

### Changed

- **Genogram legend**: auto-derivation excludes Male/Female shapes, Married, and Parent-Child — universal McGoldrick conventions omitted by default
- **No legend border/box**: hairline box dropped; legend is borderless and minimal
- **Chart centering**: when the legend widens the canvas beyond the chart's natural width, chart content is translated to remain horizontally centered

### Fixed

- **Mindmap left-align**: node label text is now flush with the left edge of the underline; previously offset ~2 px due to an incorrect anchor calculation
- **Genogram condition fill**: `.schematex-genogram-condition-fill:not([fill])` — theme CSS no longer overrides per-individual inline `fill` attributes
- **Quad clip-path**: switched to `clipPathUnits="objectBoundingBox"` with 0..1 fractional coordinates; `quad-tl` / `quad-tr` now clip to the correct quadrant

---

## [0.2.2] — 2026-04-23

### Added — Mindmap rich content (inline markdown)

Every mindmap node now supports inline markdown:

```
Root
  **bold text** / *italic* / `code`
  [link text](https://example.com)
  [x] completed task item
  [ ] pending task item
```

- Multi-line text wrapping via `%% maxLabelWidth: N` directive (default 240 px)
- New `InlineToken` discriminated union in `src/core/types.ts`: `text | code | link | checkbox`
- New `MindmapLabelLine` type; `MindmapLayoutNode` gains `fontSize` and `lines` fields
- New `src/diagrams/mindmap/inline.ts` — zero-dependency inline tokenizer + word-wrapper
- Theme tokens: `codeFg`, `codeBg`, `linkColor`, `checkboxStroke`, `checkboxFill` across all three themes

### Changed — Mindmap visual redesign (markmap-style)

- All nodes use a single underline-based visual: no root capsule border, no node box at any depth
- Bezier edges terminate precisely at the underline stroke (fixed 2 px y-offset bug from previous release)
- Same-depth nodes share identical `labelWidth` (global equalization), so bezier curves at the same depth span identical horizontal distances
- Root node gets a 1.5× wrap budget (proportional to its 20 pt font) so short titles stay on one line
- Stroke widths taper by depth: root 2.4 px → depth 1: 2.2 px → depth 2: 1.6 px → depth 3+: 1.2 px; monochrome theme scales all widths × 0.7

---

## [0.2.0] — 2026-04-20

### Added

- **Timeline** diagram type — three visual styles in one DSL:
  - `style: swimlane` — proportional/equidistant/log scale axis; auto-track packing via greedy interval scheduling; bidirectional label cascade with leader lines; era bands
  - `style: gantt` — milestone pin zone with label cascade; category lane grouping
  - `style: lollipop` — event-only axis with lollipop stems and cards
  - Date formats: ISO, BC years (`-753`), quarters (`2026-Q1`), geological Ma scale
  - Per-event DSL properties: `[icon / shape / color / category / side]`
  - Config directives: `style:`, `scale:`, `axis:`

- **Decision Tree** diagram type — hierarchical decision branching; standard box-and-arrow layout; labeled edges on decisions; leaf terminal nodes

- **`schematex/browser`** — DOM embedding helpers:

  ```ts
  import { renderToElement, renderToContainer } from 'schematex/browser';

  const svg = renderToElement(dsl, config?);    // → SVGElement (detached)
  renderToContainer(dsl, el, config?);          // mutates el.innerHTML
  ```

- **`schematex/react`** — zero-config React ≥ 18 component (optional peer dep):

  ```tsx
  import { SchematexDiagram } from 'schematex/react';

  <SchematexDiagram dsl="..." config={{ theme: 'dark' }} className="my-diagram" />
  ```

- **`schematex/export`** — rasterize and download:

  ```ts
  import { svgToPngBlob, downloadBlob, printSvgAsPdf } from 'schematex/export';

  const blob = await svgToPngBlob(svgString, { scale: 2 }); // Canvas API, 2× by default
  downloadBlob(blob, 'diagram.png');
  printSvgAsPdf(svgString); // opens browser print dialog
  ```

- **`parse(text, config?)`** — public AST export API:

  ```ts
  import { parse } from 'schematex';

  const ast = parse('genogram\nJohn M 1950\n...');  // JSON-serializable AST or null
  ```

  All 20 diagram plugins now expose `parse?` on the `DiagramPlugin` interface.

### Changed — Breaking

- **Package renamed** from `lineage` to `schematex` — update all imports:
  ```ts
  // before
  import { render } from 'lineage';
  // after
  import { render } from 'schematex';
  ```
- **License changed** to AGPL-3.0

### Changed — Flowchart layout (Sugiyama phases 1–3)

The initial basic layout from 0.1.1 is replaced by a full Sugiyama implementation:

- **Phase 1 — crossing minimization**: Barth–Junger–Mutzel barycenter with forward/backward sweep and best-of-N selection
- **Phase 2 — x-coordinate assignment**: Brandes–Kopf 4-alignment (new shared module `src/core/layered/bk.ts`) with type-1 conflict detection, block compaction, and balanced-median merge
- **Phase 3 — subgraph support**: lane-based x-coord assignment so cluster bboxes never overlap foreign-lane nodes; `subgraph Title … end` / `end` block syntax; cluster and title labels have correct viewport padding

**8 new M2 node shapes** (in addition to the 7 M1 shapes from 0.1.1):

| Shape | DSL syntax |
|-------|-----------|
| Cylinder (database) | `[(Label)]` |
| Double-circle | `(((Label)))` |
| Subroutine | `[[Label]]` |
| Hexagon | `{{Label}}` |
| Asymmetric / flag | `>Label]` |
| Parallelogram-alt | `[/Label\]` |
| Trapezoid | `[\Label/]` |
| Trapezoid-alt | `[\Label\]` |

**Parser additions**: ampersand fan-out/fan-in (`A & B --> C`), bracket-label subgraph IDs.

### Changed

- **Unified `DiagramPlugin` interface**: `render(text, config?)` and `parse?(text, config?)` are now the canonical entry points per plugin; all renderers migrated

---

## [0.1.1] — 2026-04-18

### Added — 5 new diagram types

- **Flowchart** — initial implementation:
  - Mermaid-compatible DSL (`-->`, `--label-->`, `-.->`, `==>`)
  - 7 M1 node shapes: rectangle `[…]`, rounded `(…)`, stadium `([…])`, circle `((…))`, rhombus `{…}`, trapezoid `[/…/]`, asymmetric `>…]`
  - Layered layout (basic, no crossing minimization — see 0.2.0 for full Sugiyama)
  - Orthogonal edge routing with arrowheads
  - Parser, layout, renderer, routing, shapes modules with unit tests

- **Venn** — Euler/Venn diagrams:
  - 2-, 3-, and 4-circle layouts; proportional or uniform sizing
  - Per-set labels; intersection region labels and count chips; leader lines for tight spaces
  - `multiply` blend-mode compositing for overlapping regions
  - Euler variants: disjoint, subset, mixed overlap
  - DSL: `sets:` block for set definitions, `intersections:` block for region labels

- **Matrix / Quadrant** — 2×2 BCG/Eisenhower-style quadrant and arbitrary N×M grid:
  - Per-cell content (text, items, score); axis labels; quadrant color fills
  - Supports `template: bcg`, `template: eisenhower` built-in presets
  - Items within cells are auto-stacked; custom ordering supported

- **Mindmap** — two layout styles:
  - `style: map` (default) — radial tree spreading outward from a center root
  - `style: logic-right` — left-to-right tree with aligned branches
  - Indent-based DSL; `%% style:` config directive
  - Depth-colored edges with tapered stroke widths

- **Orgchart** — org tree with rich card rendering:
  - Indent-based or explicit-edge (`->`) hierarchy
  - Card fields: name, title, optional info line (email / phone / note)
  - 15+ role glyphs (CEO crown, gear, $, briefcase, …); male/female silhouette icons
  - Department color palette (soft bg + dark fg tinting)
  - Explicit matrix/dotted-line edges (`-.->`)
  - Assistant sidecar nodes; status pills (open / draft / external / on-leave)
  - `layout: list` mode — compact directory view with depth-based indentation, subtree counts, guide lines

### Changed

- **Per-diagram subpath exports**: every diagram type now has its own addressable entry point:

  ```ts
  import { render } from 'schematex/genogram';
  import { render } from 'schematex/flowchart';
  import { render } from 'schematex/venn';
  // … /ecomap /pedigree /phylo /sociogram /timing /logic /circuit
  //   /blockdiagram /ladder /sld /entity /fishbone /orgchart
  ```

- **Unified semantic color tokens**: all 6 engineering diagrams (circuit, logic, ladder, SLD, block, timing) now respect the shared `default` / `monochrome` / `dark` theme — previously these diagrams used hardcoded colors
- **Theme token cleanup**: removed redundant/dead tokens from `src/core/theme.ts`; token surface area reduced without breaking existing theme customization

### Fixed

- **Venn label placement**: label placement algorithm rewritten — set labels, intersection labels, and count chips no longer overlap on 3-circle and 4-circle diagrams
- **Fishbone**: new DSL layout options — `sides: both | left | right`, `density: compact | normal | wide`, `cause-side:`, `rib-slope: <degrees>`, per-rib `[side: …, order: …]` overrides; alternating rib placement; improved spine and header sizing

---

## [0.1.0] — 2026-03-15

### Added

- Core pipeline: Text DSL → Parser → AST → Layout → SVG
- **Relationships:** Genogram (McGoldrick standard), Ecomap (Hartman categories), Pedigree (genetic status / carrier / presymptomatic)
- **Biological:** Phylogenetic tree (Newick/NHX format; clade coloring)
- **Social science:** Sociogram (Moreno sociometry; force-directed layout; valence edges)
- **Electrical & Industrial:** Logic Gate (IEEE Std 91), Circuit (IEEE 315 symbols), Timing Diagram (waveform / state / packet), Block Diagram, Ladder Logic (IEC 61131-3), Single-Line Diagram (SLD)
- **Corporate/Legal:** Entity Structure, Fishbone / Ishikawa (basic)
- Zero-dependency SVG builder (`src/core/svg.ts`)
- Shared theme system: `default`, `monochrome`, `dark` presets; CSS class-based theming; `data-*` hooks for interactivity
- Semantic SVG output: `<title>` + `<desc>` on all diagrams; no inline styles
- Vitest test suite
