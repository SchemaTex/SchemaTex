# Interactive capability audit — 50 diagram engines

> Status: original implementation baseline; planned modes completed 2026-07-17 Pacific Time
> Scope: direct canvas editing. Editing source in Monaco remains available for every DSL.
>
> **Current shipped capability is canonical in `docs/system/INTERACTIVE-EDITING-CAPABILITIES.md`.** This file preserves the first-principles classification and the now-completed build order; its “Current implementation” snapshot is historical.

## Decision model

Interactive editing has two independent capabilities:

1. **Text edit** — a visible authored string has an exact parser-produced `SourceRange`, so replacing it is deterministic. Stable semantic node IDs are not required.
2. **Position edit** — a visible object has a stable identity and moving it can be persisted without changing the diagram's truth accidentally.

Position editing has two valid implementations:

- **Pin drag** writes presentation-only placement to `@overrides`. Use it when position is decorative and the object has a stable authored ID.
- **Native handle** rewrites semantic geometry already present in the DSL: time, date, room edge, polygon vertex, breadboard hole, player coordinate, and similar values.

Do not use a pin when position encodes a domain fact. Do not enable drag for generated IDs. Neither restriction blocks exact text editing.

Computed and inferred output is read-only even inside an editable engine: generated placeholder nodes, default labels derived from IDs, computed RPN/reliability/critical path/area values, preset-generated players, and automatic legend text have no authored string to replace.

## Engine-by-engine classification

Legend:

- **Label** — direct authored label editing should be supported.
- **Structured** — direct editing should be supported per visible field/cell/member, not by replacing the entire object.
- **Token** — exact token spans inside compact or markup syntax are required.
- **Pin** — presentation drag through `@overrides`.
- **Axis/region pin** — pin drag constrained by hierarchy, generation, lane, pool, or region.
- **Native handle** — drag rewrites semantic DSL values, often with snapping or validation.
- **None** — position remains layout-controlled.

| Diagram | Text model | Position model | First-principles reason |
| --- | --- | --- | --- |
| genogram | Label + structured relationship text | Axis/region pin | People have authored IDs; generation and household structure constrain safe movement. |
| ecomap | Label | Pin | System placement is presentation; relationship meaning lives in edges and attributes. |
| pedigree | Label | Axis/region pin | Individuals can move within a generation, but pedigree generations remain structural. |
| phylo | Token | None | Leaf/internal names live inside Newick or indent tokens; branch geometry represents topology and distance. |
| sociogram | Label | Pin | Node position is presentation and explicit person IDs are stable. |
| timing | Label + structured signal values | Native handle | Moving a transition changes time or signal value, so it must rewrite waveform data. |
| logic | Label + structured values | Pin | Gate/component placement is presentational; connectivity is ID-based. |
| circuit | Label + structured values | Pin | Explicit component IDs are stable; generated positional components remain protected. |
| blockdiagram | Label + structured values | Pin | Block placement is presentation while ports and connections carry meaning. |
| ladder | Label + structured operands | Native handle | Contacts/coils live on a rung grid; drag must snap and rewrite rung order/connectivity. |
| fbd | Label + structured values | Pin | Function blocks have stable IDs and diagram placement is presentational. |
| sfc | Label + structured actions | Axis/region pin | Steps/transitions are ordered, so movement must preserve vertical flow and branches. |
| sld | Label + structured ratings | Axis/region pin | Equipment can be arranged within electrical hierarchy; topology remains authoritative. |
| pid | Label + structured tags/values | Pin | Equipment and instrument tags are stable; plant layout is presentational. |
| breadboard | Label + structured values | Native handle | Components and wire ends must snap to physical holes and rewrite terminal positions. |
| entity | Label + structured ownership text | Axis/region pin | Entities can move within ownership levels; ownership direction remains structural. |
| erd | Structured table/field text | Pin | Table IDs are stable; table placement is presentation, fields are separate edit targets. |
| fishbone | Label | None | Bone position follows cause/category hierarchy; moving a bone would imply ordering without a defined semantic. |
| venn | Label + structured set members | Native handle | Circle motion changes overlap meaning and must rewrite an explicit relation/geometry model. |
| decisiontree | Label | None | Question/answer hierarchy determines placement; generated path identities are not persistent pins. |
| state | Label + transition text | Pin | Explicit state IDs are stable and position is presentation. |
| bpmn | Label + structured event/task text | Axis/region pin | Nodes may move inside their pool/lane; crossing lane boundaries is a semantic change. |
| usecase | Label + relationship text | Axis/region pin | Actors/use cases can move while remaining inside/outside the system boundary. |
| sequence | Label + message text | Axis pin | Lifeline x-position is presentation; message y-order is source order and not draggable. |
| petri | Label + structured token counts | Pin | Places/transitions have stable IDs; topology and marking stay authoritative. |
| network | Label + structured device/link text | Pin | Device IDs are stable and topology is edge-defined; layout is presentation. |
| prisma | Structured stage text/counts | None | PRISMA geometry is a reporting standard and stage order is semantic. |
| pert | Label + structured duration/date fields | Pin | Network placement is presentation; schedule values and critical path are computed facts. |
| umlclass | Structured class/member text | Pin | Class IDs are stable; each compartment member needs its own range and class boxes may move. |
| faulttree | Label + structured probabilities | Axis/region pin | Events/gates can move within levels while Boolean structure remains authoritative. |
| bowtie | Label + structured barrier text | Axis/region pin | Threats, barriers, and consequences stay on fixed semantic sides of the knot. |
| flowchart | Label + edge text | Pin | Explicit node IDs are stable and layout is presentation. |
| matrix | Structured cell/item text | Mode-specific native handle | Table modes do not drag; scored quadrant/scatter modes may rewrite authored coordinates or scores. |
| orgchart | Label + structured role text | Axis pin | Cards move horizontally within reporting depth; vertical depth is semantic. |
| mindmap | Token/Markdown label | None | Exact Markdown ranges are editable; generated IDs and hierarchy-controlled layout prohibit persistent pins. |
| timeline | Label + structured dates | Native handle | Horizontal movement changes a date/time and must rewrite that authored value. |
| eventtree | Label + structured branch/outcome text | None | Event order and branch geometry are the analysis structure. |
| fmea | Structured cell text/ratings | None | It is a standards-driven table; RPN and Action Priority are computed and read-only. |
| rbd | Label + structured reliability values | Axis/region pin | Blocks can move inside series/parallel lanes; computed system reliability remains read-only. |
| comparison | Structured cell/bubble text | Mode-specific native handle | Tables are fixed; coordinate-bearing comparison modes may rewrite authored scores/positions. |
| causalloop | Label + polarity/loop text | Pin | Variable position is presentation; signed causal edges carry semantics. |
| markov | Label + structured probabilities | Pin | State position is presentation; transition probabilities and computed stationary results are not. |
| gitgraph | Label + branch/commit text | None | Lanes and commit order are derived from repository-like history. |
| epc | Label + connector text | Axis/region pin | Events/functions may move within process flow while alternation and connectors stay structural. |
| idef0 | Label + ICOM text | Pin | Function box placement is presentation; ICOM side/port meaning must remain attached. |
| threatmodel | Label + structured STRIDE text | Axis/region pin | Elements move within trust boundaries; crossing a boundary is a semantic operation. |
| welding | Structured symbol dimensions/tail text | None | AWS/ISO symbol geometry is standardized rather than a free canvas. |
| floorplan | Label + structured dimensions | Mixed native handle | Furniture uses native `at`; room edges/openings require constrained geometry handles, not room pins. |
| siteplan | Label + structured dimensions | Native handle | Markers, polygon vertices, paths, callouts, and dimensions already author coordinates. |
| playbook | Label + structured assignments | Native handle | Explicit players/routes may rewrite field coordinates; formation-generated players have no source span. |

## Current implementation

As of this audit:

- **Text + drag:** flowchart, state, orgchart, sequence, circuit, floorplan items, genogram.
- **Text only:** mindmap authored nodes.
- **Render only:** the remaining 42 engines. This is implementation backlog, not a claim that their text is inherently uneditable.

## Recommended build order

1. **High-volume label wave:** network, decisiontree, fishbone. These are mostly single-label parser work and immediately remove the misleading “render-only” experience.
2. **Multi-label model wave:** ERD and UML class. Add exact ranges per table/class name, field, attribute, method, stereotype, and relationship label.
3. **High-value pin wave:** network, ERD, UML class, P&ID, FBD, Petri, ecomap, sociogram, causal loop, Markov.
4. **Structured text wave:** matrix, FMEA, comparison, PRISMA, event tree, welding, ladder, timing, phylo.
5. **Native-handle wave:** floorplan room/opening handles, siteplan vertices, breadboard snap points, playbook routes, timeline dates, timing transitions, and mode-specific matrix/Venn geometry.

Each engine ships only after parser range round-trip tests, default-render zero-diff tests, scene/SVG identity tests, and browser interaction tests pass.
