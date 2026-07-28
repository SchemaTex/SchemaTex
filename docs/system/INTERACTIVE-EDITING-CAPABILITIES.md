# Interactive editing capabilities

> Canonical implementation truth · 2026-07-18 Pacific Time
> Scope: direct editing inside an SVG preview. Every diagram remains editable through its DSL source even when canvas editing is unavailable.
>
> [中文版 / Chinese version](./INTERACTIVE-EDITING-CAPABILITIES.zh-CN.md)

## Safety boundary

Canvas editing is enabled only when that diagram's parser and renderer produce deterministic scene metadata. A visible string is not enough: every editable label must carry the exact parser-produced `SourceRange` for the authored token it will replace.

Schematex deliberately does not infer edit targets by comparing SVG text with quoted strings in the source. That approach is ambiguous when labels repeat, when a renderer sorts rows by a computed score, or when quoted config values resemble labels. An engine without native ranges is source-editable, not canvas-editable.

The current release has **21 parser-native canvas-editable diagram types**. **18** of them also expose a safe position model. The remaining 31 types render normally and remain editable in the DSL editor, but emit no canvas handles.

Pan, zoom, pinch, and fit are host-layer viewport capabilities shared by all 52 diagram types; they do not change any engine's parser, renderer, scene metadata, or DSL editing classification.

## Capability vocabulary

1. **Title edit** — double-click an authored title and replace its exact DSL token. Authored titles can also be dragged; the presentation position is stored as `pin @title x,y` in `@overrides`.
2. **Content edit** — double-click an authored label or structured field and replace its exact DSL token.
3. **Presentation drag** — move a stable semantic object and store a `pin <id> x,y` delta in `@overrides`.
4. **Native geometry edit** — drag a domain handle that rewrites an existing date, wave, coordinate, breadboard hole, furniture position, or room-size token.

Position values mean:

- **x/y** — free movement on both axes.
- **x only / y only** — movement is constrained because the other axis expresses hierarchy or order.
- **cross-axis** — x for top-to-bottom layouts and y for left-to-right layouts.
- **native handle** — the handle rewrites domain geometry; the object is not a generic free-floating node.

## Parser-native engines

| Diagram | Authored title | Canvas text/fields | Position editing | Connections and geometry | Important limits |
| --- | --- | --- | --- | --- | --- |
| Flowchart | Edit + x/y drag | Node and edge labels | Nodes: x/y via `@overrides` | Attached edges preview live and reroute on drop | Free movement can create overlaps |
| State | Edit + x/y drag | State and transition labels | States: cross-axis via `@overrides` | Orthogonal transitions remain attached | Pseudo states and generated labels are read-only |
| Sequence | Edit + x/y drag | Participant names and messages | Participants: x only via `@overrides` | Messages follow lifelines and remain horizontal | Message y/order is semantic |
| Org chart | Edit + x/y drag | Person/card names | Cards: x only via `@overrides` | Reporting lines remain orthogonal | Reporting depth is semantic |
| Circuit · positional | Edit + x/y drag | Explicit component labels and values | Explicit component IDs: x/y via `@overrides` | Authored wires reconnect on drop | Generated IDs stay protected |
| Circuit · netlist | Edit + x/y drag | Explicit `label=` and `value=` fields | SPICE component IDs: x/y via `@overrides` | Nets follow live and rerender as orthogonal segments | Component IDs and net names are identity |
| Floorplan | Edit + x/y drag | Room and furniture labels | Furniture: native x/y; simple rooms: size handles | Rewrites furniture coordinates or `size WxH` | Room bodies do not drag; multipart rooms have no single resize box |
| Evacuation | Edit + x/y drag | Room and furniture labels | Furniture: native x/y; simple rooms: size handles | Reuses floorplan-native coordinate edits | Safety signs, routes, and compliance annotations remain source-edited |
| Genogram | Edit + x/y drag | Explicit person labels | People: x only via `@overrides` | Partner, child, and household connectors follow live | Generation y-position is locked |
| Network | Edit + x/y drag | Device and authored link labels | Devices: x/y via `@overrides` | Topology links remain attached and reroute | Device IDs remain identity tokens |
| Decision tree | Edit + x/y drag | Questions and answers | None | Tree geometry remains automatic | Generated node IDs are not pinned |
| Fishbone | Edit + x/y drag | Effect, category, cause, and sub-cause text | None | Bone geometry remains automatic | Placement expresses hierarchy |
| ERD | Edit + x/y drag | Aliases, column names, and column types | Tables: cross-axis via `@overrides` | Relationships reroute orthogonally | Bare IDs/references are identity; edit aliases instead |
| UML class | Edit + x/y drag | Aliases, member names, and member types | Classes: cross-axis via `@overrides` | Relationships remain attached | Bare classifier IDs are identity |
| P&ID | Edit + x/y drag | Title only | Equipment/instruments: x/y via `@overrides` | Process and signal lines stay orthogonal | Tags are not canvas-text editable yet |
| FBD | Edit + x/y drag | Title only | Named blocks: y only via `@overrides` | IEC wires remain attached | Synthetic blocks and identifiers are read-only |
| Petri net | Edit + x/y drag | Title only | Places/transitions: cross-axis via `@overrides` | Arcs remain attached | IDs, markings, and weights are read-only |
| Timeline | Edit + x/y drag | Title only | Date/range handles: native x only | Rewrites authored dates | Handles require proportional scale |
| Timing | Edit + x/y drag | Title only | Wave boundaries: native x only | Resizes adjacent waveform runs | Only literal wave tokens have exact handles |
| Breadboard | Edit + x/y drag | Title only | On-board parts: native x/y, snapped to holes | Jumper wires follow component pins | Side-mounted parts and loose wire endpoints do not drag |
| Siteplan | Edit + x/y drag | Title only | Vertices and markers: native x/y | Rewrites exact coordinate pairs | Whole-shape translation and curves are not implemented |
| Mindmap | Root text acts as content, not a separate title | Authored Markdown headings/items | None | Hierarchy stays automatic | Generated IDs are unstable, so pins are disabled |

Flowchart, Circuit, and Floorplan each have multiple Playground specimens, so the test workspace contains 24 interactive specimens for these 21 diagram types.

## Source-editable only

These 30 engines currently emit no scene or `data-sx-*` edit hooks, even when `scene: true` is requested:

`ecomap`, `pedigree`, `phylo`, `sociogram`, `logic`, `blockdiagram`, `ladder`, `sld`, `entity`, `venn`, `matrix`, `bpmn`, `sfc`, `prisma`, `usecase`, `pert`, `faulttree`, `bowtie`, `eventtree`, `fmea`, `rbd`, `comparison`, `causalloop`, `markov`, `gitgraph`, `epc`, `idef0`, `threatmodel`, `welding`, and `playbook`.

This is an implementation backlog, not a claim that their authored text is inherently uneditable. They will move to the table above one engine at a time after their parsers expose exact ranges.

## Core safety invariants

- `scene` and SVG `data-sx-*` attributes exist only when `scene === true` and the plugin declares native scene support. Default `render()` output remains free of interactive attributes.
- Every editable label has a parser-produced `SourceRange`, an exact `expectedText` snapshot, and the source revision from which it was rendered.
- `setLabel` and `setPosition` reject a stale revision in core. `setLabel` additionally verifies that every target range still contains its expected authored text before writing.
- Missing range means missing edit capability. The UI never fabricates a handle for generated or unmatched output.
- Stable-ID drag writes only presentation deltas under `@overrides`; native geometry handles rewrite the original domain token.
- Connections preview during drag and are recomputed from semantic endpoints on drop. Engines that promise orthogonal routing remain horizontal/vertical after rerender.

The `expectedText` guard turns many stale-range failures into safe rejection, but it cannot disambiguate two identical strings by itself. Correctness comes from parser-native range provenance; the guard is defense in depth.

## Migration gate for another engine

Each engine is migrated in its own reviewable change. It must ship with:

1. parser-produced ranges for every advertised editable token;
2. renderer scene items and SVG hooks gated behind `scene === true`;
3. default-render zero-diff coverage;
4. edit → parse → render round-trip tests;
5. a duplicate-label test where render order differs from source order, when the engine can sort or reorder computed output;
6. browser coverage for the actual visible glyph/card and any supported drag axis.

FMEA, Pugh comparison, fault tree, and RBD are especially required to test repeated text under score/risk-based sorting before canvas editing can be enabled.

## Public APIs

The typed registry is `src/core/interactive-capabilities.ts` and is exported from `schematex`. `getInteractiveCapabilities(type)` returns empty `text` plus `position: "none"` for a source-only engine. `INTERACTIVE_CAPABILITIES` itself contains only the 20 shipped native engines.

The controlled React editor is exported from `schematex/react`; the low-level `attachInteraction()` and `attachViewport()` DOM adapters are available from `schematex/interactive`. AI and MCP callers should use the revision-guarded `inspectDiagram` → `applyDiagramEdits` flow rather than inventing offsets.

## Related documents

- Implementation specification: `CoCEO/schematex/impl/3.0-interactive-editing.md`
- First-principles classification and migration order: `docs/design/interactive-capability-audit.md`
- Regression tests: `tests/interactive/`
