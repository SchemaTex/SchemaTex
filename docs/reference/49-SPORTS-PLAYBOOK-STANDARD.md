# 49 — Sports Playbook Standard Reference

*Multi-sport tactics boards from one paragraph of text — **American football** X&O play diagrams, **basketball** half-court sets, and **soccer (association football)** team shapes and movement patterns, each drawn in its sport's coaching-standard notation on its own correctly-scaled field / court / pitch. Players are placed by **formation** (or individually), assignments are drawn with **movement verbs** whose line style is coaching-correct per sport, and the engine resolves named routes, landmarks, and formations into geometry. Rendered as semantic SVG from a text DSL designed for AI generation.*

> **Primary references (the standard landscape).** Like floor plans (§48), sports-tactics notation is **convention-driven, not statute** — there is no binding ISO/IEEE standard for a play diagram. The conventions are, however, remarkably stable across coaching literature. Schematex treats the following as its baseline:
> - **American football X&O.** The "X's and O's" convention (offense = O / circles, defense = X) and the **numbered route tree** (0–9; odd numbers break to the sideline, even numbers break inside) are codified in coaching texts — *American Football Coaches Association (AFCA) Football Coaching Bible*, Homer Smith's passing-game manuals, and the West Coast / Air Raid playbook lineages. Field geometry per **NFL Rule 1** and the **NCAA Football Rules** (Rule 1): 100-yard field + two 10-yard end zones, hash marks 70′9″ apart (NFL) / 40′ apart (NCAA), goalposts on the end line.
> - **Basketball.** Court markings per **FIBA Official Basketball Rules, Art. 2** and **NBA Rule No. 1** (lane, free-throw circle r = 1.8 m, three-point arc, restricted area, centre circle). The diagramming **legend** — solid line + arrowhead = player **cut/movement**, dashed line = **pass**, zig-zag = **dribble**, line ending in a perpendicular bar (⊥) = **screen/ball-screen** — is universal across coaching references (FIBA Coaches Manual, *Basketball Skills & Drills*, NBA coaching clinics) and the named **half-court landmarks** (elbow, wing, corner, short corner, block, dunker spot, slot, nail) are standard coaching vocabulary.
> - **Soccer (association football).** Pitch geometry per the **IFAB Laws of the Game, Law 1** (length 100–110 m / width 64–75 m; Schematex uses the FIFA-recommended **105 × 68 m**; penalty area 16.5 m × 40.32 m, goal area 5.5 m × 18.32 m, penalty mark 11 m, centre circle / penalty arc radius 9.15 m, corner arc 1 m, goal 7.32 m). The tactics-board **legend** — **solid arrow = pass**, **broken/dashed arrow = player run**, zig-zag = dribble, often a double line = shot — is the convention in UEFA/FA coaching materials and tactics literature (*Soccer iQ*, *Inverting the Pyramid* diagram sets).
>
> *Honest framing (mirrors the §48 note).* Because the notation is convention-not-statute, Schematex treats the **AFCA / route-tree convention as the football baseline**, the **FIBA/NBA coaching-legend as the basketball baseline**, and the **IFAB pitch + tactics-board legend as the soccer baseline** — and documents deviations explicitly. The one cross-sport subtlety worth flagging up front: **the pass-vs-run line convention is inverted between sports** (basketball: pass = dashed, cut = solid; soccer: pass = solid, run = dashed). Schematex honours each sport's own convention rather than forcing one global rule.

---

## 0. Positioning

**A sports playbook is a high-volume, professional-yet-amateur diagram with no text-DSL engine anywhere.** Coaches at every level — youth, high-school, college, club, pro — draw plays constantly, today either by hand on a dry-erase board or in mouse-driven apps (Hudl, CoachTube, tactics-board web toys). None of them is *text-first*, none is AI-emittable, and none renders the three big team sports from a single shared grammar. The requester is a coach, a player studying film, a parent-volunteer, or a fan explaining a concept — all of whom can describe a play in one English sentence ("4 verticals out of spread vs cover 2") but cannot place 22 dots correctly by hand.

**The decisive observation: a play *is* discrete structure.** A formation is a named set of positions; a route is a named shape from the route tree; a landmark ("elbow", "near post") is a named coordinate. That is exactly the declare-structure-→-engine-computes-geometry pattern Schematex is built for, and exactly what image-generation models cannot deliver — a generated picture of a play has no editable 4th receiver, no measurable hash placement, no standards-correct three-point arc.

**Scope boundary (defensibility).** Schematex `playbook` targets the **single still diagram**: one play, one set, one team shape, drawn correctly. It does **not** do animation, game film, statistics, league tables, or full game simulation. Three sports ship in v0.1 (football, basketball, soccer); the `SportModule` abstraction (§1) is built so a fourth (hockey, lacrosse, futsal, …) is additive.

---

## 1. Architecture — the `SportModule` abstraction

Unlike most Schematex engines (one diagram = one geometry), `playbook` dispatches on a `sport` discriminator to a per-sport **`SportModule`** that owns everything sport-specific while sharing the parser, layout resolver, and renderer.

```
Text → Parser (shared) → PlaybookAst → layout (shared, dispatches to module)
     → PlaybookLayoutResult → renderer (shared, dispatches to module.drawField) → SVG
```

A `SportModule` provides:

| Member | Responsibility |
|---|---|
| `scale` | px per sport-unit (yard / foot / metre) |
| `yUp` | whether the v-axis is flipped (football: downfield = up; basketball/soccer: not flipped) |
| `buildPlayers(ast)` | formation/set roster → positioned players (+ explicit `player` overrides) |
| `buildZones(ast)` | defensive zone shells |
| `resolveNamed?` | football named routes (route tree → polyline shape) |
| `resolveLandmark?` | named coordinate ("elbow", "near-post") → x,y |
| `bounds(ast, …)` | crop the field to the play |
| `drawField(lay, ctx, t)` | the sport's field/court/pitch markings (the surface base, out-of-bounds surround and boundary are drawn by the shared renderer) |
| `legend(lay)` | the legend rows for this sport |

The three shipped modules: `football.ts`, `basketball.ts`, `soccer.ts`.

---

## 2. Coordinate models (one per sport)

Each sport uses its real measurement unit and the conventional coaching viewpoint.

| Sport | Unit | Origin & axes | View | yUp |
|---|---|---|---|---|
| **Football** | yards | x = lateral from the ball (0 = ball, ± = left/right); y = depth off the line of scrimmage. Downfield is **up**. | Offense at the bottom attacking up | `true` |
| **Basketball** | feet | x = lateral from centre (0; ±25 = sidelines); y = from the baseline (0, under the hoop) to 47 (half-court). Basket at (0, 5.25). | Baseline + hoop at the **top**, half-court line at the bottom — the universal coaching half-court view | `false` |
| **Soccer** | metres | x along the length (0 = own goal line → 105 = opponent goal line; attack toward +x); y across the width (0 → 68, goals centred at y = 34). | Full pitch landscape (or `view half`) | `false` |

---

## 3. Movement verbs & the per-sport line-style legend

The core cross-sport insight: **the same verb is drawn differently per sport, and the same line style means different things per sport.** Schematex resolves `(sport, verb) → line style + terminator` so every diagram is legend-correct for its own audience.

| Verb | Football | Basketball | Soccer |
|---|---|---|---|
| `route` (named, route tree) | solid + arrow | — | — |
| `run` | solid + arrow | — | **dashed + arrow** (player run) |
| `cut` | solid + arrow | **solid + arrow** (player movement) | dashed + arrow |
| `move` | solid + arrow | solid + arrow | dashed + arrow |
| `pass` | dashed + arrow (throw) | **dashed + arrow** (pass) | **solid + arrow** (pass) |
| `dribble` | — | **wavy + arrow** | **wavy + arrow** |
| `screen` / `block` | solid, ⊥ T-bar terminator | solid, ⊥ T-bar (screen) | solid, ⊥ T-bar |
| `shot` | — | solid + arrow | **double line + arrow** |
| `handoff` / `pull` | solid + arrow | — | — |
| `motion` (pre-snap) | dashed (faint) + arrow | dashed | dashed |

**Note the inversion:** in basketball a **dashed** line is a *pass* and a **solid** line is a *cut*; in soccer a **solid** line is a *pass* and a **dashed** line is a *run*. This is not a Schematex choice — it is how the two coaching communities actually draw, and the rendered legend matches the sport so the reader is never misled.

Terminators: `arrow` (open arrowhead), `tee` (perpendicular bar = screen/block), `none`.

---

## 4. Players & placement

### 4.1 By formation / set

| Sport | Keyword | Presets |
|---|---|---|
| Football | `formation` / `set` | `i-form`, `shotgun`, `singleback`, `pistol`, `spread`, `trips` (`trips-right` / `trips-left`), `empty`, `goal-line`, `wishbone` — with optional strength `left`/`right`. Roster ids: `LT LG C RG RT` (line), `QB RB FB`, receivers `X Z H Y` (Y = TE). |
| Basketball | `set` / `formation` | `horns`, `1-4-high`, `1-4-low`, `box`, `spread-pnr`, `4-out`, `5-out`. Players numbered `1`–`5` (1 = PG … 5 = C). |
| Soccer | `formation` | `4-4-2`, `4-3-3`, `4-2-3-1`, `4-5-1`, `4-4-1-1`, `3-5-2`, `3-4-3`. Players numbered by position (`1` = GK … `11`), attacking toward +x. |

### 4.2 Individually

```
player <id> <pos> at <x>,<y> label <text>
```

`pos` ∈ `o c ol qb rb wr te x dl lb db s gk` (offense circle / centre square / defender X / goalkeeper triangle …). Explicit `player` rows override or augment the formation roster — used for set-piece and free-form diagrams (e.g. the soccer overlap example uses `view half` + explicit players for full control).

### 4.3 Symbols

- **Offense** — numbered/lettered **circle** (filled white, navy label). Centre = **square** (football `C`). Goalkeeper = **triangle** (soccer, keeper-yellow).
- **Defense / opponent** — **X** glyph (red), optional small position label (`C M S W` etc. for football coverage, `X` for basketball/soccer).
- **Ball** — football: small ellipse on the LOS.

---

## 5. Field / court / pitch markings

Each module draws its standards-correct surface; the shared renderer frames it with an **out-of-bounds surround band**, a rounded **surface base**, and a **boundary line**, then clips the internal markings.

- **Football** — yard lines every 5 yds, yard numbers (counting to the goal when `goal` is set), NFL/NCAA hash marks (`hash nfl|college|none`), line of scrimmage (bold), end-zone band + gold goal line + goalpost when in the red zone (`goal N`), the ball on the LOS.
- **Basketball** — NBA half-court: lane/paint, free-throw circle (r = 6 ft), backboard + rim, restricted-area arc (r = 4 ft), three-point line (corners at x = ±22 ft + arc r = 23.75 ft), centre circle. Drawn on **light maple hardwood** (never green) with a mid-wood apron.
- **Soccer** — IFAB pitch: mowing stripes, halfway line, centre circle (r = 9.15 m) + spot, both penalty areas (16.5 × 40.32 m) + goal areas (5.5 × 18.32 m) + penalty spots (11 m) + penalty arcs (clipped to the part outside the box), goals, and 1 m corner arcs.

---

## 6. Defensive overlays (`defense`)

| Sport | Schemes |
|---|---|
| Football | `4-3`, `3-4`, `4-4`, `nickel`, `dime` (fronts) · `cover-0/1/2/3/4/6` (coverage shells — draw deep-zone bubbles) |
| Basketball | `man` (X matched a step toward the basket per offensive player) · `zone-2-3`, `zone-3-2`, `zone-1-3-1` |
| Soccer | `low-block`, `mid-block`, `high-press` (opponent compressed to a band by line height) |

---

## 7. DSL grammar

```
playbook "Title" sport football|basketball|soccer
field [down N] [distance N] [los N] [goal N] [hash nfl|college|none] [view full|half]
formation <name> [left|right]      # or: set <name>
defense <scheme>
player <id> <pos> at <x>,<y> label <text>

# football
route <player> <namedRoute> [depth] [left|right]
run <player> <concept> [left|right]
handoff <qb> <back>
pull <lineman> [left|right]
block <blocker> <target>

# basketball / soccer / shared
pass <from> <to>              # <to> = player id | landmark | x,y (via "to x,y")
cut <player> <landmark|to x,y>
dribble <player> to <x,y>
run <player> to <x,y>
screen <screener> <target>
shot <player> [to <x,y>]
motion <player> to <x,y>
zone <x>,<y> <rx>,<ry> "label"
view half|full
```

Named routes (route tree): `go fly streak vertical slant flat hitch out in dig curl comeback corner flag post wheel cross drag seam`. Run concepts: `dive iso power counter sweep toss draw trap`. CJK quotes (`“…”` `「…」`) are normalised. Labels and coordinates accept landmark refs resolved at layout time.

---

## 8. Validation

The engine rejects (error panel) or warns on the mistakes an LLM actually makes:

- unknown `sport` / `formation` / `set` / `defense` / named route (with the valid set listed);
- malformed `player` declaration;
- out-of-range field values.

Warnings (rendered, non-fatal — the offending move is skipped, the rest of the diagram still draws) surface the softer issues: a move whose **source** or **target** player id was never declared, a destination ref that resolves to no landmark/coordinate, and a target-based move (`pass`/`shot`/`screen`) missing its destination.

---

## 9. Theming

`PlaybookTokens` (in `core/theme.ts`) — **default** (broadcast grass green for football/soccer turf; light maple hardwood for basketball; navy ink, red defense, gold goal accents), **monochrome** (print/regulator — shape- and dash-based, no colour), **dark** (night-game turf / dim hardwood).

**Soccer has no dark variant** (a pitch reads as a daylight surface; `theme: dark` falls back to `default` for soccer). Basketball and football honour all three. The basketball court is **always hardwood, never green** — green is reserved for the grass sports.

---

## 10. Worked examples (the shipped set)

Five canonical plays per sport (see `website/content/examples/playbook-*.mdx`):

- **Football** — Four Verticals (Air Raid, vs Cover 2) · Mesh · Smash · Power O · Red-Zone Play-Action Fade (shows end zone + goalposts).
- **Basketball** — Spread Pick & Roll · Horns Twist · Give & Go · Floppy Action · Backdoor Cut.
- **Soccer** — 4-3-3 Team Shape · Build-Up From the Back · Overlap & Cross · High Press · Counter-Attack.

---

## 11. Deferred (not in v0.1)

- Additional sports (ice hockey, lacrosse, futsal, volleyball, rugby) — additive via new `SportModule`s.
- Multi-frame / animated plays; sequence numbering of steps.
- Football: full 11-personnel defensive fits, blitz paths, pass-protection slides; auto-drawn coverage responsibilities.
- Basketball: full-court sets, transition, BLOB/SLOB inbounds frames, continuity-offense multi-phase.
- Soccer: set-piece libraries (corner/free-kick routines as presets), pressing-trigger annotations, opponent build-up shapes that spatially agree with our press.
- Auto-spacing / collision avoidance of overlapping route labels and defender tags.
