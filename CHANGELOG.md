# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.4.1] — 2026-05-06

### Added — matrix `style: table` + new examples

- **`style: table` directive for matrix diagrams.** Flips any 2×2 or 3×3 quadrant diagram from scatter/bubble mode into a text-in-cell table layout — the canonical form for Eisenhower, Johari, Impact-Effort, and 9-box. Setting `style: table` automatically disables axis arrows, axis labels, grid lines, and the quadrant-annotation overlay; quadrant titles are instead rendered as cell-header text inside each cell, and multiple items for the same cell stack as a bullet list. Renderer gains three new CSS classes (`sx-matrix-cell-title`, `sx-matrix-cell-subtitle`, `sx-matrix-cell-item`) for theming.
- **`Q1`…`Q4` shorthand for 2×2 table mode.** Instead of `cell (col, row) label: "…"`, authors can write `Q2: "Ship hotfix"` — one line per item, repeating the key to stack items. Q1 = top-right, Q2 = top-left, Q3 = bottom-left, Q4 = bottom-right. Designed to match what LLMs naturally emit for Eisenhower-style prompts.
- **3×3 `style: table` support.** `renderQuadrantBackground` extended to cover 3×3 grids with a diagonal severity heatmap (green → amber → red, following the GE/McKinsey 9-box convention). `renderCellLabels` unified from a 3×3-only helper into a shared 2×2/3×3 path.
- **Four new example MDX files.** `matrix-eisenhower-week` (updated to table form), `matrix-impact-effort`, `matrix-johari-window`, and `matrix-9-box-talent` — each a canonical AI-grounding few-shot for LLM DSL generation. All four also added to `src/ai/_generated.ts`.
- **PRISMA 2020 flowchart example.** `flowchart-prisma-systematic-review.mdx` — canonical four-phase systematic-review flow (Identification → Screening → Eligibility → Included) using `subgraph`, `classDef excluded`, and per-box `(n = N)` counts. Added to `_generated.ts` and documented in `14-FLOWCHART-STANDARD.md §15.5` as the LLM grounding reference for "systematic review" / "meta-analysis" / "Cochrane review" prompts.
- **Examples-corpus AI grounding spec** (`docs/system/EXAMPLES-CORPUS-AI-GROUNDING.md`).

### Notes

These items were originally drafted into the 0.3.5 changelog entry but slipped past the 0.3.5 / 0.4.0 release boundaries; they ship for real in 0.4.1.

---

## [0.4.0] — 2026-05-05

This release adds **5 new diagram engines**, bringing Schematex to **27 diagram types** total.

### Added — ERD (Entity Relationship Diagram) v0.1 — crow's-foot notation

First engine in the new **Data modeling** cluster.

- **Full pipeline:** parser → layered LR/TB layout → tabular SVG renderer with crow's-foot endpoint glyphs (bar, open circle, foot, foot+circle).
- **DBML-compatible DSL:** `Table Name { col type PK FK -> X.y }` with Mermaid `}o--||` ASCII glyph aliases as input shorthand.
- **Automatic crow's-foot rendering:** endpoint cardinality symbols (`|`, `o`, `<`) read from relation glyphs and rendered per notation standard.
- **AI registry entry** under new `data-modeling` cluster with explicit disambiguation from the `entity` type (corporate ownership vs. database schema).
- **`erd` export**, syntax doc, 2 example MDX files (university schema, e-commerce schema).
- **Tests:** 23 unit tests (parser, layout, renderer, e2e).

**v0.1 deferred:** Chen notation, Barker notation, multi-schema diagrams.

### Added — Breadboard v0.1 — Fritzing-style component layout

- **Section-based DSL:** `board:` dimensions, `parts` with `@col-row` hole addressing, power-rail notation (`@+t8`), span placements, off-board MCU side placement.
- **Parts catalog:** resistors (auto color-bands from value), LED, capacitors, diode, button, DIP ICs, headers, MCU breakouts (Arduino Uno/Nano, ESP32, Raspberry Pi Pico), HC-SR04, DHT11/22, SSD1306 OLED, LCD 1602 I²C, rotary encoder, servo.
- **Cubic Bézier wire routing** with `via @coord` override; post-layout shift with copy-on-return fix for shared pin references.
- **Z-ordered renderer:** substrate + rails + trough + parts + wires, semantic SVG with CSS class hooks.
- **`breadboard` export**, syntax doc, 3 example MDX files (blink-LED, HC-SR04, ESP32 OLED).
- **Tests:** 16 unit tests + 5 fixture files.

### Added — BPMN v0.1 — OMG BPMN 2.0 business-process diagrams

- **Full pipeline:** parser → longest-path layered layout with DFS cycle-break → orthogonal Manhattan routing → SVG renderer.
- **Pools & lanes:** `pool "Name"` + `lane "Name"` for horizontal swimlane partitioning; black-box pools.
- **Events:** start · intermediate · end, with none / message / timer trigger variants; correct IEC-style circle glyphs.
- **Tasks:** plain tasks + 6 marker types (user / service / send / receive / manual / script) + collapsed subprocess.
- **Gateways:** XOR (×), OR (+), AND (×-filled), event-based.
- **Connectors:** sequence flow `-->`, message flow `--?`, association `--*`, default flow `~~>`.
- **Parser-side validation** of pool-boundary rules and default-flow constraints.
- **`bpmn` export**, syntax doc, example MDX files.
- **Tests:** full parser + renderer coverage.

**v0.1 deferred:** boundary events, expanded subprocesses, rare event triggers (cancel/signal/link/conditional/multiple), data objects.

### Added — FBD (Function Block Diagram) v0.1 — IEC 61131-3 §6.4

The second IEC 61131-3 visual language. FBD describes per-scan combinational logic as a network of rectangular function blocks wired left-to-right — the canonical form for REAL arithmetic, comparison chains, PID loops, and multi-input boolean logic that's unreadable in ladder.

- **Full pipeline:** parser → layered-DAG layout → SVG renderer. `fbd "Title"` keyword auto-detects.
- **40+ standard blocks** with correct IEC distinctive symbols: `&` (AND), `≥1` (OR), `=1` (XOR), `1` (BUF/NOT), `SR`, `RS`, `TON`, `TOF`, `CTU`, `CTD`, `ADD`, `SUB`, `MUL`, `DIV`, `MOD`, `LT`, `GT`, `LE`, `GE`, `EQ`, `NE`, `SEL`, `MUX`, `LIMIT`, `MOVE`, `BOOL_TO_INT`, and more.
- **Output negation bubbles** on NAND, NOR, XNOR, NOT (small circle on output port per IEC standard).
- **Wire data-type coloring:** BOOL = black, INT = blue, REAL = orange, TIME = magenta — follows TIA Portal convention.
- **Inline expression syntax:** `Out = OR(A, AND(B, ~C))` — nesting becomes sub-blocks automatically; no intermediate variable names needed.
- **Inline constants:** `LIMIT(MN: 0.0, IN: Sp, MX: 95.0)` — boxed yellow constants rendered at their port, no wire needed.
- **Negation prefix:** `~Signal` emits an inverted input bubble on the consuming port.
- **Instance-named notation:** `timer_1 TON(IN: Run, PT: T#5s)` — variable `timer_1.Q`/`timer_1.ET` referenced in downstream networks.
- **Multiple networks** per diagram, each with optional label.
- **Layered-DAG layout:** longest-path layering, per-layer y-packing, Manhattan 3-segment wire routing with column-offset spreading to avoid overlaps.
- **Lenient parser:** undeclared variables auto-declared as BOOL; cycle-safe layer assignment for feedback loops.
- **`fbd` export** in `package.json`, AI registry entry (`electrical-industrial` cluster), syntax doc, 3 example MDX files.
- **Tests:** 12 unit tests (parser × 8, renderer × 4).

**v0.1 deferred:** explicit `VAR_INPUT`/`VAR_OUTPUT` typed declarations, EN/ENO enable pins, formal structured-text expression parser, user-defined function blocks.

```
fbd "Motor seal-in latch"
var Start: bool
var Stop: bool
var Running: bool
network 0 "Seal-in latch":
  Running = OR(Start, AND(Running, NOT(Stop)))
```

### Added — SFC (Sequential Function Chart) v0.1 — IEC 61131-3 §6.5

The fifth IEC 61131-3 language — the only one that models *sequential* state. SFC is a PLC-native state machine: each step holds the active token, transitions fire on boolean conditions, and actions execute per-qualifier while their step is active.

- **Full pipeline:** parser → recursive-region layout → SVG renderer. `sfc "Title"` keyword auto-detects.
- **Steps:** `step S0 [initial]`, `step S1 [label: "Filling"]` — initial step renders with double border per IEC §6.5.1.2.
- **Transitions:** `transition from: S0 to: S1: StartBtn` — condition text rendered next to the horizontal bar.
- **Action blocks:** right-side action boxes with qualifier compartment (N/S/R/L/D/P/P0/P1/SD/DS/SL) + body text + optional time row (`D Mixer_Run T#10s`).
- **All 11 IEC action qualifiers** recognized and rendered with correct abbreviation.
- **Alternative branches (single bar):** `alt from: S_Pick:` / `branch [priority: N]:` / `merge_to: S_Ship` — OR-semantic, exactly one branch fires; priority numbers rendered near entry.
- **Simultaneous branches (double bar):** `sim from: S_Heat: TRUE` / `branch:` / `merge_to: S_Done: Cond` — AND-semantic, all branches run concurrently; double-line bars per IEC §6.5.4.
- **Jump arrows:** back-edge and non-adjacent transitions render as margin arrows alternating left/right with target label.
- **Strictly top-to-bottom layout** per IEC mandate; recursive bottom-up width sizing; top-down coordinate assignment.
- **`sfc` export** in `package.json`, AI registry entry, syntax doc, 3 example MDX files.
- **Tests:** 10 unit tests (parser × 6, renderer × 4).

**v0.1 deferred:** macro-step (§6.5.3), forced transitions, step-active monitoring tags, multiple simultaneous tokens.

```
sfc "Bottle Filling"
var StartBtn: bool
var TankLevel: real
step S0 [initial]
  N FillValve_Closed
step S1 [label: "Filling"]
  N FillValve_Open
step S2 [label: "Done"]
  N Confirm_Done
transition from: S0 to: S1: StartBtn
transition from: S1 to: S2: TankLevel >= 80.0
transition from: S2 to: S0: DoneBtn
```

### Added — infrastructure and docs

- **11 new example MDX files** covering ERD, Breadboard, BPMN, FBD, and SFC — all with industry context, complexity ratings, and `featured` flags.
- **5 new reference docs:** `docs/reference/23-FBD-STANDARD.md`, `24-SFC-STANDARD.md`, `25-ERD-STANDARD.md`, `26-BREADBOARD-STANDARD.md`, `27-BPMN-STANDARD.md`.
- **New Data modeling cluster** added to `docs/reference/00-OVERVIEW.md` and AI registry.
- **AI registry:** all 5 types in `src/ai/registry.ts`; syntax keys in `scripts/build-ai-content.mjs`; total AI-bundled syntax docs 27, examples 58.
- **Website nav (`meta.json`):** FBD and SFC added to Electrical & Industrial; ERD to Data modeling; Breadboard and BPMN to their respective sections.
- **Diagram count updated** to 27 across README, package.json, website homepage, gallery, and playground pages.
- **674 tests passing** (0 failures); typecheck and lint clean.

---

## [0.3.5] — 2026-05-04

### Fixed — production-audit findings (3 items)

Three parser bugs surfaced by ChatDiagram production data (2026-05-04 audit, ~370 parser errors / 14+ locales). Quality gate clean (587 tests pass, +27 new).

- **Logic parser: ref-before-decl now a warning, not a hard error.** When a gate references a signal that was never declared with `input`, the parser previously threw `Unknown signal "X" in gate Y`. It now auto-declares the signal as an input and appends a string to `ast.warnings`. Active-low markers (`~`) are preserved on auto-declared signals. This matches real production patterns where LLMs emit gate-first DSL without explicit `input` lines. `LogicGateInput` gains `autoDeclared?: boolean`; `LogicGateAST` gains `warnings?: string[]`.
- **Smart-quote support across all diagram header titles.** Eleven parsers extracted diagram titles with the regex `/"([^"]*)"/`, which rejected Unicode curly quotes and other locale-specific pairs used by non-English speakers. A new shared helper (`src/core/quotes.ts`) recognises `"…"` `'…'` `"…"` `'…'` `«…»` `「…」` `『…』` and `\"` / `\'` escape sequences. All header-title extraction in blockdiagram, circuit, entity, ladder, logic, orgchart, phylo, sld, sociogram, timing, and venn parsers now uses this helper.
- **Venn tokenizer: smart-quote support in title, set labels, region values, and comment stripping.** `parseTitleAndProps`, `parseConfigProps`, `splitTopLevelCommas`, and `parseValue` all updated to be quote-pair-aware. The `stripComment` helper now correctly skips over non-ASCII quote pairs (e.g. `«…»`) before looking for `#`. Fixes both the `unterminated quoted title` error and the `\"` escape robustness gap reported in Spanish-locale sessions.

---

## [0.3.4] — 2026-05-02

### Changed — background handling

SVG output is now background-agnostic. The diagram inherits whatever color
its host element provides, so the same SVG embeds cleanly in light pages,
dark canvases, and print PDFs without `!important` overrides.

- **Removed `background:` from inline `<style>` blocks** across all 19
  diagram renderers (genogram, ecomap, pedigree, phylo, sociogram, flowchart,
  circuit, logic, timing, ladder, sld, blockdiagram, entity, decisiontree,
  orgchart, venn, matrix, fishbone, timeline). Stroke / fill / text colors
  are unchanged — only the canvas fill is no longer baked in.
- **PNG export (`svgToPngBlob`) defaults to transparent.** Previously
  defaulted to `'white'`. Pass `{ background: 'white' }` (or any color) to
  keep the old behavior.
- **Dark theme requires a dark host wrapper.** When using `theme: "dark"`,
  wrap the SVG in a container with a dark background. README has an example.

No DSL changes. No layout changes. All 569 tests pass.

---

## [0.3.3] — 2026-05-01

### Fixed — production-audit findings (4 items)

Four contained fixes surfaced by ChatDiagram production audit 2026-05-01. Quality gate clean (570 tests pass, +1 new).

- **flowchart `linkStyle` now actually renders.** Parser already accepted `linkStyle 1,5,6 stroke:#ff0000,stroke-width:4px` but stored the result without applying it. Renderer now emits `data-edge-index="N"` per edge and emits matching CSS overrides. Multiple comma-separated indices supported per statement.
- **flowchart inline `<b>` / `<i>` in node labels.** `multilineText` previously stripped these tags. Now per-line segments inside `<b>...</b>` render with `font-weight=bold`; `<i>...</i>` with `font-style=italic`. Mid-line bolding works (`Foo <b>bar</b> baz`). Combines with existing `<br/>` line-break support.
- **circuit `Cannot infer type` error message rewrite.** Old: `Cannot infer type from id "X" — use type= override`. New message lists the valid SPICE prefixes (`R/C/L/D/V/I/Q/M/J/S/F/B/K/U/X/W/T`), gives an explicit `type=…` example using the user's id, and states the engine's scope (electrical schematics only — hydraulic/pneumatic prefixes like `EV*`, `BOMBA*`, `TANK*` are not supported).
- **genogram dual-union sibship regression test.** New test in `tests/genogram/layout.test.ts` covers the case where one shared parent has children with two different partners (Case F from the 2026-05-01 audit). Confirms the existing layout already groups offspring per-union with cross-union gap > 1.25× within-sibship gap. No layout change required — added as regression guard.

### Docs

- **flowchart standard:** `linkStyle` and `<b>/<i>` rows in the M1/M2/M3 implementation tracker now show ✅. EBNF grammar for `link_style` updated to accept comma-separated indices.
- **circuit standard:** prefix table now lists `T` (terminal_block). Ground-net regex matches the actual code (was documenting only 6 of the 11 supported aliases). Added explicit scope note that the engine is IEEE 315 / IEC 60617 electrical only — not ISO 1219 hydraulic/pneumatic.

---

## [0.3.2] — 2026-04-30

### Changed — Internal cleanup of v0.3.1 fixes

Code review revealed redundancy and noise in the v0.3.1 PR. No behavior changes; same test surface continues to pass.

- **circuit/netlist:** consolidated 4 separate ground-check codepaths (`GROUND_NETS` set, `isGroundNetName`, `GROUND_ID_PATTERN`, inline error-hint regex) into one `isGroundRef` helper. Trimmed redundant error-message hint that duplicated the auto-resolve branch.
- **timeline/parser:** removed unreachable `if` block (`startsWith("")` is always true) and its empty body. The block was also silently dropping the colon validation that previously existed for `track "Name":`.
- **react.tsx:** restored a concise inline comment explaining why `onError` is excluded from `useMemo` deps. Previous 3-line comment was self-contradictory ("no disable comment is needed" — written as a 3-line replacement for a 1-line disable comment).
- **eslint.config / orgchart / svg / circuit symbols / pedigree / blockdiagram / flowchart / genogram:** trimmed multi-line "story" comments down to single-line intent. Removed comments that re-narrated obvious code or self-referenced the audit PR.

### Renamed — Previous release

The release that landed on 2026-04-30 was tagged `v0.4.0` in error; SemVer-wise it's a fix release with two minor additions and should have been `v0.3.1`. The CHANGELOG entry has been renamed accordingly. The git tag `v0.4.0` remains for historical reference.

---

## [0.3.1] — 2026-04-30

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
