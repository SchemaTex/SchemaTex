# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.4] — 2026-07-27

### Fixed — LLM-generated DSL no longer fails on wrappers, valid names, labels, pins, or empty dates

Model output framing reached diagram parsers as if it were authored DSL, while several parsers maintained ASCII-only identifier checks and strict label boundaries. Valid multilingual diagrams and familiar hardware notation could therefore fail before layout, even when the intended result was unambiguous.

- **LLM wrappers are removed once, before every parser.** The shared preprocess pass strips Markdown fences, leaked `<artifact>` wrappers, Anthropic `function_calls` / `invoke` / `parameter` tags, and DeepSeek fullwidth-pipe control tokens. Clean DSL is byte-for-byte unchanged, source offsets remain stable, and legitimate angle-bracket syntax such as circuit `<ep>` endpoints survives.
- **One Unicode identifier contract.** Parsers that validate user-facing ids now share one grammar: a Unicode letter or underscore followed by Unicode letters, digits, combining marks, underscores, or hyphens. Arabic, Chinese, Hebrew, and accented Latin ids render without per-engine exceptions.
- **More tolerant flowchart labels.** Unquoted labels accept balanced parentheses, including nested function-style text. Ambiguous label syntax now recommends quoting the label; unsupported Mermaid-style `note for` statements remain errors but include a concrete rewrite.
- **Breadboard names match real pinouts.** Expanded Arduino Nano and Raspberry Pi Pico pin catalogs, plus aliases for common MCU and module notation such as `D2`, `A1`, and `pin1`. Side-placed grid modules such as servos receive a deterministic default coordinate, while genuinely unknown pins report the closest valid name.
- **Empty timeline values fail soft.** An entry such as `Tarea C :` renders as an undated event and emits a warning instead of rejecting the entire timeline.
- **Production regressions are executable fixtures.** Every reported error string is preserved verbatim, and a mechanical gate rewrites official examples with Arabic, Chinese, and Hebrew ids before reparsing them. Circuit, SLD, genogram, and ladder parser rules are unchanged. A 30-day production-message backtest projects 5,327 fewer fatal renders when consumers upgrade.

---

## [1.0.3] — 2026-07-27

### Fixed — `prisma` rejected any wholesale-indented block, and said the wrong thing about why

The PRISMA parser is indentation-significant, and it measured indent levels from the absolute left margin. A block indented as a whole — pasted out of a markdown fence, lifted from a JSX template literal, or emitted by a model that indents its entire answer — therefore failed on its very first line, with a message that pointed at the wrong thing.

- **Common leading margin is stripped before levels are measured.** Only relative indentation is meaningful, so a uniformly indented block now parses identically to the flat form at any margin width, including odd ones that are not multiples of the two-space level. Relative nesting is untouched.
- **The error names the real defect.** Indentation and keyword are now separate checks. The failure previously reported `first non-blank line must be "prisma", got "prisma"` — self-contradictory, because the message printed the trimmed text while the indent test was what actually failed — sending readers hunting for a typo that was not there. A header sitting deeper than its body now says exactly that.
- **`check-doc-dsls` validates the string the site renders.** The script read `initial={\`…\`}` straight out of the MDX source, while the MDX compiler hands the component that block with its common margin already removed. Nine `prisma` docs were consequently reported as broken for a condition that never reached a reader; the script now dedents the same way the compiler does.

---

## [1.0.2] — 2026-07-26

### Added — multi-floor plans and standards-aware evacuation diagrams

- **Multi-floor floorplans.** `floor N "Label"` sections assemble horizontal or vertical plates at one shared scale. Stair instance ids register across levels, infer `UP`/`DN`, warn above 0.1 m misalignment, and reject cross-floor references. Legacy level-0 single-floor SVG output remains byte-identical.
- **Evacuation mode.** `evacuation` / `escapeplan` is a first-class diagram type served by the floorplan engine. It adds 40 renderable ISO 7010 / NFPA 170 safety-sign variants, original 24×24 line art on semantic colour plates, orthogonal escape routes with chevrons, fire/smoke-door marks, a mandatory Tier-M legend, and evacuation-specific layer switching.
- **Compliance computation.** `iso`, `nfpa`, and `uae` profiles compute a conventional print scale and fixed-sheet symbol size for A2/A3/A4/Letter/Tabloid, then run all 13 ISO 23601 / NFPA 170 / UAE Civil Defence checks with standard-cited diagnostics. Monochrome remains renderable for diagnosis but is reported as non-compliant.
- **Launch surfaces.** Added six validated examples, nine-language evacuation docs, multi-floor sections in every floorplan locale, AI routing/profile coverage, gallery output, and the corrected ISO identities for emergency push/slide doors and F004/F006.

---

## [1.0.1] — 2026-07-24

### Added — host-layer viewport pan, zoom, pinch, and fit

- **Coordinate-safe viewport.** `attachViewport()` applies translate/scale to the SVG host rather than an inner SVG group, so `getScreenCTM()` keeps node dragging correct at every zoom level.
- **Gesture arbitration.** Blank-space drag pans, editable-node drag keeps moving the node, modifier-wheel and trackpad pinch zoom around the pointer, and a second touch semantically cancels an in-progress node drag before pinch begins.
- **React APIs.** `SchematexDiagram` and `InteractiveSchematexDiagram` accept opt-in `viewport`, `onViewportChange`, and `viewportRef` props. Existing markup and touch behavior remain unchanged when viewport is omitted.
- **Imperative controls.** Applications can call `zoomIn`, `zoomOut`, `zoomTo`, `panBy`, `fit`, `reset`, `getState`, and `setState` without adopting React or a third-party pan/zoom dependency.
- **Website proof.** Every full Playground preview uses the public viewport with application-owned fit and zoom controls, and the homepage's interactive showcase uses the safe modifier-wheel default; gallery cards and marketing thumbnails remain intentionally static.

---

## [1.0.0] — 2026-07-17

### Added — open-source interactive editor and AI-safe editing

- **Public React editor.** `InteractiveSchematexDiagram` is a controlled Client Component with WYSIWYG label editing, semantic drag constraints, live connector previews, selection callbacks, and preview-safe diagnostics. Applications retain ownership of DSL state, persistence, undo, and collaboration.
- **Parser-native Canvas capability contract.** Twenty engines expose deterministic authored text/field editing; 17 also support stable-ID drag or native geometry handles. The other 30 remain source-editable and renderable without guessed handles. A single typed registry drives SDK, website, and AI discovery.
- **AI and MCP editing.** Vercel AI SDK, local stdio MCP, and hosted Streamable HTTP MCP share eight tool manifests, including revision-guarded `inspectDiagram` and atomic `applyDiagramEdits`.
- **Editable website workspaces.** Full-size homepage, docs, example, and Playground render surfaces use the public editor. The Playground adds a searchable, grouped example rail covering published examples and a 53-specimen interactive test lab.
- **Developer documentation.** English and Simplified Chinese guides document React, Vanilla DOM, capability discovery, `@overrides`, native handles, and the AI-safe edit loop.
- **LLM discovery surfaces.** `schematex.js.org/llms.txt`, `llms-full.txt`, per-page `.md` mirrors, and a machine-readable interactive capability endpoint expose the same public contracts without requiring agents to scrape rendered HTML.

### Changed

- Package versions are now `schematex@1.0.0` and `@schematex/mcp@1.0.0`.
- The React bundle preserves its `"use client"` boundary for Next.js and other React Server Component consumers.
- The interactive React styling prop is finalized as `canvasClassName`: it names the inner host `<div>` that directly contains the generated SVG.
- Canvas writes now fail closed: core rejects stale source revisions and mismatched expected text, default renders contain no `data-sx-*` hooks, and non-native engines no longer use SVG/source text matching to infer edit ranges.

## [0.9.19] — 2026-07-09

### Fixed — readable, electrically correct household-lighting schematics

The generic circuit auto-layout treated small household AC circuits like arbitrary electronic netlists. That produced oversized rectangular return wires, crowded the mains-source label into the source symbol, and could represent a two-location stair light as ordinary SPST switches in series — a different circuit that cannot provide normal two-way control.

- **Household AC layout.** A source, protection/control chain, and lighting load now read left to right on the live conductor, with neutral returning on a clear lower rail instead of wrapping around the top of the page.
- **Correct two-way switching.** Two `switch_spdt` components sharing traveler nets render as facing changeover switches with separate parallel travelers. Either traveler declaration order is supported without creating an apparent crossing or short.
- **Clear labels.** Labels stay above horizontal symbols and to the right of vertical symbols, so `V_mains`, values, and reverse-facing switch labels no longer overlap wires, symbols, or the SVG edge.
- **Canonical lamp type.** `lamp` is now a first-class circuit component type; `type=lamp`, `type=light`, and `type=bulb` all select the lamp symbol. Household examples use `L1 ... type=lamp` rather than the misleading `RL1` designator.
- **Public guidance and examples.** The circuit reference, AI generation profile, README, all nine localized website docs, and two new gallery examples now teach the same L/N and SPDT-traveler conventions.

---

## [0.9.18] — 2026-07-09

### Fixed — `circuit` silently dropped unknown-type lines + rejected `;` comments (production failure)

Pulling a real failing MyMap production map (a home-wiring circuit edited over several turns) surfaced two `circuit` gaps that together turned a good first diagram into a near-empty one, while every validator reported success:

- **Positional mode silently dropped unrecognized component lines.** A model that wrote SPICE-style connectivity *without* the `netlist` header — e.g. `breaker CB1 (L L1) 16A`, `rcd RCD1 …`, `switch SW1 …` — had each unknown-type line silently discarded, rendering a schematic with almost nothing on it. Crucially `validateDsl` and `renderDsl` still returned `ok: true` with zero warnings, so no downstream check (in-loop `validateDsl`, or a caller's post-generation gate) could catch it. An identifier-led line whose head is not a known component type now raises `Unknown component type: "<x>"` with a hint to add the `netlist` header — matching the `id: type` colon form and every other diagram's unknown-kind handling. Known types and the netlist path are unchanged.
- **`;` comments hard-failed in netlist mode.** The grammar advertises "SPICE-style netlist", and `;` is SPICE's in-line comment marker, so models routinely write `; note` lines. These failed with `Invalid component id: ";"`. `;` is now stripped as a comment (full-line and trailing) in both netlist and positional circuit modes, alongside the existing `*`, `#`, and `%%` markers. `;` stays circuit-local — it is **not** promoted to a universal marker, because other diagram types (e.g. `network`) use `;` as a statement separator.

---

## [0.9.16] — 2026-07-09

### Fixed — `genogram` relationship + attribute gaps (top production failure)

`genogram` was the #1 remaining source of invalid artifacts in ChatDiagram production. Pulling the real failing DSL surfaced four gaps, all "the grammar advertises it / the model reasonably writes it, but the parser rejects it":

- **`~x~` divorced couple operator.** The grammar's keyword list and examples advertise `~x~` for divorce, but the parser only recognized the ASCII alias `-x-` — so `a ~x~ b` failed with `Unknown individual 'x~ b'`. This was the single most common genogram failure (Spanish, Hebrew, Chinese, English prompts alike). `~x~` is now accepted; `-x-` remains a valid alias.
- **Non-ASCII condition labels.** The `conditions: name(fill)` label was matched with an ASCII-only regex, so `hipertensión(full)` or `右側半癱(half-right)` failed with `Invalid condition format` even though the fill was valid. Labels may now be any Unicode text.
- **Status synonyms.** `stillbirth` → `stillborn`, plus `miscarried`/`aborted`/`died`/`dead` → their canonical tokens.
- **Bare age vs year.** A bare 1–3 digit number in `[...]` (e.g. `[male, 28]`) is now read as an age; a 4-digit number remains a birth year.

---

## [0.9.15] — 2026-07-08

### Fixed — the header line is optional when the diagram type is already known

When a caller passes `config.type` (always the case for an AI artifact whose `engine="…"` tag names the type), the leading header line is redundant — the type is already known. But every per-diagram parser still *required* it and hard-failed when it was missing. LLMs, having just declared the engine in the artifact tag, routinely omit the header and emit pure content (`CEO\n  VP Sales…`, `Customer ||--o{ Order…`), losing the whole diagram.

- **Header recovery.** When the type is forced and the body does not `detect()` as that type, the canonical header is prepended and kept **only if the result parses cleanly**. A genuinely malformed body (a real syntax error, an unsupported node form) still fails with its true error — recovery never masks it.
- **Dialect-aware.** erd recovers with `erDiagram` (the Mermaid crow's-foot dialect), not bare `erd` (which selects the native `table`/`ref` parser). Other engines use the bare type name.
- Headerless-by-design grammars (mindmap's `# Title`) already `detect()` true, so they short-circuit untouched. Applies uniformly to `parse`, `parseResult`, `render`, and `renderResult`.

### Fixed — `usecase` non-ASCII actor names + `network` device-kind synonyms

Two more gaps surfaced by ChatDiagram production evals across high-traffic engines.

- **`usecase` — non-ASCII auto-generated ids.** When an actor/use-case had no explicit `as <id>`, the synthetic id stripped every non-`[A-Za-z0-9_]` character to `_`. Korean actors (`순원`, `순장`) all collapsed to `__` and collided (`identifier '__' already declared`) — a recurring production failure for CJK use-case diagrams. Ids now preserve Unicode letters/digits, so non-ASCII names stay distinct.
- **`network` — device-kind synonyms.** Added common everyday aliases so a valid topology doesn't fail on a vocabulary gap: `webserver`/`mailserver`/`dns`/`dhcp`/`ntp`/`database`/`db`/`dbserver`/`vm`/`host`/`hypervisor`/`activedirectory`/`domaincontroller` → `server`, `desktop` → `pc`, `smartphone`/`tablet` → `mobile`, `accesspoint`/`wap` → `ap`, `hub`/`bridge`/`l2switch` → `switch`, `ngfw`/`utm` → `firewall`, `mfp` → `printer`.

---

## [0.9.14] — 2026-07-08

### Fixed — accept forms the model reasonably writes (`erd` titles, floorplan furniture synonyms)

Two more "advertised-but-rejected" gaps found via ChatDiagram production evals, in the same spirit as 0.9.13 — the parser rejected valid, standard-looking input a capable model naturally produces.

- **`erd` — `title:`/`direction:`/`notation:` under the Mermaid `erDiagram` header.** The native `erd` header already accepted these attributes, but the Mermaid `erDiagram` paste-compat path hard-failed on them (`Unrecognized erDiagram line: title: "…"`) — and it didn't even carry a title. A model that writes `erDiagram` + `title: "…"` (mixing the two dialects' most natural forms) lost the whole diagram. The `erDiagram` path now accepts the same header attributes and maps `title:` to the diagram title. Genuinely malformed lines (e.g. a trailing over-closing `}`) still throw.
- **`floorplan` — common furniture synonyms.** Added aliases for everyday words that map cleanly onto an existing type: `console-table`/`console`/`end-table` → `side-table`, `couch` → `sofa`, `settee` → `loveseat`, `tv-console`/`media-console`/`entertainment-center` → `tv-stand`, `refrigerator` → `fridge`, `cooktop`/`stovetop` → `stove`, `armoire` → `wardrobe`, `wc`/`water-closet` → `toilet`. A valid layout no longer fails on a vocabulary gap.

---

## [0.9.13] — 2026-07-08

### Fixed — consistent comment handling across all diagram types

Comment stripping was implemented ad-hoc inside each diagram's parser, so which marker counted as a comment was an accident of that diagram's lexer rather than a designed contract. A probe across all 50 types found no marker worked everywhere: `#` was accepted by 47/50 but is *content* in `mindmap`/`flowchart`/`gitgraph`; `%%` by only 29/50; `*` by 22/50. Driven by ChatDiagram production data — a model that faithfully wrote SPICE-style `*` comments to organize a `circuit` netlist had its entire diagram rejected with `Invalid component id: "*"`, because `circuit` advertises "SPICE-style netlist" but its parser only stripped `#`.

- **Universal `%%` comments.** Mermaid-style `%%` line and inline comments are now stripped once in the shared preprocess pass, so **every** diagram type accepts them regardless of its own lexer. `%%` never begins valid content in any schematex grammar, so this is collision-free; comment-only lines are blanked (not removed) so diagnostic line numbers stay stable.
- **`circuit` honors SPICE `*` comments.** A line whose first non-blank character is `*` is now treated as a full-line comment, matching the SPICE-style syntax the grammar advertises. `*` can never begin a valid component id, so this is unambiguous. (`#` inline comments continue to work.)
- **`stripLineComment(line, markers?)`** now takes an optional marker set (default `%%`/`//`/`#`, unchanged for existing callers); the shared pass narrows it to `%%` only, so `#`/`//` stay content where diagrams use them (e.g. `#` headings in `mindmap`).

Scope: this establishes the one universal marker and fixes the confirmed `circuit` advertised-vs-accepted bug. Folding each diagram's remaining native markers into a declared per-diagram policy is a follow-up. Added a conformance test that injects a `%%` comment into every diagram's bundled example and asserts it still validates.

---

## [0.9.12] — 2026-06-30

### Added — `siteplan`: parcel, road, driveway, and property-layout diagrams

A new Architecture & Space diagram type for presentation-grade site/plot sketches: real-estate listing materials, broker/developer proposal pages, and early parcel planning. Header aliases: `siteplan`, `plotplan`, `parcelmap`, and `propertymap`.

- **`siteplan` engine.** Added parser, layout, renderer, package export (`schematex/siteplan`), AI registry/profile entries, docs navigation, icon, tests, and reference standard ([52-SITEPLAN-STANDARD.md](docs/reference/52-SITEPLAN-STANDARD.md)).
- **DSL primitives.** Supports irregular `parcel` polygons, `structure` footprints, `parking`/`landscape`/`zone` polygons, `road`/`driveway`/`walkway`/`trail` paths, planning overlays (`frontage`, `setback`, `easement`, `fence`, `utility`, `boundary`), markers (`tree`, `car`, `pin`, `entry`, `hydrant`, `well`), `dim`, `callout`, `north`, `scale`, and `legend`.
- **Professional plan-sheet styling.** White sheet, heavy property lines, hatched building footprints, roofline hints, side-panel legend/north/scale, architectural dimension ticks, line-following labels, subdued roads, and plan-symbol trees.
- **Commercial parking/driveway language.** Driveways render as paved aisles with edge lines; commercial-width drive aisles add lane markings and directional arrows. Parking polygons use stall-striping style instead of generic hatch fills.
- **Website examples.** Added six published, featured examples: residential listing site plan, backyard landscape sketch, corner commercial site, mall parking lot concept, lifestyle center parking plan, and townhome infill concept, with rendered SVG/PNG previews under `examples/siteplan/`.

Scope boundary: `siteplan` is for listing/proposal/early-planning graphics. It is intentionally not CAD, survey-grade, permit-ready, civil engineering, grading/drainage, stall-count compliance, or 3D walkthrough output.

## [0.9.11] — 2026-06-29

### Added — user-feedback electrical layout hardening (`breadboard`, `sld`, `floorplan`, `circuit`)

Targeted release from ChatDiagram/UserSay production feedback: maker breadboard failures, professional SLD/consumer-unit requests, residential electrical floor plans, and control-cabinet layout prompts.

- **`breadboard` — pin aliases + common maker modules.** ESP32/Arduino endpoints now tolerate the names users actually type (`D22`/`IO22`/`22` for `GPIO22`, `5V`/`VBUS` for ESP32 `VIN`, `A4`/`A5` for `SDA`/`SCL`, potentiometer `A/WIPER/B`). Added `potentiometer`, `sensor vl53l0x`, `display tm1637`, and `module l298n`, plus ESP32-C3/S3 subtype aliases to the existing ESP32 footprint.
- **`sld` — first-class IEC residential distribution primitives.** `rcd`/`rcbo`/`rccb` now render as typed RCD devices instead of generic ground-fault symbols; `consumer_unit`/`distribution_board`/`panel` now render as consumer-unit symbols instead of industrial busbars. Breaker/RCD attrs (`curve`, `icn`, `rcd_type`, `sensitivity`) and structured cable attrs (`cable_csa`, `cable_length_m`, `cable_insulation`) are preserved and rendered.
- **`floorplan` — electrical fittings overlay.** Added room-relative overlay fixtures: `outlet`, `duplex-outlet`, `switch`, `light`, `ceiling-light`, `data-outlet`, `electrical-panel`, and `distribution-board`. Parser aliases cover common prompt words (`socket`, `receptacle`, `consumer-unit`, `section`), and `size N` now means square `N×N`.
- **`circuit` — control-cabinet / panel-layout MVP.** Positional mode now supports absolute `at=x,y` coordinates plus `enclosure`, `din_rail`, `wire_duct`, `plc`, `pilot_light`, `selector_switch`, and `emergency_stop`, so DIN-rail/control-panel front-layout prompts do not need to fall back to raw SVG.
- Updated reference docs, AI generation profiles, and regression tests across all four engines.

---

## [0.9.10] — 2026-06-26

### Fixed — AI generation context surfaced shipped capabilities (`floorplan`, `matrix`, `timing`)

No engine changes — this release fixes the **AI-facing prompt context** (`buildPromptContext` / generation-tier grammar cards + featured examples) so that already-shipped capabilities are actually discoverable by an LLM on the default path. Audit driven by ChatDiagram production data (wedding "plan de table" requests that fell back to comment-stuffing because the model never saw the feature).

- **`floorplan` — named seating charts.** The `seats "Alice" "Bob" …` clause (write occupant names onto auto-seated chairs — the difference between a venue plan and a seating chart) shipped in 0.9.x but was absent from the generation-tier grammar card and from every featured example, so the model couldn't emit it. Added `seats` to the `furniture` clause + a `prefer` bullet (with `plan de table` / 席次表 phrasing), and promoted **"Wedding seating chart — named guests"** to a featured example.
- **`matrix` — QFD / SIPOC / Punnett body grammar.** The three computational modes (`matrix qfd` House-of-Quality, `matrix sipoc`, `matrix punnett`) were named as headers but their **body syntax was missing** from the grammar card, and no QFD/SIPOC/Punnett example was featured — the model knew the modes existed but couldn't write a valid document. Added the `what:`/`how:`/`rel`/`roof`, `suppliers:/inputs:/process:/outputs:/customers:`, and `cross:`/`trait` grammar + inline forms + `prefer` guidance, and featured the **House of Quality**, **monohybrid Punnett**, and **SIPOC** examples.
- **`timing` — removed a phantom keyword.** The grammar card advertised `phase: FLOAT (0.0–1.0)`, which the timing engine never implemented — the model would emit it and the parse would fail. Removed.

---

## [0.9.8] — 2026-06-15

### Added — Comparison & decision-matrix engine (`comparison`)

One new engine for the highest-frequency "put things side by side and decide" request — five modes from a single unified DSL, opening the **Knowledge & Strategy** cluster. The header is `comparison "Title"` (aliases `tchart` / `pugh`); `mode:` selects the form.

- **`decision` / `pugh` — the computational centrepiece.** Stuart Pugh's controlled-convergence method (ASQ / Six-Sigma concept selection): each criterion carries a `weight:`, each option a numeric score, and **the engine computes** every option's weighted total Σ(weight × score), ranks them, highlights the winner, and shows **vs-datum deltas** against an optional `baseline:`. You never type the totals — getting a score wrong changes the computed winner. Same "engine computes the answer" stance as `pert` and `faulttree`.
- **`matrix`** — options × criteria comparison grid; cells take `yes` / `no` / `partial` marks (→ ✓ / ✗ / ~) or free text. A typo'd option name is flagged, not silently dropped.
- **`tchart` / `ychart`** — 2–N compare/contrast columns, rendered as **distinct rounded cards** with per-column coloured headers.
- **`pros-cons`** — green ✓ / red ✗ valence with pill headers and circular badges.
- **`double-bubble`** — the Thinking-Maps compare/contrast organizer: two side-coloured centres, shared traits in the middle tied to both, unique traits **fanned radially** around each centre.
- Distinct from [`matrix`](https://schematex.js.org/docs/matrix) (the 2×2 / BCG / quadrant engine that *positions* items on two axes) — `comparison` lays out a **table** and computes the decision.
- Unified keyword DSL (header aliases, pipe-form cells, mode inference, CJK quotes); `default` / `monochrome` / `dark` themes; semantic SVG (`data-diagram-type` / `data-mode` / `data-variant`). Validates the missing-column / no-option / wrong-mode / undeclared-option / out-of-set-baseline errors LLMs make.
- Reference standard ([51-COMPARISON-STANDARD.md](docs/reference/51-COMPARISON-STANDARD.md)), syntax docs, 3 worked website examples, 4 gallery SVGs, AI profile + registry entry, and a domain icon. 23 e2e tests covering the computation, tie-ranking, cell parsing, and per-mode validation.

Deferred: classic Pugh +/0/− symbol scoring, score-heat cell shading, normalised-percent view, and the other Thinking-Maps (bubble / brace / bridge).

---

## [0.9.7] — 2026-06-15

### Added — RBD time-dependent reliability R(t) + criticality importance

The reliability block diagram now models **reliability over a mission time**, not just static reliabilities — the way RBD is actually used in RAMS work.

- **`mission: <t>`** + a per-block failure distribution: `rate=λ` or `mtbf=N` (exponential, R(t) = e^(−λt)) or `weibull=β,η` (R(t) = e^(−(t/η)^β)). The engine evaluates R(t) per block and rolls it up exactly as for static reliabilities; the headline becomes `R(t=…) = …`. Constant `R=`/`p=` blocks still work and mix freely. A distribution with no `mission:` warns and falls back to the constant `R`. Keep `mission` and rates in consistent time units.
- **Criticality importance** `I_C(i) = Iᴮ(i)·(1−Rᵢ)/(1−R_sys)` for every block — derived cheaply from the existing Birnbaum computation.
- New worked example (pump station 1-year mission, MTBF + Weibull) + an R(t) section in the RBD docs.

Deferred: cold/warm standby redundancy with switch reliability (needs per-distribution treatment + identical-unit assumptions — a focused follow-up).

### Fixed — fault-tree top-event probability no longer collapses to `1`

A high `P(top)` such as `0.9999` rendered as `1`, hiding the nines that matter. The fault-tree renderer's inline `toPrecision(3)` was replaced with a shared `core/format.ts` `formatProbability()` (3 significant figures mid-range, scientific below `0.001`, escalating precision near 1 so a sub-1 value never shows as `1`) — the same near-1 rule already used for RBD's `R`. (#48)

---

## [0.9.6] — 2026-06-15

### Added — Gantt charts on the PERT engine (`gantt` / `layout: gantt`)

A real **Gantt chart** that *computes its own schedule*. It extends the existing PERT/CPM engine, so the bars are placed from the computed forward/backward pass (ES/EF) — you type **dependencies, not dates**, and the **critical path is drawn in red**. This is the gap a hand-placed Gantt (Mermaid) leaves open: Mermaid can't compute the critical path or auto-schedule from a dependency graph.

- **`gantt "Title"` header** (sugar for `pert` + `layout: gantt`), or `layout: gantt` on a `pert` document.
- **Calendar axis**: `start: YYYY-MM-DD` turns the axis into dates (omit for a numeric day-offset axis); `calendar: continuous` (default, spans weekends) or `calendar: 5day` (excludes Sat/Sun). Pure integer date arithmetic (days-from-civil) — deterministic, zero-dependency.
- **One row per task**, grouped into **sections** by `lane:`; off-critical-path bars drawn in the resting blue with their **slack** annotated, critical bars in red.
- **`progress: 60%`** completion overlays, **`milestone`** diamonds, dependency connectors, and an optional **`today: YYYY-MM-DD`** marker line.
- `default` / `monochrome` / `dark` themes. Semantic SVG (`data-id`/`data-es`/`data-ef`/`data-slack`/`data-critical`/`data-progress`).
- 2 worked examples (website relaunch, construction schedule) + gallery SVG + a Gantt section in the PERT docs; registry/profile updated so `gantt chart` routes here. No new diagram *type* — it's a PERT render mode, so the scheduler, validation, and tests are shared.

---

## [0.9.5] — 2026-06-15

### Added — `rbd`: reliability block diagram engine (50-RBD-STANDARD)

A **reliability block diagram** (IEC 61078) from a paragraph of success logic — the fifth member of the **Risk & Reliability** cluster and the success-space dual of the fault tree. Like the rest of the cluster, the engine **computes the answer**: it doesn't just draw blocks, it reduces the structure to a system reliability, ranks every block by importance, and finds the single points of failure.

- **Brace-nested success logic**: `series { … }`, `parallel { … }`, and `kofn k/n { … }` groups nest freely around `block ID "Label" R=0.99` leaves. Reliability is given as `R=0.99`, failure probability `p=0.01`, or a percentage `R=99%`. A bare top-level block list is treated as a series chain. CJK quotes welcome.
- **Computation is the differentiator**: system reliability by exact reduction (∏ for series, 1−∏(1−Rᵢ) for parallel, 2ⁿ state enumeration for k-of-n); **Birnbaum reliability importance** Iᴮ(i) = R_sys(Rᵢ=1) − R_sys(Rᵢ=0) for every block (the highest is the improvement target, accented); and **single-point-of-failure** detection (a block where R_sys(Rᵢ=0) = 0, drawn in red). High reliabilities keep their nines — the figure is never rounded up to "1".
- **Left-to-right layout**: recursive bounding-box packing — series chains wired end-to-end, parallel/k-of-n groups stacked on rails fanning out of a split node and back into a join node, bracketed by input/output terminals. k-of-n groups are labelled `k/n` at the join.
- **Shared risk-reliability palette**: neutral blocks, blue reliability numerals, red SPOF borders; `monochrome` falls back to border weight (regulator print), `dark` is the Catppuccin variant. Semantic SVG with `data-id`/`data-r`/`data-spof`/`data-critical`.
- **Validation, not silent failure**: k-of-n threshold clamped to `1..n`, reliability clamped to `0..1`, duplicate ids flagged, missing reliability surfaced as `n/a` (no invented number).
- Five worked examples (redundant server, dual-channel 1oo2, data-center Tier III, IEC 61511 SIF, fly-by-wire flight control) + full syntax doc + `50-RBD-STANDARD.md`.

---

## [0.9.4] — 2026-06-11

### Added — `playbook`: multi-sport tactics-board engine (49-SPORTS-PLAYBOOK-STANDARD)

A coach's play diagram from one paragraph of text, for the three biggest team sports — **American football** (X&O), **basketball** (half-court sets), and **soccer / association football** (team shapes & movement). Opens the new **Sports & Tactics** cluster. The notation is convention-not-statute, so Schematex takes the AFCA X&O convention + numbered route tree as the football baseline, the FIBA/NBA coaching legend as the basketball baseline, and the IFAB Law 1 pitch + tactics legend as the soccer baseline — and documents deviations.

- **One `SportModule` per sport, shared everything else**: parser, layout resolver, and renderer are sport-agnostic; each sport (`football.ts` / `basketball.ts` / `soccer.ts`) owns its coordinate model, formation/set roster, named-route + landmark resolution, field markings, and legend. A fourth sport is purely additive.
- **Three real coordinate models**: football in yards (offense attacking up, downfield = +y, ball at origin); basketball in feet (NBA half-court, baseline + hoop at top); soccer in metres (full IFAB 105 × 68 m pitch, attack toward +x, or `view half`).
- **Players by formation or by hand**: football `formation i-form|shotgun|spread|trips|empty|goal-line|wishbone|…` (+ strength), basketball `set horns|spread-pnr|5-out|1-4-low|box|…`, soccer `formation 4-3-3|4-4-2|4-2-3-1|3-5-2|…`; or place individuals with `player <id> <pos> at x,y label …` for set-pieces.
- **Movement verbs drawn in each sport's own line style** — and the pass-vs-run convention is *inverted* between sports, honoured rather than flattened: football `route` (route tree) / `run` / `handoff` / `pull` / `block` (solid routes, arrowheads, block T-bars) + dashed throws; basketball `pass` (dashed) / `cut` (solid) / `dribble` (wavy) / `screen` (T-bar) to named landmarks (rim, elbow, wing, corner); soccer `pass` (solid) / `run` (dashed) / `dribble` (wavy) / `shot` (double line). The rendered legend always matches the sport.
- **Standards-correct surfaces**: football field with 5-yard lines, NFL/NCAA hash marks (`hash nfl|college|none`), LOS, plus the end-zone band + gold goal line + goalposts in the red zone (`goal N`); basketball NBA half-court (lane, FT circle, restricted arc, three-point line, centre circle) on **light maple hardwood — never green**; soccer IFAB pitch (penalty/goal areas, penalty spots + arcs clipped outside the box, centre circle, 1 m corner arcs, goals). The shared renderer frames every surface with an out-of-bounds surround band + boundary line so no field bleeds off the canvas.
- **Defensive overlays**: football `cover-0/1/2/3/4/6` shells + `4-3/3-4/nickel/dime` fronts; basketball `man` + `zone-2-3/3-2/1-3-1`; soccer `low/mid/high` block lines.
- **Validation** of the LLM-real mistakes: unknown sport/formation/set/defense/named-route (with the valid set listed), moves referencing undeclared players, malformed coordinates / missing targets.
- **Theming**: `default` (broadcast green turf for the grass sports, maple hardwood for basketball, navy ink / red defense / gold accents), `monochrome` (print), `dark` (night turf / dim hardwood). **Soccer is daylight-only** — `theme: dark` falls back to the default pitch.
- **Surfaces**: 15 worked examples (5 per sport — Four Verticals, Mesh, Smash, Power O, Red-Zone Fade; Pick & Roll, Horns, Give & Go, Floppy, Backdoor; 4-3-3 Shape, Build-Up, Overlap, High Press, Counter-Attack), a docs page with playground, three README gallery heroes, a generation profile + registry entry under the new **Sports & Tactics** cluster.
- Deferred (documented in §11): more sports (hockey/lacrosse/futsal/rugby), animated/multi-frame plays, full defensive fits & blitz paths, set-piece preset libraries, pressing-trigger annotations, auto-spacing of overlapping labels.

---

## [0.9.3] — 2026-06-09

### Added — `floorplan`: floor plan / space layout engine (48-FLOORPLAN-STANDARD)

The highest-volume professional diagram request with no text-DSL engine anywhere — not in Mermaid (open request mermaid-js/mermaid#6134, unclaimed since 2024), not on npm. ChatDiagram production data (90 days): 455 chats name a floor plan / room layout / seating chart by title alone — classroom layouts 31%, wedding/event seating 23%, residential 17%, commercial 11%. Users arrive with dimensions ("Small House Floor Plan (7m x 3m)", "27-desk classroom"), which is exactly the declare-structure→engine-computes-geometry shape a DSL wants. Baselines: *Architectural Graphic Standards* (Ramsey & Sleeper) for symbols, US National CAD Standard v6 for annotation, banquet-industry capacity tables for defaults.

- **Rooms → walls, computed**: rectangular rooms with explicit dims chain via `right-of`/`below` (+ `align`/`offset`); adjacent rooms share an edge and their poché wall bands merge automatically. **L/T/U-shaped rooms** via `extend <room> at x,y size WxH` — a rect-union model that mirrors how professionals measure L-rooms (split into rectangles, sum), chosen over polygon vertices for LLM ergonomics; walls open along interior seams, the area reports as one number, the label centers on the largest part.
- **Openings hung on walls, not coordinates**: `door between A B at 50%` resolves the shared wall segment (multi-part aware) and positions along the overlap; wall-side form (`door hall west at 50%`) positions along the concatenated exterior segments. Door types single/double/sliding/pocket/**bifold**; window types fixed/**sliding/casement/bay** (bay draws the splayed projection); `opening` archways; openings clamp to their segment with a warning.
- **Stairs per drafting convention**: `stairs` / `stairs-l` / `stairs-u` / `spiral-stairs` — 0.28 m (11″) tread lines, direction arrow from the lowest tread with an `UP` label (item label overrides for `DN`), the 45° zigzag **cut-plane break line** with dashed treads beyond, blank landings; plus `elevator` and `column`.
- **93-symbol auto-seating furniture catalog** across seven demand clusters (residential incl. sectional/fireplace/grand piano/ceiling fan; kitchen/bath incl. dashed wall-cabinet & range-hood above-cut-plane conventions, double vanity, urinal; classroom/office incl. desk-l, lockers, filing; event/banquet; **retail/warehouse** `shelving`/`checkout`/`clothing-rack`/`fitting-room`/`pallet-rack`/`loading-dock`/`forklift`; **salon/gym** `salon-chair`/`shampoo-bowl`/`manicure-table`/`treadmill`/`weight-bench`/`power-rack`/`yoga-mat`; **site/outdoor** `tree`/`car`) — `round-table-8` *is* 8 countable chairs (60″ top), dining/banquet/conference tables seat both long edges at 0.65 m pitch, `manicure-table` seats client + technician, `row-chairs` places theater strips at 0.55 m. Arrays: `grid`/`row` with row-major `count` truncation (27 desks in a 5×6 grid drops the tail), `arc` for semicircle seating facing center.
- **The engine computes the annotations**: per-room areas (m² / sq ft) + total in `<desc>`, exterior dimension strings with architectural slash ticks, ft′in″ formatting under `unit ft`, optional `north` compass.
- **Validation tuned to real LLM failure modes** — errors (rendered as an error panel, each naming ids + a quantified fix direction): room overlap, door between non-adjacent rooms (with the measured gap), furniture outside its room or in an L-notch. Warnings: furniture collision via **oriented-box SAT** on **chair-ring envelopes** (exact under rotation — adjacent rotated chairs on a ceremony arc don't false-positive) with underlay exemptions (rug, dance-floor, yoga-mat, counter, island, wall-cabinet, range-hood, ceiling-fan); clamped openings. Every published example is regression-guarded to render with zero errors and zero collision warnings (`tests/floorplan/examples.test.ts`).
- **Theming**: light-only by design (a floor plan is paper notation — `dark` resolves to the default light theme); `monochrome` for print. Semantic SVG with `data-room` / `data-furniture` per element.
- **Surfaces**: `/icons` ships the full 93-symbol sheet rendered by the real engine; **18 worked examples** across residential, education, hospitality, and commercial work (apartment, 27-desk classroom, 120-guest wedding, 160 m² family home, bistro café, kindergarten, studio office, 96-seat lecture hall, semicircle garden ceremony, hotel banquet hall, cinema auditorium, open-plan office, computer lab, residential site plan, retail boutique, distribution warehouse, hair salon, fitness center); docs page with playground; generation profile + registry entry under the new **Architecture & Space** cluster.
- Deferred (documented in §8 with evidence): polygon-vertex rooms (45° walls fast-follow; curved walls are Pro-tier rarities — RPLAN's 80k real plans are fully axis-aligned), multi-floor linking, electrical-symbol overlay, auto-layout from adjacency constraints.

---

## [0.9.1] — 2026-06-09
Style-audit release: a full visual audit of all 45 families (code + rendered output) produced three tiers of fixes. Before/after for every item: `preview/style-audit-fixes.html`.

### Fixed — five renderer bugs visible in any gallery (P0)

- **Sociogram group colors actually render now.** The base `.schematex-sociogram-node` CSS rule set `fill`, which beats per-node `fill=""` presentation attributes by CSS specificity — every node painted accent-blue regardless of its group color, contradicting the legend (girls declared `#EF5350` rendered blue). Nodes now carry the generated `.schematex-sociogram-group-<id>` class (emitted after the base rule, so it wins); role classes (star/isolate/…) keep priority over group color.
- **Timing title no longer collides with the first waveform.** A `TITLE_H` band is reserved above the grid when `title` is set (and the title style moved from an inline `style=""` to the stylesheet, where it belongs).
- **Network labels are legible.** Device labels/sublabels and the new icon badges get a `paint-order: stroke` halo so the tiered layout's diagonal links no longer strike through them; the PoE/GW/VPN/×N badges moved from near-invisible `deviceAccent` (pale blue on white) to a haloed `subLabel` class; link annotations are placed by a candidate-position pass that clears device boxes (estimated at full text width via the new core text-metrics) and previously placed labels, degrading gracefully when the corridor is crowded.
- **QFD roof sits on the matrix again.** The HOW-label band was a fixed 130px, leaving a dead band between the correlation roof and short rotated labels; it is now sized from the actual painted extent of the longest label (`estimateTextWidth × sin 60°`), clamped 48–220px.
- **Ecomap fits and matches its legend.** The center circle grows to fit its label (was fixed r=50, overflowed by ~6+ chars); connection labels get halos, length-fitted backing rects (was fixed 80px), and the same clear-of-nodes candidate placement; legend swatches switched from solid color chips to WYSIWYG circles (9% tint fill + category-color stroke) matching the actual node rendering.

### Added — `src/core/text-metrics.ts` (P1)

Single text-width estimator for all layouts: char-class weighted sum (full-width CJK = 1.0 em — one Unicode rule for the whole library — narrow/wide Latin classes, bold + monospace factors). Replaces the five divergent per-family estimators as files are touched; matrix QFD, ecomap, and network already consume it. This is the overflow guard for LLM-generated CJK labels.

### Changed — one title style across every family (P1)

New `TITLE` token in `core/theme.ts` (16px / 700 / centered). Previously titles drifted per family — faulttree left-aligned, bowtie/erd/epc ~13px left, flowchart 600/14px centered, prisma 17px, decisiontree/orgchart weight 500, ladder/blockdiagram 15px, pid/state 600/14px. Sixteen families normalized to the house style (gallery pages no longer show three different title treatments side by side). FBD's monospace IEC header style is intentionally exempt.

**Centered on content, not canvas.** Six families (epc, bowtie, eventtree, faulttree, idef0, causalloop) draw the title *inside* a `translate(pad, pad)` content group but were centering it at `width / 2` (canvas center) — so the title landed one padding-width (~20px) right of the actual content. Fixed to `layout.width / 2` (content-area center); threatmodel got the matching fix for its untranslated root. **EPC layout** also reserved the back-edge routing margin (`BACK_MARGIN`) unconditionally, leaving a one-sided whitespace band on acyclic charts that pushed both content and title off-center — now only reserved when loop-back edges exist.

### Changed — BPMN, state, matrix, blockdiagram join the theme system (P2)

The four most-used families that still had hardcoded colors (no dark/monochrome at all) now resolve from `core/theme.ts` with all three presets:

- **`BpmnTokens`** — BPMN gets a *designed* default palette per the de-facto tool colour language (Camunda/Bizagio/Signavio): green start events, red end events, amber gateway diamonds with deep-amber glyphs, blue-tinted tasks, slate pools/flows — replacing the previous all-grey look. `monochrome` is the pure OMG-spec print stance; `dark` is Catppuccin.
- **`StateTokens`** — unifies the renderer's two hardcoded body blacks (#1a1a1a vs #2a2a2a) onto slate, keeps the conventional sticky-note yellow as a token, adds monochrome + dark.
- **`MatrixTokens`** — the entire quadrant/heatmap/correlation/SIPOC/QFD/Punnett stylesheet (≈90 hardcoded colors) is parameterised across ~26 semantic tokens; data palettes (category colors, heat ramp, quadrant tints) deliberately stay renderer-local since they encode data semantics that hold across themes.
- **`BlockTokens`** — role fills move from Material-Design tints onto the house Tailwind-100 tints (controller blue, sensor purple, actuator green, filter yellow, disturbance orange), aligning blockdiagram with flowchart/bpmn; monochrome + dark added.

All regenerated `examples/` SVGs reflect the new styling.

### Added — flowchart auto label wrapping

The long-standing layout TODO ("until line-wrapping lands") is in: node labels measuring wider than the new `FC_CONST.wrapLabelWidth` (260px ≈ 38 Latin / 20 full-width chars) are wrapped automatically instead of growing into a 420px single-line strip and overflowing the shape — the most-reported readability complaint from production flowcharts (truncated/overlapping labels on prose-style nodes).

- **`wrapLabel()`** (`src/diagrams/flowchart/layout.ts`) — greedy line breaking that prefers spaces (consumed at the break), treats every full-width glyph as a valid break point (spaceless CJK prose wraps cleanly), and hard-breaks unbreakable over-wide tokens (URLs, ids) rather than letting them overflow. Applied once at `layoutFlowchart` entry, so sizing, the existing multi-line height growth, and the renderer's `<tspan>` output all see the same wrapped text.
- **Deliberately conservative**: labels with explicit `<br/>`/`\n` breaks keep the author's line choices, and labels containing inline `<b>`/`<i>` markup pass through untouched (a styled span cannot be split across the per-line segment parser without breaking styling).
- `FC_CONST.maxLabelWidth` (420) is retained as the final clamp, but now only bites on unbreakable single tokens that survive wrapping.

### Fixed — circuit ERC: conventional rail/port names no longer flagged as floating

`CIRCUIT_FLOATING_NET` was the single largest source of spurious `partial` statuses in production (~3,300 reports in 14 days): textbook schematics deliberately leave supply rails and labeled I/O terminals as single-pin nets — opamp supply wiring is conventionally omitted (`vcc`/`vee` declared only on their sources) and the output node is labeled `out` and left open as a port.

- **`isConventionalOpenNet()`** (`src/diagrams/circuit/lint.ts`) — single-pin nets matching power-rail conventions (`vcc`/`vdd`/`vee`/`vss`/`vref`/… , voltage literals `+5V`/`3.3V`/`3V3`), I/O-port names (`in`/`out`/`vin`/`vout`, numbered variants, `_in`/`_out` compound suffixes like `pwm_in`), or header-broken-out serial/control pins (`sda1`, `tx`, `clk`, `rst`, …) now skip the floating-net and typo checks entirely. Such circuits validate `valid` instead of `partial`.
- Everything else keeps the full ERC: non-conventional dangling names (`base1`, `gate`) are still flagged, and the one-edit-away `CIRCUIT_NET_TYPO` detection is unchanged.

---

## [0.9.0] — 2026-06-05

### Added — LLM-emittable grammar cards: all 45 families hardened + single-shot context (PR #35)

The AI-emittability layer (`schematex/ai`) is now the deliberate first-shot generation surface, not just a syntax dump. Every diagram family carries a complete "grammar card" and the package can assemble an inject-ready prompt in one call.

- **`buildPromptContext(type, opts?)`** — new export. Assembles the canonical grammar card + featured worked examples into a single inject-ready string (one call instead of separate `getSyntax` + `getExamples`). Options: `examples` (default 2), `detail`, `preferFeatured`, `maxComplexity`.
- **All 45 grammar cards hardened** to a uniform bar: concrete `forms`, ≥3 `prefer`/`avoid` hints naming real tokens, and a new compact `keywords` line enumerating each family's full vocabulary. Cards that taught syntax the parser rejects were corrected (e.g. SFC `transition from:/to:`, blockdiagram auto-created ids).
- **Error-matched repair hints** — `repairHint()` now matches the actual validator diagnostic to the repair entry whose quoted error fragment fits, instead of always returning the first entry. When nothing matches, it no longer attaches a misleading hint — the raw error (already shown) plus a re-validate instruction stands on its own. Repair entries are authored as `'<real error message>' -> <fix>`.
- **Profile-completeness gate** (`tests/ai/profile-completeness.test.ts`) — a scorecard that scores every family's card across forms/prefer/avoid/repair/examples + featured + core-construct coverage, and hard-fails if any shipped example does not `validateDsl` green. Keeps card quality from drifting as families are added.

---

## [0.8.3] — 2026-06-03

### Added — diagram `aliases` + `keywords` discoverability metadata (first installment)

Two new optional fields on `DiagramMeta` (`src/ai/registry.ts`) capture the industry terminology each diagram type is searched for under, as structured data instead of prose buried in doc bodies. `aliases` are other *names* the same diagram goes by ("single-line diagram" → `sld`, "cap table" → `entity`); `keywords` are use-case / industry / standard search terms that are not names ("PLC programming", "M&A due diligence"). This is the single source the internal diagram index, on-page "Also known as" lines, SEO metadata, and LLM type routing will all generate from.

- **Populated** for the nine diagram types added since 0.7.0 — `eventtree`, `fmea`, `causalloop`, `markov`, `gitgraph`, `epc`, `idef0`, `threatmodel`, `welding`. The remaining types are tracked for the next installment.
- **`listDiagrams()`** (`src/ai/tools.ts`) now returns `aliases` / `keywords` when present, so the LLM can map a request like "draw a STRIDE diagram" or "焊接符号" to the right type.

### Fixed — docs navigation drift: 9 diagram pages were unreachable

`website/content/docs/meta.json` had not been updated when the Bucket B engines and `welding` shipped, so `eventtree`, `fmea`, `causalloop`, `markov`, `gitgraph`, `epc`, `idef0`, `threatmodel`, and `welding` had live doc pages that were absent from the sidebar (reachable only by guessing the URL). All nine are now linked under their domain sections.

---

## [0.8.2] — 2026-06-03

### Fixed — entity `cluster [members: [...]]` no longer fails to parse

The entity-structure grouping primitive `cluster "Name" [members: [id1, id2]]` could not be parsed: any cluster with a `members` list threw `Cannot parse line`. Only `cluster "Name"` (empty) and `cluster "Name" [color: "..."]` (no nested array) worked.

- **Root cause** (`src/diagrams/entity/parser.ts`): the attribute-block regex captured the bracket body with `[^\]]*`, which stops at the *first* `]`. Because `members: [a, b]` contains its own `]`, the match terminated early, the outer bracket never closed, and the whole line fell through to the parse error. The capture now tolerates one level of nested `[...]`, so the members array no longer truncates the attribute block. The downstream `parseProps` / `parseIdList` helpers already handled nesting correctly — only the line-level extraction was broken.
- **Tests** (`tests/entity/parser.test.ts`, new): the entity engine previously had no parser tests. Added regression coverage for empty / bracketed-members / members+color / color-only clusters, plus an end-to-end render assertion that members actually produce a grouping box.

### Changed

- **AI discoverability** (`src/ai/profiles.ts`): the entity generation profile now lists the `cluster` form and states that `members` must be a bracketed list, so `getSyntax("entity")` surfaces grouping to the model instead of leaving it to guess Mermaid-style `subgraph`.
- **Docs** (`docs/reference/12-ENTITY-STRUCTURE-STANDARD.md`): the §5.3 mixed-jurisdiction cluster example used the un-bracketed `members: a, b` form, which contradicts the EBNF grammar (`"members:" "[" ID_LIST "]"`) and is not parseable. Corrected to the bracketed form.

---

## [0.8.1] — 2026-06-03

### Added — `welding` diagram engine (AWS A2.4 / ISO 2553)

A new `DiagramType` for welding-symbol callouts — the only gap in the ⚡ Electrical & Industrial cluster, next to circuit / ladder / SLD. A welding symbol is a fixed-skeleton glyph system (reference line + leader arrow to the joint + weld glyphs snapped above/below with dimensions in fixed slots), so it renders deterministically with no graph layout.

- **`welding`** — full glyph catalog (16 types: fillet · square / V / bevel / U / J / flare-V / flare-bevel grooves · plug · slot · spot · seam · back · backing · surfacing · edge), drawn as original line-art. Dimension slots — size, throat `(E)`, length, length-pitch, count×length, groove angle, root opening. Supplementary symbols — weld-all-around circle, field-weld flag, tail process/spec/NDE, contour (flush / convex / concave) + finish letter. AWS A2.4 single reference line, ISO 2553 System A (solid + dashed dual line, inverted side convention) and System B; arrow / other / `both:` sides; multi-joint vertical stacking. The structural differentiator: AI-readable validation of illegal type/side/dimension combinations (a fillet needs `size`, `angle` is groove-only, `pitch` needs `length`, surfacing is arrow-side only).

Standard documented in `docs/reference/47-WELDING-SYMBOL-STANDARD.md`; syntax tutorial in `website/content/docs/welding.mdx`; gallery example + static SVG in `examples/welding/`. AI bundle now ships 45 syntax docs.

### Added — `matrix → punnett` mode (Mendelian genetics)

A sixth mode on the existing `matrix` engine (no new `DiagramType`). The engine computes the genetics: from two parental genotypes it derives the gametes, the offspring grid, and the genotype + phenotype ratios.

- **matrix → `punnett`** — `cross: Bb x Bb` with allele-case dominance and optional `trait` phenotype names. Computes the canonical ratios — monohybrid **3:1**, dihybrid **9:3:3:1** — reduced to lowest terms, with each box tinted by phenotype class. Mono / di / trihybrid (2×2 / 4×4 / 8×8). Three gallery examples: monohybrid (3:1), test cross (1:1), and dihybrid (9:3:3:1).

---

## [0.8.0] — 2026-06-03

### Added — Bucket B: 8 new diagram engines

Eight new `DiagramType`s, each a full engine (parser + layout + renderer + tests) built against its published-standard reference imagery, wired into the registry, plugin list, AI generation profiles, and LLM syntax docs.

- **`eventtree`** — Event Tree Analysis (IEC 62502 / NUREG). Header function columns, success-up/failure-down pruned tree; the engine computes each outcome's path frequency = initiating freq × Π branch probabilities.
- **`fmea`** — Failure Mode and Effects Analysis (AIAG-VDA / IEC 60812 / SAE J1739). The engine computes RPN = S×O×D and the AIAG-VDA Action Priority, ranks the sheet, and colour-fills the RPN/AP cells by risk. Schematex's first table-shaped diagram.
- **`causalloop`** — Causal Loop Diagram (Sterman system dynamics). Signed links; the engine detects feedback loops and classifies each reinforcing (R) / balancing (B) by negative-link parity.
- **`markov`** — Discrete-time Markov chain. The engine computes the stationary distribution (power iteration) and classifies states recurrent/transient/absorbing; absorbing states render with a double ring.
- **`gitgraph`** — Git commit graph, Mermaid `gitGraph`-compatible. Per-branch swimlanes, hollow merge commits, open-square HIGHLIGHT, branch pills + tags, cherry-pick.
- **`epc`** — Event-driven Process Chain (ARIS). Red-hexagon events / green-rounded-rect functions / ∧∨× connectors; the engine validates event↔function alternation (an event cannot be the source of an OR/XOR split).
- **`idef0`** — IDEF0 function model (FIPS PUB 183). ICOM arrow placement (Input-left / Control-top / Output-right / Mechanism-bottom), diagonal box staircase, node numbering; the engine enforces ICOM sides.
- **`threatmodel`** — DFD + STRIDE threat model (Shostack). Per-element STRIDE mapping (data-store Repudiation conditional on log/audit stores) and trust-boundary-crossing detection. Includes the DFD base notation.

Reference standards documented in `docs/reference/39–46`; syntax tutorials in `website/content/docs/`; gallery examples in `website/content/examples/`. AI bundle now ships 44 syntax docs — all new types discoverable via `listDiagrams` / `getSyntax`.

---

## [0.7.0] — 2026-06-02

### Added — Bucket A: 4 engine-extension modes

New modes on existing engines (no new `DiagramType`), each shipped with docs + gallery examples + AI bundle coverage.

- **phylo → `dendrogram`** — merge-height (cophenetic) layout, rectangular elbows, height axis, and `cut <value>` flat-cluster slicing.
- **decisiontree → `influence`** — Howard & Matheson influence diagram: compact DAG with decision (rectangle) / chance (oval) / value (octagon) nodes and destination-derived arc semantics.
- **matrix → `sipoc` + `qfd`** — Six Sigma SIPOC table and the Akao House of Quality with a computed technical-importance row (Σ weight×strength) and a HOW×HOW diamond-cell correlation roof.
- **mindmap → `futureswheel` + `driver`** — Jerome Glenn concentric-ring consequence map and the IHI aim→drivers→change-ideas tree.

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
