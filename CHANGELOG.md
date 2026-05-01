# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.4.0] — 2026-04-30

### Fixed — Genogram: cousins of different couples no longer interleave (Case A)

When two sibships from different parental couples share a generation row, children were getting interleaved by birth-year sort and centering, making cousins look like siblings. New post-centering pass `unscrambleSibships` groups children by their `childOf` family unit, orders sibship blocks by parent midpoint (left-to-right), and lays each block out contiguously with `familyGap` separation between blocks. `resolveOverlaps` is now cluster-aware and enforces `familyGap` instead of `minGap` between adjacent nodes from different sibships. Resolves the 16-iteration user-abandon case in the 2026-04-30 production audit.

### Fixed — Pedigree: SAB / TAB / Ectopic now render as NSGC triangles (Case B)

`[sab]`, `[tab]`, `[ectopic]`, and `[stillborn]` statuses were parsed but rendered as regular sex-based shapes (square/circle/diamond). Now follows NSGC pedigree-symbol standard: SAB renders as a small filled point-down triangle (~60% size); TAB adds a diagonal slash; Ectopic adds an "ECT" label; Stillborn keeps the sex-based shape but adds an "SB" label. New CSS classes `schematex-pedigree-loss-shape`, `schematex-pedigree-tab-slash`, `schematex-pedigree-status-label`.

### Fixed — Blockdiagram: inline `[id] -> [id]` no longer rejected (Case F)

The trailing-attrs `[…]` parser was greedily consuming the leading `[` of bracketed identifiers, making body empty and throwing `Invalid connection`. Fixed by scanning backwards from the closing `]` (depth-aware), requiring whitespace before the matching `[`, and treating bare-identifier brackets as inline endpoints rather than attrs. Bracketed ids in connection chains now auto-declare blocks. Trailing attrs `... ["label"]` and `... [role:plant]` continue to work.

### Fixed — Circuit: `GND_REF`/`AGND`/`DGND`/`EARTH`/`PE` no longer reject (Case D)

Previously only `0` / `gnd` / `GND` / `Gnd` / `ground` / `Ground` were recognized as ground net aliases, and there was no `G` prefix in `PREFIX_MAP`, so `GND_REF` declared as a component threw `Cannot infer type from id`. Extended `GROUND_NETS` with `AGND`, `DGND`, `GNDA`, `GNDD`, `EARTH`, `PE`, `VSS`, `COM` (case variants). Added pattern `GROUND_ID_PATTERN` so any id starting with `gnd|ground|earth|pe|agnd|dgnd` resolves to type `ground` automatically. Improved error message suggests `type=ground` for ground-like ids.

### Added — Circuit: `terminal_block` primitive (Case C)

New component type `terminal_block` draws a labeled rectangular enclosure with N user-defined terminals on the left, each rendered with a small terminal-screw circle and a label. Aliases: `tb`, `junction_box`, `jbox`, `enclosure`. T-prefixed ids infer the type automatically. Pin labels supplied via `pins="SIG,COM,12V+,GND"`. Fills the gap for instrumentation drawings (junction boxes, terminal strips) where users previously had to hand-build enclosures from `wire` segments.

### Added — Genogram: `shape:` override field (Case B)

New optional `shape:` attribute on individuals lets the DSL request a specific shape regardless of sex. Accepts `square`, `circle`, `diamond`, `triangle`, `triangle-down`. Useful for anthropology / unilineal kinship diagrams where males are conventionally drawn as triangles, or for visually distinguishing matrilineal vs patrilineal lineages.

### Added — Flowchart: multi-line node labels via `<br/>` (Case G)

Labels containing `<br/>`, `<br>`, or literal `\n` now render as multiple `<tspan>` rows centered around the node label anchor. New `multilineText` helper in `core/svg.ts`. Inline `<b>` and `<i>` tags are stripped (no per-run formatting yet) so PRISMA-style flowchart labels render cleanly. Accessibility `<title>` strips tags so screen readers get plain text.

### Added — Flowchart: Mermaid-style outer-quote stripping in node labels

Labels wrapped in `["..."]`, `("...")`, `{"..."}`, etc. now have the surrounding quotes stripped. Mermaid uses this convention to allow special chars (`]`, `<br/>`, etc.) inside labels.

### Added — Timeline: `section` keyword (Case E, partial)

New `section "Name"` keyword acts as a Mermaid-timeline-compatible alias for `track`, including bare-name form (`section Foo`) without trailing colon. Events follow the section header at any indentation level until the next `section`/`track`. Multi-`:`-separated rows and non-date row keys are deferred to a future release (require categorical-axis layout work).

### Preview

`preview/v04-fixes.html` exercises every fix above with side-by-side DSL + rendered SVG, plus before/after notes.

---

## [0.3.0] — 2026-04-29

### Added — State diagram (UML 2.5 / Harel statechart)

New diagram type `state` for behavior modeling. Implements a strict superset of [Mermaid `stateDiagram-v2`](https://mermaid.js.org/syntax/stateDiagram.html) syntax (every Mermaid example pastes in unchanged) plus UML 2.5 features Mermaid omits: `entry / exit / do` activities, full `trigger [guard] / action` transition labels, `terminate` and history pseudo-states, junction, choice (diamond), and Schematex-style block notes. Layout reuses the flowchart Sugiyama engine — Greedy-FAS cycle removal handles state-machine cycles, longest-path layering + barycenter crossing-min + Brandes-Köpf x-coords give clean composite-aware placement, and Manhattan routing detours around node bboxes. Default direction `TB` (matches Mermaid). Pseudo-state path-endpoint trimming so arrows land on the symbol perimeter, not the layout bbox edge. Composite-target transitions auto-redirect to the composite's initial pseudo-state (avoids Mermaid-incompatible phantom-node rendering).

### Added — P&ID (Piping & Instrumentation Diagram)

New diagram type `pid` for process-engineering documentation. ANSI/ISA-5.1-2009 instrument bubbles + ISO 10628-1:2014 equipment symbols. P0 MVP covers 22 process-equipment types (vessels, columns, heat exchangers, pumps, reactors, separators, flare, cooling tower), 7 valve types (gate, ball, globe, butterfly, check, control with diaphragm actuator, PSV with diagonal outlet + spring), 8 ISA-5.1 instrument-bubble variants (field/CR × discrete/shared/computer/PLC), 8 line types (process, pneumatic with tick marks, electric dashed, capillary dotted, software, mechanical, hydraulic), ISA letter-code tag parsing, auto-routed `measures` / `controls` signal lines, and Manhattan routing. Multi-row layouts, tee junctions, and crossing detection deferred to v0.4.

### Added — `state` and `pid` MCP / AI integration

Both new diagrams are registered in `DIAGRAM_REGISTRY` (consumed by the Schematex MCP server's `listDiagrams` / `getSyntax` tools), with full per-diagram syntax docs (`website/content/docs/state.mdx`, `pid.mdx`) compiled into the AI content bundle via `scripts/build-ai-content.mjs`. New domain cluster `behavior-modeling` introduced for state diagrams.

### Added — Ecomap: mesosystem edges (Bronfenbrenner 1979)

Edges connecting two non-center nodes are now tagged as **mesosystem** connections — Bronfenbrenner's bioecological extension to Hartman's 1978 ecomap. Each such edge gets a `data-mesosystem` attribute, a CSS class, and reduced opacity so the central client-system relationships remain the visual focus. Documentation updated in `docs/reference/02-ECOMAP-STANDARD.md`.

### Added — Circuit: W-prefixed wire IDs

`W1`, `W2`, … now parse as wire components in the netlist (extends the SPICE-style `PREFIX_MAP`). Common in EE textbooks (non-SPICE convention) — documented in `docs/reference/08-CIRCUIT-SCHEMATIC-STANDARD.md`.

### Fixed — Flowchart: `BT` / `RL` direction coordinate flip

`direction BT` and `direction RL` now correctly flip node and edge coordinates after layout, instead of leaving the diagram in the default TB/LR orientation. Cluster title padding is also swapped post-flip so subgraph titles render on the correct visual side. Three regression tests added.

---

## [0.2.5] — 2026-04-27

### Fixed — Flowchart: sequential subgraph right-drift

When all subgraphs occupy distinct, non-overlapping layer ranges (sequential topology), the lane-based x-coordinate algorithm would still activate and push each cluster into its own horizontal lane, causing the diagram to drift rightward with each additional subgraph. The fix: `hasOverlappingTopLevelClusters()` now detects sequential vs. parallel cluster topology; lane mode only activates when two or more top-level clusters genuinely overlap in layer range. Sequential layouts use Brandes-Köpf directly, keeping the spine straight and centered.

### Fixed — Flowchart: null-lane centering for parallel sibling clusters

In symmetric parallel layouts (e.g. two branches that fan out and rejoin), the spine nodes (Start / merge / Done) were placed in a "null lane" that was pushed to the far left or right depending on sort order. The fix: when the null lane has no layer overlap with any cluster (boundary-only) and sibling clusters exist, the null lane is reordered to the center of `laneOrder`, keeping the spine visually centered between the two branch clusters.

### Fixed — Flowchart: cluster bbox vertical overlap

When three or more sequential clusters were stacked top-to-bottom, the fixed `layerSpacingY: 56` gap between layers was insufficient. Each cluster requires `pad (24) + titleH (20)` of extra clearance at its entry/exit boundary (≥ 80 px total for a back-to-back pair), but the fixed gap only allocated 56 px. The fix: `layerGapAt(li)` computes a per-boundary minimum based on which clusters enter and exit at that boundary, using shared `CLUSTER_GEO` constants, and `Math.max(layerSpacingY, required)` ensures the stricter requirement wins.

### Fixed — Flowchart: parallelogram/trapezoid text overflow

The parallelogram and trapezoid shapes narrow at the sides by `slant` pixels on each edge, but node sizing was using the same inset formula as a rectangle, causing long labels to overflow the slanted boundary. The fix: `sizeOf()` now adds `2 × SHAPE_SLANT + 8` extra horizontal padding for parallelogram and trapezoid shapes. The `SHAPE_SLANT` constant (`{ parallelogram: 20, trapezoid: 16 }`) is shared between `layout.ts` and `shapes.ts` to keep geometry consistent.

### Added — Flowchart: CJK-aware label width measurement

`measureLabelWidth(label)` replaces the previous `label.length * charWidth` approximation. It iterates codepoints and applies `cjkCharWidth: 12.5` for full-width characters (CJK Unified, CJK Extension A/B, Hangul, Katakana, Hiragana, Fullwidth Forms, and astral CJK blocks) vs. `charWidth: 6.8` for all others. This ensures nodes containing traditional/simplified Chinese, Japanese, or Korean text are sized wide enough so glyphs do not overflow node boundaries. `maxLabelWidth` raised to 420 to accommodate long CJK labels.

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
