# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.6.10] — 2026-06-02

### Fixed — P&ID layout quality: the 5 long-pending renderer tests now pass

Implemented (not skipped) the five P&ID visual-quality features written in v0.6.4 as acceptance tests and tracked in `docs/issues/06-pid-layout-quality.md`. The full suite is now green (was 100 files pass / 1 fail).

- **Minor-process line class** (`src/diagrams/pid/renderer.ts`): line types now map to explicit CSS classes — `process` → `lt-pid-process`, `process_minor` → `lt-pid-process-min` (was the unstyled `lt-pid-process-minor`).
- **No-fill guard class**: every line `<path>` now carries a shared `lt-pid-line-path` class (with `.lt-pid-line-path { fill: none; }`), so no line can inherit a fill.
- **Z-order layering**: render split into ordered groups — process pipes (`lt-pid-process-lines`) behind equipment (`lt-pid-equipment`), with signal lines (`lt-pid-signal-lines`) + instruments above.
- **Line-mounted instrument placement** (`src/diagrams/pid/layout.ts`): an instrument that `measures`/`controls` a *pipe* (not equipment) now anchors to that pipe's midpoint x instead of a fixed offset.
- **Instrument fan-out**: fixed the de-overlap sweep so 3+ instruments that collapse onto the same anchor (e.g. several on one vessel) all spread ≥40px apart — previously only the second one moved.

P&ID-engine-internal; no other engine touched. All 21 P&ID tests + the full 1140-test suite pass.

---

## [0.6.9] — 2026-06-01

### Added — LLM input recovery: code-fence stripping + abbreviated-header normalization (`src/core/api.ts`)

Two cross-engine `preprocess`/detection passes that recover the most common ways an LLM mangles otherwise-valid DSL, instead of returning "cannot detect diagram type" / a header parse error. Both are pure input rewrites — no per-engine grammar changed.

- **Markdown code-fence stripping.** Input wrapped in ```` ```mermaid … ``` ````, ```` ```schematex … ``` ````, or a bare ```` ``` … ``` ```` fence now has the fence lines removed before detection. Previously the opening fence line (` ```mermaid `) was read as the diagram header and the whole diagram failed to detect. A leading fence line and a trailing fence line are stripped independently, so a truncated artifact with only an opening fence is still recovered; unfenced input is untouched.
- **Abbreviated-header normalization.** Once the target engine is known, a first-token header that is a prefix (≥3 chars) of the resolved diagram type is rewritten to the canonical keyword — `flow`→`flowchart`, `org`→`orgchart`, `gen`→`genogram`, `ped`→`pedigree`, `seq`→`sequence`, `socio`→`sociogram`, `eco`→`ecomap`. Headerless grammars (mindmap's `# Title`), already-canonical headers, and unrelated first tokens (e.g. flowchart's alternate `graph` keyword) are left untouched.
- New test suite `tests/core/input-recovery.test.ts` (14 cases across fence stripping, abbreviation recovery, and the two combined).

### Added — Circuit ERC (electrical-rule check) expansion (`src/diagrams/circuit/lint.ts`)

The circuit `lint()` hook grew from the single under-specified-pin warning to a four-rule ERC pass. Every finding is **non-fatal** — the schematic still renders, the result is flagged `partial`, and the author gets an actionable message (degrade-not-reject).

- **`CIRCUIT_DUPLICATE_ID`** — a reference designator declared twice (silently overwrites a pinMap entry). Runs in both positional and netlist modes.
- **`CIRCUIT_NO_GROUND`** — the circuit has a source (`voltage_source` / `ac_source` / `battery` / `current_source`) but no ground reference anywhere; node voltages are undefined.
- **`CIRCUIT_FLOATING_NET`** — a net only one pin connects to (dangling node), excluding intentional single-terminal reference symbols (ground / vcc / port / label / test_point / no_connect / antenna) and auto no-connect padding.
- **`CIRCUIT_NET_TYPO`** — a dangling net whose name is one edit (Levenshtein) from a properly wired net (e.g. `vot` vs `vout`) — surfaced as a likely misspelled connection with a rename suggestion, in place of the generic floating-net warning.
- Connectivity rules (no-ground / floating / typo) run only in netlist mode, where the net graph is authoritative; duplicate-id runs in both. New tests in `tests/circuit/erc.test.ts` (12 cases).

---

## [0.6.8] — 2026-05-31

### Fixed — Block diagram: dangling output signals now render with label

- **`signal("label")` with no consumer** (only incoming edges, no outgoing) was silently dropped: the edge lost its label and the layout discarded it because the target had no anchor. Two fixes: the parser now applies the signal label to the surviving edge, and the layout synthesises a lightweight output-port anchor for any signal ID that is an edge target but not declared as a block/sum/port.
- **Compact height for pure-forward diagrams**: an unconditional `FWD_Y + 170` height floor overrode the natural canvas height even when there were no feedback rows, producing unnecessarily tall SVGs. The floor now applies only when at least one feedback row is present, reducing the canvas for simple diagrams.
- Fixes the last non-P&ID pre-existing test failure (`tests/blockdiagram/renderer.test.ts`). The 5 remaining P&ID test failures describe unimplemented layout features (z-order, instrument fan-out, `process_minor` CSS class) tracked in `docs/issues/06-pid-layout-quality.md`.

---

## [0.6.7] — 2026-05-31

### Fixed — Parser tolerance: degrade-not-reject for circuit / orgchart / mindmap

Three engines that hard-threw on common LLM input mistakes now degrade to a `status:"partial"` render with actionable diagnostics instead of returning an orange error card.

- **Circuit** (`src/diagrams/circuit/netlist.ts`): a multi-terminal component given fewer nets than its pin count (e.g. a 4-pin transformer given only 2 nets) no longer throws. Missing pins are padded with floating no-connect nets and the component is rendered; a `CIRCUIT_PIN_UNDERSPECIFIED` lint warning names the shortfall and gives a minimal correct example. New `lint()` hook in `circuit/index.ts`.
- **Orgchart** (`src/diagrams/orgchart/parser.ts`): unparseable lines are now skipped with an `ORGCHART_UNPARSEABLE_LINE` warning instead of aborting the whole chart. Edge-only (Mermaid-style) input (`CEO -> CTO`) synthesises implied nodes rather than throwing "unknown node" (`ORGCHART_IMPLIED_NODE`). Duplicate node ids keep the first declaration (`ORGCHART_DUPLICATE_ID`). New `lint()` hook in `orgchart/index.ts`.
- **Mindmap** (`src/diagrams/mindmap/parser.ts`): a missing `# Title` central topic is recovered — the first plain text line is adopted as the centre (`rootInferred:"line"`), or a "Mindmap" placeholder is inserted over top-level bullets (`rootInferred:"placeholder"`). The orphan-node throw is gone. New `lint()` hook in `mindmap/index.ts` surfaces a `MINDMAP_SYNTHESIZED_ROOT` warning.

### Fixed — `validateDsl` now surfaces `status` and `warnings`

- The return type of `validateDsl` is extended: `ok:true` results now carry `status: "valid" | "partial"` and `warnings: SchematexValidationError[]`, so upstream LLMs can see exactly what was recovered and self-correct rather than only seeing a binary pass/fail.

### Fixed — Circuit: 24 declared component types no longer render as `?box`

The following `CircuitComponentType` values were accepted by the parser but had no `SymbolDef`, causing a dashed `?type` placeholder in the output. Real IEC/IEEE-aligned glyphs have been added to `src/diagrams/circuit/symbols.ts`:

| Category | Types added |
|---|---|
| Passive variants | `varistor`, `fuse_slow`, `inductor_iron`, `inductor_ferrite`, `ferrite_bead` |
| Diode variants | `varactor`, `tvs_diode`, `bridge_rectifier` |
| Bipolar / power semis | `darlington_npn`, `darlington_pnp`, `nmos_depletion`, `igbt`, `scr`, `triac`, `diac` |
| Optoelectronics | `phototransistor`, `optocoupler` |
| Analog / IC | `schmitt_buffer`, `tri_state_buffer`, `instrumentation_amp`, `dc_dc_converter` |
| Switches & connectors | `switch_dpdt`, `oscilloscope`, `port` |

### Tests

- New test suites: `tests/mindmap/degradation.test.ts`, `tests/orgchart/degradation.test.ts`, `tests/circuit/degradation.test.ts` — 35 new passing tests covering degradation paths, lint warnings, and glyph coverage.
- Updated `tests/ai/tools.test.ts` to assert the new degradation contract (partial render + warnings) instead of the old hard-error expectation.

---

## [0.6.6] — 2026-05-30

### Added — Bowtie risk diagram engine (`bowtie`)

- **New `bowtie` engine** (`src/diagrams/bowtie/`) for CCPS / Energy Institute 2018 barrier-based risk management (IEC 31010 §B.4.6, ICAO Doc 9859) — the sibling of `faulttree` in the **Risk & Reliability** cluster. A central **top event** (the knot) with **threats** fanning in from the left through chains of **preventative barriers** and **consequences** fanning out to the right through chains of **mitigative barriers**, shaped like a bow tie. Spec: `38-BOWTIE-STANDARD.md`.
- **The differentiator is not computation** (bowtie is qualitative — no probability rollup) but a **rigid, correct-by-construction symmetric layout** that no general-purpose box-and-arrow tool produces, plus **structural validation of the CCPS/EI barrier rule set**: every threat must reach the top event through ≥ 1 barrier, every consequence must hang off it through ≥ 1 barrier, every escalation factor must attach to a named barrier — violations are *rejected* with plain-English errors, not silently drawn.
- **Full element vocabulary**: `hazard` header, `topevent` (green-disc knot), `threat` (orange), `prevent`/`mitigate` barriers (grey, chained, declaration-order = outer→inner), `consequence` (red), `escalation` factor (amber, drops below the barrier it degrades), escalation-factor `barrier`. Indentation-structured DSL mirroring the CCPS 7-step build; CJK quotes accepted.
- **Bespoke symmetric band model** (not the flowchart DAG engine): wings centred independently about the knot, centre-anchored barrier columns, escalation factors dropping into the whitespace below without breaking line symmetry. Theme: `BowtieTokens` (BowTieXP/bowtiemaster colour scheme in `default`, shape/border-based `monochrome` for regulator print, Catppuccin `dark`).

### Registered / docs / tests

- Registered across `DiagramType`, `src/core/api.ts`, `src/index.ts`, `src/ai/registry.ts`, `src/ai/profiles.ts`, `DIAGRAM_SINCE`, and `SYNTAX_KEYS`. Theme tokens in `src/core/theme.ts`. Icon `assets/icons/bowtie.svg`. Tests in `tests/bowtie/` (TC-1…TC-5: minimal / symmetric fan / defence-in-depth / escalation+EF-barrier / validation failures + CJK + determinism). Docs: `website/content/docs/bowtie.mdx`; examples: `bowtie-lpg-loss-of-containment.mdx`, `bowtie-working-at-height.mdx`, `bowtie-runway-excursion.mdx`, `bowtie-hot-work-fire.mdx`.

---

## [0.6.5] — 2026-05-30

### Added — Fault Tree Analysis engine (`faulttree`)

- **New `faulttree` engine** (`src/diagrams/faulttree/`) for NUREG-0492 / IEC 61025 fault tree analysis, opening a new **Risk & Reliability** cluster. Like `pert` and `petri`, the engine *computes the semantics*: it runs **MOCUS** (Fussell-Vesely 1972) to enumerate the **minimal cut sets** (with idempotence + absorption, so repeated/shared events are handled correctly) and the **top-event probability** (`prob: rare | mcub | exact`), then highlights the cut sets in red and single points of failure in the strongest red. Spec: `37-FAULT-TREE-STANDARD.md`.
- **Events**: `top` / `gate` (intermediate) rectangles, `basic` circles with `p:`, `undeveloped` diamonds, `house` events with `state: 0|1`, conditioning ellipses. **Gates**: `AND` (dome), `OR`/`XOR` (shield), `VOTING(k/n; …)`, `INHIBIT(x) if cond` (hexagon), `PAND(…) order: …`. Flat declaration wired by id (DAG-friendly); keyword `faulttree` (alias `fta`).
- **Deterministic tidy top-down layout** with content-sized event boxes; shared leaves duplicated (NUREG convention); cut-set boxes drawn behind nodes. Theme: `ReliabilityTokens` (coloured-house `default`, faithful black/white `monochrome`, Catppuccin `dark`).
- **Validation**: exactly-one-top, undefined-reference (named), cycle detection, probability range, VOTING bounds, conditioning-gate placement — all readable errors.

### Registered / docs / tests

- Registered across `DiagramType`, `src/core/api.ts`, `src/index.ts`, `src/ai/registry.ts` (new `risk-reliability` cluster), `src/ai/profiles.ts`, `DIAGRAM_SINCE`, and `SYNTAX_KEYS`. Theme tokens in `src/core/theme.ts`. Icon `assets/icons/faulttree.svg`. Tests in `tests/faulttree/` (TC-1…TC-5: AND/OR/absorption/voting+inhibit+house/exact-vs-rare + validation). Docs: `website/content/docs/faulttree.mdx`; examples: `faulttree-pump-redundancy.mdx`, `faulttree-repeated-event.mdx`, `faulttree-vessel-rupture.mdx`, `faulttree-water-overheating.mdx`.

---

## [0.6.4] — 2026-05-30

### Added — UML class diagram engine (`umlclass`)

- **New `umlclass` engine** (`src/diagrams/umlclass/`) for UML 2.5.1 §9–§11 class diagrams — the largest unfilled gap below Mermaid's `classDiagram`. Standard-correct adornments (hollow triangle → parent, filled diamond at the composite end), a **generalization-driven layered layout** (Sugiyama with dummy-node edge routing, so connectors never cross a box), and **tree-merged inheritance heads** (N children of one parent share one trunk + one triangle). Five classifier kinds, all six relationship kinds, visibility glyphs, multiplicity, roles, stereotypes. Spec: `36-UMLCLASS-STANDARD.md`.
- Accepts the Mermaid `classDiagram` header and glyph aliases for one-line migration (`<|--`, `*--`, `o--`, `-->`, `..>`, `..|>`, `--`, `..`).

### Added — `umlclass` packages/namespaces + Mermaid-compat member forms

- **Namespaces / packages**: `namespace Name { … }` renders a labelled containment frame (union + padding, C4-style). Dot-notation `namespace A.B.C` auto-creates parent packages; blocks nest syntactically; explicit `["Label"]` supported. A package-clustering pass keeps same-package classifiers contiguous so frames stay clean rectangles.
- **Mermaid member forms**: tilde-generics `List~int~` → `List<int>` (nested + on class names), single-line `Class : +member` / `Class : <<interface>>`, member classifiers `*` (abstract) / `$` (static), and space-return-type `getId() String`. A lone leading `~` stays the package-visibility glyph.
- **Single-line class bodies** (`class Foo { +a +b }`) now parse correctly (depth-aware member splitter).

### Registered / docs / tests

- Registered across `DiagramType`, `src/core/api.ts`, `src/index.ts`, `src/ai/registry.ts`, `src/ai/profiles.ts`, and `SYNTAX_KEYS`. Theme tokens (incl. package-frame tints) in `src/core/theme.ts`. Tests in `tests/umlclass/`. Docs: `website/content/docs/umlclass.mdx`; examples: `umlclass-shape-hierarchy.mdx`, `umlclass-order-model.mdx`, `umlclass-payment-strategy.mdx`, `umlclass-namespaces.mdx`, `umlclass-generics-mermaid.mdx`.

---

## [0.6.3] — 2026-05-29

### Changed — graceful degradation for the highest-failure industrial diagrams (`SLD`, `P&ID`, `logic gate`)

Theme: a single unrecognised type keyword used to throw and **blank the whole diagram** — the dominant production failure for these three families (130 `SLD`, 26 `P&ID`, 7 `logic gate` distinct prod failures). Two layers of fix, **no breaking changes** — all valid DSL renders exactly as before.

- **L1 — the generation profiles now teach the full controlled vocabulary.** `src/ai/profiles.ts` lists the complete equipment / node / gate-type enum for `SLD`, `P&ID`, and `logic gate` in each `prefer` block, so the LLM emits canonical names instead of inventing synonyms. Repair hints gained example mappings (e.g. `exchanger → hx_shell_tube`, `vessel_horizontal → vessel_h`). This is a vocabulary fix, not a hard-coded alias table.
- **L2 — an unknown type keyword no longer blanks the diagram.** When a parser hits an unrecognised node/equipment/gate **kind**, it keeps the element with an `"unknown"` sentinel + the original `rawType` token instead of throwing. The renderer draws a **visibly-flagged placeholder** (dashed box + `?` + the raw word, accent-coloured) so the output is never silently wrong, and the lint pass emits a non-fatal warning naming the bad token with a did-you-mean suggestion (`SLD_UNKNOWN_DEVICE` / `PID_UNKNOWN_EQUIP` / `LOGIC_UNKNOWN_GATE`). Genuine structural errors (duplicate ids, malformed syntax) stay fatal.
- **`P&ID` — modifier keywords degrade to a safe default** rather than a placeholder: an unknown line `type:` falls back to `process` and an unknown instrument category to `field_discrete`. The instrument-tag grammar was relaxed to accept dash-less tags (e.g. `inst PLC : cr_shared`).

### Tests

- Added `tests/{sld,pid,logic}/graceful-degradation.test.ts` (17 cases): no-throw parsing, `"unknown"` sentinel + `rawType` preservation, flagged-placeholder markers in the SVG, the three lint warning codes, modifier-default fallback, dash-less `P&ID` tags, and regression guards that fully-known diagrams stay `valid`.
- Updated `tests/regression/prod-report-2026-05-15.test.ts` and `tests/ai/tools.test.ts` to assert the new degrade-don't-throw contract.

---

## [0.6.2] — 2026-05-27

### Changed — Mermaid header compatibility for `sequence` and `erd`

Continues the 0.6.1 theme (align generation with the dominant Mermaid prior). Both parsers now accept their Mermaid dialect so an LLM can paste Mermaid in unchanged. **No breaking changes** — the native headers and semantics are untouched.

- **`sequence` — accepts the Mermaid `sequenceDiagram` header.** Under that header the arrow tokens take Mermaid meaning (`->>` synchronous call, `-->>` reply/return, `-)` async, plus `--)`/`--x`); under the native `sequence "Title"` header the long-standing Schematex meaning is preserved (`->>` = async), so existing documents are unaffected. `participant`/`actor`, `Note over A,B:`, activation suffixes, and `loop`/`alt`/`opt`/`par … end` work in both. Canonical profile now recommends `sequenceDiagram`.
- **`erd` — accepts the Mermaid `erDiagram` header.** Bare relationships (`CUSTOMER ||--o{ ORDER : places`, no `ref` keyword) auto-create their entities, and type-first entity blocks (`ORDER { int id PK }`, KEY ∈ PK/FK/UK) are parsed. The native `erd` header with `table NAME { name type PK }` + `ref …` is unchanged. Canonical profile now recommends `erDiagram`.

### Added — showcase examples

- `timing-clock-rle-shorthand` — synchronous bus read using the `clock N` and `rle <state>*<count>` shorthands (0.6.1 features).
- `circuit-pullup-orientation-hint` — netlist pull-up circuit demonstrating the `dir=` orientation hint (0.6.1 feature).

### Tests

- Added `tests/sequence/mermaid-compat.test.ts` and `tests/erd/mermaid-compat.test.ts` (header detection, Mermaid arrow/cardinality semantics, native-mode regression guards).

---

## [0.6.1] — 2026-05-27

### Changed — LLM-friendlier DSL for the highest-failure diagram types

Theme: cut LLM syntax-generation failures by shrinking the surface area each diagram requires, aligning with dominant priors (Mermaid / SPICE), and improving netlist auto-layout. **No breaking changes** — all existing DSL still parses; these are additive and canonical-path changes.

- **`circuit` — netlist is now the recommended generation path.** Canonical syntax (`src/ai/profiles.ts`) and docs lead with the SPICE-style netlist (`circuit "…" netlist`); the positional/cursor mode is reframed as hand-drawing only (it requires tracking a moving cursor across lines, the dominant LLM failure). Added an optional per-component orientation hint **`dir=right|left|up|down`** (Lcapy-style L2 control) that rotates a symbol without affecting connectivity.
- **`circuit` — netlist auto-layout compaction.** Two-pin components with one pin on ground are now recognised as **shunt legs** and dropped vertically beneath the node they tap; series / multi-pin components stay on a top spine row and spacing is tightened. Footprint: RC low-pass −36%, voltage divider −40%, common-emitter amp −32%; output now follows the conventional schematic idiom instead of one wide row.
- **`network` — minimal core keeps the cheap structural hints.** Canonical guidance is now: device + link skeleton **plus `layout:` / `tier:`** (recommended — they drive the hierarchy at near-zero cost). The verbose per-link annotations (`vlan:` / `port:` / speed / `trunk`) are demoted to "only when asked" — they don't affect layout and are the main source of generation errors.
- **`state` — Mermaid `stateDiagram-v2` is now the recommended header/form.** Aligns generation with the dominant training-data prior (`[*]` start/end, `-->` transitions). The native `state "…"` + `initial`/`final` form still works; the parser already accepted both.
- **`timing` — clock / run-length shorthands.** Added **`NAME: clock N [neg]`** (clock generator) and **`NAME: rle <state>*<count> …`** (run-length) so waveforms no longer require hand-counting characters; both compile to standard WaveDrom wave strings and auto-align length. Invalid wave states now name the offending character and suggest the shorthands.

### Docs

- Rewrote the canonical generation profiles (`src/ai/profiles.ts`), the per-diagram reference tutorials (`circuit`, `network`, `timing` mdx → regenerated `src/ai/_generated.ts`), and the standard specs (`06-TIMING`, `08-CIRCUIT`, `21-STATE`, `35-NETWORK`) to lead with the recommended LLM path.

### Tests

- Added `tests/circuit/autolayout.test.ts` (shunt-drop compaction, dir= override) and `tests/timing/parser.test.ts` (clock / rle / error messages). Full suite: **991 passing**.

---

## [0.6.0] — 2026-05-25

### Changed

- **`petri` reclassified into a new `concurrency` cluster** (was `behavior-modeling`), matching the type-system intent (`Concurrency / discrete-event formalism`) and the docs navigation. Petri nets model concurrent / distributed / asynchronous systems, so they now group on their own in the gallery's by-type view with a dedicated line-glyph.
- **Clearer registry taglines for `usecase` and `sequence`** — both now lead with purpose (what the diagram is *for*) before the feature list, matching the house definition style.

### Added — PERT / CPM network engine (`pert`)

- **New dedicated `pert` engine** (`src/diagrams/pert/`) implementing the activity-on-node / Precedence Diagramming Method per PMI PMBOK 7 + Moder 1983. Unlike every other text-DSL diagram tool, the engine **computes the schedule**: a forward pass + backward pass return Early/Late Start & Finish, total slack, project duration, and the critical path — the render is downstream of the computation. Spec: `32-PERT-STANDARD.md`.
- **Six-field activity box** (ES | Duration | EF / Name + id / LS | Slack | LF), the canonical Kerzner / Primavera P6 representation. Every computed field is mirrored onto `data-*` attributes.
- **Full PDM dependencies** — FS (default), SS, FF, SF — with integer/fractional lag (`after: A+2d`) and lead (`after: A SS-1`). Edge labels render the type + lag (`SS+1d`, `FF`); FS with zero lag stays unlabelled.
- **Three-point (PERT) estimation** — `duration: O/M/P` computes `te = (O+4M+P)/6` and variance `σ² = ((P−O)/6)²`; the project-level standard deviation over the critical path is reported in the footer.
- **Milestones** (`milestone` flag or `duration: 0`) as diamonds, optional Start/Finish **sentinels** (`show-sentinels: true`), and **swimlanes** (`lane: "…"`) that band the network by team/phase while keeping the same computed schedule.
- **Three layouts** — `network` (default; longest-path layering + barycenter ordering, critical path biased straight), `timescaled` (x ∝ ES, width ∝ duration, with a unit time axis and lane packing), and `aoa` (legacy activity-on-arrow: AON→event-graph conversion with auto-inserted dummy activities, numbered event circles, FS-only with a warning on SS/FF/SF/lag).
- **House-style palette** — soft blue is the resting state; red is reserved as the critical-path accent (border + name band + bold slack), never a full red wash.
- **Validation** — cycle detection, undefined/duplicate/self-referencing predecessors, three-point ordering (`O ≤ M ≤ P`), unit-suffix matching — all reported with the source line.
- Registered across `DiagramType`, `src/core/api.ts`, `src/index.ts`, `src/ai/registry.ts` (new `project-management` cluster), and `SYNTAX_KEYS`. 45 tests in `tests/pert/`. Docs: `website/content/docs/pert.mdx`; examples: `pert-product-launch.mdx`, `pert-swimlane-online-shop.mdx`, `pert-three-point-estimation.mdx`, `pert-migration-timescaled.mdx`, `pert-aoa-software-project.mdx`.

### Added — Petri net engine (`petri`)

- **New dedicated `petri` engine** (`src/diagrams/petri/`) for place/transition nets per Murata 1989 + ISO/IEC 15909-1. Like `pert`, the engine **computes the dynamics**: it validates the bipartite structure, applies a `fire:` sequence to the initial marking, and highlights which transitions are *enabled* in the resulting marking. Spec: `34-PETRINET-STANDARD.md`.
- **Places, transitions, and four arc types** — `place <id> *<tokens>` circles, `transition <id>` bars (immediate) or `timed rate: <λ>` boxes (GSPN), with standard `->`, inhibitor `-o`, read `--`, and reset `=>` arcs. Weighted arcs (`weight: n` / `*n`) and place `capacity:`.
- **Subclass detection** — source/sink, workflow-net (van der Aalst), state-machine, and marked-graph structures are recognised and noted in the SVG `<desc>`.
- **House-style palette** with green reserved for "enabled" and red for "inhibitor/dead"; faithful black-and-white Murata textbook look under `monochrome`. `layout: lr|tb` with cycle-removal back-edge routing.
- Registered across `DiagramType`, `src/core/api.ts`, `src/index.ts`, `src/ai/registry.ts`, and `SYNTAX_KEYS`. Tests in `tests/petri/`. Docs: `website/content/docs/petri.mdx`; examples: `petri-producer-consumer.mdx`, `petri-mutual-exclusion.mdx`, `petri-classic-net.mdx`, `petri-workflow-net.mdx`, `petri-fire-sequence.mdx`.

### Added — Network topology engine (`network`)

- **New dedicated `network` engine** (`src/diagrams/network/`) for IT / CCTV network topology with Cisco-convention device icons, typed links, subnets/VLANs, and topology-correct layout. Spec: `35-NETWORK-STANDARD.md`.
- **31 device kinds** (router, switch, l3switch, firewall, loadbalancer, ap, wlc, gateway, server, serverfarm, pc, laptop, mobile, ipphone, printer, storage, camera with `type: fixed|bullet|dome|ptz|turret`, nvr, dvr, poeswitch, encoder, monitor, internet/wan/cloud/pstn, lan, …) connected with `--` (undirected), `->` (directed), or `==` (LAG).
- **Rich link specs** after `:` — link type (fiber/wireless/serial/poe/vpn/lag), `trunk`/`access`, `vlan:`, speed, and `port: a>b`; each rendered with a distinct line style.
- **Physical + logical boundaries** — `site`/`rack` (solid) vs `subnet`/`vlan`/`zone`/`dmz` (dashed, tinted) nested blocks. Layouts `tiered` (default), `tree`, `star`, `ring`, `bus`, `mesh`, `spine-leaf`, `manual`. Validates VLAN range 1–4094 and device-IP-in-subnet-CIDR; never drops a device/port/link.
- Registered across `DiagramType`, `src/core/api.ts`, `src/index.ts`, `src/ai/registry.ts` (new `network-infrastructure` cluster), and `SYNTAX_KEYS`. Tests in `tests/network/`. Docs: `website/content/docs/network.mdx`; examples: `network-cctv-camera-network.mdx`, `network-enterprise-campus.mdx`, `network-spine-leaf-fabric.mdx`, `network-link-types.mdx`, `network-boundaries.mdx`.

---

## [0.5.2] — 2026-05-22

### Fixed — parser preview resilience

- **Preview surfaces stay visible when strict parsing or rendering fails.** New
  `renderPreview()`, `renderResult()`, and `parseResult()` APIs return
  diagnostic results across every registered diagram type instead of forcing
  AI/editor canvases to collapse into a blank result.
- **React, browser, and AI integrations use the non-blank preview boundary.**
  `<SchematexDiagram />`, browser preview helpers, and AI `renderDsl()` now
  preserve a diagnostic SVG while still reporting invalid DSL through
  structured diagnostics.
- **Circuit netlist explicit `type=` now owns pin order.** A component such as
  `M_X ... type=motor` no longer inherits MOSFET arity from its `M` ID prefix;
  canonical netlist pin order follows the selected symbol/type.
- **Docs cover strict versus preview APIs.** The README, reference overview,
  website API/getting-started/AI integration docs, and MCP README now describe
  the result and fallback contracts for preview consumers.

---

## [0.5.0] — 2026-05-19

### Added — PRISMA 2020 flow diagram engine (`prisma`)

- **New dedicated `prisma` engine** (`src/diagrams/prisma/`) implementing the PRISMA 2020 flow diagram (Page MJ et al., BMJ 2021;372:n71). Rigid four-row layout (Identification → Screening → Eligibility → Included) that is correct by construction — the author writes record counts and exclusion reasons; the layout, mandatory `n =` fields, and exclusion side-boxes are prescribed. Spec: `28-PRISMA-STANDARD.md`.
- **Single + dual pipeline.** `mode: 2020-single` (databases & registers only) and `mode: 2020-dual` (adds the "Identification via other methods" column, merged into Screening via a Y-junction). Auto-detects dual when an `other:` block is present.
- **Canonical column-group layout.** "Records removed before screening" is its own box in the right column; the orange/slate section header is an independent capsule bar spanning the column group (matrix-style), and the left Identification/Screening/Included stage bands are independent capsules that bracket the cards.
- **Vocabulary overlays.** `kind: scoping-review` (PRISMA-ScR — "sources of evidence"), `kind: ipd` (participants count), `kind: systematic-review` (default).
- **Optional previous-studies row** for updated reviews, **count-arithmetic validation** (`validate-counts: warn|strict|off`, default warn), and **top-N exclusion-reason aggregation** (top 7 + "Other (n = …)").
- Registered across `DiagramType`, `src/core/api.ts`, `src/index.ts`, `src/ai/registry.ts` (new `research` cluster), and `SYNTAX_KEYS`. 19 tests in `tests/prisma/`. Docs: `website/content/docs/prisma.mdx`; examples `prisma-systematic-review.mdx` + `prisma-dual-pipeline.mdx`.
- **Retired the flowchart-based PRISMA workaround.** `flowchart-prisma-systematic-review.mdx` is removed and `14-FLOWCHART-STANDARD.md §15.5` now points LLMs to the dedicated `prisma` engine instead of faking the layout with `subgraph` + `classDef`.

### Changed — Use Case diagram polish (`usecase`)

- **Unified actor anchor.** Every association line from an actor now fans out from a single anchor point (facing-side, torso height) instead of each line exiting the actor box at a different edge point — matching canonical UML rendering.
- **Aesthetic pass.** Soft blue tinted use-case ellipses, bold names, rounded stick-figure strokes, a quiet rounded subject boundary, and crisper dashed include/extend lines.
- Added `website/content/docs/usecase.mdx` (the syntax doc was registered in `SYNTAX_KEYS` but missing) and curated example MDX.

---

## [0.4.3] — 2026-05-16

### Fixed — production parser bugs from ChatDiagram 2026-05-15 report

- **Ladder `RES` reset coil now parses.** Rockwell / Allen-Bradley counter-reset
  was rejected as "unknown element type". Added to `LadderCoilType` and
  rendered with an inscribed `R` glyph.
- **Ladder element regex no longer breaks on parens inside quoted names.**
  `XIC(SENSOR, name="الحساس (صغير)")` previously failed because `[^)]*` stopped
  at the first inner `)`. Replaced with a balanced-paren scanner.
- **Ladder `rung N` accepts a trailing colon or none.** LLMs routinely omit it
  (no Mermaid analogue in their training data); the parser is now tolerant.
- **SLD residential vocabulary.** Added `mcb`, `mccb`, `rcd`, `rcbo`, `rccb`,
  `differential`, `diferencial`, `pia`, `iga`, `main_switch`, `isolator`,
  `disconnector`, `consumer_unit`, `distribution_board`, `panel`,
  `panelboard` as type aliases mapping to existing IEEE-315 primitives. Each
  alias preserves its original word as the visible label so REBT / BS 7671 /
  IEC 60364 diagrams read correctly.
- **Fishbone accepts implicit category headings.** Mermaid-mindmap-shaped
  input (`Content\n  - heavy hero image`) now parses without requiring the
  `category` keyword. Closes 13/13 fishbone errors in the production window.
- **Flowchart accepts Mermaid `:::className` inline class assignment.**
  `A[Start]:::myClass` now attaches `myClass` to node A, matching Mermaid
  semantics. The existing block-form `class A myClass` continues to work.
- **Pedigree / Ecomap accept `:mode` header suffix and report header
  errors with the offending text.** `pedigree:autosomal-dominant "Family X"`
  and `ecomap:strengths "Title"` now parse; the `:mode` value is stashed
  in `metadata.mode` for future renderer use.

### Added — Mermaid-compatibility scaffolding

- **YAML frontmatter title block.** `---\ntitle: My diagram\n---` at the top
  of any DSL is now recognized and merged into the diagram's title. Inline
  titles in the header line win on conflict.
- **Universal `%%` comment marker.** All parsers touched by this release
  (genogram, pedigree, ecomap, fishbone, ladder, sld, and flowchart) now skip
  Mermaid-style `%%` line comments before public diagram detection. Future
  releases will roll this out to the remaining engines.
- **"Did you mean…?" suggestions.** New `src/core/dsl-suggest.ts` returns
  unambiguous Levenshtein-distance-≤2 keyword suggestions. Wired into the
  ladder "unknown element type" and SLD "unknown node type" errors.
- **Engine-bug error telemetry.** `extractError()` now tags runtime errors
  (`ReferenceError`, `TypeError`, `RangeError`) with `[engine bug: …]` and
  attaches the first stack frame as `source`, distinguishing them from
  user-input parse errors. Motivated by the 92-occurrence
  `Cannot access 'x' before initialization` cluster in the production
  window, where the bare message gave us no way to act.

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
