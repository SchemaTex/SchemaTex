# 37 — Fault Tree Analysis (FTA) Standard Reference

*The deductive, top-down reliability formalism — start from one undesired **top event** (a system failure) and decompose it through Boolean **gates** (AND / OR / …) down to **basic events** (component failures) whose probabilities are known. Schematex implements the classic NUREG-0492 symbol set with a text DSL designed for AI generation and — exactly as `pert` computes the schedule and `petri` computes the marking — **the engine computes the minimal cut sets and the top-event probability**, not just static gate shapes. The computed cut sets are highlighted as a first-class render feature.*

> **Primary References:**
> - **IEC 61025:2006 Ed. 2.0** — *Fault tree analysis (FTA).* International Electrotechnical Commission, Geneva. — *The international standard. Defines the qualitative and quantitative methods, the event/gate vocabulary, and (Annex A) the graphical symbols. When this doc says "the standard," IEC 61025 is the cross-industry baseline.* https://cdn.standards.iteh.ai/samples/12812/877551080d2e42c3b1241586fa45d9c0/IEC-61025-2006.pdf
> - **NUREG-0492** — Vesely, W.E.; Goldberg, F.F.; Roberts, N.H.; Haasl, D.F. (1981). *Fault Tree Handbook.* U.S. Nuclear Regulatory Commission, Washington DC. — *The canonical symbol set and method reference; the figures in §III ("Symbology — The Building Blocks of the Fault Tree") are the de-facto visual baseline that every later tool copies. Free PDF.* https://www.nrc.gov/docs/ML1007/ML100780465.pdf
> - **NASA (2002)** — Stamatelatos, M.; Vesely, W.; et al. *Fault Tree Handbook with Aerospace Applications, Version 1.1.* NASA Office of Safety and Mission Assurance, Washington DC. — *The modern update of NUREG-0492; identical symbology, expanded quantification (cut-set probability, importance measures) and worked aerospace cases.* https://www.mwftr.com/CS2/Fault%20Tree%20Handbook_NASA.pdf
> - **Fussell, J.B.; Vesely, W.E.** (1972). "A New Methodology for Obtaining Cut Sets for Fault Trees." *Trans. Am. Nucl. Soc.* **15**: 262–263. — *The original MOCUS (Method of Obtaining Cut Sets) top-down algorithm — the cut-set engine Schematex implements.*
> - **SAE ARP4761** — *Guidelines and Methods for Conducting the Safety Assessment Process on Civil Airborne Systems and Equipment.* — *Civil-aerospace FTA practice; same symbols.*
> - **Wikipedia, "Fault tree analysis."** https://en.wikipedia.org/wiki/Fault_tree_analysis — *Lists the standards landscape (NUREG-0492 · NASA · ARP4761 · MIL-HDBK-338 · IEC 61025) and the conventional symbol shapes used here.*
>
> *Notes on the standard landscape.* FTA's **method** is heavily standardised (IEC 61025 defines the math; NUREG-0492 / NASA define the procedure) but, like Petri nets, the **graphics are light-touch in the formal text** — IEC 61025 Annex A even allows alternative gate symbols. Schematex therefore treats **NUREG-0492 / NASA's figures as the visual baseline** (circle = basic, diamond = undeveloped, house = external, rectangle = intermediate/top, the dome AND-gate and the shield OR-gate) and documents every deviation in §10. FTA's sister diagram in the new cluster, the **bowtie** (a fault tree spliced to an event tree at a central hazard), shares this symbol set on its left/cause side.

---

## 0. Positioning

**Fault Tree Analysis is the single most widely deployed reliability/safety technique in regulated engineering** — invented at Bell Labs (1962, H.A. Watson, for the Minuteman missile), formalised by Boeing and the US NRC in the 1970s, and now mandatory or recommended by IEC 61025 (cross-industry), NUREG-0492 (nuclear), SAE ARP4761 (civil aerospace), ISO 26262 (automotive), and MIL-HDBK-338 (defence). Reliability engineers, safety analysts, and process-hazard teams draw fault trees daily. The notation is small and instantly recognisable: a *rectangle* is the failure being analysed, a *dome* is an AND gate, a *shield* is an OR gate, and the *circles* at the bottom are the component failures you actually have data for.

**A new domain cluster: 🛡 Risk & Reliability Engineering.** Schematex's existing clusters cover relationships, electrical/industrial, corporate/legal, causality, process, UML, and research. None of them owns the safety-engineering family. This doc proposes a new cluster row in `00-OVERVIEW.md`:

| Cluster | Diagrams | Standards |
|---|---|---|
| 🛡 **Risk & Reliability** | fault tree (FTA) · bowtie (sibling, in parallel) | IEC 61025 · NUREG-0492 · NASA FT Handbook 2002 · CCPS bowtie · ISO 17776 |

Fault tree and bowtie are natural siblings: a bowtie is literally *a fault tree (the causes, on the left) joined to an event tree (the consequences, on the right) at a central top/hazard event*. They share the basic-event/gate vocabulary, the cut-set math, and the `ReliabilityTokens` theme defined in §6. (This doc does **not** depend on the bowtie file existing — it only references it as a sibling.)

**Naming: the keyword is `faulttree`.** Schematex keywords are single lowercase words (`bpmn`, `sld`, `usecase`, `petri`, `sequence`). `faulttree` follows that rule, is unambiguous, and is SEO-aligned with the search term "fault tree." `detect()` also accepts **`fta`** as an alias (the universal acronym), but the canonical header is `faulttree`. We reject the shorter `tree` (collides with phylo / decisiontree / taxonomy) and `ft` (too cryptic).

**The differentiator is the cut sets, not the dome.** Anyone can draw a dome and a circle — draw.io and Lucidchart ship a fault-tree shape stencil and stop there; the result is a picture, not a model. A *real* FTA engine knows that the tree is a Boolean function and **computes its minimal cut sets** (the irreducible combinations of basic-event failures that cause the top event) and the **top-event probability** from per-event probabilities. That is the whole point of drawing a fault tree, and it is precisely the stance `pert` takes toward scheduling and `petri` toward the marking: the render is downstream of the semantics. The reference image Victor supplied — green gates, circular basic events, **minimal cut sets boxed in red** — makes "highlight the computed cut sets" a first-class render feature, driven by `analysis:` directives (§2.4, §4, §5.6).

---

## 1. Relation to Existing Schematex Engines

Three existing engines look adjacent. They are semantically different, and the doc must keep `faulttree` sharply distinct from each.

| Engine | Coverage | Why fault tree is different |
|---|---|---|
| `logic` (§07, IEEE 91 / IEC 60617-12) | Combinational/sequential **netlist** — left→right signal flow, gates wired by named nets, flip-flops, buses | FTA gates *look like* logic gates (the AND dome, the OR shield), but the semantics are **opposite in orientation and meaning**: a logic diagram is a left-to-right circuit where a gate transforms *signals*; a fault tree is a **top-down reliability tree** where a gate decomposes the *cause* of a failure (output on top, inputs hanging below). A fault tree has a single **root** (the top event), per-leaf **probabilities**, and the deliverable is **minimal cut sets + P(top)** — none of which exist in `logic`. There is no signal flow, no fan-out reuse of "nets," no flip-flops. `faulttree` reuses the *symbol style* of `logic`'s AND/OR/XOR but nothing of its layout or analysis. |
| `decisiontree` (§17, Howard-Raiffa / CART) | Probability tree — decision (□) / chance (○) / outcome (△) nodes; the math is **expected-value rollback** | Both are probability trees, but the *math is unrelated*. Decision-tree rollback computes `EV(chance) = Σ pᵢ·EVᵢ`, `EV(decision) = max EVᵢ` to pick the best **decision**. FTA computes **Boolean failure logic**: a cut set is a *conjunction of basic events*, P(top) comes from *cut-set probabilities*, and there is no decision to optimise — only a failure probability to estimate. A chance node's children must sum to 1; an FTA gate's inputs are independent events with no sum constraint. Different node shapes, different edges (FTA edges are unlabeled structural links, not probability-weighted branches), different deliverable. |
| `fishbone` (§13, Ishikawa) | Cause-and-effect spine — qualitative brainstorm of contributing causes by category | Fishbone is **qualitative and unquantified** — a spine of categorised causes with no logic and no math. FTA is **quantitative and Boolean** — the causes are joined by AND/OR gates with a defined truth function, and the engine computes cut sets and probability. Fishbone answers "what might contribute?"; FTA answers "exactly which combinations cause it, and how likely?" |
| **bowtie** (sibling, parallel) | Hazard analysis — threats → barriers → top event → barriers → consequences | The bowtie's **left half is a fault tree** (the causes converging on the central hazard). They share basic events, gates, cut-set math, and `ReliabilityTokens`. Bowtie adds the right-hand event-tree / barrier side. `faulttree` is the deeper Boolean engine; bowtie is the management-facing skin. |

**Layout reuse.** Fault tree inherits the **layered top-down tree** machinery already shared by `decisiontree` (Reingold-Tilford / Walker tidy tree) and `flowchart` layering — top event at the root, each gate directly below the event it feeds, inputs hanging below the gate, basic/undeveloped/house events as leaves. A shared **basic event can be a leaf of more than one gate** (a repeated event / DAG, not a strict tree), so layout uses the tidy-tree skeleton with a **shared-leaf duplication or merge** pass (§5.4) — this is the one place naive tree layout breaks, and it is also where naive cut-set algorithms break (§2.4, TC-3). No force simulation; deterministic for stable golden-string tests.

---

## 2. The Vocabulary (what the standard contains)

The full NUREG-0492 / IEC 61025 vocabulary. The **v0.1 column** marks what the first release renders; everything else is specified here so the DSL and types don't change to add it later. Per the project rule, **v0.1 covers the complete *coherent static* fault-tree vocabulary** (all events + the AND/OR/XOR/VOTING/INHIBIT/PAND gates + transfers + the cut-set & probability engine), deferring only dynamic-fault-tree gates and advanced importance measures (§11).

### 2.1 Event symbols (NUREG-0492 §III)

| Concept | Meaning | Notation | v0.1 |
|---|---|---|:--:|
| **Top event** | the single undesired system failure being analysed; the tree root; output of the first gate | **rectangle** ▭ (the root, emphasised) | ✅ |
| **Intermediate event** | a fault that is *itself* the output of a lower gate; an internal node | **rectangle** ▭ | ✅ |
| **Basic event** | a primary component failure, developed no further; **the leaves that carry probability** | **circle** ○ | ✅ |
| **Undeveloped event** | an event not developed further — insufficient information or insignificant consequence | **diamond** ◇ | ✅ |
| **Conditioning event** | a specific condition/restriction applied to a gate; **only attaches to INHIBIT and PRIORITY-AND** | **ellipse / oval** ⬭ | ✅ |
| **External / House event** | a normally-expected event (not a fault); a boolean **forced true (1) or false (0)** — used to switch parts of the tree on/off | **house** ⌂ (rectangle with a triangular roof; sometimes drawn as a pentagon) | ✅ |

> *Top vs intermediate* are the same rectangle shape; they differ only by tree position (root vs internal) and are tagged `data-role`. A **house event = 0** prunes its sub-branch from the Boolean function; **house = 1** forces it — this is how analysts toggle scenarios, and the cut-set engine honours it (§2.4).

### 2.2 Gate symbols (NUREG-0492 §III)

Gates take input events (drawn **below**) and produce one output event (drawn **above**, on the gate's top pin). Orientation is the mirror of a `logic` gate: **output up, inputs down**.

| Gate | Output occurs iff | Notation | v0.1 |
|---|---|---|:--:|
| **AND** | **all** inputs occur | flat-bottomed **dome** ("D" lying on its flat side, output pin on the curved top) | ✅ |
| **OR** | **at least one** input occurs | curved/pointed **shield** with a **concave-curved bottom edge** (inputs enter the concave base) | ✅ |
| **Exclusive-OR (XOR)** | **exactly one** input occurs | OR shield + an extra arc through the base (logic-gate XOR convention) | ✅ |
| **Voting / k-out-of-n** | **at least k of the n** inputs occur | OR-shield body labelled **`k/n`** (e.g. `2/3`) | ✅ |
| **Priority-AND (PAND)** | all inputs occur **in a specified left-to-right order** | AND dome + a **conditioning ellipse** stating the order condition | ✅ (order parsed; sequence is rendered + flagged, see §10) |
| **Inhibit** | the single input occurs **and** the attached conditioning event holds | **hexagon** with a conditioning **ellipse** on its side | ✅ |
| **NOT / NAND / NOR** | negation-bearing gates | dome/shield + a bubble | ⬜ deferred — *non-coherent; rare in real fault trees (§11)* |
| **Dynamic gates** (PAND-with-timing, SPARE, FDEP, SEQ) | dynamic-fault-tree (Dugan) semantics | DFT symbols | ⬜ deferred (§11) |

> **Coherent fault trees.** Real safety fault trees are almost always **coherent** (monotone — adding a failure never *fixes* the system), so NOT/NAND/NOR are rare and are deferred. v0.1 targets the coherent subset, which keeps the cut-set algorithm sound (§2.4).

### 2.3 Transfer symbols (NUREG-0492 §III)

For splitting a large tree across pages/subtrees:

| Symbol | Meaning | Notation | v0.1 |
|---|---|---|:--:|
| **Transfer-out** | "this branch is developed elsewhere, under name X" — a link *out* | **triangle** with the link name, attached *below* an intermediate event | ✅ |
| **Transfer-in** | "the subtree named X is inserted here" — the matching link *in* | **triangle** at the top of the named subtree | ✅ |

> Transfers let one DSL document define a named subtree once and reference it from several places, *or* split rendering across pages. v0.1 resolves transfers **in-document** (the named subtree is spliced in for cut-set computation and rendering; the triangle is drawn at the splice point). Multi-file / multi-page transfer is deferred (§11).

### 2.4 Computed analysis (the differentiator)

This is the point of the engine — the equivalent of `pert`'s critical path and `petri`'s enabled set.

| Concept | Meaning | Rendering | v0.1 |
|---|---|---|:--:|
| **Minimal cut set (MCS)** | a set of basic events whose *simultaneous* occurrence causes the top event, such that **no proper subset is also a cut set** | each MCS **boxed in red** (the reference-image look); listed in `<desc>` + exposed via `data-cutset` | ✅ |
| **Cut-set order** | the cardinality of an MCS (a 1-event MCS = a single point of failure) | order-1 MCS flagged as SPOF in `<desc>` | ✅ |
| **Top-event probability** `P(top)` | computed from per-basic-event probabilities via the cut sets (rare-event approx; MCUB; note exact inclusion-exclusion) | annotated near the top event when `show: probability`; per-event `p` rendered beside circles | ✅ |
| **Repeated / shared basic event** | a basic event appearing under more than one gate — the case naive algorithms get wrong | drawn once or duplicated with a shared-id tag; cut-set engine applies Boolean **absorption / idempotence** | ✅ |
| **Minimal path set** | dual of a cut set: a set of events whose *non-occurrence* guarantees the top event does not occur | reported in `<desc>` on request | ⬜ deferred (§11) |
| **Importance measures** | Birnbaum, Fussell-Vesely, RAW, RRW — ranking how much each basic event drives P(top) | reported / colour-ramped | ⬜ deferred (§11) |

**The cut-set algorithm — MOCUS (Method of Obtaining Cut Sets), Fussell-Vesely 1972.** This is the algorithm Schematex implements; it is simple enough to hand-write and is the textbook method. It is a **top-down Boolean expansion** of the tree into a sum-of-products, with two structural facts:

> **AND gates increase the *order* (size) of a cut set; OR gates increase the *number* of cut sets.**

Procedure (top-down substitution):

1. **Start** with a single-row matrix containing only the top gate: `{ {T} }`. Rows are conjunctions (cut sets in progress); the set of rows is a disjunction.
2. **Pick** any row containing an unexpanded gate `G`. Let `G`'s inputs be `i₁ … iₙ`.
   - **If `G` is an OR gate:** replace that one row with `n` rows, each identical to the original but with `G` swapped for one input `iⱼ`. *(OR multiplies the number of rows.)*
   - **If `G` is an AND gate:** replace `G` *in place* in that row with all `n` inputs `i₁ … iₙ` (the row grows). *(AND grows the row.)*
   - **VOTING `k/n`:** expand to the OR of all `C(n,k)` AND-combinations of `k` inputs (then proceed as above).
   - **XOR (2-input):** `A ⊕ B = (A ∧ ¬B) ∨ (¬A ∧ B)`; in the *coherent* approximation Schematex uses, XOR is treated as OR for cut-set generation and the exact form is noted in `<desc>` (§10).
   - **INHIBIT / PAND:** expand like AND over their inputs; the conditioning event is carried as an extra literal (a basic event) in the row.
   - **House = 1:** treated as constant TRUE — dropped from the row (absorbed). **House = 0:** constant FALSE — the entire row is deleted.
3. **Repeat** step 2 until **no row contains a gate** — every row is now a pure conjunction of basic events (a candidate cut set).
4. **Minimise** the set of rows:
   - **Idempotence** within a row: `A ∧ A = A` (drop duplicate literals — this is where *repeated events* are handled correctly).
   - **Absorption** across rows: if cut set `X ⊆ Y`, delete the superset `Y` (`X ∨ (X ∧ Z) = X`).
   - Drop exact duplicate rows.
   The survivors are the **minimal cut sets**.

Complexity is worst-case exponential (inherent — MCS enumeration is NP-hard), so v0.1 caps expansion and reports a readable warning past a configurable bound (§10); for the small/medium trees that humans and LLMs author, MOCUS is fast and exact. BDD-based methods are deferred (§11).

**Top-event probability.** Given independent basic-event probabilities `P(eᵢ)` and minimal cut sets `C₁ … Cₘ` (each `Cⱼ` a conjunction):

- **Cut-set probability:** `P(Cⱼ) = ∏_{eᵢ ∈ Cⱼ} P(eᵢ)` (independence assumption).
- **Rare-event approximation (default, fast, conservative upper bound):**
  `P(top) ≈ Σⱼ P(Cⱼ)` — valid when event probabilities are small; over-estimates otherwise.
- **Minimal-cut-set upper bound (MCUB), tighter:**
  `P(top) ≈ 1 − ∏ⱼ (1 − P(Cⱼ))`.
- **Exact (inclusion-exclusion):**
  `P(top) = Σ P(Cⱼ) − Σ_{j<k} P(Cⱼ ∩ Cₖ) + Σ P(Cⱼ ∩ Cₖ ∩ Cₗ) − …`,
  where `P(Cⱼ ∩ Cₖ)` is the product over the *union* of literals (so repeated events are not double-counted). Exact is exponential in the number of cut sets; v0.1 offers it as an opt-in (`prob: exact`) for small trees, with rare-event the default.

---

## 3. Symbol Table

ASCII/Unicode depictions; the canonical shapes are NUREG-0492 §III. CSS class prefix `sx-ft-*`; all strokes/fills from the theme — no inline styles (hard constraint #3).

```
EVENTS
  Top / Intermediate event        Basic event         Undeveloped event
       ┌──────────────┐               ╭───╮                  ╱╲
       │  Pump fails   │              │   │                  ╱  ╲
       └──────┬───────┘               ╰───╯                  ╲  ╱
              │  (gate hangs below)   p=0.003                 ╲╱
                                                            (no data)

  Conditioning event            External / House event
      ⬭───────────⬭                 ┌────────┐
     (  order /     )               ╱  roof   ╲      ← house = forced 0/1
      ⬭ condition ⬭                 ├─────────┤
       (only on INHIBIT/PAND)       │ Power on │
                                    └──────────┘

GATES   (output pin on TOP, inputs enter the BASE)
   AND  (dome)            OR  (shield)           XOR              VOTING
        │ out                  │ out               │                │
     ╭──┴──╮               ╭───┴───╮           ╭───┴───╮        ╭───┴───╮
    ╱       ╲             ╱  ╲   ╱  ╲          ╱ ╲   ╱ ╲         ╱  2/3  ╲
   │  (AND)  │           │    ╲ ╱    │        │   ╲ ╱   │       │ (k/n)  │
   └─┬──┬──┬─┘           └─┬───┴───┬─┘        └┈┬──┴──┬┈┘       └┬──┬──┬─┘
     i1 i2 i3              i1      i2           i1    i2         i1 i2 i3
   (flat bottom)        (concave bottom)     (extra base arc)

   INHIBIT (hexagon + condition)        PRIORITY-AND (dome + order condition)
          │ out                                │ out
        ╱─────╲   ⬭─────────⬭               ╭──┴──╮  ⬭──────────⬭
       │ INHIB │ ( condition )             ╱  PAND ╲ ( i1 before i2 )
        ╲─────╱   ⬭─────────⬭             └─┬────┬─┘ ⬭──────────⬭
          │ in                              i1   i2

TRANSFER
   Transfer-out (link out)        Transfer-in (link in, top of named subtree)
       ┌────────┐                       ╱╲  "A1"
       │ branch │                      ╱  ╲
       └───┬────┘                     ╱ A1 ╲
          ╱╲  "A1"                   ────────
         ╱A1╲                         │ (subtree root below)
        ──────

COMPUTED ANALYSIS
   Minimal cut set    boxed in RED:  ┏━━━━━━━━━━━━┓
                                     ┃ {MSF, CDM} ┃   ← order-2 MCS
                                     ┗━━━━━━━━━━━━┛
   Single point of failure (order-1 MCS)  → red box around one circle + SPOF tag
   P(top) = 0.0041  annotated beside the top rectangle (show: probability)
```

---

## 4. DSL Grammar

Hand-authorable, indentation-tolerant, AI-friendly. Header keyword **`faulttree`** (alias `fta`). `detect()` matches a first non-comment line beginning with `faulttree` or `fta`. The DSL is **flat declaration + reference** (like `petri`/`logic`), not nesting-by-indentation, because fault trees are DAGs (repeated events) — a flat form expresses sharing without ambiguity, and is the most reliable shape for LLM generation.

### 4.1 Worked example — wafer-handling robot (NUREG-style, AND/OR mix + repeated event)

```
faulttree "Failure to remove product from tool"
  analysis: cutsets, probability

  top   T  "Failure to remove product from tool" = OR(G1, G2)
  gate  G1 "Robot arm jams or collides"          = AND(MSF, G3)
  gate  G2 "Wrong slot commanded"                = OR(CDM, MSF)
  gate  G3 "Loss of arm position feedback"       = OR(ESF, RCF)

  basic MSF "Manipulator system failure"  p: 0.0035
  basic CDM "Controller command error"    p: 0.0009
  basic ESF "Encoder sensor failure"      p: 0.0021
  basic RCF "Resolver cable fault"        p: 0.0012
```

*MSF feeds both G1 and G2 — a **repeated event**. MOCUS expands `T = OR(G1,G2) = OR( AND(MSF, OR(ESF,RCF)), OR(CDM,MSF) )`, then idempotence/absorption reduces it. Because `{MSF}` is a cut set (via G2), the AND-derived sets `{MSF,ESF}` and `{MSF,RCF}` are **absorbed** (supersets of `{MSF}`). Minimal cut sets: `{MSF}`, `{CDM}` — both order-1 single points of failure (boxed red). `P(top) ≈ P(MSF)+P(CDM) = 0.0044` (rare-event).*

### 4.2 Pressure-vessel rupture — voting, inhibit, house, undeveloped, transfer

```
faulttree "Pressure vessel ruptures"
  analysis: cutsets, probability
  prob: mcub
  layout: tb

  top  TOP "Pressure vessel ruptures" = AND(OVP, RELIEF_FAILS)

  gate OVP "Sustained over-pressure" = INHIBIT(PUMP_RUNAWAY) if HEATER_ON
  gate RELIEF_FAILS "Both relief paths fail" = VOTING(2/2; PRV_A, PRV_B)

  basic PUMP_RUNAWAY "Feed pump runaway"      p: 0.004
  basic PRV_A        "Relief valve A stuck"   p: 0.02
  basic PRV_B        "Relief valve B stuck"   p: 0.02
  house HEATER_ON    "Heater energised"       state: 1
  undeveloped EXT    "External fire (not modelled)"

  # large sub-cause developed on its own page
  transfer OVP -> "OVP-detail"
```

*`INHIBIT(PUMP_RUNAWAY) if HEATER_ON` = `PUMP_RUNAWAY ∧ HEATER_ON`; with `HEATER_ON` house = 1 it reduces to `PUMP_RUNAWAY`. `VOTING(2/2; …)` = `PRV_A ∧ PRV_B`. Minimal cut set: `{PUMP_RUNAWAY, PRV_A, PRV_B}` (order 3). `P(top) ≈ 0.004·0.02·0.02 = 1.6e-6`.*

### 4.3 EBNF

```ebnf
diagram     = header , { directive | event | gate | transfer | comment } ;
header      = ("faulttree" | "fta") , [ string ] , newline ;    (* optional title *)

directive   = "analysis:" , analysis_item , { "," , analysis_item } , newline
            | "prob:"     , ("rare" | "mcub" | "exact") , newline   (* default rare *)
            | "layout:"   , ("tb" | "bt") , newline                 (* default tb, top at top *)
            | "style:"    , ("ansi" | "iec") , newline ;            (* gate symbol style; default ansi *)
analysis_item = "cutsets" | "probability" | "pathsets" | "none" ;

(* ---- events ---- *)
event       = top | intermediate | basic | undeveloped | house | conditioning ;
top         = "top"  , id , [ string ] , "=" , gate_expr , newline ;
intermediate= "gate" , id , [ string ] , "=" , gate_expr , newline ;  (* an intermediate event IS a gate output *)
basic       = "basic"       , id , [ string ] , [ prob ] , newline ;
undeveloped = "undeveloped" , id , [ string ] , [ prob ] , newline ;
house       = "house"       , id , [ string ] , [ "state:" , ("0" | "1") ] , newline ;
conditioning= "condition"   , id , [ string ] , [ prob ] , newline ; (* optional explicit decl; usually inline *)
prob        = ("p:" | "prob:") , number ;                            (* 0 ≤ p ≤ 1 *)

(* ---- gate expressions (the tree structure) ---- *)
gate_expr   = "AND"     , "(" , ref_list , ")"
            | "OR"      , "(" , ref_list , ")"
            | "XOR"     , "(" , ref_list , ")"
            | "VOTING"  , "(" , k "/" n , ";" , ref_list , ")"        (* k-of-n *)
            | "INHIBIT" , "(" , ref , ")" , "if" , cond
            | "PAND"    , "(" , ref_list , ")" , [ "order:" , ref_list ]
            | ref ;                                                   (* pass-through / single child *)
ref_list    = ref , { "," , ref } ;
ref         = id ;                                                    (* names a gate or an event *)
cond        = id | string ;                                          (* conditioning event id or inline text *)

(* ---- transfer ---- *)
transfer    = "transfer" , id , "->" , string , newline              (* transfer-out: develop `id` under name *)
            | "transfer" , string , "=" , gate_expr , newline ;      (* transfer-in: the named subtree *)

comment     = ( "#" | "//" ) , text , newline ;

id          = letter , { letter | digit | "_" } ;
string      = '"' , { char } , '"' | "「" , { char } , "」" ;        (* CJK quotes ok *)
number      = digit , { digit } , [ "." , { digit } ] | "1e-6" ... ; (* decimal or scientific *)
```

### 4.4 AI-friendliness rules

Mirrors the project-wide "Made for AI" pillar (per 34-PETRINET §4.4):

- **CJK quotes** (`「…」`, `『…』`, `"…"`) accepted wherever `"…"` is.
- **Forgiving syntax**: whitespace around `=`, `,`, `->` optional (`G1=AND(A,B)` == `G1 = AND(A, B)`); `p:` and `prob:` interchangeable on events.
- **Undeclared-reference is a readable error, not a silent guess.** An arc/gate referencing an unknown id reports *"gate G3 references undefined event 'XSF' (line 7)"* — naming the id and line. (Same stance as `petri`: the structure must be sound for the cut-set math to be meaningful.)
- **Single-root check is first-class**: a fault tree must have **exactly one `top`**; zero or multiple `top` declarations is a readable error.
- **Cycle check is first-class**: a gate that (transitively) references itself reports *"cycle detected: G1 → G3 → G1 — a fault tree must be acyclic"* (it's a DAG, not a general graph).
- **Probability range**: `p` outside `[0,1]` reports a plain-English error; an event with no `p` is treated as *symbolic* (cut sets still computed; probability reported as "n/a — missing p on {…}").
- **Conditioning-event placement check**: a `condition` / `if` clause on anything other than `INHIBIT` or `PAND` is rejected with an explanatory message (the standard restricts conditioning events to those two gates).
- **VOTING bounds**: `k/n` with `k > n` or `k < 1`, or `n` ≠ number of inputs, is a readable error.

---

## 5. Layout Rules

Deterministic — no force simulation, no randomness (golden-string e2e tests stay stable). Reuses the `decisiontree` / `flowchart` layered top-down tree primitives.

### 5.1 Coordinate model

```
Constants (px):
  EVENT_W            = 132     intermediate/top rectangle width
  EVENT_H            = 46      rectangle height
  BASIC_R            = 20      basic-event circle radius
  DIAMOND_W          = 40      undeveloped diamond width (= height)
  HOUSE_W            = 64      house width
  HOUSE_H            = 44      house body height (+ roof)
  COND_W             = 70      conditioning ellipse width
  COND_H             = 30      conditioning ellipse height
  GATE_W             = 56      gate body width (dome / shield / hexagon)
  GATE_H             = 40      gate body height
  GATE_GAP           = 10      vertical gap event-rect → its gate
  LEVEL_GAP          = 64      vertical gap between tree levels
  SIBLING_GAP        = 28      min horizontal gap between sibling subtrees
  PIN_LEN            = 12      pin stub length (gate top → parent, inputs → gate base)
  PROB_OFFSET        = 6       per-event p label offset
  CUTSET_PAD         = 6       red cut-set box padding around member events
```

### 5.2 Direction & layering

1. **Flow axis**: `layout: tb` (default, **top→bottom** — the top event is at the top, the textbook orientation) or `layout: bt` (rare).
2. **Level assignment**: longest-path layering from the top event downward. The top event is level 0; each gate sits at the same level as the event it feeds (drawn just below that rectangle, `GATE_GAP` under it); the gate's input events sit at the next level down.
3. **Repeated / shared events** are assigned to the **deepest** level at which any referencing gate places them (so a shared basic event sinks to the leaf band), then handled by §5.4.
4. **Within-level ordering**: tidy-tree (Reingold-Tilford / Walker) ordering inherited from `decisiontree`, minimising sibling-subtree overlap; leaf order follows DSL declaration order to keep output predictable.
5. **Coordinate assignment**: tidy-tree x-positioning; levels evenly spaced `LEVEL_GAP` on the flow axis.

### 5.3 Node rendering

1. **Top / intermediate event** → `EVENT_W × EVENT_H` rectangle; the top event gets the emphasised stroke (`STROKE_WIDTH.thick`) and `data-role="top"`.
2. **Gate** → drawn directly below its output rectangle, connected by a short pin: AND = dome path, OR/XOR/VOTING = shield path (VOTING carries the `k/n` label centred), INHIBIT = hexagon, PAND = dome with an order tag. Inputs attach to the gate's base; the output pin attaches to the rectangle's bottom edge.
3. **Basic event** → circle `BASIC_R`; **undeveloped** → diamond; **house** → house glyph (forced state shown as `=0`/`=1` tag); each leaf's `p` is rendered `PROB_OFFSET` below it when `show: probability`.
4. **Conditioning event** → ellipse drawn to the **side** of its INHIBIT/PAND gate, connected by a short flat stub (never below — it is a modifier, not an input).
5. **Transfer triangle** → drawn at the splice point (below the transfer-out rectangle / above the transfer-in subtree), carrying the link name.

### 5.4 Shared-leaf (repeated-event) handling

A basic event referenced by multiple gates is the DAG case. Two render modes, `repeated: duplicate` (default) or `repeated: merge`:

- **`duplicate`** (default, NUREG-0492 convention for readability): the event is **drawn once per referencing gate**, each instance tagged `data-shared-id="MSF"` and visually marked (a small dot/bar inside the circle, the classic "this circle appears elsewhere" mark). Layout stays a clean tree. The cut-set engine treats all instances as the **same Boolean variable** (idempotence handles the rest).
- **`merge`**: the event is drawn **once**, and edges from each referencing gate route to it (true DAG). Cleaner for small trees, busier routing for large ones.

Either way, **the cut-set math sees one variable** — this is the correctness point that separates a real engine from a shape stencil (TC-3).

### 5.5 Edge routing

1. Edges are **structural links** (no labels, unlike decision-tree probability branches): gate-base → child-event-top, orthogonal L-shaped (shared with `decisiontree` §5.2 routing), bend at the inter-level midpoint.
2. Output pins are vertical stubs; the top event has no incoming edge.
3. In `merge` mode, the extra edges to a shared leaf route around sibling subtrees with the flowchart orthogonal router.

### 5.6 Cut-set highlight rendering (the first-class feature)

After layout, the engine runs MOCUS (§2.4) and, when `analysis: cutsets` is active:

1. Each **minimal cut set** is rendered as a **red rounded box** (`CUTSET_PAD` padding) enclosing the basic-event instances that form it — matching the reference image. When a cut set's members are not adjacent, the box wraps the smallest enclosing region and is tagged `data-cutset="MSF,CDM"`.
2. **Order-1 cut sets (single points of failure)** get the red box around a single circle plus a `data-spof="true"` tag and a `<desc>` note.
3. Overlapping cut-set boxes (a shared event in several MCS) are drawn with slight offset + distinct `data-cutset-index`, so each is individually inspectable.
4. When `show: probability`, `P(top)` is annotated beside the top rectangle and each cut set's `P(Cⱼ)` is available via `data-cutset-prob`.

This is exactly the `pert` stance: the **red accent is reserved for the computed-critical thing** — there, the critical path; here, the cut sets / SPOFs.

---

## 6. Styles & Theme Design

> How fault-tree visuals derive from the existing Schematex token system, consistently with the other 35 diagrams — and the new cluster-wide `ReliabilityTokens`.

### 6.1 Where fault tree sits in the theme taxonomy

Schematex has two visual stances (see `00-OVERVIEW.md` §Theme System):

- **`IndustrialTokens`** — circuit / ladder / SLD / logic / FBD / SFC: *forced monochrome* under IEEE/IEC compliance, no colourful variant by design.
- **`BaseTheme` + a semantic extension** — most others (timeline, flowchart, venn, pert, petri): a tasteful house palette in `default`, true black/white in `monochrome`, Schematex slate/blue in `dark`.

**Fault tree belongs to the second group.** IEC 61025 even *permits alternative symbols* — it is not a forced-mono compliance drawing like a circuit schematic. The NUREG-0492 figures are black-and-white, so `monochrome` reproduces the textbook look faithfully, but real reliability tools (ReliaSoft BlockSim, Isograph, the reference image) freely use colour — green gates, red cut-set boxes. So a tasteful `default` colour theme is legitimate. This mirrors **`pert`** exactly: house body with **one reserved semantic accent (red)** for the computed-critical element — there the critical path, here the **cut sets / SPOFs**.

### 6.2 The `ReliabilityTokens` semantic extension (cluster-shared)

Because fault tree and the sibling **bowtie** share a vocabulary, the extension is named for the cluster, not the single diagram. Add to `src/core/theme.ts`, alongside `PetriTokens` / `PertTokens`:

```ts
export interface ReliabilityTokens {
  eventFill: string;        // intermediate/top rectangle interior
  eventStroke: string;      // rectangle border
  topEventStroke: string;   // emphasised root border
  basicFill: string;        // basic-event circle interior
  basicStroke: string;
  undevelopedFill: string;  // undeveloped diamond
  houseFill: string;        // house / external event
  conditionFill: string;    // conditioning ellipse
  gateFill: string;         // AND/OR/… gate body — the "go" green in default
  gateStroke: string;
  edgeStroke: string;       // structural links
  probText: string;         // per-event probability + P(top) numerals
  /** Computed minimal cut sets + single-point-of-failure boxes. Red = "this is the risk". Reserved accent. */
  cutsetStroke: string;
  cutsetFill: string;       // soft tint inside a cut-set box
  spofStroke: string;       // single-point-of-failure (order-1 MCS) — strongest red
}
```

`resolveReliabilityTheme(name)` follows the established pattern: `{ ...BASE_THEMES[name], ...RELIABILITY_TOKENS[name] }`.

### 6.3 Per-theme values

**`default`** — house palette; gates green (matching the reference image), cut sets red:

| Token | Value | Rationale |
|---|---|---|
| `eventFill` | `#ffffff` (`fill`) | clean white rectangle |
| `eventStroke` | `#334155` (`stroke`) | slate body line |
| `topEventStroke` | `#1e293b` (darker) | emphasised root |
| `basicFill` | `#ffffff` | white circle |
| `basicStroke` | `#334155` | |
| `undevelopedFill` | `#f1f5f9` (`fillMuted`) | muted diamond |
| `houseFill` | `#fef9c3` (warn-tint) | house stands out as a forced condition |
| `conditionFill` | `#f1f5f9` | neutral modifier |
| `gateFill` | `#dcfce7` (positive 50) | **green gates** — the reference look ("logic proceeds") |
| `gateStroke` | `#059669` (`positive`) | |
| `edgeStroke` | `#334155` (`stroke`) | |
| `probText` | `#2563eb` (`accent`) | probabilities pop in house blue |
| `cutsetStroke` | `#dc2626` (`negative`) | **red = the computed risk** |
| `cutsetFill` | `rgba(220,38,38,0.06)` | soft red tint |
| `spofStroke` | `#b91c1c` (negative 700) | strongest red — single point of failure |

**`monochrome`** — faithful NUREG-0492 textbook (print/compliance stance):

| Token | Value |
|---|---|
| `eventFill` / `basicFill` / `houseFill` / `conditionFill` | `#ffffff` |
| `eventStroke` / `basicStroke` / `gateStroke` / `edgeStroke` | `#000000` |
| `topEventStroke` | `#000000` (drawn with the thick stroke for emphasis) |
| `undevelopedFill` | `#ffffff` |
| `gateFill` | `#ffffff` — *colour can't carry meaning in mono*; the **dome vs shield shape** distinguishes AND from OR, not fill |
| `probText` | `#000000` |
| `cutsetStroke` / `spofStroke` | `#000000` — cut sets shown by a **bold dashed box**, not red |
| `cutsetFill` | `none` |

> Principle (shared with `venn`/`industrial`/`petri`): in `monochrome`, semantics that ride on colour in `default` fall back to **shape/weight** — bold-dashed box for cut sets, dome/shield shape for gate type — so a black-and-white print is still unambiguous.

**`dark`** — Schematex slate/blue dark palette, mirroring `DARK_THEME`:

| Token | Value |
|---|---|
| `eventFill` / `basicFill` | `#172033` (`fill`) |
| `eventStroke` / `basicStroke` / `edgeStroke` | `#f8fafc` (`stroke`) |
| `topEventStroke` | `#f8fafc` (thick) |
| `undevelopedFill` | `#202b3d` |
| `houseFill` | `#45413a` (warn-tint) |
| `conditionFill` | `#202b3d` |
| `gateFill` | `rgba(52,211,153,0.18)` (positive tint) |
| `gateStroke` | `#34d399` (`positive`) |
| `probText` | `#6d8fff` (`accent`) |
| `cutsetStroke` | `#f87171` (`negative`) |
| `cutsetFill` | `rgba(248,113,113,0.12)` |
| `spofStroke` | `#fb7185` |

### 6.4 Stroke & type scale (reuse `theme.ts` constants)

- Event / gate / edge body strokes: `STROKE_WIDTH.normal` (2).
- Top-event + cut-set-box emphasis: `STROKE_WIDTH.thick` (3) — same emphasis convention as proband / critical-path / enabled-ring elsewhere.
- Event id + label: `FONT_SIZE.label` (12); probability + `k/n`: `FONT_SIZE.small` (9); title: `FONT_SIZE.title` (16).
- Font: `DEFAULT_FONT_FAMILY`.

### 6.5 House-style rule (one sentence to remember)

**Body in `stroke`/`fill` neutrals; green (`positive`) reserved for gate bodies ("logic proceeds"); red (`negative`) reserved for the computed minimal cut sets and single points of failure; blue (`accent`) only for probability numerals; colour falls back to shape in `monochrome`.** This keeps fault tree in the `pert`/`petri`/`flowchart` family, not the forced-mono industrial family.

---

## 7. Legend

By the project's auto-derive rules (`LEGEND-SYSTEM.md`): universal textbook conventions — rectangle = event, circle = basic event, dome = AND, shield = OR — are common knowledge and **not** listed. The legend auto-derives entries **only** for encodings actually used and non-obvious:

- minimal cut-set box (red) — when `analysis: cutsets` is active;
- single-point-of-failure (order-1 cut set) — when one exists;
- undeveloped event (diamond) — when present;
- house / external event (forced 0/1) — when present;
- conditioning event (ellipse) — when an INHIBIT/PAND uses one;
- voting gate (`k/n`) — when present;
- transfer triangle — when present.

DSL controls follow the shared system: `legend: on/off/<position>`, `legend.title:`, etc. Default position `bottom-inline`.

---

## 8. Output Contract

- Root `<svg>` carries `data-diagram-type="faulttree"`, `role="img"`, `aria-label` = title or "Fault tree".
- `<title>` / `<desc>` summarise event/gate counts, the top event, the **minimal cut sets** (with orders), any **single points of failure**, and the computed **P(top)** with the method used (rare/mcub/exact).
- Events: `<g class="sx-ft-event" data-id="…" data-role="top|intermediate|basic|undeveloped|house|condition" [data-prob="…"] [data-state="0|1"] [data-shared-id="…"]>`.
- Gates: `<g class="sx-ft-gate" data-id="…" data-gate="and|or|xor|voting|inhibit|pand" [data-k="…" data-n="…"] [data-condition="…"]>`.
- Edges: `<g class="sx-ft-edge" data-from="…" data-to="…">` (structural).
- Cut sets: `<g class="sx-ft-cutset" data-cutset="MSF,CDM" data-cutset-index="0" data-order="2" [data-spof="true"] [data-cutset-prob="…"]>` enclosing the member-event boxes.
- Transfers: `<g class="sx-ft-transfer" data-link="…" data-dir="in|out">`.
- Theme via `resolveReliabilityTheme`; strokes/fills from tokens only — no inline styles.

The `data-cutset*` / `data-prob` attributes make the computed analysis **inspectable and interactive** downstream (MyMap.ai / ChatDiagram can let a user click a cut set, edit a `p`, and recompute) — the same interactivity stance as `decisiontree`'s `data-ev`.

---

## 9. Canonical Test Cases

Fixtures the implementation must satisfy (parser + layout + cut-set + golden-string e2e).

### TC-1 — Minimal AND-only tree (known single cut set)
```
faulttree "Both pumps fail"
  analysis: cutsets, probability
  top T "Both redundant pumps fail" = AND(PA, PB)
  basic PA "Pump A fails" p: 0.01
  basic PB "Pump B fails" p: 0.01
```
*Assert:* 1 top, 1 AND gate, 2 basic events; the **single minimal cut set is `{PA, PB}`** (order 2) → one red box around both circles; **no SPOF**; `P(top) ≈ 0.01·0.01 = 1.0e-4` (rare-event). Layout: T at level 0, gate below it, PA/PB at level 1.

### TC-2 — OR tree (each input is its own cut set + SPOFs)
```
faulttree "Engine stops"
  analysis: cutsets, probability
  top T "Engine stops" = OR(FUEL, IGN, SEIZE)
  basic FUEL  "Fuel starvation"   p: 0.002
  basic IGN   "Ignition failure"  p: 0.003
  basic SEIZE "Mechanical seizure" p: 0.0005
```
*Assert:* three **order-1 minimal cut sets** `{FUEL}`, `{IGN}`, `{SEIZE}` — each a **single point of failure** (red box around one circle + `data-spof="true"`); `P(top) ≈ 0.002+0.003+0.0005 = 0.0055` (rare-event); MCUB ≈ `1−(0.998)(0.997)(0.9995) = 0.00549`.

### TC-3 — Mixed tree with a SHARED/REPEATED basic event (where naive algorithms break)
```
faulttree "Product not removed"
  analysis: cutsets, probability
  top T  "Failure to remove product" = OR(G1, G2)
  gate G1 "Arm jams or collides"     = AND(MSF, G3)
  gate G2 "Wrong slot commanded"     = OR(CDM, MSF)
  gate G3 "Loss of position feedback"= OR(ESF, RCF)
  basic MSF "Manipulator system failure" p: 0.0035
  basic CDM "Controller command error"   p: 0.0009
  basic ESF "Encoder sensor failure"     p: 0.0021
  basic RCF "Resolver cable fault"       p: 0.0012
```
*Assert:* MSF is **shared** by G1 and G2 → rendered with the shared-id mark (or merged), `data-shared-id="MSF"`. MOCUS expands and **absorption removes** `{MSF,ESF}` and `{MSF,RCF}` (supersets of `{MSF}`). **Minimal cut sets: `{MSF}` and `{CDM}`** — both order-1 SPOFs. A naive expander that forgets absorption would wrongly report `{MSF}`, `{MSF,ESF}`, `{MSF,RCF}`, `{CDM}`; the test asserts only the two minimal sets survive. `P(top) ≈ P(MSF)+P(CDM) = 0.0044`.

### TC-4 — Voting + inhibit + house + undeveloped (full vocabulary)
```
faulttree "Vessel ruptures"
  analysis: cutsets, probability
  prob: mcub
  top TOP "Pressure vessel ruptures" = AND(OVP, RELIEF)
  gate OVP    "Sustained over-pressure" = INHIBIT(PUMP) if HEATER
  gate RELIEF "Both reliefs fail"        = VOTING(2/2; PRV_A, PRV_B)
  basic PUMP  "Pump runaway"   p: 0.004
  basic PRV_A "Relief A stuck" p: 0.02
  basic PRV_B "Relief B stuck" p: 0.02
  house HEATER "Heater energised" state: 1
  undeveloped EXT "External fire (not modelled)"
```
*Assert:* INHIBIT renders as a hexagon with the `HEATER` conditioning ellipse on its side; `HEATER` house=1 absorbed → OVP reduces to `{PUMP}`; VOTING 2/2 = `PRV_A ∧ PRV_B`. **Minimal cut set: `{PUMP, PRV_A, PRV_B}`** (order 3). `EXT` declared, drawn as a diamond, referenced nowhere → `<desc>` notes it is unconnected. `P(top)` via MCUB. *Negative test:* `state: 0` on HEATER deletes the OVP branch → top becomes unsatisfiable, reported as "no cut sets — top event cannot occur with current house states."

### TC-5 — Computed probability emphasis + exact vs rare comparison
```
faulttree "Safety function fails on demand"
  analysis: cutsets, probability
  prob: exact
  top T "Safety function fails" = OR(C1, C2)
  gate C1 "Channel 1 path" = AND(S1, L1)
  gate C2 "Channel 2 path" = AND(S2, L1)
  basic S1 "Sensor 1 fails" p: 0.05
  basic S2 "Sensor 2 fails" p: 0.05
  basic L1 "Shared logic solver fails" p: 0.05
```
*Assert:* L1 shared across C1 and C2. Minimal cut sets `{S1,L1}` and `{S2,L1}` (order 2 each, sharing L1). Rare-event `P(top) ≈ P(S1)P(L1)+P(S2)P(L1) = 0.0025+0.0025 = 0.005`. **Exact** must subtract the overlap `P(C1∩C2) = P(S1)P(S2)P(L1) = 0.000125` (L1 counted once over the union), giving `P(top) = 0.005 − 0.000125 = 0.004875`; the test asserts `prob: exact` produces 0.004875 (not 0.005), proving inclusion-exclusion handles the shared event. `P(top)` annotated beside the top rectangle.

---

## 10. Deviations From the Standard

- **Flat declaration, not nested indentation.** NUREG-0492 draws trees graphically; Schematex's DSL declares each gate/event on its own line and wires them by `id` reference (like `petri`/`logic`). This is the only sound way to express **repeated events** (a shared leaf can't live at two indentation positions) and is the most reliable form for LLM generation. The *rendered* tree is fully graphical and standard-compliant.
- **AND = dome, OR = shield (ANSI/NUREG default).** IEC 61025 Annex A permits alternative gate glyphs (and a rectangular IEC-60617 style). v0.1 defaults to the NUREG-0492 distinctive shapes (the most recognisable) and offers `style: iec` for the rectangular variant later. The dome/shield orientation is **output-up, inputs-down** — the mirror of the `logic` engine — to match every FTA textbook.
- **Coherent subset in v0.1.** Real safety fault trees are coherent (monotone). XOR is rendered with its distinctive symbol but, for cut-set generation, treated as OR in the coherent approximation (the exact `(A∧¬B)∨(¬A∧B)` form is noted in `<desc>`); NOT/NAND/NOR are deferred (§11). This keeps MOCUS sound.
- **PRIORITY-AND order is rendered, not time-evaluated.** PAND's input *order* is parsed, displayed (via the conditioning ellipse), and the ordering is recorded in `<desc>`, but v0.1 treats PAND as a plain AND for cut-set purposes (the *combination* of events is the cut set; the *sequence* requires dynamic-fault-tree / Markov analysis — deferred §11).
- **Probability default is the rare-event approximation.** It is fast and a conservative upper bound — the standard engineering default. `prob: mcub` (tighter) and `prob: exact` (inclusion-exclusion, small trees) are opt-in. The engine notes the method used in `<desc>` so the number is never ambiguous.
- **Cut-set expansion is capped.** MCS enumeration is NP-hard; past a configurable bound (default ~10⁴ intermediate terms) the engine stops and emits a readable `<desc>` warning rather than hanging — BDD-based exact enumeration is deferred (§11). For human/LLM-authored trees this cap is never hit.
- **Transfers resolved in-document.** v0.1 splices a named subtree defined in the same document at its transfer points (and draws the triangle); cross-file / multi-page transfer is deferred.

---

## 11. Deferred (post-v0.1)

Each has a slot in §2 so adding it is additive — no DSL or type breakage:

- **Dynamic Fault Trees (DFT, Dugan)** — true time-ordered PAND, SPARE (cold/warm/hot), FDEP (functional dependency), and SEQ gates; require Markov-chain / simulation analysis, not Boolean cut sets.
- **Non-coherent gates** — NOT / NAND / NOR and exact XOR cut-set semantics (prime implicants instead of cut sets); needed only for non-monotone trees.
- **Importance measures** — Birnbaum (`∂P(top)/∂P(eᵢ)`), Fussell-Vesely, Risk Achievement/Reduction Worth (RAW/RRW), with a colour-ramp on basic events ranking risk contribution.
- **Minimal path sets** — the dual of cut sets (success modes); a separate qualitative report.
- **BDD-based quantification** — binary decision diagrams for exact P(top) and large-tree cut-set enumeration without the rare-event approximation.
- **Common-cause failures (CCF)** — beta-factor / MGL / alpha-factor models that couple "independent" basic events (the dominant real-world correction to naive independence).
- **Common-cause / uncertainty propagation** — Monte-Carlo over lognormal event-probability distributions to produce a P(top) confidence interval.
- **Multi-file / multi-page transfers** — true transfer-in/out across documents for very large trees.
- **Bowtie integration** — splice this fault tree's top event into the sibling bowtie's central hazard event (shared `ReliabilityTokens`).
