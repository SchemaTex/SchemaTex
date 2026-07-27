# 53 — Evacuation / Escape Plan Standard Reference

*Posted emergency escape and evacuation plans: the framed plan that shows the viewer's position, primary and alternative escape routes, exits, fire equipment, first aid, and the assembly point. Schematex renders these as semantic SVG on top of the `floorplan` geometry engine and checks the governing profile before the plan is used.*

> **Primary references**
>
> - **ISO 23601:2020**, *Safety identification — Escape and evacuation plan signs*: plan content, orientation, scale, legend, and location marker. National adoptions include DIN ISO 23601.
> - **ISO 7010:2019 with current amendments**: registered E-series safe-condition and F-series fire-equipment sign identities.
> - **ISO 3864-1:2011 / ISO 3864-3:2012**: semantic safety colours, geometric forms, and supplementary arrows.
> - **NFPA 170, Chapter 11**, together with OSHA 29 CFR 1910.38 and NFPA 101: United States evacuation diagrams and egress requirements.
> - **UAE Fire and Life Safety Code / Civil Defence guidance**: ISO-derived signs, yellow location marker, and bilingual English/Arabic labels.
>
> ISO and NFPA artwork is copyrighted. Schematex references sign identities but ships only original geometry drawn from the standards' described visual grammar. It never copies, traces, downloads, or embeds official vector artwork.

---

## 0. Scope

`evacuation` produces an occupant-facing posted plan. It is not a fire-service pre-incident plan, fire-protection engineering drawing, egress-capacity calculation, travel-distance certification, or substitute for approval by the authority having jurisdiction.

This mode is a first-class `DiagramType` but is served by the `floorplan` plugin. It reuses rooms, rect-union extensions, poché walls, openings, furniture geometry, vertical circulation, and multi-floor plates; it adds safety signs, route geometry, a mandatory legend, a print-scale calculation, and profile-aware validation.

---

## 1. Safety-sign catalogue

Every coordinate-based sign uses a fixed `24 × 24` drawing viewBox. The viewBox describes pictogram geometry, not metres. Its rendered footprint is calculated from sheet millimetres so an 8 mm sign stays 8 mm on A3 regardless of the building's size.

ISO 3864 visual grammar is mandatory: a solid semantic-colour plate with a knockout pictogram. Safe-condition signs are green, fire-equipment and prohibition signs red, mandatory information blue, and warnings yellow. These colours do not change with the application theme.

### 1.1 Coordinate-based DSL kinds

| Family | DSL kind | Identity / use |
|---|---|---|
| Location | `here` | ISO 23601 Standort / NFPA YOU ARE HERE; mandatory |
| Egress | `exit` | ISO 7010 E001 left / E002 right |
| Egress | `exit-final` | E001/E002 plus final-discharge doorway |
| Egress | `assembly` | E007 assembly point |
| Egress | `refuge` | NFPA 170 area of refuge |
| Egress | `shelter` | NFPA 170 severe-weather shelter |
| Rescue | `first-aid` | E003 |
| Rescue | `aed` | E010 |
| Rescue | `stretcher` | E013 |
| Rescue | `doctor` | E009 |
| Rescue | `eyewash` | E011 |
| Rescue | `safety-shower` | E012 |
| Rescue | `emergency-phone` | E004 |
| Rescue | `break-glass` | E008 |
| Rescue | `escape-ladder` | E016 |
| Rescue | `rescue-window` | E017 |
| Door operation | `emergency-door-push` | E022 pushes left / E023 pushes right |
| Door operation | `emergency-door-slide` | E033 slides right / E034 slides left |
| Fire | `extinguisher` | F001; optional extinguisher class |
| Fire | `hose-reel` | F002 |
| Fire | `fire-ladder` | F003 |
| Fire | `fire-equipment` | F004 collection of firefighting equipment |
| Fire | `call-point` | F005 |
| Fire | `fire-phone` | F006 fire emergency telephone |
| Fire | `riser` | NFPA-derived standpipe/riser location |
| Prohibition | `not-an-exit` | NFPA 170 Chapter 11 |
| Prohibition | `no-elevator` | NFPA 170 Chapter 11; auto-added by NFPA/UAE profiles |
| Notification | `alarm-sounder` | alarm sounder/strobe |

ISO 7010 **E024 is temporary refuge**; it is not a sliding-door sign. That earlier secondary-source mapping was rejected. The current sliding-door identities are E033/E034.

### 1.2 Forty renderable catalogue cells

The 40-cell visual QA catalogue consists of the 28 kinds above, two structural marks (`fire-door`, `smoke-door`), and ten profile/direction variants:

- ISO and NFPA left/right `exit`;
- ISO and NFPA left/right `exit-final`;
- NFPA and UAE `here`.

Each glyph is tested for a `24 × 24` viewBox, a solid plate, knockout artwork, a semantic colour family, and absence of inline styles.

### 1.3 Structural door marks

`fire-door` and `smoke-door` attach to an existing door reference rather than a free coordinate. They render after the opening symbol, with an optional quoted rating such as `EI30` or `S200`.

---

## 2. Escape-route geometry

| Kind | Rendering |
|---|---|
| `primary` | solid green band |
| `secondary` | dashed green band |
| `accessible` | solid green band with an accessible-egress marker |
| `rescue` | blue rescue-access band |

Routes are ordered anchor chains. Anchors may be `here`, safety-symbol ids, or room ids. Between adjacent room anchors the layout passes through the centre of their declared door or opening, then adds deterministic orthogonal bends. It never path-finds or invents a passage. Every room transition therefore has to name both the room and the actual opening.

Chevron arrowheads appear at 2 m intervals and point away from `here` toward the destination. Routes render above room fill but below walls so they cannot erase structure.

---

## 3. DSL

Header: `evacuation` or `escapeplan`.

```ebnf
plan       ::= ("evacuation"|"escapeplan") string?
               ("unit" ("m"|"ft"))? ("stack" ("horizontal"|"vertical"))? NL statement*
statement  ::= floorplan-stmt | floor | compliance | sheet | safety | route
             | fire-door | smoke-door | legend-directive | show
floor      ::= "floor" signed-int string?
compliance ::= "compliance" ("iso"|"nfpa"|"uae")
sheet      ::= "sheet" ("a4"|"a3"|"a2"|"letter"|"tabloid")
               ("landscape"|"portrait")?
safety     ::= "safety"? kind id? location ("side" wallside)?
               ("hand" ("left"|"right"))? ("rotate" num)?
               ("class" string)? string?
location   ::= "in" room-id "at" coord | "outside" "at" coord
route      ::= "route" ("primary"|"secondary"|"accessible"|"rescue")?
               anchor ("->" anchor)+ string?
fire-door ::= ("fire-door"|"smoke-door")
               ("between" id id | id wallside "at" pct) ("rating" string)?
show       ::= "show" "furniture"
```

`safety` is optional, so `exit-final east in lobby at 5.8,2 side east` and the long form are equivalent. Coordinates inside rooms are room-relative; `outside at` uses plan coordinates and grows the plate bounds. A trailing label containing ` / ` carries English and Arabic halves; Arabic renders as a separate RTL run.

Canonical source:

```dsl
evacuation "Office Escape Plan" unit m
compliance iso
sheet a3 landscape

room office "Office" at 0,0 size 7x5
room corridor "Corridor" below office size 7x2
room stair "Protected Stair" right-of corridor size 3x2
opening between office corridor at 50% width 1.2
door between corridor stair at 50% width 1.1

here in office at 3.5,2.5 "YOU ARE HERE"
exit-final east in stair at 2.9,1 side east "EXIT"
extinguisher f1 in corridor at 0.5,1 class "ABC"
route primary here -> office -> corridor -> stair -> east
legend auto
```

---

## 4. Layers and theme

Evacuation mode keeps room fill, walls, openings, door swings, stairs, elevators, room names, and a north compass. It hides furniture and architectural dimension annotations by default, while preserving furniture in the AST; `show furniture` opts that layer back in. Dimension annotations remain suppressed in this occupant-facing mode.

Z-order:

`room fill → route bands → furniture (if requested) → walls → openings → fire/smoke-door marks → safety signs → room labels → legend and scale note`.

`EvacuationTokens` defines six named semantic colours:

- safe `#00843D`
- fire `#C8102E`
- mandatory `#005387`
- warning `#FFCC00`
- route `#00A651`
- rescue `#006EB6`

`monochrome` is the one deliberate render-after-error exception in Schematex: the engine reports that monochrome is non-compliant, then renders with the colour tokens so the author can still diagnose the rest of the plan.

---

## 5. Compliance profiles and print scale

| Rule | `iso` | `nfpa` | `uae` |
|---|---|---|---|
| Governing basis | ISO 23601 / 7010 / 3864 | NFPA 170 Ch.11 / NFPA 101 | UAE Civil Defence, ISO-derived |
| Exit glyph | E001/E002 | NFPA profile variant | E001/E002 |
| Location marker | ISO Standort | YOU ARE HERE | yellow marker |
| `no-elevator` | authored | auto when elevator exists | auto when elevator exists |
| Bilingual English/Arabic | optional | optional | required for relevant labels |
| Coarsest scale | 1:250 | no fixed engine floor | 1:250 |
| Minimum sign height | 7 mm | no fixed engine floor | 7 mm |
| One-route severity | warning | error | warning |

Supported sheets use their physical portrait dimensions, swapped for landscape, with a 15 mm margin on every side. A single denominator must fit the largest floor plate in both printable width and printable height:

```text
raw denominator =
  max(
    plan_width_m × 1000 / printable_width_mm,
    plan_height_m × 1000 / printable_height_mm
  )

reported denominator =
  first conventional step >= raw denominator

world footprint for a fixed sign =
  sign_mm × reported denominator / 1000
```

Conventional steps are 1:50, 1:100, 1:200, 1:250, 1:350, 1:500, 1:750, and 1:1000, followed by 250-step rounding. This formula is intentionally stated in fixed-sheet terms: a symbol is authored in millimetres and converted to world metres, not the reverse.

---

## 6. Mandatory legend

Evacuation uses **Tier M** in `LEGEND-SYSTEM.md`. The legend is always on and auto-derived from signs and route styles actually present. Sections are Escape routes, Exits, Fire equipment, First aid, and Structural. Universal symbols are not omitted because the legend itself is a compliance artefact.

`legend: off` is a parse error citing ISO 23601 §6 and NFPA 170 Chapter 11. Other legend overrides—title, position, labels, hidden optional items, and section titles—remain available.

---

## 7. Validation

Every diagnostic names the relevant id/floor, explains a repair, and cites the governing source. Errors block normal success; warnings still render.

1. **Missing location marker** — error; ISO 23601 §6 / NFPA 170 Ch.11.
2. **Missing exit** — error; ISO 23601 §6 / NFPA 170 Ch.11.
3. **Non-adjacent route hop** — error when consecutive rooms share no declared opening; ISO 23601 §6.
4. **Fewer than two independent routes** — NFPA error, ISO/UAE warning. **Independence = the two routes discharge at different final exits**, nothing more; NFPA 101 §7.4.1 / ISO 23601 §6. Room-sequence overlap is deliberately *not* part of the test: in a corridor building the two routes legitimately share the corridor and split only at the ends, which is the normal shape of compliant egress, not a defect.
5. **Dead room** — warning for a connected occupiable room omitted from all routes and without its own exit; ISO 23601 §6.
6. **Route ends at an ordinary room** — error; destination must be `exit`, `exit-final`, or `assembly`; ISO 23601 §6 / NFPA 170 Ch.11.
7. **Safety-sign collision** — warning when two fixed-sheet footprints overlap; touching edges are allowed; ISO 23601 §6.
8. **Missing UAE bilingual label** — error when either English or Arabic half is absent; UAE Civil Defence.
9. **Elevator without prohibition** — auto-add exactly one `no-elevator` under NFPA/UAE; NFPA 170 Ch.11 / UAE Civil Defence.
10. **Legend disabled** — parse error; ISO 23601 §6 / NFPA 170 Ch.11.
11. **Monochrome theme** — compliance error but still render in colour; ISO 3864-1 / NFPA 170 Ch.11.
12. **Scale coarser than 1:250 or sign below 7 mm** — ISO/UAE error; ISO 23601 §5.2 / §6.
13. **Unknown safety kind** — parse error with the valid list and nearest suggestion; the message identifies the ISO 7010 / NFPA 170 catalogue.

Inherited floorplan checks remain active: room overlap, non-adjacent door, out-of-room placement, unknown furniture, duplicate floor level, cross-floor reference, and vertical-circulation misalignment.

---

## 8. Multi-floor evacuation

Each `floor N "Label"` becomes a framed plate, and all plates share one scale. Matching stair instance ids register the same vertical route across floors; the lowest occurrence is `UP` and every higher occurrence is `DN`, unless explicitly labelled. A coordinate difference over 0.1 m warns.

No room, opening, safety sign, or route anchor may silently resolve across floors. Each plate must independently have its location marker, exit, and route coverage. For installation, a multi-storey building normally exports one posted sheet per mounting location; changing the `here` marker creates each location-specific copy.

---

## 9. Canonical tests and non-goals

Required scenarios:

1. ISO office with two route styles, chevrons, hidden furniture/dimensions, mandatory legend, and scale note.
2. NFPA warehouse with elevator auto-prohibition, NOT AN EXIT, accessible route, and NFPA two-route severity.
3. Two-storey villa with shared scale, stair registration, UP/DN inference, per-floor validation, and cross-floor rejection.
4. UAE clinic with English/Arabic labels, separate RTL runs, and yellow location marker.
5. One trigger and one exact non-trigger test for every rule in §7.
6. Minimal one-room smoke plan and byte-for-byte regression coverage for legacy single-floor `floorplan`.

Deferred: egress capacity and travel-distance calculations, automatic route generation, fire-service pre-incident plans, fire-protection engineering drawings, 3D/isometric plans, photoluminescent-material schedules, and site-context muster plans.
