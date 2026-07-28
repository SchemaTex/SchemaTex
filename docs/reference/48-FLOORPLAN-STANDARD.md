# 48 — Floor Plan / Space Layout Standard Reference

*2D architectural floor plans and space layouts — **rooms** (rectilinear, dimensioned), **walls** with poché (solid-fill) rendering and automatic shared-wall merging, **openings** (doors with swing arcs, windows, archways) placed along walls, and a **furniture/fixture symbol catalog** (residential, kitchen/bath, classroom, event/banquet, office) placeable individually or as **arrays** (grids, rows, arcs of desks/tables/chairs). Schematex renders the conventional architectural plan-view vocabulary as semantic SVG from a text DSL designed for AI generation — with automatic area computation, dimension lines, and validation that catches the errors LLMs actually make (overlapping rooms, doors on non-shared walls, colliding furniture).*

> **Primary references (the standard landscape).** Floor-plan notation has **no single binding ISO/IEEE standard** — it is convention-driven, and the conventions are documented in a small set of canonical sources. Schematex treats the following as its baseline:
> - **Ramsey & Sleeper, *Architectural Graphic Standards*** (12th ed., Wiley / The American Institute of Architects) — *the* de-facto reference for US architectural drawing conventions: wall poché, door-swing quarter-arcs, window glazing lines, plumbing-fixture and appliance symbols, dimension-line format.
> - **U.S. National CAD Standard (NCS v6)** — drawing-set conventions (line weights, symbol classes, annotation) that professional plan sets follow.
> - **ISO 4157** (construction drawings — designation of buildings and parts) and **ISO 7518** (simplified representation of demolition/rebuilding) — light-touch international counterparts; ISO plans use the same poché/swing/glazing vocabulary.
> - **Banquet & event industry conventions** (BizBash / Cvent / Social Tables operational standards): 60″ (152 cm) round seats 8, 72″ (183 cm) round seats 10, 8′ banquet rectangle seats 8–10, dance floor ≈ 4.5 sq ft per guest, service aisles ≥ 60″ between table edges (chair-back to chair-back).
> - **Classroom/教育 layout practice** has no formal standard; the vocabulary (desk-chair units in rows/groups/semicircle, teacher desk, whiteboard run, cubbies, reading-corner rug) is stable across ConceptDraw/EdrawMax template libraries and ECERS-R environment-rating conventions. Documented here as the baseline, deviations welcome.
>
> *Honest framing (mirrors the network §0 note).* Because the notation is convention-not-statute, Schematex treats **AGS symbols as the visual baseline**, **NCS dimensioning as the annotation baseline**, and **the event-industry capacity tables as the defaults baseline** — and documents deviations explicitly.

---

## 0. Positioning

**Floor plan is the highest-volume professional diagram request that currently has no text-DSL engine anywhere — not in Schematex, not in Mermaid, not on npm.** ChatDiagram production data (90 days, 2026-03→06): 455 chats whose *title alone* names a floor plan / room layout / seating chart — composition: **classroom layouts 31%, wedding/event seating 23%, residential 17%, commercial small-business 11%**. The requesters are teachers, wedding planners, shop owners, contractors — professionals who need a *printable, labeled, dimensioned* diagram, not a photorealistic render and not CAD.

**The decisive observation: users arrive with dimensions.** Real request titles: *"Small House Floor Plan (7m x 3m)"*, *"21'x21' Classroom Seating Layout"*, *"Wedding Tent Floor Plan (40x120)"*, *"Semi-Circle Wedding Seating (130 Chairs)"*. The input is already structured — rectangular spaces, explicit sizes, repeated objects. That is **exactly the DSL-friendly discrete structure** (declare structure → engine computes geometry), and exactly what image-generation models cannot deliver: a Nano-Banana picture has no measurable dimensions, no editable 4th desk row, no standard door swings.

**The competitive gap (verified 2026-06-09).** Every existing open-source floor-plan project is a mouse-driven editor, and most are dead (react-planner, last npm release 2019; blueprint3d, last push 2021). The only text→SVG attempt is a 2-star unpublished prototype (langalex/mermaid-floorplan). Mermaid's own floorplan feature request (mermaid-js/mermaid#6134) has been open since 2024-12 with no maintainer claim. Commercial vertical SDKs (@expofp/floorplan, 5.3K weekly downloads) prove developers pay to render plans in web pages; no generic open base layer exists.

**Scope boundary (defensibility).** Schematex `floorplan` targets the **measurable-and-editable** 80%: classroom arrangements, event seating, small residential/commercial plans, with industry-standard symbols. It does **not** compete for "dream home concept art" (multimodal image models win there) and does **not** attempt construction-document precision (CAD wins there).

---

## 1. Relation to Existing Schematex Engines

| Engine | Coverage | Why floorplan is different |
|---|---|---|
| `breadboard` (§26) | Physical component placement on a real coordinate grid | **Closest structural cousin** — both place typed symbols at physical coordinates in a metric space. But breadboard's space is a fixed prefab grid; floorplan's space is user-declared rooms with walls, openings, and free metric placement. |
| `flowchart` (§14) | Topology → auto-layout (Sugiyama) | Floorplan is the *inverse* problem: geometry is explicit (user gives dims/positions), the engine validates and renders. No graph layout involved in v0.1. |
| `network` (§35) | Typed icon catalog + boundary containers | Shares the "typed symbol catalog + container" pattern; floorplan rooms are metric containers with structural walls, not dashed logical boundaries. |
| `sld` / `circuit` | IEEE/IEC symbol standards | Same *stance* (published symbol conventions, redrawn as original line art); different domain. Electrical floor plans (outlets/switches per NEC symbols) are a natural **future bridge** between `floorplan` and `circuit` — deferred, see §8. |

**New core surface, deliberately small.** Floorplan introduces one genuinely new mechanism — *wall geometry with openings* (poché merge, gap punching, swing arcs). Everything else (parser, symbol library, validation, theming) follows existing patterns. No auto-layout solver in v0.1 (§8).

---

## 2. Vocabulary

### 2.1 Structural elements

| Element | Convention (AGS) | v0.1 |
|---|---|---|
| `room` | Rectangular space; walls drawn as solid poché (filled) bands centered on the room boundary; adjacent rooms share a single merged wall | ✅ |
| `extend` | L/T/U-shaped rooms as a union of axis-aligned rects (`extend <room> at x,y size WxH`); extension must share an edge; walls merge along the seam, area sums, label centers on the largest part. Mirrors how pros measure L-rooms (split into rectangles, sum). | ✅ |
| stairs | `stairs` / `stairs-l` / `stairs-u` / `spiral-stairs` furniture symbols — 0.28 m tread lines, direction arrow from the lowest tread with `UP` (label override for `DN`), 45° zigzag break line at the 4 ft cut plane, dashed treads beyond; landings blank. `elevator` = shaft with X. | ✅ |
| room label | Name + auto-computed area (m² or sq ft) centered in the room | ✅ |
| `door` (single swing) | Wall gap + door leaf + quarter-circle swing arc; hinge side and swing direction explicit | ✅ |
| `door` double / French | Two mirrored quarter-arcs | ✅ |
| `door` sliding / pocket | Gap with offset parallel leaf line (no arc) | ✅ |
| `door` bifold | Two tent peaks (closet doors) | ✅ |
| `opening` / archway | Wall gap with thin jamb lines, no leaf | ✅ |
| `window` (fixed) | Triple parallel glazing lines across a wall gap | ✅ |
| `window` sliding / casement / bay | `type` param: two offset panels / fixed + outward swing arc / trapezoid projection with splayed sides | ✅ |
| `wall` standalone segment (partition not enclosing a room) | Solid band | ⬜ deferred (compose rooms + openings instead) |
| dimension lines | Overall width/height + per-room segment dims along top/left exteriors; architectural 45° slash ticks (NCS convention) + centered text; ft′in″ formatting under `unit ft` | ✅ |
| north arrow / compass | `north [deg]` statement — circle + N arrow at the top-right of the dim band | ✅ |
| scale bar | Graphic bar, optional | ⬜ deferred |

### 2.2 Furniture & fixture catalog

Full vocabulary specified now (DSL/types never change to add more); **v0.1 column** = first release. v0.1 deliberately covers the four demand clusters completely: **classroom, event/banquet, residential living, kitchen/bath**.

**Residential / living** — all ✅: `bed-double` `bed-single` `bed-queen` `bed-king` `bunk-bed` `crib` `sofa` `loveseat` `sectional` (L-sofa) `armchair` `bench` `beanbag` `ottoman` `coffee-table` `side-table` `tv` `tv-stand` `fireplace` `floor-lamp` `rug` `wardrobe` `dresser` `nightstand` `bookshelf` `plant` `piano` (grand, auto bench) `piano-upright` `pool-table` `ceiling-fan` (overhead, dashed, underlay) `dining-table` (auto-seats chairs by length).
**Kitchen / bath** — all ✅: `counter` (run, dashed front edge) `wall-cabinet` (dashed — above cut plane) `kitchen-sink` (double-bowl) `stove` (4-burner) `range-hood` (dashed trapezoid) `fridge` `dishwasher` `island` `bar-stool` `toilet` `sink` (lavatory) `vanity` (double-basin) `bidet` `urinal` `bathtub` `shower` `washer` `dryer`.
**Classroom / office** — all ✅: `desk-chair` (student unit) `desk` (office desk, auto chair) `teacher-desk` (front-facing lectern/worktop, no auto chair) `desk-l` (corner workstation) `chair` `easel` `whiteboard` (wall-mounted run) `smartboard` `bookcase` `cubbies` (= labeled `counter`) `filing-cabinet` `lockers` `toy-box` `kidney-table` `round-table-4/6/8/10` `conference-table`.
**Event / banquet** — all ✅ v0.1: `round-table-6` (60″ default) `round-table-8` (60″) `round-table-10` (72″) `banquet-table` (8′ rect, seats both sides) `head-table` `stage` `dance-floor` (diagonal hatch) `bar` `dj-booth` `cocktail-table` (30″ high-top, no chairs) `podium` `row-chairs` (theater seating strip).
**Stairs / structural** — all ✅: `stairs` `stairs-l` `stairs-u` `spiral-stairs` `elevator` `column`.
**Retail / warehouse** — all ✅ (0.9.3): `shelving` (gondola run, back-to-back spine + bays) `checkout` (POS counter + register) `clothing-rack` (round rail) `fitting-room` (booth + bench + curtain) `pallet-rack` (open frame, X-braced bays) `loading-dock` (roll-up door + bumpers) `forklift`.
**Salon / gym** — all ✅ (0.9.3): `salon-chair` (styling station + mirror) `shampoo-bowl` (backwash unit) `manicure-table` (auto-seats client + technician) `treadmill` `weight-bench` (auto barbell) `power-rack` `yoga-mat` (underlay).
**Restaurant / commercial kitchen** — ✅ (0.9.9, expanded from production evidence): `booth` (two facing benches + table between, restaurant booth) `prep-table` (stainless work table, dashed under-shelf) `range` (commercial 6-burner + oven) `walk-in` (insulated double-wall cooler/freezer + door) `commercial-sink` (three-compartment sink) `fryer` (twin fry vats) `grill` (0.9 m-deep charbroiler/griddle with grate and control strip). Targets `restaurant floor plan` / `commercial kitchen layout` (Google Ads US: ~2.4K / ~850 mo, the head commercial-floorplan terms).
**Electrical overlay** — ✅ (0.9.11): `outlet` `duplex-outlet` `switch` `light` `ceiling-light` `data-outlet` `electrical-panel` `distribution-board`. These are room-relative overlay fixtures for residential/commercial electrical fittings plans (socket/switch/light/panel placement). They intentionally do **not** model panel internals; use `sld` for consumer-unit/distribution-board single-lines and `circuit` positional panel layout for DIN-rail/control-cabinet views.
**Site / outdoor** — ✅ (0.9.3, expanded from production evidence): `bench` (slatted freestanding seat) `fountain` (concentric courtyard basin and jets) `tree` (canopy disc) `car` (parking-stall footprint). A site/plot plan tiles the lot as adjacent zones (front yard · house footprint · driveway · back yard) with fixtures, trees, and cars on top.
**Deferred** ⬜: hospital/dental beds & chairs — add by demand evidence.

Symbols are original line art following AGS plan-view silhouettes (same stance as network vs Cisco icons): thin stroke, white fill, no inline styles, themable via CSS classes (`stx-floorplan-wall`, `stx-floorplan-furniture`, `stx-floorplan-label`, …).

### 2.3 Auto-seating rules (industry defaults baked in)

| Symbol | Rule |
|---|---|
| `round-table-N` | N chairs auto-distributed on the circumference; default diameter 60″ for N≤8, 72″ for N=10 |
| `dining-table` / `banquet-table` / `conference-table` | chairs auto-placed per 0.65 m of long edge, both sides |
| `head-table` | chairs one side only (facing the room) |
| `manicure-table` | one client chair + one technician chair, facing across the table |
| `row-chairs` | chairs at fixed 0.55 m pitch along the strip |

### 2.4 Per-seat occupant names — the seating chart (0.9.9)

Any auto-seating table accepts a `seats "Name" "Name" …` clause that writes an occupant onto each chair, turning a venue floor plan into the **seating chart** guests read off the wall. This is the deliverable behind the highest-volume untapped term in the cluster — `wedding seating chart` / `seating chart maker` (Google Ads US ~40K/mo combined) — which no text→SVG engine produces.

- **Order** follows the chair geometry: round tables clockwise from the 12-o'clock seat; rectangular tables fill the whole top edge left-to-right, then the whole bottom edge.
- **Mismatch is forgiving** (LLM-ergonomic): fewer names than chairs leaves the remaining chairs empty; more names than chairs ignores the overflow — never an error.
- **CJK quotes** are normalised like every label (`seats "张伟" "李娜"`).
- Named tables are placed as individual `furniture` statements (a seating chart names each table's guests), not via `grid`/`row` arrays.
- Names render horizontally (upright); rotate the table only when legibility allows.

### 2.5 Multi-floor plans (1.0.2)

A multi-floor document is one `floorplan` containing two or more `floor` sections:

```dsl
floorplan "Two-storey villa" unit m
stack horizontal

floor 0 "Ground Floor"
  room living "Living Room" at 0,0 size 6x5
  furniture stairs in living at 4.5,1 size 1.2x3 id main-stair

floor 1 "First Floor"
  room hall "Landing" at 0,0 size 6x5
  furniture stairs in hall at 4.5,1 size 1.2x3 id main-stair
```

- `floor <integer> "<label>"` starts a plate. Labels are optional; levels may be negative.
- `stack horizontal|vertical` selects plate assembly. All plates share one pixels-per-metre scale.
- A stair `id` is its cross-floor identity. The lowest occurrence is labelled `UP`; every higher occurrence is labelled `DN`, unless the author supplied an explicit label.
- Matching vertical-circulation ids whose world coordinates differ by more than 0.1 m produce an alignment warning.
- Structural and opening references never cross a floor boundary. A reference to an id that exists only on another floor is an error naming both levels.
- A one-floor level-0 document keeps the legacy SVG path byte-for-byte: no plate wrapper or plate title is introduced.

---

## 3. DSL Grammar

Header keyword: `floorplan` (unique for `detect()`).

```ebnf
plan      ::= "floorplan" string? ("unit" ("m"|"ft"))? NL
              ("stack" ("horizontal"|"vertical") NL)? (statement | floor-section)*
floor-section ::= "floor" signed-int string? NL statement*
statement ::= room | extend | north | door | window | opening | furniture | array
room      ::= "room" id string? placement "size" dims ("fill" color)? ("nolabel")?
extend    ::= "extend" id placement "size" dims        (* L/T/U rooms; must share an edge *)
north     ::= "north" num?                             (* compass, clockwise deg, default 0 *)
placement ::= "at" coord
            | ("right-of"|"left-of"|"above"|"below") id ("offset" num)?
            | ("align" ("start"|"center"|"end"))?          (* with relative placement *)
door      ::= "door" (wallref | "between" id id) "at" pct
              ("width" num)? ("hinge" ("left"|"right"))? ("swing" ("in"|"out"))?
              ("type" ("single"|"double"|"sliding"|"pocket"|"bifold"))?
window    ::= "window" wallref "at" pct ("width" num)? ("type" ("fixed"|"sliding"|"casement"|"bay"))?
opening   ::= "opening" (wallref | "between" id id) "at" pct ("width" num)?
furniture ::= "furniture" type ("in" id) "at" coord ("size" dims)? ("rotate" num)?
              string? ("seats" string+)? ("id" id)?
array     ::= ("grid"|"row"|"arc") type "in" id
              ("rows" int)? ("cols" int)? ("count" int)?
              ("area" coord coord)? ("itemsize" dims)? ("rotate" num)?
              ("center" coord)? ("radius" num)? ("from" num "to" num)?   (* arc only *)
wallref   ::= id ("north"|"south"|"east"|"west")
coord     ::= num "," num          dims ::= num "x" num          pct ::= num "%"
```

Notes for implementers (LLM-ergonomics, learned from the working POC):
- **All numbers are in `unit`** (default `m`). Furniture `at` is **relative to its room's interior origin** (top-left). This is what LLMs emit naturally from "7m x 3m house" prompts.
- `door between A B` resolves the shared wall segment automatically and positions at `pct` along the *overlap*, not the full wall — the single biggest ergonomic win over coordinate-based door placement.
- Comments: `#` to end of line. CJK quotes accepted as ASCII quotes (Schematex house rule).
- `grid … count N` truncates row-major (27 desks in a 5×6 grid — the real classroom case).
- `extend` grows a room into an L/T/U shape; side wallrefs (`door living east …`) then position along the **concatenated exterior segments** of that side (interior seams between parts are skipped), and `pct` selects the segment + position deterministically.
- On a multi-part room, furniture must be covered by the part union — a sofa straddling the notch is an error naming the uncovered m².
- `arc` places items on a circular arc facing center (semicircle classrooms, ceremony seating).

### 3.1 Canonical example (compressed)

```
floorplan "Two-Bedroom Apartment — 68 m²" unit m
room living  "Living Room" at 0,0 size 5.2x4.2
room kitchen "Kitchen" right-of living size 3.0x4.2
room hall    "Hallway" below living size 2.0x2.6
door hall west at 50% width 1.0
opening between living kitchen at 35% width 1.2
window living north at 30% width 1.8
furniture sofa in living at 0.25,2.9
grid desk-chair in class rows 5 cols 6 count 27 area 5,7 25,23   # (classroom plan)
```

---

## 4. Layout & Rendering Rules

1. **Coordinate space.** Meters internally (ft inputs converted on parse, 1 ft = 0.3048 m); y-down; renderer scales (default ≈ 55 px/m, configurable).
2. **Walls.** Thickness 0.2 m default, drawn as filled bands **centered on room boundary lines**, so two adjacent room rects sharing an edge produce one merged wall automatically — no wall graph needed. Corners overlap-fill naturally.
3. **Openings.** Punch a white gap in the wall band, then draw the symbol: door = leaf line + quarter arc (90°) from hinge jamb, swing into the owning room by default; window = 3 glazing lines + jamb caps; archway = jamb lines only. Opening width clamps to fit its wall segment minus 0.05 m margins.
4. **Z-order.** room fills → furniture → walls → opening symbols → labels → dimension lines. (Walls over furniture keeps poché crisp when furniture abuts a wall.)
5. **Labels.** Room name (semibold) + area on the next line, centered; `nolabel` suppresses (single-space plans like classrooms). Furniture optional string label centers on the symbol.
6. **Dimension lines.** Overall W and H always; per-room segment dims for rooms touching the top/left exterior. `unit ft` formats as `15'1"`.
7. **Areas.** `w × h` of the room rect (interior measure), 1 decimal in m², integer sq ft.
8. **Semantic SVG.** `<title>`, `<desc>` (room count + total area), `data-room`, `data-furniture` attrs, theme classes per element family. No inline styles (house rule).
9. **Multi-floor plates.** Layout each floor independently, choose a single shared scale from the largest plate, then assemble plates in `stack` order with a 1.5 m visual gap. Plate groups carry `data-floor="<level>"`; plate titles use the declared label.

---

## 5. Default Dimensions (hard knowledge for sane LLM defaults)

| Thing | Default |
|---|---|
| Wall thickness | 0.2 m (interior and exterior identical in v0.1) |
| Door width | 0.9 m wall-side form / 0.8 m `between` form (≈ 36″/32″) |
| Window width | 1.2 m |
| Archway (`opening`) width | 1.0 m |
| Student desk-chair unit | 0.6 × 0.75 m |
| Round table 8-top | 1.52 m (60″) + 0.45 m chair ring |
| Banquet 8′ table | 2.44 × 0.76 m |
| Dance floor | ≈ 0.42 m²/guest (4.5 sq ft) |
| Aisle between table edges | ≥ 1.5 m (60″ service aisle) |
| Min furniture-furniture gap before warning | 0 (touching allowed); overlap → error |

---

## 6. Validation (AI-readable errors — first-class, not afterthought)

Every error names the offending ids and a fix direction:

1. **Room overlap** — `rooms "bed1" and "bath" overlap by 0.40×2.60 m — move "bath" right-of "bed1" or shrink size`.
2. **Door/opening between non-adjacent rooms** — `door between "kitchen" and "bed2": rooms share no wall (gap 2.0 m on x-axis)`.
3. **Furniture collision** — ⚠ the #1 failure mode observed in the POC (3 rounds of manual spacing fixes on the wedding example). Oriented-box (SAT) check across all placed items *including auto-seated chairs* (each symbol declares a chair-ring envelope beyond its nominal box, not just the table disc); plain AABBs false-positive on rotated items — adjacent chairs on a ceremony arc — so the test is exact on the rotated envelope: `round-table-8 #4 overlaps round-table-8 #7 by 0.3 m — increase grid area or reduce cols`. **Underlay exemption:** floor coverings (`rug`, `dance-floor`) and work surfaces (`counter`, `island`) never collide — furniture legitimately sits *on* them (coffee table on rug, sink embedded in counter run).
4. **Furniture outside room interior** — clamp is wrong (hides intent); error with the overshoot amount.
5. **Opening wider than wall segment** — clamp + warning.
6. **Unknown furniture type** — list valid types (existing house pattern).
7. **Duplicate floor level** — error and name the repeated level.
8. **Cross-floor reference** — error when a room/opening/furniture reference resolves only on another floor; include the source and target levels.
9. **Stairwell mismatch** — warning when matching stair ids differ by more than 0.1 m in plan coordinates.

Severity: room overlap / non-adjacent door / out-of-room = **error** (render error panel); furniture collision / clamped opening = **warning** (render anyway + warning list, because tight-but-touching layouts are sometimes intended).

---

## 7. Canonical Test Cases

1. **Two-bedroom apartment** (residential cluster): 7 rooms via relative placement, 7 doors (incl. `between` + hinge/swing variants), 7 windows, 18 furniture items, ft′in″ off (`unit m`). Asserts: shared-wall merge produces no double-thickness bands; area sum = 68.76 m² ±0.1 (the title's "68 m²" is the rounded marketing number); all door arcs inside their owning rooms.
2. **27-desk classroom** (`unit ft`): `grid … rows 5 cols 6 count 27` truncation; whiteboard run on north wall; dims render as `32'`/`26'`. Asserts: exactly 27 desk-chair groups; truncation drops the *last row's tail*, not random cells.
3. **120-guest wedding reception**: 15 × `round-table-8` via two grids + one row, `dance-floor`, `head-table`, two south doors. Asserts: 15×8 = 120 chairs total; **no furniture-collision warnings** at the documented spacing; collision warning *does* fire when the grid area is squeezed below the chair-ring envelope spacing (negative test).
4. **Error plan**: overlapping rooms + door between non-adjacent rooms + desk placed outside room → exactly 3 errors, each naming both ids and a quantified overlap/gap.
5. **Minimal smoke**: one room, one door, one window, no furniture — parses, renders, `<desc>` reports "1 room, 12.0 m²".
6. **Two-storey villa**: two labelled floor plates with a shared stair id. Asserts: shared scale, inferred `UP`/`DN`, 1.5 m plate gap, cross-floor reference error, duplicate-level error, alignment warning above 0.1 m, and no warning at exactly 0.1 m. A separate regression asserts a level-0 single-floor SVG is byte-identical to the pre-1.0.2 output.

Working POC (parser + renderer + the three scenario renders, zero-dep JS): `../CoCEO/daily/2026-06-09-floorplan-poc/` — reference implementation for geometry (wall merge, arc direction, dim lines), **not** for code style (it predates this spec; no svg.ts builder, no theme classes, no collision validation).

---

## 8. Non-Goals / Deferred (decided, not forgotten)

- **Auto-layout from adjacency constraints only** ("kitchen next to living, no coordinates") — academic-grade problem (diffusion/MIP); v0.1 is explicit-dims + relative placement, which covers the observed demand. Revisit only with usage evidence.
- **Polygon-vertex rooms** — `extend` (rect union) covers rectilinear L/T/U natively; a `polygon` vertex-list escape hatch (rectilinear-validated, later relaxed to 45°) is reserved syntax for a fast-follow. **Diagonal (45°) walls** = fast-follow; **curved/arc walls** = deferred — evidence: the RPLAN corpus (80k real residential plans) is fully axis-aligned, and RoomSketcher gates curved walls behind its Pro tier. Bay windows (the most common curved-ish feature) are covered by `window … type bay`.
- **HVAC/plumbing runs**, **3D/isometric**, **furniture clearance codes** (ADA/fire egress) — all deferred. Multi-floor plate assembly and stair registration are implemented in 1.0.2. Electrical **placement** overlay is supported; electrical **panel internals / schedules** remain `sld` / `circuit` territory.
- **Photorealism** — permanently out of scope; that is the image-model lane.
