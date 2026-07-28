# 54 — Stage Plot Standard

Status: Schematex normative implementation profile
Scope: live-sound stage plots and their derived input lists

## 1. Purpose and standards stance

A stage plot is an operational handoff to the venue audio crew: it places
performers, backline, microphones, DIs, monitor mixes, power, snake boxes and
FOH equipment on a measured stage. Its input list is the same document
expressed as mixer channels. Schematex therefore stores channel metadata on
the plotted equipment and derives the table; authors never maintain two
independent copies.

There is no single ratified stage-plot drawing standard comparable to ISO
23601. This profile follows the stable vocabulary and orientation conventions
used by venue technical manuals and professional live-sound advances:

- stage directions are from a performer standing on stage facing the audience;
- upstage is away from the audience and downstage is toward the audience;
- every monitor wedge carries its mix/send number;
- plotted microphone/DI identifiers and the input-list channel rows agree;
- stage dimensions and device coordinates use the floorplan metre/foot model.

Reference practice:

- University of Northern Iowa, *School of Music Technical Manual* (stage
  directions are from onstage looking at the audience)
- Yamaha Pro Audio, *Seven Ways to Ensure a Smooth Sound Check* (input list
  records channel, source and microphone/DI; plot identifiers match the list)
- University of Wisconsin–Stevens Point, *What is a Stage Plot & Input List?*

This output is an advance/operations document, not rigging, electrical,
structural, accessibility or fire-code approval.

## 2. Architecture

`stageplot` is a first-class `DiagramType` served by the floorplan plugin
through `altTypes`. The shared parser and layout retain one AST
(`type: "floorplan"`) with `mode: "stageplot"`, exactly as evacuation mode does.

This is intentional: a stage plot is a rectangular measured surface with
symbolic objects, so it benefits directly from floorplan units, room-relative
coordinates, bounds checking and deterministic rendering. Stage-only
equipment, input rows and signal paths remain in a namespaced subtree so they
cannot change legacy floorplan output.

## 3. Coordinate and orientation model

Coordinates use the floorplan model:

- AST numbers remain in the declared `unit m|ft`.
- Layout converts to absolute metres, y increasing downward.
- `stage <id> ... at x,y size WxH` creates the measured stage surface.
- `equipment ... in <stage> at x,y` is relative to that surface.
- `equipment ... outside at x,y` is plan-absolute (normally FOH).

The canonical drawing keeps the audience at the bottom:

```text
                    UPSTAGE
  STAGE RIGHT                         STAGE LEFT
  (performer view)                   (performer view)
                   DOWNSTAGE
                    AUDIENCE
```

Therefore **STAGE RIGHT is printed on the page-left edge** and **STAGE LEFT on
the page-right edge**. Swapping those labels is a blocking correctness defect.

## 4. Grammar

```text
stageplot "Title" [unit m|ft]
stage <id> ["Label"] at x,y size WxH

equipment <kind> <id>
  (in <stage> at x,y | outside at x,y)
  [size WxH] [rotate deg] ["plot label"]
  [channel N] [source "Instrument or person"]
  [model "Suggested microphone or DI"]
  [stand boom|straight|short-boom|clip|none]
  [phantom yes|no] [notes "Text"] [mix N]

monitor <mix-number> [id] in <stage> at x,y ["label"]
signal <equipment-id> -> <equipment-id> [-> ...] ["label"]
input-list on|off
```

`monitor` is shorthand for `equipment monitor-wedge ... mix N`.
`input-list` defaults to `on`.

## 5. Equipment catalog

Required native equipment:

- Backline: `drum-kit`, `guitar-amp`, `bass-amp`, `keyboard` (with stand),
  `bass-cabinet`
- Microphones/stands: `boom-stand`, `straight-stand`, `drum-mic`, `overhead`
- Signal: `di-box`, `mixer`, `foh-console`, `snake`
- Monitoring: `monitor-wedge`, `side-fill`, `iem`
- Utility: `power-drop`, `stage-riser`, `music-stand`, `set-list`

The existing floorplan symbols `stage`, `dance-floor`, `dj-booth`, `podium`,
`row-chairs`, and `piano` are referenced, not redrawn.

`stage-riser` is the canonical stage-platform key. Stage mode accepts `riser`
as a convenience alias, but the stored value is always `stage-riser`; the bare
`riser` safety-sign kind in evacuation mode continues to mean a fire-service
riser.

## 6. Derived input list

Every equipment node carrying `channel N` yields exactly one row sorted by
channel:

| Column | Source |
|---|---|
| Channel | `channel` |
| Instrument / vocal | `source`, falling back to label/kind |
| Suggested mic / DI | `model`, falling back to `—` |
| Stand | explicit `stand`, otherwise inferred from symbol kind |
| 48V | `phantom yes|no` |
| Notes | `notes`, falling back to empty |

Duplicate or non-positive channels are errors. The exported
`deriveStageInputList()` helper and the SVG table use the same derived array.

## 7. Monitor numbering

`monitor-wedge` requires a positive `mix` number. The number is printed as the
dominant mark inside the wedge and exposed as `data-mix`. Multiple wedges may
share a mix; that represents one console send feeding more than one speaker.
Missing or non-positive wedge numbers are errors.

`side-fill` and `iem` may carry a mix number but do not require one.

## 8. Signal paths

`signal` joins two or more equipment ids. Layout converts anchor centres to a
deterministic orthogonal polyline. Only this routing primitive is shared with
evacuation mode. Escape-route kinds, opening continuity, chevrons and
life-safety validation remain evacuation-specific.

Unknown anchors and paths with fewer than two endpoints are errors.

## 9. Rendering and design tokens

The print-first palette is fixed through semantic tokens:

- paper `#F8FAFC`
- ink `#172033`
- stage navy `#1E3A5F`
- signal blue `#2563EB`
- monitor amber `#D97706`
- input green `#0F766E`

Display/headline text uses IBM Plex Sans; body text uses Noto Sans; channel
and utility text uses IBM Plex Mono. The scale is 20 px title, 13 px section,
11 px body and 9 px caption. The orientation rails are the signature visual
device and must remain visible at print size.

Z-order:

1. paper and measured stage surface
2. risers/underlays
3. signal paths
4. backline and equipment
5. microphone/monitor marks and labels
6. stage-direction rails and dimensions
7. derived input-list table

## 10. Validation

Errors:

- no stage surface
- unknown stage/room reference
- equipment outside its declared stage
- duplicate equipment id
- duplicate/non-positive input channel
- wedge without a positive mix number
- signal path with an unknown endpoint

Warnings:

- a channel-bearing device without an explicit model

## 11. Canonical fixtures

The regression suite and gallery must include:

1. Four-piece rock band — drums, bass, guitar, lead vocal, DIs, wedges, snake
2. Jazz trio — piano, upright/bass amp, drums, compact monitoring
3. Full band — drum riser and six numbered monitor mixes

All three render with zero errors; the full-band fixture visibly contains mix
numbers 1–6.
