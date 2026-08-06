# 38 — Bowtie Risk Diagram Standard Reference

*The bowtie is the single most recognisable picture in process-safety and barrier-based risk management: a central **top event** (the moment control of a hazard is lost) with **threats** fanning in from the left through chains of **preventative barriers**, and **consequences** fanning out to the right through chains of **mitigative barriers** — the whole thing shaped like a bow tie. Schematex implements the rigid, symmetric five-element structure with **escalation factors** that hang off individual barriers, and — like `prisma` — its edge is that the diagram is **correct by construction**: every threat must reach the top event through at least one barrier, every consequence must hang off it through at least one barrier, and the engine validates this before it renders a single shape.*

> **Primary References:**
> - **CCPS (Center for Chemical Process Safety) & Energy Institute** (2018). *Bow Ties in Risk Management: A Concept Book for Process Safety.* Wiley / AIChE. ISBN 978-1119490395. — **the definitive reference**; co-authored by CCPS and the Energy Institute, it fixes the element vocabulary (hazard, top event, threat, consequence, preventative/mitigative barrier, escalation factor, escalation-factor barrier) and the "barrier rule set" that separates a well-formed bowtie from a Swiss-cheese cartoon. When this doc says "the standard", it means this book.
> - **Reason, James** (1990). *Human Error.* Cambridge University Press. ISBN 978-0521314190 — the **Swiss Cheese Model** of accident causation; the conceptual lineage of layered, independently-fallible barriers ("slices of cheese", the holes being barrier failures). The bowtie is the engineered, auditable descendant of Reason's metaphor.
> - **ISO 31000:2018** — *Risk management — Guidelines.* — the framework context (risk = effect of uncertainty on objectives; the bowtie is one of the techniques used inside an ISO 31000 process).
> - **IEC 31010:2019** — *Risk management — Risk assessment techniques.* — explicitly lists **bow tie analysis** (§B.4.6) as a recognised technique, alongside FTA and ETA; the nearest thing to a normative standard that names the method.
> - **ICAO Doc 9859** — *Safety Management Manual*, 4th ed. (2018). — aviation safety management; bowtie is a primary SMS hazard-analysis tool and the source of much non-process-industry practice.
> - **CGE Risk Management Solutions / Wolters Kluwer — BowTieXP** and **bowtiemaster.com** — the *de-facto tool conventions* (colour coding, escalation-factor placement, barrier-chain rendering) that practitioners recognise on sight. The canonical colour scheme below is theirs.
> - **Wikipedia** — *Bow-tie diagram (risk management)* and *Swiss cheese model* — useful overview and the standard textbook figure.
>
> *Notes on the standard landscape.* **There is no single ISO/IEC standard that prescribes the bowtie's geometry or appearance** — the same situation as DFD (§31, no ISO) and breadboard (§26, Fritzing convention). IEC 31010 *names* and *defines* the method but draws no normative diagram; the CCPS/EI concept book is the closest the field has to a canonical specification, and the BowTieXP/bowtiemaster.com tool conventions are the de-facto visual baseline. Schematex therefore treats the **CCPS/EI 2018 element vocabulary and barrier rule set as the semantic spec**, the **BowTieXP/bowtiemaster colour scheme as the visual baseline**, and documents every deviation explicitly in §10.

---

## 0. Positioning

**The bowtie is the integrating picture of barrier-based risk management.** It answers, for one hazard, the two questions a regulator, a board, or an operator actually asks: *what could make this go wrong, and what stops it?* (left), and *if it does go wrong, what happens, and what limits the damage?* (right). It is mandated or strongly recommended across oil & gas, chemical processing, aviation (ICAO SMS), rail, mining, healthcare, and increasingly in enterprise risk and cyber-security. Its power is communicative: a single A3 bowtie puts the entire defence-in-depth story for one major-accident scenario in front of a non-specialist.

**The bowtie joins a NEW Schematex cluster: "Risk & Reliability Engineering."** Its sibling is **Fault Tree Analysis** (FTA, §37, in parallel development). The two are deeply related — in fact a fully-developed bowtie *is* an FTA glued to an event tree: the left wing, read backwards, is the fault tree whose top event is the bowtie's top event, and the right wing is the event tree that propagates that top event into consequences. CCPS/EI 2018 makes this explicit. Schematex keeps them as **two engines** because their day-to-day use differs sharply:

- **FTA** is *quantitative and Boolean* — AND/OR gates, basic-event probabilities, minimal cut sets, a probability rollup to the top event.
- **Bowtie** is, at its core, *qualitative and symmetric* — it does not roll up probabilities; its value is the barrier inventory and the at-a-glance defence-in-depth story.

**The differentiator — be clear-eyed.** Because a basic bowtie has no probability arithmetic, Schematex's edge here is **not** computation (that is FTA's and PERT's story). It is two things:

1. **A rigid, correct-by-construction symmetric layout.** No general-purpose text-diagram tool produces a real bowtie. Mermaid and D2 can draw boxes and arrows but have no notion of "the centre is a top event with two mirror-image wings of barrier chains"; you get a lopsided flowchart, not a bowtie. There is **no free, embeddable, text-first bowtie renderer** — the field lives in BowTieXP (commercial desktop), Visio templates, and PowerPoint. Schematex closes that gap exactly as `prisma` did for the four-row evidence-synthesis figure.
2. **Structural validation against the barrier rule set.** The thing that separates a real bowtie from a Swiss-cheese doodle (Reason 1990; CCPS/EI's "barrier rule set") is that *every threat reaches the top event through ≥ 1 preventative barrier*, *every consequence hangs off the top event through ≥ 1 mitigative barrier*, and *every escalation factor attaches to a specific named barrier*. Schematex enforces these as parse/layout errors with plain-English messages — a threat with no barrier is rejected, not silently drawn.

Optional barrier-effectiveness scoring, LOPA-style quantification, and linking to a full FTA/ETA are **Deferred** (§11) — the v0.1 engine ships the qualitative, validated, correct-by-construction diagram.

---

## 1. Relation to Existing Schematex Engines

| Engine | What it does | Why bowtie needs its own engine |
|---|---|---|
| **`fishbone`** (§13, Ishikawa) | Many causes converging on **one** effect; a category taxonomy (6M) on a slanted-rib spine | Fishbone is **unidirectional and single-sided** — causes → one effect, no notion of "what happens after". The bowtie is **bidirectional**: the top event sits in the *middle*, with causes (threats) on the left **and** outcomes (consequences) on the right. Crucially, fishbone has no concept of a **barrier** — the entire point of a bowtie is the controls *between* cause and event, which fishbone cannot express. A fishbone says "these things cause the problem"; a bowtie says "these things could cause it, *here is what stops them*, and if it happens anyway, *here is what limits it*." |
| **`faulttree`** (§37, FTA — sibling) | Boolean AND/OR gate tree from basic events up to a top event; quantitative probability rollup, minimal cut sets | FTA is the *quantitative left wing in isolation*. The bowtie is the *qualitative integrating view* with a symmetric right wing (consequences) that FTA lacks entirely, plus barriers as first-class objects (FTA has gates and events, not barriers). In mature practice an FTA often sits **behind** a single threat line and an event tree **behind** a single consequence line; the bowtie is the management-facing summary above them. Same cluster, complementary abstraction. |
| **`flowchart`** (§14, Sugiyama DAG) | Generic layered directed graph, free-form boxes + arrows | A bowtie is not a free DAG: it has a **fixed five-element grammar** (hazard / top event / threat / barrier / consequence) and a **forced symmetric geometry** (centre knot, mirror wings). A generic layered layout produces a lopsided graph that a process-safety reviewer will reject; it cannot enforce the barrier rule set. |
| **`decisiontree`** (§17) | Branching decision/chance/outcome rollback | Different semantics — sequential choice and expected-value, not a static barrier inventory around one event. |

`bowtie` reuses Schematex's shared SVG primitives (`src/core/svg.ts`), the box/rounded-rect/ellipse shapes, orthogonal connector routing, and `BaseTheme` tokens. It does **not** reuse the flowchart layout engine — its layout is a bespoke symmetric band model (§5).

---

## 2. The Vocabulary

This is the full element set from CCPS/EI 2018. The **v0.1** column marks what the first release renders; everything else is specified so the DSL and types don't have to change to add it later. Per the project rule, **v0.1 covers the complete core element vocabulary** (all eight elements below), not a partial subset.

### 2.1 The eight core elements

| Element | Meaning (CCPS/EI 2018) | Position | Conventional shape / colour | v0.1 |
|---------|------------------------|----------|-----------------------------|:----:|
| **Hazard** | The operation, activity, or material with the potential to cause harm — the *context* the bowtie is about (e.g. "Working at height", "Hydrocarbon under pressure"). Sits above the top event as a header. | top, above centre | rounded box, neutral / yellow header | ✅ (optional) |
| **Top Event** | The moment control of the hazard is **lost** — the release point (e.g. "Loss of containment", "Person falls from height"). The knot of the bowtie. Exactly one per diagram. | dead centre | **circle** (BowTieXP uses a coloured disc; bowtiemaster green) | ✅ |
| **Threat** | A credible cause that, on its own, could trigger the top event (e.g. "Guardrail removed for access"). Each threat is the start of one left-wing line. | left edge, stacked rows | box, **orange** | ✅ |
| **Preventative (proactive) barrier** | A control on a threat line that *stops the threat from reaching the top event*. One or more in **series** along each threat line (a barrier chain). | left wing, between threat and centre | box, **grey** | ✅ |
| **Consequence** | An outcome if the top event occurs (e.g. "Fatality", "Serious injury"). Each consequence is the end of one right-wing line. | right edge, stacked rows | box, **red** | ✅ |
| **Mitigative (reactive / recovery) barrier** | A control on a consequence line that *reduces or limits the consequence after* the top event. One or more in series along each consequence line. | right wing, between centre and consequence | box, **grey** | ✅ |
| **Escalation factor** (a.k.a. defeating / degradation factor) | A condition that *degrades a specific barrier's effectiveness* (e.g. "Edge protection not inspected", "Operator fatigue"). Attaches to **one** barrier, not to the line. | drops vertically off the barrier it degrades | box, **amber** | ✅ |
| **Escalation-factor barrier** | A control placed on an escalation factor — it protects the barrier from being degraded (e.g. "Pre-use inspection regime"). | below its escalation factor | box, grey | ✅ |

### 2.2 The 7-step build methodology (practitioner workflow)

The bowtiemaster.com / CCPS workflow that the DSL is shaped to follow. Each step carries a *quality question* the analyst should answer — the doc surfaces these so an AI prompt can walk a user through building a sound bowtie:

| Step | Action | Quality question(s) to satisfy |
|------|--------|-------------------------------|
| **1** | **Identify the Hazard** | Is it a real source of harm inherent to the operation (not an event)? Is it phrased as a *thing/activity*, not a failure? |
| **2** | **Identify the Top Event** | Is it the precise moment of *loss of control*, not a cause and not yet a consequence? Is there exactly one? |
| **3** | **Identify the Threats** | Could this threat, *on its own*, cause the top event (it is sufficient, not just contributory)? Is each threat a distinct credible cause, not a barrier failure in disguise? |
| **4** | **Identify the Consequences** | Is this a credible outcome *of the top event* (not of the threat)? Is it an end-state, severe enough to manage? |
| **5** | **Identify the Preventative Barriers** | Does each barrier *independently* interrupt the threat → top-event path? Is it a real control (detect / decide / act), not an objective or a hope? |
| **6** | **Identify the Mitigative Barriers** | Does each barrier *independently* reduce the consequence after the top event? Recovery-oriented, not preventative? |
| **7** | **Identify the Escalation Factors** | What specific condition could *defeat* this barrier? Is there a control on the escalation factor itself (an escalation-factor barrier)? |

The "barrier rule set" (CCPS/EI 2018) underlies steps 5–7: a barrier must be *effective* (can stop/mitigate on its own), *independent* (not defeated by the same thing that defeats its neighbour), and *auditable* (a real, maintainable control). Schematex does not judge effectiveness (qualitative v0.1) but **does** enforce the structural half of the rule set (§5.6).

### 2.3 The bowtie = fault tree + event tree (lineage)

CCPS/EI 2018 and IEC 31010 both describe the bowtie as a **fault tree joined to an event tree at the top event**:

```
      … Fault Tree …  ──►  TOP EVENT  ──►  … Event Tree …
   (threats + preventative)   (knot)    (consequences + mitigative)
```

Schematex renders the *bowtie abstraction* (threats/barriers/consequences), not the gate-level FTA/ETA. Where the analyst wants the gate-level detail behind a threat, that is a **separate `faulttree` diagram** (§37) — linking the two is Deferred (§11).

---

## 3. Symbol Table

```
                              ┌─────────────────────────┐
                              │   HAZARD (header box)   │   neutral / yellow, optional
                              └────────────┬────────────┘
                                           │
  THREATS (orange)      PREVENTATIVE (grey, chained)        ╭─────────╮       MITIGATIVE (grey, chained)     CONSEQUENCES (red)
  ┌──────────┐  ┌────────────┐ ┌────────────┐              │  TOP    │       ┌────────────┐ ┌────────────┐  ┌──────────┐
  │ Threat 1 │──│ Barrier 1a │─│ Barrier 1b │──────────────│  EVENT  │───────│ Barrier A1 │─│ Barrier A2 │──│ Conseq A │
  └──────────┘  └─────┬──────┘ └────────────┘              ╰─────────╯       └────────────┘ └────────────┘  └──────────┘
                      │ (escalation drops vertically)
                ┌─────┴────────┐
                │ Escalation   │   amber
                │   factor     │
                └─────┬────────┘
                      │
                ┌─────┴────────┐
                │ EF barrier   │   grey
                └──────────────┘

  ┌──────────┐                                              ╭─────────╮                                       ┌──────────┐
  │ Threat 2 │──│ Barrier 2a │──────────────────────────────│  (same  │───────│ Barrier B1 │─────────────────│ Conseq B │
  └──────────┘  └────────────┘                              │  knot)  │       └────────────┘                 └──────────┘
                                                            ╰─────────╯
```

| Element | Shape | Default fill (conventional) | CSS class |
|---------|-------|-----------------------------|-----------|
| Hazard | rounded rect (header) | yellow / neutral | `sx-bowtie-hazard` |
| Top event | **circle** | green disc | `sx-bowtie-topevent` |
| Threat | rect | orange | `sx-bowtie-threat` |
| Preventative barrier | rect | grey | `sx-bowtie-barrier` + `data-side="prevent"` |
| Mitigative barrier | rect | grey | `sx-bowtie-barrier` + `data-side="mitigate"` |
| Consequence | rect | red | `sx-bowtie-consequence` |
| Escalation factor | rect | amber | `sx-bowtie-escalation` |
| Escalation-factor barrier | rect | grey | `sx-bowtie-ef-barrier` |
| Line (threat→…→centre→…→conseq) | polyline, filled arrowhead | base stroke | `sx-bowtie-line` |
| Escalation connector | vertical line, no arrowhead | base stroke (muted) | `sx-bowtie-escalation-line` |

CSS class prefix: `sx-bowtie-*`. All strokes/fills come from the theme (§6); no inline styles (hard constraint #3).

---

## 4. DSL Grammar

Hand-authorable, indentation-structured, AI-friendly. Header keyword is **`bowtie`** (single lowercase word, per Schematex convention). `detect()` matches a first non-comment line beginning with `bowtie`.

The DSL is shaped to mirror the **7-step methodology** (§2.2): you declare the hazard, then the top event, then each threat with its barrier chain (indented), then each consequence with its barrier chain. Escalation factors nest under the barrier they degrade; an escalation-factor barrier nests under the escalation factor.

### 4.1 Worked example — minimal "person falls from height"

```
bowtie
hazard "Working at height"
topevent "Person falls from height"

threat "Guardrail removed for access"
  prevent "Permit-to-work system"
  prevent "Temporary edge protection"
    escalation "Edge protection not inspected"
      barrier "Pre-use inspection regime"

threat "Fragile roof surface"
  prevent "Crawling boards + signage"

consequence "Fatality"
  mitigate "Fall-arrest harness + lanyard"
  mitigate "Rescue plan + first aid"

consequence "Serious injury"
  mitigate "Safety netting below"
```

*Reads as: the hazard is working at height; loss of control is a person falling. Two threats each pass through a preventative chain; one barrier ("Temporary edge protection") has an escalation factor ("not inspected") that is itself controlled by a "Pre-use inspection regime". Two consequences each have a mitigative chain.*

### 4.2 Worked example — process-safety "loss of containment"

```
bowtie "LPG storage — loss of containment"
hazard "LPG stored under pressure"
topevent "Loss of containment (release of LPG)"

threat "Corrosion of vessel wall"
  prevent "Corrosion-resistant coating"
  prevent "Periodic UT thickness inspection"
    escalation "Inspection interval too long"
      barrier "Risk-based inspection (RBI) scheme"
  prevent "Cathodic protection"

threat "Overpressure during filling"
  prevent "High-pressure trip (SIL 2)"
  prevent "Pressure relief valve"

threat "Mechanical impact (vehicle)"
  prevent "Bollards / vehicle barriers"

consequence "Jet fire"
  mitigate "Gas detection + ESD"
  mitigate "Deluge / water spray"
  mitigate "Fire-rated separation distance"

consequence "Vapour cloud explosion"
  mitigate "Gas detection + ESD"
  mitigate "Ignition-source control (ATEX zoning)"

consequence "Toxic / asphyxiation exposure"
  mitigate "Personal gas monitors"
  mitigate "Emergency evacuation plan"
```

### 4.3 EBNF

```ebnf
diagram        = header , newline ,
                 [ hazard_line ] ,
                 topevent_line ,
                 { threat_block } ,
                 { consequence_block } ,
                 { directive } ;

header         = "bowtie" , [ string ] ;            (* optional title *)

hazard_line    = "hazard" , string ;                (* optional, exactly one if present *)
topevent_line  = "topevent" , string ;              (* MANDATORY, exactly one *)

(* ---- left wing ---- *)
threat_block   = "threat" , string , newline ,
                 { prevent_block } ;                (* >= 1 required by validation, see §5.6 *)
prevent_block  = indent1 , "prevent" , string , newline ,
                 { escalation_block } ;
escalation_block = indent2 , "escalation" , string , newline ,
                   { ef_barrier_line } ;
ef_barrier_line  = indent3 , "barrier" , string , newline ;

(* ---- right wing ---- *)
consequence_block = "consequence" , string , newline ,
                    { mitigate_block } ;            (* >= 1 required by validation, see §5.6 *)
mitigate_block = indent1 , "mitigate" , string , newline ,
                 { escalation_block } ;             (* mitigative barriers can also be degraded *)

(* ---- directives (any order, top or bottom) ---- *)
directive      = "layout:" , ("symmetric" | "compact") , newline
               | "legend:" , ("on" | "off" | position) , newline
               | "theme:" , theme_name , newline ;

(* ---- lexical ---- *)
indent1        = "  " ;          (* 2 spaces  — barrier under a threat/consequence  *)
indent2        = "    " ;        (* 4 spaces  — escalation under a barrier          *)
indent3        = "      " ;      (* 6 spaces  — EF-barrier under an escalation       *)
string         = '"' , { char } , '"'                     (* straight quotes        *)
               | "「" , { char } , "」"                     (* CJK corner quotes      *)
               | "“" , { char } , "”" ;                    (* CJK / smart quotes     *)
position       = "bottom" | "bottom-right" | "top" ;
theme_name     = "default" | "monochrome" | "dark" ;
newline        = "\n" ;
comment        = ( "#" | "//" ) , { char } , newline ;
```

Notes:
- A barrier under a `threat` is a **preventative** barrier; under a `consequence` it is **mitigative**. The keyword is `prevent` vs `mitigate` to make the side explicit and AI-unambiguous, but the *indentation level* is what binds it to its line. The `barrier` keyword at indent3 is reserved for the escalation-factor barrier (its side is implied by its parent).
- Barrier **order** along a line is declaration order (first declared = closest to the threat/consequence, i.e. outermost in defence-in-depth; last = closest to the top event). This matches the left-to-right reading of a real bowtie.

### 4.4 AI-friendliness rules

Mirrors the project-wide "Made for AI" pillar (cf. §4.4 of 34-PETRINET):

- **CJK quotes** (`「…」`, `『…』`, `“…”`) accepted everywhere straight `"…"` is — LLMs frequently emit smart/corner quotes when generating Chinese labels.
- **Ordering tolerance.** Threats and consequences may be declared in any interleaved order; the parser groups all left-wing blocks and all right-wing blocks regardless of declaration sequence. (Internally it sorts threats above threats and consequences above consequences for stable layout.) An author can write all threats then all consequences, or alternate — both parse identically.
- **Barrier-chain length is free** (1..n). A threat with a single barrier and a threat with five barriers both lay out; the wing simply extends.
- **Readable structural errors** rather than silent fixes:
  - A `threat` with **no** `prevent` barrier → *"Threat 'X' has no preventative barrier — every threat must reach the top event through at least one barrier (CCPS/EI barrier rule). Add a `prevent` line under it."* (§5.6)
  - A `consequence` with **no** `mitigate` barrier → the mirror message.
  - An `escalation` not nested under a barrier → *"Escalation factor 'X' is not attached to a barrier — escalation factors must degrade a specific named barrier."*
  - More than one `topevent`, or none → *"A bowtie has exactly one top event."*
- **Whitespace forgiveness.** Tabs are normalised to the 2-space indent ladder; trailing whitespace ignored; blank lines between blocks are decorative.
- **Quotes optional for single bareword labels** but recommended; any label containing a space must be quoted.

---

## 5. Layout Rules

Layout is deterministic — no force simulation, no randomness (golden-string e2e tests stay stable). It is a **bespoke symmetric band model**, *not* the flowchart layered-DAG engine, because the geometry is prescribed, not solved.

### 5.1 Coordinate model (constants, px)

```
  TOPEVENT_R          = 46     top-event circle radius (the knot)
  NODE_W              = 132    threat / consequence / barrier box width
  NODE_H              = 44     box height
  BARRIER_W           = 120    barrier box width (slightly narrower than threat/conseq)
  WING_X_STEP         = 168    horizontal pitch between adjacent barriers in a chain
                               (= BARRIER_W + connector gap)
  ROW_BAND_H          = 96     vertical band allocated to one threat/consequence line
  ROW_GAP             = 24     gap between adjacent row bands
  EF_DROP             = 72     vertical drop from a barrier to its escalation factor
  EF_GAP              = 16     gap between escalation factor and its EF-barrier
  CENTER_GUTTER       = 40     clear space each side of the top-event circle
  HAZARD_GAP          = 40     vertical gap from hazard header down to top event
  PAGE_PAD            = 32     outer padding on all sides
```

### 5.2 Vertical placement — row bands

1. The diagram has a horizontal **centre axis** `cy`. The top event circle is centred on `(cx, cy)`.
2. The **left wing** stacks threats in row bands; the **right wing** stacks consequences in row bands. Each line (threat-line or consequence-line) owns one band of height `ROW_BAND_H`.
3. Bands are **centred vertically about `cy`**: with `n` threat lines, the threat block spans `n × ROW_BAND_H + (n−1) × ROW_GAP` and is centred on `cy`. The consequence block is centred on `cy` independently. The taller of the two wings sets the diagram height; the shorter wing is vertically centred within it.
4. A line's barriers, its threat/consequence box, and its connecting polyline all sit on that band's centre-line `by` — so a single threat line is read straight across.
5. **Escalation factors** drop **downward** from the barrier they degrade by `EF_DROP`; if two escalation factors in adjacent bands would collide, the lower band is pushed down by the overflow (bands are not fixed-pitch when escalation factors are present — height grows). EF-barriers stack a further `EF_GAP + NODE_H` below their escalation factor.

### 5.3 Horizontal placement — barrier-chain x-stepping

1. The top event is at `cx`. Its left edge is `cx − TOPEVENT_R`; right edge `cx + TOPEVENT_R`.
2. **Left wing** (threats): walking *outward* from the centre, the innermost preventative barrier (last declared) is at `x = cx − TOPEVENT_R − CENTER_GUTTER − BARRIER_W`; each further-out barrier steps left by `WING_X_STEP`; the threat box sits one `WING_X_STEP` beyond the outermost barrier. So a threat with `k` barriers occupies `k + 1` columns to the left of the knot.
3. **Right wing** (consequences): the mirror image — innermost mitigative barrier (first declared) at `x = cx + TOPEVENT_R + CENTER_GUTTER`, stepping right; the consequence box beyond the outermost barrier.
4. The wing with the **longest chain** sets that wing's outer extent; shorter chains on the same side are **right-justified toward the centre** (left wing) / **left-justified toward the centre** (right wing) so all threats align their barrier-adjacent edges — i.e. barriers form neat columns where chain lengths match, and ragged-but-centre-anchored where they differ. (Threat/consequence boxes therefore align to the *outer* edge per wing for a clean fan.)

> **NEEDS VICTOR INPUT** — chain alignment policy when chains differ in length. Two defensible choices: (a) **centre-anchored** (barriers nearest the knot align in a column; outer boxes ragged) — proposed default, reads as defence-in-depth depth; or (b) **outer-anchored** (threat boxes align in a clean left column; inner barriers ragged) — reads as a tidy threat list. Proposed default: **(a) centre-anchored**. Cost of either: trivial; one justification flag.

### 5.4 Line routing

1. Each threat line is a **polyline**: threat box → barrier → barrier → … → top-event circle boundary. Segments are horizontal where boxes share a band centre-line; a barrier-to-knot final segment angles into the circle boundary at the correct band height (the wings *fan* into the knot).
2. Arrowheads: a single filled triangle where the line meets the **top-event circle** (left wing) and where the line leaves the **top-event circle** to the consequence (right wing) — the flow direction is threat → top event → consequence throughout. Barrier-to-barrier segments are plain (barriers are *on* the line, not separate flows).
3. **Escalation connectors** are short vertical lines from the bottom edge of a barrier down to its escalation factor, then to the EF-barrier — drawn with no arrowhead and a muted stroke, to read as "attached to / degrades" rather than "flows into".

### 5.5 Hazard header

If a `hazard` is declared, it renders as a header box centred horizontally on `cx`, `HAZARD_GAP` above the top of the top-event circle, with a short vertical tie-line down to the circle. It is purely contextual — no threat or consequence connects to it.

### 5.6 Structural validation (the barrier rule set — correct by construction)

Before layout, the engine validates and **refuses to render** on failure (parse error), mirroring how `prisma` refuses missing counts:

1. **Exactly one top event.** Zero or ≥ 2 → error.
2. **Every threat has ≥ 1 preventative barrier.** A bare threat → error (a threat with no barrier is a Swiss-cheese cartoon, not a bowtie).
3. **Every consequence has ≥ 1 mitigative barrier.** Mirror of (2).
4. **Every escalation factor is attached to a barrier** (it cannot float on a line or on the top event).
5. **At least one threat and at least one consequence** (a bowtie with only one wing is an FTA or an ETA, not a bowtie — point the author to §37 / event-tree).

Validation messages name the offending element and the rule, in plain English (§4.4). This structural half of the CCPS/EI barrier rule set is what makes the Schematex bowtie *correct by construction*; the *qualitative* half (is the barrier truly effective / independent?) is the analyst's judgement, not the engine's, and is out of scope for v0.1.

---

## 6. Styles & Theme Design

Bowtie belongs to the **`BaseTheme` + semantic extension** family (like `prisma`, `pert`, `flowchart`, `petri`) — *not* the forced-monochrome industrial family. The field has a **strongly recognised colour scheme** (BowTieXP / bowtiemaster.com): orange threats, grey barriers, a coloured top-event disc, red consequences, amber escalation factors. We reproduce it in the `default` theme as the de-facto baseline, keep it fully themeable, and fall back to shape/label distinction in `monochrome` (where a print bowtie is also common — many regulator submissions are black-and-white).

### 6.1 The `BowtieTokens` semantic extension

Add to `src/core/theme.ts`, alongside `PetriTokens` / `FlowchartTokens`:

```ts
export interface BowtieTokens {
  hazardFill: string;        // hazard header box
  hazardStroke: string;
  topEventFill: string;      // the central knot disc
  topEventStroke: string;
  threatFill: string;        // left-edge cause boxes — conventional orange
  threatStroke: string;
  barrierFill: string;       // preventative + mitigative barriers — conventional grey
  barrierStroke: string;
  consequenceFill: string;   // right-edge outcome boxes — conventional red
  consequenceStroke: string;
  escalationFill: string;    // escalation / degradation factors — conventional amber
  escalationStroke: string;
  efBarrierFill: string;     // escalation-factor barriers — grey (= barrierFill)
  lineStroke: string;        // the threat→topevent→consequence flow line
  escalationLineStroke: string; // muted "degrades" connector
  labelText: string;
}
```

`resolveBowtieTheme(name)` follows the established pattern: `{ ...BASE_THEMES[name], ...BOWTIE_TOKENS[name] }`.

### 6.2 Per-theme values

**`default`** — the recognised BowTieXP/bowtiemaster palette, mapped onto `BaseTheme` semantic slots so it stays coherent with the rest of Schematex (threat = `warn`, consequence = `negative`, escalation = a softer warn/amber, top event = `positive`, barrier = `neutral`):

| Token | Value | Rationale |
|-------|-------|-----------|
| `hazardFill` | `#fef9c3` (pale yellow) | conventional yellow hazard header |
| `hazardStroke` | `#ca8a04` | |
| `topEventFill` | `#dcfce7` / disc `#22c55e` ring | **green disc** knot (bowtiemaster) |
| `topEventStroke` | `#16a34a` (`positive`) | |
| `threatFill` | `#fed7aa` (orange 200) | **orange** threats (de-facto) |
| `threatStroke` | `#ea580c` (`warn`-ish) | |
| `barrierFill` | `#e5e7eb` (grey 200) | **grey** barriers (de-facto) |
| `barrierStroke` | `#6b7280` (`neutral`) | |
| `consequenceFill` | `#fecaca` (red 200) | **red** consequences (de-facto) |
| `consequenceStroke` | `#dc2626` (`negative`) | |
| `escalationFill` | `#fde68a` (amber 300) | **amber** escalation factors (de-facto) |
| `escalationStroke` | `#d97706` | |
| `efBarrierFill` | `#e5e7eb` | = barrier grey |
| `lineStroke` | `#334155` (`stroke`) | the main flow line |
| `escalationLineStroke` | `#9ca3af` (`strokeMuted`) | muted "degrades" tie |
| `labelText` | `#0f172a` (`text`) | |

**`monochrome`** — regulator-print stance; colour can't carry meaning, so the element distinction rides on **shape + position + a label tag**, not fill:

| Token | Value |
|-------|-------|
| `hazardFill` | `#ffffff` (header drawn with a double top border) |
| `topEventFill` | `#ffffff` (disc with a bold double ring) |
| `topEventStroke` | `#000000` |
| `threatFill` | `#ffffff` |
| `threatStroke` | `#000000` |
| `barrierFill` | `#f2f2f2` (light grey is still legible in print and distinguishes barriers) |
| `barrierStroke` | `#000000` |
| `consequenceFill` | `#ffffff` |
| `consequenceStroke` | `#000000` |
| `escalationFill` | `#ffffff` (drawn with a dashed border to mark "degrades") |
| `escalationStroke` | `#000000` |
| `lineStroke` | `#000000` |
| `escalationLineStroke` | `#000000` (dashed `4 3`) |
| `labelText` | `#000000` |

> Principle (shared with `venn` / `petri`): in `monochrome`, semantics that ride on colour in `default` fall back to a **shape/border distinction** — escalation factors get a dashed border, the top event a doubled ring — so a black-and-white print stays unambiguous. Position (threat=left edge, consequence=right edge, barrier=on the line) already disambiguates most elements.

**`dark`** — Schematex slate/blue dark palette, mirroring `DARK_THEME`: `threatFill` peach `#fbbf24`, `consequenceFill` red `#f87171`, `escalationFill` yellow `#facc15`, `topEventFill` green `#34d399`, `barrierFill` surface `#202b3d`, `lineStroke` `#f8fafc`. Bodies on `#0f172a`.

### 6.3 Stroke & type scale (reuse `theme.ts` constants)

- Box / circle / line strokes: `STROKE_WIDTH.normal` (2). Top-event ring emphasis: `STROKE_WIDTH.thick` (3).
- Escalation connector: `STROKE_WIDTH.thin` (1).
- Threat/consequence/barrier labels: `FONT_SIZE.label` (12); escalation labels: `FONT_SIZE.small` (10); top-event label: `FONT_SIZE.body` (13, wrapped inside the disc); title: `FONT_SIZE.title` (16).
- Font: `DEFAULT_FONT_FAMILY`. Long labels wrap inside the box via the shared `wrapTextInRect` primitive.

### 6.4 House-style rule (one sentence)

**Threat = warn-orange (left), consequence = negative-red (right), top event = positive-green knot (centre), barriers = neutral-grey on the line, escalation = amber dropping below; the flow line in `stroke` neutral; in `monochrome` colour falls back to shape/border + position.** This keeps the bowtie visually a member of the `prisma`/`pert`/`flowchart`/`petri` family while reproducing the colour scheme practitioners expect.

---

## 7. Legend

Per the auto-derive legend rules (`LEGEND-SYSTEM.md`): the universal bowtie conventions — left = threats, centre = top event, right = consequences — are domain-common-knowledge once the reader knows it is a bowtie, but the **colour coding is non-obvious to a first-time reader**, so the legend auto-derives entries for the encodings actually present:

- threat (orange) — always (≥ 1 threat is mandatory);
- preventative vs mitigative barrier (grey, with the side tag) — always;
- consequence (red) — always;
- top event (green disc) — always;
- escalation factor (amber) — only when present;
- escalation-factor barrier — only when present.

DSL controls follow the shared system: `legend: on/off/<position>`, `legend.title:`. Default position `bottom-inline`.

---

## 8. Output Contract

- Root `<svg>` carries `data-diagram-type="bowtie"`, `role="img"`, `aria-label` = title or "Bowtie risk diagram".
- `<title>` / `<desc>` summarise the hazard, the top event, the threat count, the consequence count, the total barrier count, and any escalation factors — e.g. *"Bowtie: hazard 'Working at height', top event 'Person falls from height'; 2 threats, 2 consequences, 4 barriers, 1 escalation factor."*
- Hazard: `<g class="sx-bowtie-hazard" data-role="hazard">`.
- Top event: `<g class="sx-bowtie-topevent" data-role="topevent">`.
- Threats: `<g class="sx-bowtie-threat" data-role="threat" data-id="…">`.
- Consequences: `<g class="sx-bowtie-consequence" data-role="consequence" data-id="…">`.
- Barriers: `<g class="sx-bowtie-barrier" data-role="barrier" data-side="prevent|mitigate" data-line="<threat|consequence id>" data-order="n">` — `data-order` is the chain position (0 = outermost). Interactivity hooks (hover a barrier to highlight its line) ride on `data-line`.
- Escalation factors: `<g class="sx-bowtie-escalation" data-role="escalation" data-barrier="<barrier id it degrades>">`.
- Escalation-factor barriers: `<g class="sx-bowtie-ef-barrier" data-role="ef-barrier" data-escalation="…">`.
- Lines: `<g class="sx-bowtie-line" data-line="…">`; escalation connectors `<g class="sx-bowtie-escalation-line">`.
- Theme via `resolveBowtieTheme`; strokes/fills from tokens only — no inline styles.

---

## 9. Canonical Test Cases

Fixtures the implementation must satisfy (parser + layout + golden-string e2e). Each lists the DSL and the assertions that matter.

### TC-1 — Minimal: one threat, one consequence, one barrier each
```
bowtie
topevent "Loss of containment"
threat "Corrosion"
  prevent "Inspection programme"
consequence "Release to atmosphere"
  mitigate "Gas detection + ESD"
```
*Assert:* exactly one top-event circle centred at `(cx, cy)`; one threat box on the left edge, one preventative barrier between it and the knot; one consequence box on the right edge, one mitigative barrier between knot and it; both wings have one band, centred on `cy`; structural validation passes; `<desc>` reports "1 threat, 1 consequence, 2 barriers".

### TC-2 — Multi-threat, multi-consequence (the symmetric fan)
```
bowtie "LPG — loss of containment"
hazard "LPG stored under pressure"
topevent "Loss of containment"
threat "Corrosion"
  prevent "UT inspection"
threat "Overpressure"
  prevent "High-pressure trip"
threat "Vehicle impact"
  prevent "Bollards"
consequence "Jet fire"
  mitigate "Deluge"
consequence "Vapour cloud explosion"
  mitigate "Ignition-source control"
```
*Assert:* 3 threat bands stacked and centred on `cy`; 2 consequence bands stacked and centred on `cy`; the taller (left) wing sets diagram height, the right wing is vertically centred within it; hazard header centred above the knot with a tie-line; all lines fan into / out of the circle boundary at their band heights.

### TC-3 — Barrier chain of length ≥ 2 (defence in depth)
```
bowtie
topevent "Person falls from height"
threat "Guardrail removed for access"
  prevent "Permit-to-work system"
  prevent "Temporary edge protection"
  prevent "Spotter / banksman"
consequence "Fatality"
  mitigate "Fall-arrest harness"
  mitigate "Rescue plan + first aid"
```
*Assert:* the threat line shows 3 preventative barriers in series, x-stepped by `WING_X_STEP`, declaration order = outer→inner (Permit-to-work outermost, Spotter nearest the knot); the consequence line shows 2 mitigative barriers; `data-order` 0/1/2 on the left, 0/1 on the right.

### TC-4 — Escalation factor with its own barrier
```
bowtie
topevent "Loss of containment"
threat "Corrosion"
  prevent "UT thickness inspection"
    escalation "Inspection interval too long"
      barrier "Risk-based inspection scheme"
consequence "Release"
  mitigate "Gas detection"
```
*Assert:* "UT thickness inspection" barrier drops a muted vertical connector to an amber escalation-factor box `EF_DROP` below it; that box drops a further connector to a grey escalation-factor barrier; the threat band height grows to accommodate the drop without colliding with any consequence band; `data-barrier` on the escalation links it to the UT barrier.

### TC-5 — Minimal compliant barrier coverage
```
bowtie
topevent "Loss of containment"
threat "Corrosion"
  prevent "Corrosion monitoring programme"
consequence "Release"
  mitigate "Gas detection"
```
*Assert:* the smallest valid bowtie still includes one preventative barrier for every threat and one mitigative barrier for every consequence. Omitting either barrier fails with a readable CCPS/EI barrier-rule diagnostic; an `escalation` at top level similarly raises the unattached-escalation error.

---

## 10. Deviations From the Standard

- **No single normative standard exists** (see References). Schematex adopts CCPS/EI 2018 for the *element vocabulary and barrier rule set*, and the BowTieXP/bowtiemaster.com *colour scheme and escalation-factor placement* as the visual baseline. Tools differ in minor styling (some draw the top event as a diamond or a rounded box rather than a circle); Schematex defaults to the **green circle** because it is the most widely recognised "knot" and visually distinguishes the centre from the rectangular threats/consequences. A `topevent-shape:` override is Deferred (§11).
- **Barrier rule set — structural half only.** The engine enforces the *structural* rules (every threat/consequence has ≥ 1 barrier; escalation factors attach to a barrier) but does **not** judge barrier *effectiveness or independence* — those are analyst judgements, qualitative, and out of scope for a renderer. We surface the 7-step quality questions (§2.2) for human/AI use instead.
- **No probability rollup.** Unlike FTA (§37), the v0.1 bowtie is qualitative — it carries no frequencies, PFDs, or LOPA credits. Barrier-effectiveness scoring and LOPA quantification are Deferred (§11). This is honest to the basic-bowtie practice that dominates the field; quantified bowties (BowTieXP "barrier criticality") are a specialist extension.
- **Escalation factors render below the barrier line.** Some tools render escalation factors above or in a separate "escalation lane". Schematex drops them downward for a consistent, collision-managed layout; the side is purely visual and carries no semantics.
- **Exactly one hazard, one top event.** Multi-hazard "bowtie books" (several bowties sharing barriers) are a portfolio artefact, not one diagram — Deferred (§11).

---

## 11. Deferred (post-v0.1)

Each has a conceptual slot in §2 so adding it is additive — no DSL or type breakage:

- **Barrier effectiveness / LOPA quantification** — per-barrier PFD / effectiveness rating, barrier criticality, frequency rollup threat→top-event→consequence (the quantified bowtie / LOPA-on-a-bowtie). This is the single largest extension and the boundary toward FTA/ETA quantification.
- **Barrier types / categories** — classifying barriers as hardware / human / procedural, active / passive, or by the IEC 61511 SIS taxonomy; rendered as an icon or tag on the barrier box.
- **Linking to a full FTA / ETA** — a threat line that expands into a `faulttree` (§37) sub-diagram, and a consequence line that expands into an event tree; the "drill-down" that BowTieXP supports.
- **Multi-hazard / bowtie books** — several bowties sharing common barriers, with cross-references (a barrier appearing on multiple bowties).
- **Accountabilities & metadata per barrier** — owner, criticality, performance standard, verification activity, KPI — the "barrier management" data layer (CCPS/EI "managing barriers" chapter) rendered as a hover card or a side table.
- **`topevent-shape:` and per-element colour overrides** beyond theme tokens.
- **Degradation controls vs escalation-factor barriers nuance** — CCPS/EI distinguishes several sub-types of escalation control; v0.1 renders them all as a single grey EF-barrier box.

---

*End of standard. No single ISO/IEC standard governs the bowtie's appearance; this doc adopts CCPS/EI 2018 for semantics and BowTieXP/bowtiemaster.com for visual baseline. Sibling: `faulttree` (§37) in the Risk & Reliability cluster. See `../../CoCEO/schematex/impl/` for the implementation plan when scheduled.*
