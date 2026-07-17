# Interactive editing capabilities

> Canonical implementation truth · 2026-07-17 Pacific Time
> Scope: direct editing inside an SVG preview. Every diagram remains editable through its DSL source even when canvas editing is unavailable.
>
> [中文版 / Chinese version](./INTERACTIVE-EDITING-CAPABILITIES.zh-CN.md)

## How to read this document

Canvas editing is not one binary feature. Schematex exposes four independent capabilities:

1. **Title edit** — double-click an authored diagram title and replace its exact DSL token.
2. **Content edit** — double-click a visible authored label or structured field and replace its exact DSL token.
3. **Presentation drag** — move a stable semantic object; the position is stored in `@overrides` as `pin <id> x,y`.
4. **Native geometry edit** — move a domain-specific handle; the original date, wave, coordinate, hole, or dimension token is rewritten instead of creating an override.

“Double-click” applies to both the visible glyph and its owning node/card. A title is also freely draggable when it is an authored title. Title drag writes `pin @title x,y`; title rename changes the original quoted title.

Drag directions mean:

- **x/y** — free horizontal and vertical movement.
- **x only** — horizontal movement; vertical position still represents hierarchy or order.
- **y only** — vertical movement; horizontal position still represents hierarchy or order.
- **cross-axis** — x for top-to-bottom layouts, y for left-to-right layouts.
- **handle** — only the blue native geometry handle moves; the object body is not a generic draggable node.

## Currently implemented engines

| Diagram | Authored title | Canvas text/fields | Position editing | Connections and geometry | Important limits |
| --- | --- | --- | --- | --- | --- |
| Flowchart | Edit + x/y drag | Node labels and edge labels | Nodes: x/y via `@overrides` | Attached edges preview live and reroute on drop | Free movement may create overlaps; automatic layout remains the starting point |
| State | Edit + x/y drag | State labels and transition labels | States: cross-axis via `@overrides` | Orthogonal transitions remain attached and reroute | Pseudo states and generated labels are read-only |
| Sequence | Edit + x/y drag | Participant names and message text | Participants: x only via `@overrides` | Messages remain horizontal and follow lifelines | Message y/order is semantic and cannot be dragged |
| Org chart | Edit + x/y drag | Person/card names | Cards: x only via `@overrides` | Reporting lines remain orthogonal and attached | Reporting depth is semantic and cannot be changed by vertical drag |
| Circuit · positional | Edit + x/y drag | Explicit component labels and values | Explicit component IDs: x/y via `@overrides` | Authored wires reconnect after drop | Generated wire/component IDs are protected; positional wires do not promise full live routing during the gesture |
| Circuit · netlist | Edit + x/y drag | Explicit `label=` and `value=` fields | SPICE component IDs: x/y via `@overrides` | Routed nets follow live and are rebuilt as horizontal/vertical segments on drop | Component IDs and net names are identity, not editable labels |
| Floorplan | Edit + x/y drag | Room and furniture labels | Furniture: native x/y; simple rooms: east/south/corner size handles | Furniture coordinates or room `size WxH` are rewritten and the plan is revalidated | Room bodies do not drag; L-shaped/multipart rooms do not expose one bounding-box resize handle |
| Genogram | Edit + x/y drag | Authored person labels | People: x only via `@overrides` | Partner, child, and household connectors follow live | Generation y-position is semantic and locked |
| Network | Edit + x/y drag | Device labels and authored link labels | Devices: x/y via `@overrides` | Topology links remain attached and reroute live | Device IDs remain stable identity tokens |
| Decision tree | Edit + x/y drag | Questions and answers | None | Tree geometry remains automatic | Node IDs are generated; branch order/hierarchy controls placement |
| Fishbone | Edit + x/y drag | Effect, category, cause, and sub-cause text | None | Bone geometry remains automatic | Bone placement expresses hierarchy and is not independently draggable |
| ERD | Edit + x/y drag | Display aliases, column names, and column types | Tables: cross-axis via `@overrides` | Relationships remain orthogonal and reroute | Bare table IDs and references are identity tokens; edit a display alias instead |
| UML class | Edit + x/y drag | Display aliases, member names, and member types | Class boxes: cross-axis via `@overrides` | Relationships remain attached and reroute | Bare classifier IDs are identity tokens; stereotypes and relationship fields are not all exposed yet |
| P&ID | Edit + x/y drag | Title only | Equipment and instruments: x/y via `@overrides` | Process and signal lines remain orthogonal, follow live, and recompute from authored ports | Equipment tags, line tags, and instrument tags are not canvas-text editable yet |
| FBD | Edit + x/y drag | Title only | Named function-block instances: y only via `@overrides` | IEC wires stay attached and reroute from named ports | Synthetic inline-expression blocks and instance identifiers are read-only |
| Petri net | Edit + x/y drag | Title only | Places/transitions: cross-axis via `@overrides` | Standard, inhibitor, read, and reset arcs remain attached | Place/transition IDs, markings, and arc weights are not canvas-text editable yet |
| Timeline | Edit + x/y drag | Title only | Date/range handles: x only, native DSL | Point and range handles rewrite ISO dates | Date handles require proportional scale; equidistant/log layouts remain automatic |
| Timing | Edit + x/y drag | Title only | Wave-boundary handles: x only, native DSL | A boundary resizes its two adjacent waveform runs | Only literal wave tokens are editable; `clock` and `rle` shorthand have no exact boundary token |
| Breadboard | Edit + x/y drag | Title only | On-board parts: x/y, snapped native DSL | Connected jumper wires follow part pins live | Side-mounted boards/modules and standalone wire endpoints are not draggable |
| Siteplan | Edit + x/y drag | Title only | Polygon/path/line/dimension/callout vertices and markers: native x/y | Exact coordinate pairs are rewritten in site units | Whole-shape translation and arbitrary curve handles are not implemented |
| Mindmap | No separate title; root text is editable | Authored Markdown headings/items | None | Hierarchy remains auto-laid out | Generated node IDs are unstable after insertions, so persistent pins are intentionally disabled |
| Ecomap | Edit + x/y drag | Person/system/relationship labels | Stable people/systems: x/y via `@overrides` | Relationships follow live and recompute on drop | Free movement can create overlap |
| Pedigree | Edit + x/y drag | Person labels | Individuals: x only via `@overrides` | Parent/partner connectors remain attached | Generation y-position is semantic and locked |
| Phylogenetic tree | Edit + x/y drag | Newick leaf/internal-clade tokens and indent-tree names | None | Tree topology and branch geometry remain automatic | Branch lengths do not yet expose geometry handles |
| Sociogram | Edit + x/y drag | Member and tie labels | Members: x/y via `@overrides` | Directed ties follow live | Analysis-generated badges are read-only |
| Logic gate | Edit + x/y drag | Signal/gate identities, renamed atomically across references | Stable gates: x/y via `@overrides` | Wire endpoints follow live | Input/output ports themselves do not drag |
| Block diagram | Edit + x/y drag | Block and signal labels | Stable blocks: x/y via `@overrides` | Signals remain attached | Summing junctions and generated ports stay protected |
| Ladder | Edit + x/y drag | Operands, tags, names/comments | Blue rung grip: y only, native source-block reorder | The complete rung reparses and relayouts on drop | Elements do not support arbitrary pixel drag; wires/grid remain automatic |
| SFC | Edit + x/y drag | Step/action/transition text | Steps: x only via `@overrides` | Transitions remain attached | Flow order/y-position is semantic |
| Single-line diagram | Edit + x/y drag | Equipment labels, voltages, and ratings | Equipment: x only via `@overrides` | Feeders remain attached | Hierarchy/depth cannot change through drag |
| Entity diagram | Edit + x/y drag | Entity and ownership labels/fields | Entities: x only via `@overrides` | Ownership lines remain attached | Ownership level/y-position is locked |
| Venn | Edit + x/y drag | Set/region labels and values | Set body: native center x/y; blue east handle: native radius | Rewrites normalized `at` / `radius`; overlap recomputes | No generic region drag that could contradict set semantics |
| BPMN | Edit + x/y drag | Task/event/pool/lane text | Flow nodes: x only via `@overrides` | Sequence flows remain attached | Lane membership and flow order stay DSL-defined |
| Use case | Edit + x/y drag | Actor, use-case, and system text | Stable actors/use-cases: x/y via `@overrides` | Associations remain attached | System membership does not change through drag |
| PRISMA | Edit + x/y drag | Authored stage labels and counts | None | Flow geometry remains automatic | Computed reconciliation/warnings are read-only |
| PERT | Edit + x/y drag | Task labels and durations | Stable tasks: x/y via `@overrides` | Dependencies remain attached | Critical-path results are read-only |
| Fault tree | Edit + x/y drag | Event labels and probabilities | Events/gates: x only via `@overrides` | Tree connectors remain attached | Failure level/y is locked; computed top probability is read-only |
| Bow-tie | Edit + x/y drag | Hazard/threat/barrier/consequence text | Stable items: y only via `@overrides` | Connectors remain attached | Left/right region semantics cannot be swapped |
| Matrix | Edit + x/y drag | Labels, cells, and structured values | Coordinate-mode points: native x/y | Rewrites normalized point coordinates | Non-coordinate modes have no safe geometry token to drag |
| Event tree | Edit + x/y drag | Initiating event, function, branch/outcome text and probabilities | None | Branch geometry remains automatic | Branch order is semantic and cannot be pixel-dragged |
| FMEA | Edit + x/y drag | Item/function/mode/effect/cause/control and S/O/D ratings | None | Table geometry remains automatic | RPN and other computed values are read-only |
| Reliability block diagram | Edit + x/y drag | Block labels and reliability | Stable blocks: x only via `@overrides` | Reliability paths remain attached | Lane and series/parallel structure stay DSL-defined |
| Comparison | Edit + x/y drag | Columns, cells, and structured values | None | Table/bubble geometry remains automatic | The current DSL has no coordinate mode, so no native handle is fabricated |
| Causal loop | Edit + x/y drag | Variables, polarities, and link labels | Stable variables: x/y via `@overrides` | Causal links follow live | IDs containing spaces are persisted as quoted pins |
| Markov | Edit + x/y drag | State labels and probabilities | Stable states: x/y via `@overrides` | Transitions/self-loops remain attached | Probability edits must still satisfy per-state constraints |
| Git graph | Edit + x/y drag | Commit/tag text; branch declaration and all references rename atomically | None | Lane/merge geometry remains automatic | Branch lane/order is semantic and does not drag |
| EPC | Edit + x/y drag | Event/function/connector text | Stable events/functions: x only via `@overrides` | Connectors remain attached | Process order/y-position is locked |
| IDEF0 | Edit + x/y drag | Function/ICOM text | Stable functions: x/y via `@overrides` | ICOM arrows remain attached | ICOM roles/topology stay DSL-defined |
| Threat model | Edit + x/y drag | Element, flow, boundary/STRIDE text | Stable elements: x/y via `@overrides` | Data flows remain attached | Trust-boundary membership does not change through drag |
| Welding symbol | Edit + x/y drag | Dimensions, joint, and tail/process text | None | Standard geometry remains fixed | Geometry cannot be arbitrarily distorted; only authored fields edit |
| Playbook | Edit + x/y drag | Player/play labels | Explicit player coordinates and route endpoints: native x/y | Route endpoint previews live and recomputes on drop | Formation-generated players and named-route geometry are read-only |

The interactive playground contains 53 specimens because Flowchart, Circuit, and Floorplan each have more than one representative mode. The table above covers all 50 unique engines: 40 support safe position editing, and all 50 expose at least one authored title, label, or structured field for canvas editing.

The machine-readable source of truth is `src/core/interactive-capabilities.ts`.
The public controlled React editor is exported from `schematex/react`; the
low-level DOM adapter remains available from `schematex/interactive`. Website
workspaces consume the public React component rather than maintaining a second
interaction implementation.

## Canvas coverage status

All 30 engines previously listed under “planned safe model” are now shipped. There are no render-only engines. The remaining distinction is whether an engine has a safe position model: diagrams without stable identity or native geometry tokens expose text/field editing only instead of inventing unreliable coordinates.

The original 20 engines use parser-native source ranges. The 30-engine completion wave uses a shared compatibility adapter where an older AST does not yet expose ranges; it maps only authored SVG text back to source tokens and every shipped specimen must survive an edit → parse → render round trip. Computed or unmatched output remains read-only. Parser-native ranges are still preferred when an engine is extended.

## Persistence and routing rules

### `@overrides` is presentation-only

Stable-ID presentation drag writes only the user-authorized delta:

```text
@overrides
pin R1 153.1,73.1
pin @title 42,18
```

Unpinned objects continue using automatic layout. Structural edits do not require maintaining a full coordinate snapshot.

### Native handles rewrite domain facts

Dates, waveform boundaries, breadboard holes, site coordinates, furniture coordinates, and room dimensions already exist in the semantic DSL. Their handles update those exact source tokens. They never create a visual pin that could disagree with the domain value.

### A connection must never lie

During drag, attached connections preview from the moving object. After drop, the engine recomputes the connection from semantic endpoints or ports. Engines that promise orthogonal routing must emit only horizontal and vertical segments after the rerender; Circuit Netlist has an explicit regression test for this invariant.

## Interaction and test contract

An engine is documented as canvas-editable only when all relevant checks pass:

- every editable glyph or handle maps to exactly one `SceneItem`;
- every text target has an exact authored `SourceRange`, produced by a parser-native adapter or the guarded compatibility mapper;
- editing changes only the intended token and the result reparses;
- stable-ID drag writes or updates one `@overrides` pin;
- native-handle drag rewrites the native token and creates no override;
- connections stay attached during the gesture and are recomputed on drop;
- browser verification confirms that the visible node/card—not only a narrow text glyph—can invoke its primary edit action;
- default source editing, rendering, share links, and Monaco undo remain available.

## Related documents

- Implementation specification: `CoCEO/schematex/impl/3.0-interactive-editing.md`
- Original first-principles classification and completed build order: `docs/design/interactive-capability-audit.md`
- Interactive regression tests: `tests/interactive/`
